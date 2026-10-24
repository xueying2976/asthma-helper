import AeriDayCore
import Foundation
import Testing

struct PersonalBaselineReviewTests {
    private var calendar: Calendar {
        var result = Calendar(identifier: .gregorian)
        result.timeZone = TimeZone(secondsFromGMT: 0)!
        return result
    }
    private let now = Date(timeIntervalSince1970: 1_786_003_200)
    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now))!
    }
    private func features(source: String = "synthetic-watch") -> [DailyFeature] {
        (-32 ... -1).map { offset in
            DailyFeature(metric: .respiratoryRate, day: day(offset), sourceID: source,
                         value: 15 + Double((offset + 32) % 3 - 1) * 0.2,
                         unit: "count/min", sampleCount: 1)
        }
    }
    private func baseline(frozenOffset: Int = -20, source: String = "synthetic-watch", version: String = PersonalChangeEngine.ruleVersion) -> BaselineSnapshot {
        BaselineSnapshot(metric: .respiratoryRate, sourceID: source, unit: "count/min", referenceStart: day(-52),
                         referenceEnd: day(-25), validDays: 28, median: 15, mad: 0.2,
                         frozenAt: day(frozenOffset), ruleVersion: version)
    }
    private func assertReviewPersists(_ features: [DailyFeature], baseline: BaselineSnapshot) throws {
        var prior = [baseline]
        for _ in 0..<3 {
            let run = PersonalChangeEngine.evaluate(features: features, asOf: now, calendar: calendar, previousBaselines: prior)
            let finding = try #require(run.findings.first { $0.metric == .respiratoryRate })
            #expect(finding.state == .baselineReviewNeeded)
            #expect(finding.baseline == baseline)
            prior = run.baselines
        }
    }
    @Test func expiredFreezeCannotDisappearOnRepeatedRefresh() throws {
        try assertReviewPersists(features(), baseline: baseline())
    }
    @Test func incompatibleVersionCannotSilentlyResumeRollingReference() throws {
        try assertReviewPersists(features(), baseline: baseline(frozenOffset: -3, version: "older-rule"))
    }
    @Test func missingHistoryPreservesReviewState() throws {
        try assertReviewPersists([], baseline: baseline())
        try assertReviewPersists(Array(features().suffix(2)), baseline: baseline())
    }
    @Test func sourceTransitionRequiresReviewUntilExplicitReset() throws {
        let prior = baseline()
        try assertReviewPersists(features(source: "synthetic-new-watch"), baseline: prior)
        let reset = PersonalChangeEngine.evaluate(features: features(source: "synthetic-new-watch"), asOf: now, calendar: calendar)
        #expect(reset.findings.first { $0.metric == .respiratoryRate }?.state == .noSustainedChangeDetected)
    }
    @Test func ambiguousSourceDoesNotDiscardFrozenEpisode() throws {
        try assertReviewPersists(features() + [DailyFeature(metric: .respiratoryRate, day: day(-1),
                                                            sourceID: "synthetic-other-watch", value: 15,
                                                            unit: "count/min", sampleCount: 1)], baseline: baseline())
    }
    @Test func restoredMatchingInputsCannotClearExplicitReviewLock() throws {
        let locked = baseline(frozenOffset: -3).requiringReview(reason: "referenceInputsChanged")
        // Repeated identical input rows cannot stand in for the owner's review.
        try assertReviewPersists(features(), baseline: locked)
        let run = PersonalChangeEngine.evaluate(features: features(), asOf: now, calendar: calendar,
                                               previousBaselines: [locked])
        #expect(run.findings.first { $0.metric == .respiratoryRate }?.reasons.contains("referenceInputsChanged") == true)
        #expect(locked.ruleVersion == PersonalChangeEngine.ruleVersion)
    }
    @Test func baselineArchiveWithoutReviewFieldStillDecodes() throws {
        let original = baseline()
        let encoder = JSONEncoder()
        let data = try encoder.encode(original)
        var json = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        json.removeValue(forKey: "reviewReason")
        let decoded = try JSONDecoder().decode(BaselineSnapshot.self, from: JSONSerialization.data(withJSONObject: json))
        #expect(decoded == original)
        #expect(decoded.reviewReason == nil)
    }
}
