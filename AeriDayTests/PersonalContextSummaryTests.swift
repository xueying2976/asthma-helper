import AeriDayCore
import Foundation
import Testing

struct PersonalContextSummaryTests {
    private func calendar(_ zone: String = "UTC") -> Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(identifier: zone)!
        return value
    }
    private func date(_ value: String) -> Date { ISO8601DateFormatter().date(from: value)! }

    @Test func unknownAnswersAreNotExplicitAbsenceOrCoverage() throws {
        let now = date("2026-10-18T12:00:00Z")
        var entries = LocalEntries()
        entries.symptomCheckIns = [SymptomCheckIn(date: date("2026-10-17T12:00:00Z")),
                                  SymptomCheckIn(date: date("2026-10-16T12:00:00Z"), cough: .none)]
        let result = PersonalContextSummary.resolve(records: entries, now: now, calendar: calendar())
        let cough = try #require(result.current7.symptoms.first { $0.field == "cough" })
        let wheeze = try #require(result.current7.symptoms.first { $0.field == "wheeze" })
        #expect(result.current7.reportingDays == 2)
        #expect(cough.knownDays == 1 && cough.positiveDays == 0)
        #expect(wheeze.knownDays == 0 && wheeze.positiveDays == 0)
        #expect(!result.reportedSymptomsPresent)
        #expect(result.changeAssessment == "notEstablished")
    }

    @Test func leapDayWindowsAreHalfOpenAndDoNotDoubleCount() {
        var entries = LocalEntries()
        entries.symptomCheckIns = [
            SymptomCheckIn(date: date("2024-02-23T00:00:00Z"), cough: .mild),
            SymptomCheckIn(date: date("2024-03-01T00:00:00Z"), cough: .none),
            SymptomCheckIn(date: date("2024-02-29T12:00:00Z"), cough: .mild)
        ]
        let result = PersonalContextSummary.resolve(records: entries, now: date("2024-03-08T12:00:00Z"), calendar: calendar())
        #expect(result.current7.start == date("2024-03-01T00:00:00Z"))
        #expect(result.prior7.start == date("2024-02-23T00:00:00Z"))
        #expect(result.current7.checkInCount == 1)
        #expect(result.prior7.checkInCount == 2)
        #expect(!result.reportedSymptomsPresent)
    }

    @Test func daylightSavingUsesCalendarDaysRatherThanFixedHours() {
        let result = PersonalContextSummary.resolve(records: LocalEntries(), now: date("2026-03-10T16:00:00Z"),
                                                    calendar: calendar("America/New_York"))
        #expect(result.current7.start == date("2026-03-03T05:00:00Z"))
        #expect(result.current7.endExclusive == date("2026-03-10T04:00:00Z"))
        #expect(result.current7.endExclusive.timeIntervalSince(result.current7.start) == 167 * 3600)
        #expect(result.current7.expectedDays == 7)
    }

    @Test func todaysSymptomsRemainVisibleWithoutInflatingCompletedCoverage() {
        var entries = LocalEntries()
        let now = date("2026-10-18T12:00:00Z")
        entries.symptomCheckIns = [SymptomCheckIn(date: date("2026-10-18T11:00:00Z"), breathlessness: .mild),
                                  SymptomCheckIn(date: date("2026-10-19T11:00:00Z"), cough: .severe)]
        let result = PersonalContextSummary.resolve(records: entries, now: now, calendar: calendar())
        #expect(result.reportedSymptomsPresent)
        #expect(result.current7.reportingDays == 0 && result.current7.checkInCount == 0)
        #expect(result.changeAssessment == "notEstablished")
        entries.symptomCheckIns.removeFirst()
        #expect(!PersonalContextSummary.resolve(records: entries, now: now, calendar: calendar()).reportedSymptomsPresent)
    }

    @Test func unknownRegimenStaysUnknownAndEventsDoNotBecomeDosesOrAdherence() throws {
        var entries = LocalEntries()
        let now = date("2026-10-18T12:00:00Z")
        entries.medicationUseEvents = [
            MedicationUseEvent(date: date("2026-10-17T12:00:00Z"), medicationName: "Synthetic A", amount: 2, unit: .puff),
            MedicationUseEvent(date: date("2026-10-17T18:00:00Z"), medicationName: "Synthetic A", amount: 4, unit: .puff),
            MedicationUseEvent(date: date("2026-10-10T12:00:00Z"), medicationName: "Synthetic B", purpose: .relief,
                               regimen: .saba, amount: 1, unit: .puff)
        ]
        let result = PersonalContextSummary.resolve(records: entries, now: now, calendar: calendar())
        let log = try #require(result.current7.medicationLogs.first)
        #expect(log.regimen == .unknown && log.purpose == .unknown)
        #expect(log.eventCount == 2 && log.loggedDays == 1)
        #expect(result.prior7.medicationLogs.first?.regimen == .saba)
        #expect(result.current7.reportingDays == 0)
        #expect(result.changeAssessment == "notEstablished")
    }

    @Test func multipleCheckInsPerDayCountCoverageOnceWithoutErasingPositiveReport() throws {
        var entries = LocalEntries()
        entries.symptomCheckIns = [SymptomCheckIn(date: date("2026-10-17T08:00:00Z"), cough: .mild),
                                  SymptomCheckIn(date: date("2026-10-17T20:00:00Z"), cough: .none)]
        let result = PersonalContextSummary.resolve(records: entries, now: date("2026-10-18T12:00:00Z"), calendar: calendar())
        let cough = try #require(result.current7.symptoms.first { $0.field == "cough" })
        #expect(result.current7.checkInCount == 2 && result.current7.reportingDays == 1)
        #expect(cough.knownDays == 1 && cough.positiveDays == 1)
        #expect(result.reportedSymptomsPresent)
    }
}
