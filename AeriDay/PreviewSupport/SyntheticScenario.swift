import AeriDayCore
import Foundation

enum SyntheticScenario: String, CaseIterable, Identifiable, Sendable {
    case content
    case insufficientData
    case staleData
    case accessNotRequested
    case multipleSources
    case serviceUnavailable

    var id: String { rawValue }
}

enum SyntheticFixtures {
    static let now = Date(timeIntervalSince1970: 1_786_000_000)

    static func localRecords(for scenario: SyntheticScenario) -> LocalRecordSummary {
        let hasContent = scenario == .content || scenario == .multipleSources || scenario == .staleData
        return LocalRecordSummary(
            entryCount: hasContent ? 2 : 0,
            latestEntryAt: hasContent ? now.addingTimeInterval(-3_600) : nil,
            provenance: DataProvenance(
                sourceName: "Synthetic local records",
                collectedAt: hasContent ? now.addingTimeInterval(-3_600) : nil,
                freshness: scenario == .staleData ? .stale : (hasContent ? .current : .unavailable),
                isSynthetic: true
            )
        )
    }

    static func health(for scenario: SyntheticScenario) -> HealthSnapshot {
        let availability: HealthSnapshot.Availability
        let freshness: DataFreshness
        let date: Date?

        switch scenario {
        case .content, .multipleSources:
            availability = .sampleAvailable
            freshness = .current
            date = now.addingTimeInterval(-1_800)
        case .staleData:
            availability = .sampleAvailable
            freshness = .stale
            date = now.addingTimeInterval(-172_800)
        case .accessNotRequested:
            availability = .accessNotRequested
            freshness = .unavailable
            date = nil
        case .serviceUnavailable:
            availability = .serviceUnavailable
            freshness = .unavailable
            date = nil
        case .insufficientData:
            availability = .noAvailableData
            freshness = .unavailable
            date = nil
        }

        return HealthSnapshot(
            availability: availability,
            metrics: syntheticHealthMetrics(for: scenario),
            provenance: DataProvenance(
                sourceName: scenario == .multipleSources ? "Synthetic Apple Health sources" : "Synthetic Apple Health",
                collectedAt: date,
                freshness: freshness,
                isSynthetic: true
            )
        )
    }

    private static func syntheticHealthMetrics(for scenario: SyntheticScenario) -> [HealthMetricSummary] {
        guard scenario == .content || scenario == .multipleSources || scenario == .staleData else {
            return []
        }

        let endDate = scenario == .staleData ? now.addingTimeInterval(-172_800) : now.addingTimeInterval(-1_800)
        let primarySource = "Synthetic Watch"
        let primaryBundle = "com.aeriday.synthetic.watch"
        var metrics = [
            HealthMetricSummary(kind: .respiratoryRate, value: 15.2, unit: "count/min", startDate: endDate, endDate: endDate, sourceName: primarySource, sourceBundleIdentifier: primaryBundle, deviceName: "Synthetic wearable"),
            HealthMetricSummary(kind: .restingHeartRate, value: 62, unit: "count/min", startDate: endDate, endDate: endDate, sourceName: primarySource, sourceBundleIdentifier: primaryBundle, deviceName: "Synthetic wearable"),
            HealthMetricSummary(kind: .sleepAnalysis, value: 1.4, unit: "hr", startDate: endDate.addingTimeInterval(-5_040), endDate: endDate, sourceName: primarySource, sourceBundleIdentifier: primaryBundle, deviceName: "Synthetic wearable"),
            HealthMetricSummary(kind: .oxygenSaturation, value: 97, unit: "%", startDate: endDate, endDate: endDate, sourceName: primarySource, sourceBundleIdentifier: primaryBundle, deviceName: "Synthetic wearable"),
            HealthMetricSummary(kind: .stepCount, value: 328, unit: "count", startDate: endDate.addingTimeInterval(-600), endDate: endDate, sourceName: "Synthetic Phone", sourceBundleIdentifier: "com.aeriday.synthetic.phone", deviceName: "Synthetic iPhone"),
            HealthMetricSummary(kind: .workout, value: 24, unit: "min", startDate: endDate.addingTimeInterval(-1_440), endDate: endDate, sourceName: primarySource, sourceBundleIdentifier: primaryBundle, deviceName: "Synthetic wearable")
        ]

        if scenario == .multipleSources {
            metrics.append(
                HealthMetricSummary(kind: .respiratoryRate, value: 15.0, unit: "count/min", startDate: endDate.addingTimeInterval(-300), endDate: endDate.addingTimeInterval(-300), sourceName: "Synthetic Secondary Source", sourceBundleIdentifier: "com.aeriday.synthetic.secondary", deviceName: "Synthetic secondary wearable")
            )
        }
        return metrics
    }

    static func environment(for scenario: SyntheticScenario) -> EnvironmentalSnapshot {
        let unavailable = scenario == .serviceUnavailable
        return EnvironmentalSnapshot(
            availability: unavailable ? .serviceUnavailable : .sampleAvailable,
            provenance: DataProvenance(
                sourceName: "Synthetic environment service",
                collectedAt: unavailable ? nil : now.addingTimeInterval(-900),
                freshness: unavailable ? .unavailable : (scenario == .staleData ? .stale : .current),
                isSynthetic: true
            )
        )
    }
}
