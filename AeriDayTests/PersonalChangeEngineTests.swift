import AeriDayCore
import Foundation
import Testing

/// Independent counterexamples use synthetic daily summaries only.
struct PersonalChangeEngineTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }
    private var asOf: Date { Date(timeIntervalSince1970: 1_786_003_200) }
    private func day(_ offset: Int) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: asOf))!
    }
    private func feature(_ offset: Int, _ value: Double?, metric: HealthMetricKind = .respiratoryRate,
                         source: String = "synthetic-watch-A", unit: String? = nil,
                         quality: DailyFeatureQuality = .usable, flags: [DailyQualityFlag] = []) -> DailyFeature {
        DailyFeature(metric: metric, day: day(offset), sourceID: source, value: value,
                     unit: unit ?? PersonalChangeEngine.canonicalUnit(metric), sampleCount: value == nil ? 0 : 1,
                     quality: quality, flags: flags)
    }
    private func reference(_ count: Int = 28, center: Double = 15, spread: Double = 0.2,
                           metric: HealthMetricKind = .respiratoryRate) -> [DailyFeature] {
        (0..<count).map { index in
            feature(-32 + index, center + (Double(index % 3 - 1) * spread), metric: metric)
        }
    }
    private func finding(_ features: [DailyFeature], metric: HealthMetricKind = .respiratoryRate,
                         previous: [BaselineSnapshot] = []) throws -> ChangeFinding {
        try #require(PersonalChangeEngine.evaluate(features: features, asOf: asOf, calendar: calendar,
                                                   previousBaselines: previous).findings.first { $0.metric == metric })
    }

    @Test func requiresTwentyOneReferenceDaysAndTwoRecentDays() throws {
        let recent = [feature(-3, 18), feature(-2, 18), feature(-1, 15)]
        #expect(try finding(reference(20) + recent).state == .insufficientData)
        #expect(try finding(reference(21) + recent).state == .sustainedPersonalDeviation)
        #expect(try finding(reference() + [feature(-1, 18)]).state == .insufficientData)
    }

    @Test func persistenceSeparatesOneOutlierFromTwoQualifyingDays() throws {
        let single = try finding(reference() + [feature(-3, 18), feature(-2, 15), feature(-1, 15)])
        #expect(single.state == .singleDayChange)
        let sustained = try finding(reference() + [feature(-3, 18), feature(-2, 15), feature(-1, 18)])
        #expect(sustained.state == .sustainedPersonalDeviation)
        #expect(sustained.baseline?.frozenAt == day(-1))
        #expect(sustained.recent.filter(\.qualifies).count == 2)
    }

    @Test func bothStandardizedAndAbsoluteConditionsAreRequired() throws {
        // Huge standardized change from an unusually tight baseline, but below 10% / 1 breath/min.
        let tinyAbsolute = try finding(reference(spread: 0.01) + [feature(-3, 15.5), feature(-2, 15.5)])
        #expect(tinyAbsolute.state == .noSustainedChangeDetected)
        #expect(tinyAbsolute.recent.allSatisfy { ($0.robustZ ?? 0) > 3 && !$0.qualifies })
        // Absolute change exceeds its floor, but is ordinary relative to a variable baseline.
        let ordinaryZ = try finding(reference(spread: 2) + [feature(-3, 17), feature(-2, 17)])
        #expect(ordinaryZ.state == .noSustainedChangeDetected)
        #expect(ordinaryZ.recent.allSatisfy { $0.difference >= 1.5 && !$0.qualifies })
    }

    @Test func zeroVarianceWithholdsStandardizedClaims() throws {
        let result = try finding(reference(spread: 0) + [feature(-3, 25), feature(-2, 25)])
        #expect(result.state == .indeterminate)
        #expect(result.reasons.contains("zeroVarianceNoValidatedNoiseFloor"))
        #expect(result.recent.allSatisfy { $0.robustZ == nil && !$0.qualifies })
        #expect(result.recent.first?.difference == 10)
    }

    @Test func currentDayFutureAndBufferCannotTriggerOrContaminateBaseline() throws {
        let stable = reference() + [feature(-3, 15), feature(-2, 15), feature(-1, 15)]
        let result = try finding(stable + [feature(-4, 1000), feature(0, 1000), feature(1, 1000)])
        #expect(result.state == .noSustainedChangeDetected)
        #expect(result.baseline?.median == 15)
        #expect(result.referenceValidDays == 28)
        #expect(result.recent.count == 3)
        #expect(result.recent.allSatisfy { $0.day < day(0) })
    }

    @Test func sourceTransitionCannotBorrowPriorDeviceBaseline() throws {
        let result = try finding(reference() + [feature(-3, 18, source: "synthetic-watch-B"),
                                               feature(-2, 18, source: "synthetic-watch-B")])
        #expect(result.state == .insufficientData)
        #expect(result.referenceValidDays == 0)
        #expect(result.reasons.contains("sourceSegmentRestarted"))
    }

    @Test func returningToAnOldSourceAlsoRestartsComparableSegment() throws {
        let result = try finding(reference() + [feature(-4, 15, source: "synthetic-watch-B"),
                                               feature(-3, 18), feature(-2, 18)])
        #expect(result.state == .insufficientData)
        #expect(result.referenceValidDays == 0)
    }

    @Test func simultaneousLatestSourcesRequireSelectionInsteadOfAlphabeticalConfidence() throws {
        let result = try finding(reference() + [feature(-2, 18), feature(-1, 18),
                                               feature(-1, 18, source: "synthetic-watch-B")])
        #expect(result.state == .baselineReviewNeeded)
        #expect(result.reasons.contains("ambiguousActiveSourceRequiresSelection"))
    }

    @Test func duplicateDaysAreExcludedRatherThanCountedTwice() throws {
        let base = reference(21)
        let result = try finding(base + [base[0], feature(-3, 18), feature(-2, 18)])
        #expect(result.state == .insufficientData)
        #expect(result.referenceValidDays == 20)
        #expect(result.reasons.contains("ambiguousDuplicateDaysExcluded"))
    }

    @Test func incompatibleUnknownAndWrongUnitDaysCannotSupplyCoverage() throws {
        let invalid = [feature(-12, 15, unit: "breaths/hour"),
                       feature(-11, 15, flags: [.sleepContextUnconfirmed]),
                       feature(-10, 15, flags: [.timeZoneChanged]),
                       feature(-9, 15, quality: .incomplete), feature(-8, nil),
                       feature(-7, .nan), feature(-6, -.infinity)]
        let result = try finding(reference(20) + invalid + [feature(-3, 18), feature(-2, 18)])
        #expect(result.state == .insufficientData)
        #expect(result.referenceValidDays <= 20)
    }

    @Test func sleepTriggersOnlyDecreaseWithMinuteAndRelativeFloors() throws {
        let base = reference(center: 420, spread: 5, metric: .sleepAnalysis)
        let decreasing = try finding(base + [feature(-3, 320, metric: .sleepAnalysis),
                                            feature(-2, 320, metric: .sleepAnalysis)], metric: .sleepAnalysis)
        #expect(decreasing.state == .sustainedPersonalDeviation)
        let increasing = try finding(base + [feature(-3, 600, metric: .sleepAnalysis),
                                            feature(-2, 600, metric: .sleepAnalysis)], metric: .sleepAnalysis)
        #expect(increasing.state == .noSustainedChangeDetected)
    }

    @Test func restingHeartRateRequiresItsFiveBeatAbsoluteFloor() throws {
        let base = reference(center: 40, spread: 0.1, metric: .restingHeartRate)
        let result = try finding(base + [feature(-3, 44.5, metric: .restingHeartRate),
                                        feature(-2, 44.5, metric: .restingHeartRate)], metric: .restingHeartRate)
        #expect(result.state == .noSustainedChangeDetected)
    }

    @Test func oxygenActivityAndWorkoutsRemainContextRegardlessOfExtremes() throws {
        for metric in [HealthMetricKind.oxygenSaturation, .stepCount, .workout] {
            let result = try finding(reference(center: 80, spread: 1, metric: metric) +
                                     [feature(-3, 1, metric: metric), feature(-2, 10000, metric: metric)], metric: metric)
            #expect(result.state == .contextOnly)
            #expect(result.baseline == nil)
            #expect(result.recent.isEmpty)
            #expect(result.reasons.contains("contextOnlyNoAnomalyTrigger"))
        }
    }

    @Test func validFreezeUsesItsOriginalComparisonAndDoesNotRollIntoEpisode() throws {
        let frozen = BaselineSnapshot(metric: .respiratoryRate, sourceID: "synthetic-watch-A", unit: "count/min",
                                      referenceStart: day(-33), referenceEnd: day(-6), validDays: 28,
                                      median: 15, mad: 0.2, frozenAt: day(-3))
        let result = try finding(reference(center: 17, spread: 0.2) + [feature(-3, 18), feature(-2, 18)], previous: [frozen])
        #expect(result.state == .sustainedPersonalDeviation)
        #expect(result.baseline == frozen)
        #expect(result.reasons.contains("baselineFrozenDuringChangeEpisode"))
    }

    @Test func expiredFutureAndWrongVersionFreezesRequireReview() throws {
        for (frozenAt, version) in [(day(-16), PersonalChangeEngine.ruleVersion),
                                  (day(1), PersonalChangeEngine.ruleVersion), (day(-3), "future-rule")] {
            let frozen = BaselineSnapshot(metric: .respiratoryRate, sourceID: "synthetic-watch-A", unit: "count/min",
                                          referenceStart: day(-33), referenceEnd: day(-6), validDays: 28,
                                          median: 15, mad: 0.2, frozenAt: frozenAt, ruleVersion: version)
            let result = try finding(reference() + [feature(-3, 18), feature(-2, 18)], previous: [frozen])
            #expect(result.state == .baselineReviewNeeded)
            #expect(result.reasons.contains("frozenBaselineExpiredOrIncompatible"))
        }
    }

    @Test func quietEpisodeRequiresReviewInsteadOfSilentBaselineRelease() throws {
        let frozen = BaselineSnapshot(metric: .respiratoryRate, sourceID: "synthetic-watch-A", unit: "count/min",
                                      referenceStart: day(-33), referenceEnd: day(-6), validDays: 28,
                                      median: 15, mad: 0.2, frozenAt: day(-3))
        let result = try finding(reference() + [feature(-3, 15), feature(-2, 15)], previous: [frozen])
        #expect(result.state == .baselineReviewNeeded)
        #expect(result.reasons.contains("episodeQuietBaselineReviewRequired"))
    }

    @Test func outputsAreDeterministicVersionedExperimentalAndNotDiseaseScores() throws {
        let input = reference() + [feature(-3, 18), feature(-2, 18)]
        let first = PersonalChangeEngine.evaluate(features: input, asOf: asOf, calendar: calendar)
        let second = PersonalChangeEngine.evaluate(features: Array(input.reversed()), asOf: asOf, calendar: calendar)
        #expect(first == second)
        #expect(first.experimental)
        #expect(first.latestCompletedDay == day(-1))
        #expect(first.findings.count == HealthMetricKind.allCases.count)
        #expect(first.findings.allSatisfy { $0.ruleVersion == PersonalChangeEngine.ruleVersion && !$0.evidenceIDs.isEmpty })
        let decoded = try JSONDecoder().decode(AnalysisRun.self, from: JSONEncoder().encode(first))
        #expect(first == decoded)
    }
}
