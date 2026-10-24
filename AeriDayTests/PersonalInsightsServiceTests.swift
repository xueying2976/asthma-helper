@testable import AeriDay
import AeriDayCore
import Foundation
import Testing

@MainActor
struct PersonalInsightsServiceTests {
    private var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)!
        return value
    }
    private let now = Date(timeIntervalSince1970: 1_786_003_200)
    private func directory() -> URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("AeriDayInsightsTests-" + UUID().uuidString)
    }
    private func history(value: Double = 15, synthetic: Bool = true) -> HealthHistorySnapshot {
        let today = calendar.startOfDay(for: now)
        let feature = DailyFeature(metric: .respiratoryRate,
                                   day: calendar.date(byAdding: .day, value: -1, to: today)!,
                                   sourceID: "Synthetic race-test source", value: value,
                                   unit: "count/min", sampleCount: 1)
        return HealthHistorySnapshot(features: [feature], queriedAt: now,
                                     startDate: calendar.date(byAdding: .day, value: -90, to: today)!,
                                     isSynthetic: synthetic, availability: .sampleAvailable)
    }
    private func start(_ service: PersonalInsightsService, provider: ControlledInsightsProvider,
                       outcome: RefreshOutcome) -> Task<Void, Never> {
        Task { @MainActor in
            do {
                _ = try await service.refresh(provider: provider, entries: LocalEntries())
                outcome.succeeded = true
            } catch is CancellationError { outcome.cancelled = true }
            catch { outcome.failed = true }
        }
    }
    private func hasValue(_ service: PersonalInsightsService, expected: Double) throws -> Bool {
        let series = try service.series(metricID: "rr", days: 7)
        let points = try #require(series["points"] as? [[String: Any]])
        return points.contains { ($0["value"] as? Double) == expected }
    }

    @Test func disableDuringReadCancelsOldResponseAndPersistsChoice() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let provider = ControlledInsightsProvider()
        let outcome = RefreshOutcome()
        let task = start(service, provider: provider, outcome: outcome)
        await provider.waitUntilStarted()
        try service.setEnabled(false)
        await provider.finish(history())
        await task.value
        #expect(outcome.cancelled && !outcome.succeeded && !outcome.failed)
        #expect(!service.enabled)
        #expect(!PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base).enabled)
        try service.setEnabled(true)
        #expect(try !hasValue(service, expected: 15))
    }

    @Test func clearDuringReadCannotResurrectDeletedAnalysis() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let provider = ControlledInsightsProvider()
        let outcome = RefreshOutcome()
        let task = start(service, provider: provider, outcome: outcome)
        await provider.waitUntilStarted()
        try service.clear()
        await provider.finish(history())
        await task.value
        #expect(outcome.cancelled && !outcome.succeeded)
        #expect(!service.enabled)
        let reloaded = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        #expect(!reloaded.enabled)
        // A post-deletion frontend refresh stays disabled and cannot reimport history.
        let disabledEnvelope = try await reloaded.refresh(provider: ImmediateInsightsProvider(value: history()), entries: LocalEntries())
        #expect((disabledEnvelope["enabled"] as? Bool) == false)
        #expect((disabledEnvelope["findings"] as? [[String: Any]])?.isEmpty == true)
        try reloaded.setEnabled(true)
        #expect(try !hasValue(reloaded, expected: 15))
    }

    @Test func clearPersistsDisabledAcrossRestartEvenAfterSuccessfulAnalysis() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        _ = try await service.refresh(provider: ImmediateInsightsProvider(value: history()), entries: LocalEntries())
        #expect(try hasValue(service, expected: 15))
        try service.clear()
        #expect(!service.enabled)
        let reloaded = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        #expect(!reloaded.enabled)
        let result = try await reloaded.refresh(provider: ImmediateInsightsProvider(value: richHistory()), entries: LocalEntries())
        #expect((result["enabled"] as? Bool) == false)
        #expect((result["findings"] as? [[String: Any]])?.isEmpty == true)
        try reloaded.setEnabled(true)
        #expect(try !hasValue(reloaded, expected: 15))
    }

    @Test func newerRequestWinsEvenWhenOlderRequestFinishesLast() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let oldProvider = ControlledInsightsProvider(), newProvider = ControlledInsightsProvider()
        let oldOutcome = RefreshOutcome(), newOutcome = RefreshOutcome()
        let oldTask = start(service, provider: oldProvider, outcome: oldOutcome)
        await oldProvider.waitUntilStarted()
        let newTask = start(service, provider: newProvider, outcome: newOutcome)
        await newProvider.waitUntilStarted()
        await newProvider.finish(history(value: 20))
        await newTask.value
        #expect(newOutcome.succeeded)
        #expect(try hasValue(service, expected: 20))
        await oldProvider.finish(history(value: 10))
        await oldTask.value
        #expect(oldOutcome.cancelled && !oldOutcome.succeeded)
        #expect(try hasValue(service, expected: 20))
        #expect(try !hasValue(service, expected: 10))
    }

    @Test func sourceSelectionDuringReadInvalidatesOldResult() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let provider = ControlledInsightsProvider(), outcome = RefreshOutcome()
        let task = start(service, provider: provider, outcome: outcome)
        await provider.waitUntilStarted()
        try service.setPreferredSource(metricID: "rr", sourceID: "Other synthetic source")
        await provider.finish(history())
        await task.value
        #expect(outcome.cancelled && !outcome.succeeded)
        #expect(try !hasValue(service, expected: 15))
    }

    @Test func explicitInvalidationDuringReadInvalidatesOldResult() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let provider = ControlledInsightsProvider(), outcome = RefreshOutcome()
        let task = start(service, provider: provider, outcome: outcome)
        await provider.waitUntilStarted()
        service.invalidate()
        await provider.finish(history())
        await task.value
        #expect(outcome.cancelled && !outcome.succeeded)
        #expect(try !hasValue(service, expected: 15))
    }

    @Test func syntheticProviderCannotEnterPersonalAnalysis() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: false, calendar: calendar, baseDirectory: base)
        let provider = ControlledInsightsProvider(), outcome = RefreshOutcome()
        let task = start(service, provider: provider, outcome: outcome)
        await provider.waitUntilStarted()
        await provider.finish(history(synthetic: true))
        await task.value
        #expect(outcome.failed && !outcome.succeeded)
        #expect(try !hasValue(service, expected: 15))
    }

    private func richHistory(source: String = "Synthetic source A", center: Double = 15,
                             change: String? = nil) -> HealthHistorySnapshot {
        let today = calendar.startOfDay(for: now)
        let features: [DailyFeature] = (-90 ... -1).compactMap { offset in
            if change == "delete" && offset == -32 { return nil }
            var value = center + Double((offset + 90) % 3 - 1) * 0.2
            if offset >= -3 { value = center + 5 }
            // Keep the median and MAD effectively unchanged while altering exact input provenance.
            if change == "edit" && offset == -32 { value -= 0.1 }
            return DailyFeature(metric: .respiratoryRate,
                                day: calendar.date(byAdding: .day, value: offset, to: today)!,
                                sourceID: source, value: value, unit: "count/min", sampleCount: 1)
        }
        return HealthHistorySnapshot(features: features, queriedAt: now,
                                     startDate: calendar.date(byAdding: .day, value: -90, to: today)!,
                                     isSynthetic: true, availability: .sampleAvailable)
    }

    private func respiratoryFinding(_ service: PersonalInsightsService,
                                    history: HealthHistorySnapshot) async throws -> [String: Any] {
        let envelope = try await service.refresh(provider: ImmediateInsightsProvider(value: history), entries: LocalEntries())
        let findings = try #require(envelope["findings"] as? [[String: Any]])
        return try #require(findings.first { ($0["metricId"] as? String) == "rr" })
    }

    @Test(arguments: ["edit", "delete"])
    func changedFrozenReferenceRequiresPersistentExplicitReview(change: String) async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let first = try await respiratoryFinding(service, history: richHistory())
        #expect((first["state"] as? String) == "sustainedPersonalDeviation")
        let changed = try await respiratoryFinding(service, history: richHistory(change: change))
        #expect((changed["state"] as? String) == "baselineReviewNeeded")
        #expect((changed["limitations"] as? String)?.contains("referenceInputsChanged") == true)
        // Returning to the old inputs must not quietly undo the review requirement.
        let restored = try await respiratoryFinding(service, history: richHistory())
        #expect((restored["state"] as? String) == "baselineReviewNeeded")
        let reloaded = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let afterRestart = try await respiratoryFinding(reloaded, history: richHistory())
        #expect((afterRestart["state"] as? String) == "baselineReviewNeeded")
        #expect((afterRestart["limitations"] as? String)?.contains("referenceInputsChanged") == true)
        try reloaded.reviewBaseline(metricID: "rr")
        let reviewed = try await respiratoryFinding(reloaded, history: richHistory())
        #expect((reviewed["state"] as? String) == "sustainedPersonalDeviation")
        #expect((reviewed["limitations"] as? String)?.contains("referenceInputsChanged") == false)
    }

    @Test func explicitSourceSelectionStartsANewReferenceAndPersistsSelection() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let first = try await respiratoryFinding(service, history: richHistory())
        #expect((first["state"] as? String) == "sustainedPersonalDeviation")
        try service.setPreferredSource(metricID: "rr", sourceID: "Synthetic source B")
        let reloaded = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let selected = try await respiratoryFinding(reloaded, history: richHistory(source: "Synthetic source B", center: 20))
        #expect((selected["state"] as? String) == "sustainedPersonalDeviation")
        #expect((selected["sourceId"] as? String) == "Synthetic source B")
        #expect((selected["baseline"] as? Double) == 20)
        #expect((selected["limitations"] as? String)?.contains("referenceInputsChanged") == false)
        #expect(throws: (any Error).self) { try reloaded.reviewBaseline(metricID: "unknown") }
    }

    @Test func seriesIsBoundedAndUnknownMetricIsRejected() async throws {
        let base = directory(); defer { try? FileManager.default.removeItem(at: base) }
        let service = PersonalInsightsService(isDemo: true, calendar: calendar, baseDirectory: base)
        let provider = ControlledInsightsProvider(), outcome = RefreshOutcome()
        let task = start(service, provider: provider, outcome: outcome)
        await provider.waitUntilStarted()
        await provider.finish(history())
        await task.value
        #expect(outcome.succeeded)
        for days in [7, 30, 90] {
            let result = try service.series(metricID: "rr", days: days)
            #expect((result["points"] as? [[String: Any]])?.count == days)
        }
        #expect(throws: (any Error).self) { try service.series(metricID: "rr", days: 10000) }
        #expect(throws: (any Error).self) { try service.series(metricID: "heartRisk", days: 7) }
    }
}

@MainActor
private final class RefreshOutcome {
    var succeeded = false
    var cancelled = false
    var failed = false
}

private actor ControlledInsightsProvider: HealthDataProviding {
    private var continuation: CheckedContinuation<HealthHistorySnapshot, Never>?
    private var started = false
    private var startWaiters: [CheckedContinuation<Void, Never>] = []

    func latestSnapshot() async -> HealthSnapshot {
        HealthSnapshot(availability: .noAvailableData,
                       provenance: DataProvenance(sourceName: "Synthetic race-test provider", collectedAt: nil,
                                                  freshness: .unavailable, isSynthetic: true))
    }
    func history(days: Int, calendar: Calendar) async -> HealthHistorySnapshot {
        await withCheckedContinuation { continuation in
            self.continuation = continuation
            started = true
            startWaiters.forEach { $0.resume() }
            startWaiters.removeAll()
        }
    }
    func waitUntilStarted() async {
        guard !started else { return }
        await withCheckedContinuation { startWaiters.append($0) }
    }
    func finish(_ history: HealthHistorySnapshot) {
        let pending = continuation
        continuation = nil
        pending?.resume(returning: history)
    }
}

private struct ImmediateInsightsProvider: HealthDataProviding {
    let value: HealthHistorySnapshot
    func latestSnapshot() async -> HealthSnapshot {
        HealthSnapshot(availability: .sampleAvailable,
                       provenance: DataProvenance(sourceName: "Synthetic reference-test provider", collectedAt: value.queriedAt,
                                                  freshness: .current, isSynthetic: true))
    }
    func history(days: Int, calendar: Calendar) async -> HealthHistorySnapshot { value }
}
