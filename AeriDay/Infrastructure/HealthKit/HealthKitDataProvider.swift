import AeriDayCore
import Foundation
import HealthKit

final class HealthKitDataProvider: HealthDataProviding, @unchecked Sendable {
    static let connectionRequestedKey = "healthkit.connection.requested"

    private let healthStore: HKHealthStore
    private let defaults: UserDefaults
    private let now: @Sendable () -> Date
    private let freshnessPolicy = FreshnessPolicy(staleAfter: 48 * 60 * 60)

    init(
        healthStore: HKHealthStore = HKHealthStore(),
        defaults: UserDefaults = .standard,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.healthStore = healthStore
        self.defaults = defaults
        self.now = now
    }

    func requestAuthorization() async -> HealthSnapshot {
        guard HKHealthStore.isHealthDataAvailable() else {
            return unavailableSnapshot()
        }

        do {
            try await healthStore.requestAuthorization(
                toShare: Set<HKSampleType>(),
                read: HealthKitTypeRegistry.readTypes
            )
            defaults.set(true, forKey: Self.connectionRequestedKey)
            return await latestSnapshot()
        } catch {
            return serviceFailureSnapshot()
        }
    }

    func disconnect() async -> HealthSnapshot {
        defaults.set(false, forKey: Self.connectionRequestedKey)
        return notRequestedSnapshot()
    }

    func latestSnapshot() async -> HealthSnapshot {
        guard HKHealthStore.isHealthDataAvailable() else {
            return unavailableSnapshot()
        }
        guard defaults.bool(forKey: Self.connectionRequestedKey) else {
            return notRequestedSnapshot()
        }

        let queryEnd = now()
        let queryStart = Calendar(identifier: .gregorian)
            .date(byAdding: .day, value: -7, to: queryEnd) ?? queryEnd.addingTimeInterval(-7 * 86_400)
        let predicate = HKQuery.predicateForSamples(
            withStart: queryStart,
            end: queryEnd,
            options: [.strictStartDate]
        )

        var summaries = [HealthMetricSummary]()
        var successfulQueryCount = 0
        var failedKinds = Set<HealthMetricKind>()

        for (kind, type, unit) in HealthKitTypeRegistry.quantityTypes {
            if let samples = try? await samples(for: type, predicate: predicate) {
                successfulQueryCount += 1
                summaries += quantitySummaries(kind: kind, samples: samples, unit: unit)
            } else {
                failedKinds.insert(kind)
            }
        }

        if let samples = try? await samples(for: HealthKitTypeRegistry.sleepType, predicate: predicate) {
            successfulQueryCount += 1
            summaries += sleepSummaries(samples)
        } else {
            failedKinds.insert(.sleepAnalysis)
        }

        if let samples = try? await samples(for: HealthKitTypeRegistry.workoutType, predicate: predicate) {
            successfulQueryCount += 1
            summaries += workoutSummaries(samples)
        } else {
            failedKinds.insert(.workout)
        }

        guard successfulQueryCount > 0 else {
            return serviceFailureSnapshot()
        }

        summaries.sort {
            if $0.kind.rawValue == $1.kind.rawValue {
                return $0.endDate > $1.endDate
            }
            return $0.kind.rawValue < $1.kind.rawValue
        }

        let latestDate = summaries.map(\.endDate).max()
        let sourceNames = Set(summaries.map(\.sourceName))
        let availability: HealthSnapshot.Availability = summaries.isEmpty ? .noAvailableData : .sampleAvailable

        return HealthSnapshot(
            availability: availability,
            metrics: summaries,
            failedKinds: failedKinds,
            earliestAuthorizedSampleDate: nil,
            provenance: DataProvenance(
                sourceName: sourceNames.count > 1 ? "Apple Health sources" : "Apple Health",
                collectedAt: latestDate,
                freshness: freshnessPolicy.freshness(collectedAt: latestDate, now: queryEnd),
                isSynthetic: false
            )
        )
    }

    /// Full bounded rebuild intentionally avoids anchor/cache atomicity hazards. Each call
    /// queries all samples again, so edits and deletions cannot leave stale cached findings.
    func history(days: Int = 90, calendar: Calendar = .current) async -> HealthHistorySnapshot {
        let end = now()
        let start = calendar.date(byAdding: .day, value: -min(max(days, 1), 90),
                                  to: calendar.startOfDay(for: end)) ?? end
        let availability: HealthSnapshot.Availability? = !HKHealthStore.isHealthDataAvailable()
            ? .serviceUnavailable : !defaults.bool(forKey: Self.connectionRequestedKey) ? .accessNotRequested : nil
        if let availability {
            return HealthHistorySnapshot(features: [], queriedAt: end, startDate: start,
                                         isSynthetic: false, availability: availability)
        }
        // Include overlap at the lower bound to preserve overnight sleep continuity.
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        var normalized = [HistorySample]()
        var failed = Set<HealthMetricKind>()
        for (kind, type, unit) in HealthKitTypeRegistry.quantityTypes {
            do {
                for sample in try await samples(for: type, predicate: predicate) {
                    guard let sample = sample as? HKQuantitySample else { continue }
                    let value = sample.quantity.doubleValue(for: unit) * (kind == .oxygenSaturation ? 100 : 1)
                    normalized.append(historySample(sample, kind: kind, value: value))
                }
            } catch { failed.insert(kind) }
        }
        do {
            for sample in try await samples(for: HealthKitTypeRegistry.sleepType, predicate: predicate) {
                guard let sample = sample as? HKCategorySample, Self.isAsleep(sample.value) else { continue }
                normalized.append(historySample(sample, kind: .sleepAnalysis, value: sample.endDate.timeIntervalSince(sample.startDate) / 60))
            }
        } catch { failed.insert(.sleepAnalysis) }
        do {
            for sample in try await samples(for: HealthKitTypeRegistry.workoutType, predicate: predicate) {
                guard let sample = sample as? HKWorkout else { continue }
                normalized.append(historySample(sample, kind: .workout, value: sample.duration / 60))
            }
        } catch { failed.insert(.workout) }
        let features = HealthHistoryBuilder.build(samples: normalized, start: start, now: end, calendar: calendar)
        return HealthHistorySnapshot(features: features, failedKinds: failed, queriedAt: end, startDate: start,
            isSynthetic: false, availability: failed.count == HealthMetricKind.allCases.count ? .serviceUnavailable
                : features.isEmpty ? .noAvailableData : .sampleAvailable)
    }

    private func historySample(_ sample: HKSample, kind: HealthMetricKind, value: Double) -> HistorySample {
        let device = sample.device
        // Material device identity avoids carrying a baseline across different wearables.
        // Unknown identity stays explicitly unknown; source software version alone is not a device change.
        let identity = [device?.localIdentifier, device?.manufacturer, device?.model, device?.hardwareVersion, device?.name]
            .map { $0 ?? "unknown" }.joined(separator: "|")
        return HistorySample(id: sample.uuid, metric: kind, start: sample.startDate, end: sample.endDate,
            value: value, sourceID: sample.sourceRevision.source.bundleIdentifier + "|" + identity,
            timeZoneID: sample.metadata?[HKMetadataKeyTimeZone] as? String)
    }

    private func samples(
        for type: HKSampleType,
        predicate: NSPredicate
    ) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: samples ?? [])
                }
            }
            healthStore.execute(query)
        }
    }

    private func quantitySummaries(
        kind: HealthMetricKind,
        samples: [HKSample],
        unit: HKUnit
    ) -> [HealthMetricSummary] {
        let quantitySamples = samples.compactMap { $0 as? HKQuantitySample }
        return groupedBySource(quantitySamples).compactMap { sourceSamples in
            guard let latest = sourceSamples.max(by: { $0.endDate < $1.endDate }) else { return nil }
            var value = latest.quantity.doubleValue(for: unit)
            if kind == .oxygenSaturation { value *= 100 }
            return HealthMetricSummary(
                kind: kind,
                value: value,
                unit: displayUnit(for: kind),
                startDate: latest.startDate,
                endDate: latest.endDate,
                sourceName: latest.sourceRevision.source.name,
                sourceBundleIdentifier: latest.sourceRevision.source.bundleIdentifier,
                deviceName: latest.device?.name,
                sampleCount: sourceSamples.count
            )
        }
    }

    private func sleepSummaries(_ samples: [HKSample]) -> [HealthMetricSummary] {
        let sleepSamples = samples.compactMap { $0 as? HKCategorySample }.filter { Self.isAsleep($0.value) }
        return groupedBySource(sleepSamples).compactMap { sourceSamples in
            guard let latest = sourceSamples.max(by: { $0.endDate < $1.endDate }) else { return nil }
            return HealthMetricSummary(
                kind: .sleepAnalysis,
                value: latest.endDate.timeIntervalSince(latest.startDate) / 3_600,
                unit: "hr",
                startDate: latest.startDate,
                endDate: latest.endDate,
                sourceName: latest.sourceRevision.source.name,
                sourceBundleIdentifier: latest.sourceRevision.source.bundleIdentifier,
                deviceName: latest.device?.name,
                sampleCount: sourceSamples.count
            )
        }
    }

    private func workoutSummaries(_ samples: [HKSample]) -> [HealthMetricSummary] {
        let workouts = samples.compactMap { $0 as? HKWorkout }
        return groupedBySource(workouts).compactMap { sourceSamples in
            guard let latest = sourceSamples.max(by: { $0.endDate < $1.endDate }) else { return nil }
            return HealthMetricSummary(
                kind: .workout,
                value: latest.duration / 60,
                unit: "min",
                startDate: latest.startDate,
                endDate: latest.endDate,
                sourceName: latest.sourceRevision.source.name,
                sourceBundleIdentifier: latest.sourceRevision.source.bundleIdentifier,
                deviceName: latest.device?.name,
                sampleCount: sourceSamples.count
            )
        }
    }

    static func isAsleep(_ value: Int) -> Bool {
        [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
         HKCategoryValueSleepAnalysis.asleepCore.rawValue,
         HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
         HKCategoryValueSleepAnalysis.asleepREM.rawValue].contains(value)
    }

    private func groupedBySource<Sample: HKSample>(_ samples: [Sample]) -> [[Sample]] {
        Dictionary(grouping: samples) { $0.sourceRevision.source.bundleIdentifier }
            .values
            .map(Array.init)
    }

    private func displayUnit(for kind: HealthMetricKind) -> String {
        switch kind {
        case .respiratoryRate, .restingHeartRate: "count/min"
        case .oxygenSaturation: "%"
        case .stepCount: "count"
        case .sleepAnalysis: "hr"
        case .workout: "min"
        }
    }

    private func notRequestedSnapshot() -> HealthSnapshot {
        HealthSnapshot(
            availability: .accessNotRequested,
            provenance: DataProvenance(
                sourceName: "Apple Health",
                collectedAt: nil,
                freshness: .unavailable,
                isSynthetic: false
            )
        )
    }

    private func unavailableSnapshot() -> HealthSnapshot {
        HealthSnapshot(
            availability: .serviceUnavailable,
            provenance: DataProvenance(
                sourceName: "Apple Health",
                collectedAt: nil,
                freshness: .unavailable,
                isSynthetic: false
            )
        )
    }

    private func serviceFailureSnapshot() -> HealthSnapshot {
        HealthSnapshot(
            availability: .serviceUnavailable,
            failedKinds: Set(HealthMetricKind.allCases),
            provenance: DataProvenance(
                sourceName: "Apple Health",
                collectedAt: nil,
                freshness: .unavailable,
                isSynthetic: false
            )
        )
    }
}
