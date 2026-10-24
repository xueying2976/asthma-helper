import Foundation

/// Pure text layout for the doctor summary. Produces ordered (style, text) lines following the
/// brief's section order. No UIKit; the platform layer maps `LineStyle` to fonts. Because this is
/// deterministic and Foundation-only, the exact report text is unit-testable, and the PDF renders
/// exactly these lines.
public enum DoctorSummaryLineStyle: String, Sendable { case title, heading, body, caption }

public struct DoctorSummaryLine: Equatable, Sendable {
    public let style: DoctorSummaryLineStyle
    public let text: String
    public init(_ style: DoctorSummaryLineStyle, _ text: String) { self.style = style; self.text = text }
}

public enum DoctorSummaryText {
    private static func f(_ d: Date, _ tz: String) -> String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.timeZone = TimeZone(identifier: tz) ?? .current
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: d)
    }
    private static func num(_ v: Double) -> String { v.formatted(.number.precision(.fractionLength(0...1))) }

    public static func lines(for s: DoctorVisitSummary) -> [DoctorSummaryLine] {
        var out: [DoctorSummaryLine] = []
        func line(_ st: DoctorSummaryLineStyle, _ t: String) { out.append(.init(st, t)) }

        // 1. Title / period / mode
        line(.title, "Asthma Helper — Recent summary for a doctor visit")
        let periodDays = s.range.completedDays
        line(.body, "Period: \(f(s.range.firstInclusiveDay, s.timeZone)) to \(f(s.range.lastInclusiveDay, s.timeZone)) (\(periodDays) completed days, \(s.timeZone))")
        if s.range.includesPartialToday { line(.body, "Today is included as a PARTIAL day, shown separately from completed-day comparisons.") }
        line(.body, "Generated: \(f(s.generatedAt, s.timeZone)) · Data mode: \(s.isDemo ? "DEMO (synthetic)" : "On this iPhone")")
        line(.caption, "Patient-generated observations; not clinically validated.")

        // 2. Reporting coverage
        line(.heading, "Reporting coverage")
        line(.body, "Symptom check-ins: \(s.reportingCoverage.knownSymptomDays) of \(s.reportingCoverage.expectedDays) expected days.")
        for field in s.symptoms where field.unansweredDays > 0 {
            line(.caption, "• \(prettyField(field.field)): \(field.unansweredDays) day(s) unanswered")
        }
        line(.body, "Wearable context missing on up to \(s.reportingCoverage.missingWearableDays) day(s).")

        // 3. Symptom observations
        line(.heading, "Symptom observations (positive days among known days)")
        for field in s.symptoms {
            line(.body, "\(prettyField(field.field)): \(field.positiveDays) positive / \(field.knownDays) known day(s)")
        }
        line(.caption, "Unknown is not a negative. Multiple entries on one day count once. Presence is not an increase.")

        // 4. Medication-use events
        line(.heading, "Logged medication-use events")
        if s.medicationLogs.isEmpty {
            line(.body, "No medication-use events logged in this period.")
        } else {
            for log in s.medicationLogs {
                var row = "\(log.label): \(log.eventCount) event(s) on \(log.loggedDays) day(s)"
                if let total = log.totalAmount, let unit = log.unit { row += " · total \(num(total)) \(unit.rawValue)" }
                line(.body, row)
            }
            line(.caption, "Counts are logged events, not complete use or adherence. Names/identity are as recorded; not reconstructed from inventory.")
        }

        // 5. Peak flow
        line(.heading, "Peak flow (L/min)")
        if s.peakFlow.validReadingCount == 0 {
            line(.body, "No valid peak-flow readings in this period.")
        } else {
            line(.body, "\(s.peakFlow.validReadingCount) valid reading(s); observed range \(num(s.peakFlow.minValue ?? 0))–\(num(s.peakFlow.maxValue ?? 0)) L/min.")
            if let pct = s.peakFlow.percentOfConfirmedBestRange {
                line(.body, "Percent of clinician-confirmed personal best: \(num(pct[0]))–\(num(pct[1]))%.")
            } else {
                line(.caption, "No percent-of-best shown (no clinician-confirmed personal best). No treatment zones assigned.")
            }
        }

        // 6. Wearable context
        line(.heading, "Wearable context")
        if s.wearableContext.isEmpty {
            line(.body, "No wearable context available for this period.")
        } else {
            for w in s.wearableContext {
                var row = "\(prettyMetric(w.metricID)): \(w.usableDays) usable day(s), \(w.missingDays) missing"
                if let lo = w.observedMin, let hi = w.observedMax { row += " · observed \(num(lo))–\(num(hi)) \(w.unit)" }
                line(.body, row)
                if w.incompatibleSources { line(.caption, "• Multiple/incompatible sources; values are not combined.") }
            }
        }

        // 7. Personal changes
        line(.heading, "Personal changes (experimental)")
        if let reason = s.personalChangesOmittedReason { line(.caption, reason) }
        if s.personalChanges.isEmpty {
            line(.body, "No personal-change findings as of the report endpoint.")
        } else {
            for c in s.personalChanges {
                var row = "\(prettyMetric(c.metricID)): \(prettyState(c.state))"
                if let ref0 = c.referenceStart, let ref1 = c.referenceEnd {
                    row += " · reference \(f(ref0, s.timeZone))–\(f(ref1, s.timeZone)) (\(c.referenceValidDays) days)"
                }
                if let diff = c.observedDifference { row += " · observed diff \(num(diff)) \(c.unit)" }
                line(.body, row)
            }
            line(.caption, "Experimental engineering thresholds, not validated asthma rules. Rule \(s.personalChanges.first?.ruleVersion ?? "")")
        }

        // 8. Notes & questions
        line(.heading, "Notes and questions")
        if s.selectedNotes.isEmpty {
            line(.body, "No notes selected for inclusion.")
        } else {
            for n in s.selectedNotes { line(.body, "[\(f(n.date, s.timeZone))] \(n.text)") }
        }
        if s.patientQuestions.isEmpty {
            line(.caption, "No patient questions added.")
        } else {
            for q in s.patientQuestions { line(.body, "Q: \(q)") }
        }

        // 9. Limitations
        line(.heading, "Limitations")
        for lim in s.limitations { line(.body, "• \(lim)") }

        return out
    }

    private static func prettyField(_ f: String) -> String {
        switch f {
        case "cough": "Cough"; case "wheeze": "Wheeze"; case "chestTightness": "Chest tightness"
        case "breathlessness": "Breathlessness"; case "respiratoryNightWaking": "Respiratory night waking"
        case "activityLimitation": "Activity limitation"; default: f
        }
    }
    private static func prettyMetric(_ m: String) -> String {
        switch m {
        case "rr": "Respiratory rate"; case "rhr": "Resting heart rate"; case "sleep": "Sleep"
        case "spo2": "Oxygen saturation"; case "steps": "Steps"; case "workout": "Workouts"; default: m
        }
    }
    private static func prettyState(_ s: String) -> String {
        switch s {
        case "insufficientData": "building your reference"
        case "noSustainedChangeDetected": "no sustained change detected"
        case "singleDayChange": "single-day change"
        case "sustainedPersonalDeviation": "sustained personal change"
        case "baselineReviewNeeded": "reference needs review"
        case "contextOnly": "context only"; case "indeterminate": "comparison indeterminate"
        case "reportedRespiratoryChange": "reported change"; default: s
        }
    }
}
