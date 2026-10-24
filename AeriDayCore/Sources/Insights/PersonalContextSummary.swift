import Foundation

public struct SymptomReportingCoverage: Codable, Equatable, Sendable {
    public let field: String
    public let knownDays: Int
    public let positiveDays: Int
}
public struct MedicationLoggingCount: Codable, Equatable, Sendable {
    public let regimen: MedicationRegimen
    public let purpose: MedicationUsePurpose
    public let eventCount: Int
    public let loggedDays: Int
}
public struct PersonalContextWindow: Codable, Equatable, Sendable {
    public let start: Date
    public let endExclusive: Date
    public let expectedDays: Int
    public let reportingDays: Int
    public let checkInCount: Int
    public let symptoms: [SymptomReportingCoverage]
    public let medicationLogs: [MedicationLoggingCount]
    public let peakFlowEntryCount: Int
}
public struct PersonalContextSummary: Codable, Equatable, Sendable {
    public let current7: PersonalContextWindow
    public let prior7: PersonalContextWindow
    public let reportedSymptomsPresent: Bool
    public let changeAssessment: String
    public let summary: String
    public let limitations: [String]

    /// Two non-overlapping, completed-day windows. Today remains available as a separate
    /// observation and never quietly counts as a full reporting day.
    public static func resolve(records: LocalEntries, now: Date, calendar: Calendar = .current) -> PersonalContextSummary {
        let today = calendar.startOfDay(for: now)
        let start = calendar.date(byAdding: .day, value: -7, to: today)!
        let priorStart = calendar.date(byAdding: .day, value: -14, to: today)!
        let current = window(records, start: start, end: today, calendar: calendar)
        let prior = window(records, start: priorStart, end: start, calendar: calendar)
        let todayCheckIns = records.symptomCheckIns.filter { $0.date >= today && $0.date <= now }
        let todayPositive = todayCheckIns.contains { entry in
            [entry.cough, entry.wheeze, entry.chestTightness, entry.breathlessness].contains(where: positive)
                || entry.respiratoryNightWaking == .yes || entry.activityLimitation == .yes
        }
        let present = current.symptoms.contains { $0.positiveDays > 0 } || todayPositive
        let text = "Check-ins cover \(current.reportingDays) of the latest 7 completed days and \(prior.reportingDays) of the preceding 7. "
            + (present ? "Respiratory symptoms or effects were reported recently; these remain relevant even without wearable changes. " : "Missing check-ins do not mean no symptoms. ")
            + "Medication counts describe logged events, not complete use or adherence."
        return PersonalContextSummary(current7: current, prior7: prior, reportedSymptomsPresent: present,
                                      changeAssessment: "notEstablished", summary: text,
                                      limitations: ["Presence of reported symptoms is not evidence that they increased.",
                                                    "Day counts can contain partial answers; review coverage for each symptom.",
                                                    "Logged medication events do not establish complete use, zero use on unlogged days, or adherence.",
                                                    "No percentages or clinical treatment conclusions are generated.",
                                                    "Today's observations remain relevant but are excluded from completed-day comparison counts."])
    }

    private static func positive(_ value: SymptomSeverity) -> Bool {
        [.mild, .moderate, .severe].contains(value)
    }
    private static func window(_ records: LocalEntries, start: Date, end: Date, calendar: Calendar) -> PersonalContextWindow {
        let entries = records.symptomCheckIns.filter { $0.date >= start && $0.date < end }
        let grouped = Dictionary(grouping: entries, by: { calendar.startOfDay(for: $0.date) })
        let severities: [(String, KeyPath<SymptomCheckIn, SymptomSeverity>)] = [
            ("cough", \.cough), ("wheeze", \.wheeze), ("chestTightness", \.chestTightness), ("breathlessness", \.breathlessness)
        ]
        var coverage = severities.map { name, key in
            SymptomReportingCoverage(field: name,
                                     knownDays: grouped.values.filter { $0.contains { $0[keyPath: key] != .unknown } }.count,
                                     positiveDays: grouped.values.filter { $0.contains { positive($0[keyPath: key]) } }.count)
        }
        let answers: [(String, KeyPath<SymptomCheckIn, ReportedAnswer>)] = [
            ("respiratoryNightWaking", \.respiratoryNightWaking), ("activityLimitation", \.activityLimitation)
        ]
        coverage += answers.map { name, key in
            SymptomReportingCoverage(field: name,
                                     knownDays: grouped.values.filter { $0.contains { $0[keyPath: key] != .unknown } }.count,
                                     positiveDays: grouped.values.filter { $0.contains { $0[keyPath: key] == .yes } }.count)
        }
        let events = records.medicationUseEvents.filter { $0.date >= start && $0.date < end }
        let medication = MedicationRegimen.allCases.flatMap { regimen in
            MedicationUsePurpose.allCases.compactMap { purpose -> MedicationLoggingCount? in
                let matching = events.filter { $0.regimen == regimen && $0.purpose == purpose }
                guard !matching.isEmpty else { return nil }
                return MedicationLoggingCount(regimen: regimen, purpose: purpose, eventCount: matching.count,
                                              loggedDays: Set(matching.map { calendar.startOfDay(for: $0.date) }).count)
            }
        }
        return PersonalContextWindow(start: start, endExclusive: end, expectedDays: 7, reportingDays: grouped.count,
                                     checkInCount: entries.count, symptoms: coverage, medicationLogs: medication,
                                     peakFlowEntryCount: records.peakFlowEntries.filter { $0.date >= start && $0.date < end }.count)
    }
}
