import AeriDayCore
import Foundation
import Testing

/// Pure report-builder tests. These depend only on AeriDayCore (Foundation-only), so they build and
/// run without the app host's macros. Fixtures are synthetic.
struct DoctorSummaryBuilderTests {
    private func calendar(_ zone: String = "UTC") -> Calendar {
        var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: zone)!; return c
    }
    private func date(_ v: String) -> Date { ISO8601DateFormatter().date(from: v)! }
    private func day(_ v: String) -> Date { ISO8601DateFormatter().date(from: v + "T12:00:00Z")! }

    private func build(_ entries: LocalEntries, range: DoctorSummaryRange = .last7,
                       findings: [ChangeFinding] = [], wearable: [DailyFeature] = [],
                       options: DoctorSummaryOptions = .init(), now: String = "2026-10-24T12:00:00Z",
                       isDemo: Bool = false, zone: String = "UTC") throws -> DoctorVisitSummary {
        try DoctorSummaryBuilder.build(from: entries, findings: findings, wearable: wearable, range: range,
                                       options: options, recordRevision: "rev-test", isDemo: isDemo,
                                       now: date(now), calendar: calendar(zone))
    }

    // MARK: Range validation

    @Test func last7EndsYesterdayWithSevenCompletedDays() throws {
        let s = try build(LocalEntries())
        #expect(s.range.completedDays == 7)
        #expect(s.range.lastInclusiveDay == date("2026-10-23T00:00:00Z"))
        #expect(s.range.firstInclusiveDay == date("2026-10-17T00:00:00Z"))
        #expect(!s.range.includesPartialToday)
    }

    @Test func customRangeRejectsReversedFutureAndOverLimit() {
        #expect(throws: DoctorSummaryError.rangeReversed) {
            _ = try build(LocalEntries(), range: .init(kind: .custom, customStart: day("2026-10-20"),
                                                       customEnd: day("2026-10-10")))
        }
        #expect(throws: DoctorSummaryError.rangeInFuture) {
            _ = try build(LocalEntries(), range: .init(kind: .custom, customStart: day("2026-10-20"),
                                                       customEnd: day("2026-10-24"))) // today/future
        }
        #expect(throws: DoctorSummaryError.rangeTooLong(maxDays: 90)) {
            _ = try build(LocalEntries(), range: .init(kind: .custom, customStart: day("2026-06-01"),
                                                       customEnd: day("2026-10-23")))
        }
    }

    @Test func dstRangeUsesCalendarDaysNotFixedHours() throws {
        // US spring-forward 2026-03-08. last7 ending yesterday around then.
        let s = try build(LocalEntries(), now: "2026-03-10T16:00:00Z", zone: "America/New_York")
        #expect(s.range.completedDays == 7)
        #expect(s.timeZone == "America/New_York")
    }

    // MARK: Symptom honesty invariants

    @Test func positiveDaysNeverExceedKnownNeverExceedExpected() throws {
        var e = LocalEntries()
        e.symptomCheckIns = [
            SymptomCheckIn(date: day("2026-10-20"), cough: .mild),
            SymptomCheckIn(date: day("2026-10-20"), cough: .none),   // same day, counts once
            SymptomCheckIn(date: day("2026-10-21"), cough: .unknown) // unknown is not a negative
        ]
        let s = try build(e)
        let cough = try #require(s.symptoms.first { $0.field == "cough" })
        #expect(cough.positiveDays <= cough.knownDays)
        #expect(cough.knownDays <= s.reportingCoverage.expectedDays)
        #expect(cough.knownDays == 1 && cough.positiveDays == 1) // day 21 unknown not counted known
    }

    @Test func positiveAnswerWinsOverNegativeSameDayAndUnknownIsNotNo() throws {
        var e = LocalEntries()
        e.symptomCheckIns = [
            SymptomCheckIn(date: day("2026-10-19"), respiratoryNightWaking: .no),
            SymptomCheckIn(date: day("2026-10-19"), respiratoryNightWaking: .yes),
            SymptomCheckIn(date: day("2026-10-18"), respiratoryNightWaking: .unknown)
        ]
        let s = try build(e)
        let waking = try #require(s.symptoms.first { $0.field == "respiratoryNightWaking" })
        #expect(waking.knownDays == 1 && waking.positiveDays == 1)
    }

    @Test func permutationInvariance() throws {
        var e = LocalEntries()
        let base = [
            SymptomCheckIn(date: day("2026-10-20"), cough: .mild),
            SymptomCheckIn(date: day("2026-10-21"), wheeze: .severe),
            SymptomCheckIn(date: day("2026-10-22"), breathlessness: .moderate)
        ]
        e.symptomCheckIns = base
        let a = try build(e)
        e.symptomCheckIns = base.reversed()
        let b = try build(e)
        #expect(a.symptoms == b.symptoms)
    }

    @Test func duplicateRecordIdDoesNotInflateCounts() throws {
        var e = LocalEntries()
        let id = UUID()
        let one = SymptomCheckIn(id: id, date: day("2026-10-20"), cough: .mild)
        e.symptomCheckIns = [one, one] // same id twice
        let s = try build(e)
        let cough = try #require(s.symptoms.first { $0.field == "cough" })
        #expect(cough.knownDays == 1 && cough.positiveDays == 1)
    }

    // MARK: Medication grouping

    @Test func medicationGroupsByExactNameAndKeepsUnknownUnknown() throws {
        var e = LocalEntries()
        e.medicationUseEvents = [
            MedicationUseEvent(date: day("2026-10-20"), medicationName: "Synthetic Reliever", amount: 2, unit: .puff),
            MedicationUseEvent(date: day("2026-10-20"), medicationName: "Synthetic Reliever", amount: 1, unit: .puff),
            MedicationUseEvent(date: day("2026-10-21"), medicationName: "Synthetic Reliever", amount: 2, unit: .puff)
        ]
        let s = try build(e)
        let log = try #require(s.medicationLogs.first { $0.medicationName == "Synthetic Reliever" })
        #expect(log.eventCount == 3 && log.loggedDays == 2)
        #expect(log.totalAmount == 5 && log.unit == .puff)
        #expect(log.regimen == .unknown && log.purpose == .unknown)
    }

    @Test func mixedUnitsSuppressTotalAmount() throws {
        var e = LocalEntries()
        e.medicationUseEvents = [
            MedicationUseEvent(date: day("2026-10-20"), medicationName: "Synthetic Mix", amount: 2, unit: .puff),
            MedicationUseEvent(date: day("2026-10-21"), medicationName: "Synthetic Mix", amount: 1, unit: .tablet)
        ]
        let s = try build(e)
        let log = try #require(s.medicationLogs.first { $0.medicationName == "Synthetic Mix" })
        #expect(log.totalAmount == nil && log.unit == nil && log.eventCount == 2)
    }

    // MARK: Peak flow

    @Test func peakFlowRangeAndNoPercentWithoutConfirmedBest() throws {
        var e = LocalEntries()
        e.peakFlowEntries = [
            PeakFlowEntry(date: day("2026-10-20"), value: 420),
            PeakFlowEntry(date: day("2026-10-21"), value: 380),
            PeakFlowEntry(date: day("2026-10-22"), value: 450, personalBest: 500, personalBestConfirmedByClinician: false)
        ]
        let s = try build(e)
        #expect(s.peakFlow.validReadingCount == 3)
        #expect(s.peakFlow.minValue == 380 && s.peakFlow.maxValue == 450)
        #expect(s.peakFlow.percentOfConfirmedBestRange == nil)
    }

    @Test func peakFlowPercentOnlyFromConfirmedBest() throws {
        var e = LocalEntries()
        e.peakFlowEntries = [
            PeakFlowEntry(date: day("2026-10-20"), value: 400, personalBest: 500, personalBestConfirmedByClinician: true)
        ]
        let s = try build(e)
        #expect(s.peakFlow.percentOfConfirmedBestRange == [80, 80])
    }

    // MARK: Future isolation + notes + empty

    @Test func futureRecordsCannotChangeAPastSummary() throws {
        var e = LocalEntries()
        e.symptomCheckIns = [SymptomCheckIn(date: day("2026-10-20"), cough: .mild)]
        let a = try build(e)
        e.symptomCheckIns.append(SymptomCheckIn(date: day("2026-10-26"), cough: .severe)) // after window
        let b = try build(e)
        #expect(a.symptoms == b.symptoms)
    }

    @Test func notesExcludedUnlessSelected() throws {
        var e = LocalEntries()
        let n = JournalEntry(date: day("2026-10-20"), text: "Synthetic note")
        e.notes = [n]
        #expect(try build(e).selectedNotes.isEmpty)
        let withNote = try build(e, options: .init(selectedNoteIDs: [n.id]))
        #expect(withNote.selectedNotes.count == 1 && withNote.selectedNotes.first?.text == "Synthetic note")
    }

    @Test func emptyDatasetYieldsHonestEmptyReport() throws {
        let s = try build(LocalEntries())
        #expect(s.symptoms.allSatisfy { $0.knownDays == 0 && $0.positiveDays == 0 })
        #expect(s.medicationLogs.isEmpty && s.peakFlow.validReadingCount == 0)
        #expect(s.reportingCoverage.knownSymptomDays == 0)
        #expect(!s.limitations.isEmpty)
    }

    @Test func demoAddsSyntheticDataLimitation() throws {
        let s = try build(LocalEntries(), isDemo: true)
        #expect(s.isDemo)
        #expect(s.limitations.first?.hasPrefix("DEMO") == true)
    }

    // MARK: Additional required cases

    @Test func customRangeMidnightBoundaryIsHalfOpen() throws {
        let s = try build(LocalEntries(), range: .init(kind: .custom, customStart: day("2026-10-10"),
                                                       customEnd: day("2026-10-23")))
        #expect(s.range.completedDays == 14)
        #expect(s.range.endExclusive == date("2026-10-24T00:00:00Z"))
    }

    @Test func allUnknownSymptomsAreNotNegatives() throws {
        var e = LocalEntries()
        e.symptomCheckIns = [SymptomCheckIn(date: day("2026-10-20")), SymptomCheckIn(date: day("2026-10-21"))]
        let s = try build(e)
        #expect(s.symptoms.allSatisfy { $0.knownDays == 0 && $0.positiveDays == 0 })
        #expect(s.reportingCoverage.knownSymptomDays == 2)
    }

    @Test func mixedAnswersOnOneDayAcrossFields() throws {
        var e = LocalEntries()
        e.symptomCheckIns = [SymptomCheckIn(date: day("2026-10-20"), cough: .mild, wheeze: SymptomSeverity.none,
                                            breathlessness: .unknown)]
        let s = try build(e)
        #expect(s.symptoms.first { $0.field == "cough" }?.positiveDays == 1)
        let wheeze = try #require(s.symptoms.first { $0.field == "wheeze" })
        #expect(wheeze.knownDays == 1 && wheeze.positiveDays == 0)
        #expect(s.symptoms.first { $0.field == "breathlessness" }?.knownDays == 0)
    }

    @Test func multipleMedicinesFormDistinctGroups() throws {
        var e = LocalEntries()
        e.medicationUseEvents = [
            MedicationUseEvent(date: day("2026-10-20"), medicationName: "Synthetic A", amount: 1, unit: .puff),
            MedicationUseEvent(date: day("2026-10-21"), medicationName: "Synthetic B", amount: 1, unit: .tablet)
        ]
        #expect(try build(e).medicationLogs.count == 2)
    }

    @Test func wearableIncompatibleSourcesAreFlaggedNotCombined() throws {
        let wf = [
            DailyFeature(metric: .respiratoryRate, day: day("2026-10-20"), sourceID: "WatchA", value: 16, unit: "count/min", sampleCount: 1),
            DailyFeature(metric: .respiratoryRate, day: day("2026-10-21"), sourceID: "WatchB", value: 18, unit: "count/min", sampleCount: 1)
        ]
        let s = try build(LocalEntries(), wearable: wf)
        let rr = try #require(s.wearableContext.first { $0.metricID == "rr" })
        #expect(rr.incompatibleSources && rr.sources.count == 2)
    }

    @Test func personalChangeAfterReportEndpointIsOmittedWithReason() throws {
        let finding = ChangeFinding(metric: .respiratoryRate, sourceID: "WatchA", state: .singleDayChange,
            baseline: nil,
            recent: [ChangeDayComparison(day: day("2026-10-30"), value: 20, difference: 4, robustZ: 3, qualifies: true)],
            referenceValidDays: 21, recentValidDays: 2, referenceExpectedDays: 28, recentExpectedDays: 3,
            reasons: [], explanationID: "x", evidenceIDs: [], ruleVersion: "test")
        let s = try build(LocalEntries(),
                          range: .init(kind: .custom, customStart: day("2026-10-10"), customEnd: day("2026-10-20")),
                          findings: [finding])
        #expect(s.personalChanges.isEmpty)
        #expect(s.personalChangesOmittedReason != nil)
    }
}
