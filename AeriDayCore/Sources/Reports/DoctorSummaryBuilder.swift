import Foundation

/// Pure, deterministic builder for the recent doctor summary. Takes an injected clock/calendar so
/// it is unit-testable and permutation-invariant. No platform frameworks, no I/O, no randomness.
///
/// Honesty rules enforced here:
/// - positiveDays <= knownDays <= expectedDays for every symptom field.
/// - A positive answer wins over negative for daily presence; unknown never becomes no.
/// - Multiple entries on one day count once per field.
/// - Medication names/adherence are never reconstructed from inventory.
/// - Peak-flow percent-of-best is produced only from a clinician-confirmed best.
/// - Personal-change findings are reused as-of the report endpoint; future data cannot enter.
public enum DoctorSummaryBuilder {
    public static let maxCustomDays = 90

    // MARK: Range resolution

    /// Resolve a requested range into completed local calendar days, DST-safe.
    /// Default window ends yesterday (last completed day). `includeToday` adds a partial today that
    /// is reported separately and never counted as a completed day.
    public static func resolveRange(_ range: DoctorSummaryRange, now: Date,
                                    calendar: Calendar) throws -> ResolvedReportRange {
        let today = calendar.startOfDay(for: now)
        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: today) else { throw DoctorSummaryError.invalidRange }

        let lastCompletedDay: Date
        let firstCompletedDay: Date

        switch range.kind {
        case .last7, .last30:
            let span = range.kind == .last7 ? 7 : 30
            lastCompletedDay = yesterday
            guard let first = calendar.date(byAdding: .day, value: -(span - 1), to: yesterday) else {
                throw DoctorSummaryError.invalidRange
            }
            firstCompletedDay = first
        case .custom:
            guard let s = range.customStart, let e = range.customEnd else { throw DoctorSummaryError.invalidRange }
            let startDay = calendar.startOfDay(for: s)
            let endDay = calendar.startOfDay(for: e)
            if endDay < startDay { throw DoctorSummaryError.rangeReversed }
            // A custom end cannot be in the future relative to the last completed day.
            if endDay > yesterday { throw DoctorSummaryError.rangeInFuture }
            let days = calendar.dateComponents([.day], from: startDay, to: endDay).day.map { $0 + 1 } ?? 0
            if days < 1 { throw DoctorSummaryError.invalidRange }
            if days > maxCustomDays { throw DoctorSummaryError.rangeTooLong(maxDays: maxCustomDays) }
            firstCompletedDay = startDay
            lastCompletedDay = endDay
        }

        guard let endExclusive = calendar.date(byAdding: .day, value: 1, to: lastCompletedDay) else {
            throw DoctorSummaryError.invalidRange
        }
        let completedDays = (calendar.dateComponents([.day], from: firstCompletedDay, to: lastCompletedDay).day ?? 0) + 1
        return ResolvedReportRange(start: firstCompletedDay, endExclusive: endExclusive,
                                   completedDays: completedDays,
                                   includesPartialToday: range.includeToday,
                                   timeZoneIdentifier: calendar.timeZone.identifier,
                                   firstInclusiveDay: firstCompletedDay, lastInclusiveDay: lastCompletedDay)
    }

    // MARK: Build

    public static func build(from entries: LocalEntries, findings: [ChangeFinding],
                             wearable: [DailyFeature], range: DoctorSummaryRange,
                             options: DoctorSummaryOptions, recordRevision: String, isDemo: Bool,
                             now: Date, calendar: Calendar) throws -> DoctorVisitSummary {
        let resolved = try resolveRange(range, now: now, calendar: calendar)
        let start = resolved.start
        let endExclusive = resolved.endExclusive
        func inWindow(_ d: Date) -> Bool { d >= start && d < endExclusive }

        // ---- Symptoms (completed days only) ----
        let checkIns = entries.symptomCheckIns.filter { inWindow($0.date) }
        let byDay = Dictionary(grouping: checkIns, by: { calendar.startOfDay(for: $0.date) })
        let severityFields: [(String, KeyPath<SymptomCheckIn, SymptomSeverity>)] = [
            ("cough", \.cough), ("wheeze", \.wheeze), ("chestTightness", \.chestTightness),
            ("breathlessness", \.breathlessness)
        ]
        let answerFields: [(String, KeyPath<SymptomCheckIn, ReportedAnswer>)] = [
            ("respiratoryNightWaking", \.respiratoryNightWaking), ("activityLimitation", \.activityLimitation)
        ]
        var symptoms: [SymptomFieldSummary] = severityFields.map { name, key in
            let known = byDay.values.filter { day in day.contains { $0[keyPath: key] != .unknown } }.count
            let positive = byDay.values.filter { day in day.contains { [.mild, .moderate, .severe].contains($0[keyPath: key]) } }.count
            return SymptomFieldSummary(field: name, knownDays: known, positiveDays: positive,
                                       unansweredDays: max(0, resolved.completedDays - known))
        }
        symptoms += answerFields.map { name, key in
            let known = byDay.values.filter { day in day.contains { $0[keyPath: key] != .unknown } }.count
            let positive = byDay.values.filter { day in day.contains { $0[keyPath: key] == .yes } }.count
            return SymptomFieldSummary(field: name, knownDays: known, positiveDays: positive,
                                       unansweredDays: max(0, resolved.completedDays - known))
        }

        // ---- Medication-use events, grouped by exact name when identifiable ----
        let events = entries.medicationUseEvents.filter { inWindow($0.date) }
        let grouped = Dictionary(grouping: events) { (e: MedicationUseEvent) -> String in
            let trimmed = e.medicationName.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? "regimen:\(e.regimen.rawValue)/purpose:\(e.purpose.rawValue)" : "name:\(trimmed)"
        }
        let medicationLogs: [MedicationUseSummary] = grouped
            .sorted { $0.key < $1.key }
            .map { _, group in
                let identifiableName: String? = {
                    let n = group.first?.medicationName.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    return n.isEmpty ? nil : n
                }()
                let units = Set(group.map(\.unit))
                let allFinite = group.allSatisfy { $0.amount.isFinite }
                let total: Double? = (units.count == 1 && allFinite) ? group.reduce(0) { $0 + $1.amount } : nil
                let days = Set(group.map { calendar.startOfDay(for: $0.date) }).count
                let label = identifiableName ?? "\(group.first?.regimen.rawValue ?? "unknown")/\(group.first?.purpose.rawValue ?? "unknown")"
                return MedicationUseSummary(label: label, medicationName: identifiableName,
                                            regimen: group.first?.regimen ?? .unknown,
                                            purpose: group.first?.purpose ?? .unknown,
                                            eventCount: group.count, loggedDays: days,
                                            totalAmount: total, unit: units.count == 1 ? units.first : nil)
            }

        // ---- Peak flow (L/min) ----
        let peaks = entries.peakFlowEntries.filter { inWindow($0.date) && $0.value.isFinite && $0.value > 0 }
        let peakValues = peaks.map(\.value)
        let confirmedPercents = peaks.compactMap { $0.percentOfConfirmedPersonalBest }.filter { $0.isFinite }
        let peakFlow = PeakFlowSummary(validReadingCount: peaks.count,
                                       minValue: peakValues.min(), maxValue: peakValues.max(),
                                       unit: .litresPerMinute,
                                       percentOfConfirmedBestRange: confirmedPercents.isEmpty ? nil
                                           : [confirmedPercents.min()!, confirmedPercents.max()!])

        // ---- Wearable context (never fabricate daily values; never combine incompatible sources) ----
        let wearableInWindow = wearable.filter { $0.day >= start && $0.day < endExclusive }
        let metricIDs = ["rr", "rhr", "sleep", "spo2", "steps", "workout"]
        let wearableContext: [WearableMetricSummary] = metricIDs.compactMap { id in
            let rows = wearableInWindow.filter { metricKey($0.metric) == id }
            guard !rows.isEmpty else { return nil }
            let sources = Set(rows.map(\.sourceID))
            let units = Set(rows.map(\.unit))
            let usable = rows.filter { $0.quality == .usable && ($0.value?.isFinite ?? false) }
            let usableDays = Set(usable.map { calendar.startOfDay(for: $0.day) }).count
            let values = usable.compactMap(\.value)
            return WearableMetricSummary(metricID: id, unit: units.count == 1 ? (units.first ?? "") : "mixed",
                                         usableDays: usableDays,
                                         missingDays: max(0, resolved.completedDays - usableDays),
                                         sources: sources.sorted(),
                                         observedMin: values.min(), observedMax: values.max(),
                                         incompatibleSources: units.count > 1 || sources.count > 1)
        }

        // ---- Personal changes: reuse engine findings as of endpoint; exclude future data ----
        // Each finding's own analysis/reference windows are shown even if they differ from the
        // report period. A finding whose recent window extends past the report endpoint is omitted
        // to avoid attaching current findings to a past report.
        let endpoint = resolved.lastInclusiveDay
        var personalChanges: [PersonalChangeSummary] = []
        var omittedReason: String? = nil
        for f in findings {
            let latestRecentDay = f.recent.map(\.day).max()
            if let latestRecentDay, calendar.startOfDay(for: latestRecentDay) > endpoint {
                omittedReason = "Some change findings analyze days after the report endpoint and were omitted to avoid attaching current analysis to a past period."
                continue
            }
            let last = f.recent.last
            personalChanges.append(PersonalChangeSummary(
                metricID: metricKey(f.metric), state: f.state.rawValue,
                referenceStart: f.baseline?.referenceStart, referenceEnd: f.baseline?.referenceEnd,
                referenceValidDays: f.referenceValidDays, recentValidDays: f.recentValidDays,
                observedDifference: last?.difference, unit: f.baseline?.unit ?? metricUnit(f.metric),
                ruleVersion: f.ruleVersion))
        }

        // ---- Notes (excluded unless explicitly selected) ----
        let selectedSet = Set(options.selectedNoteIDs)
        let selectedNotes: [SelectedNote] = entries.notes
            .filter { selectedSet.contains($0.id) && inWindow($0.date) }
            .sorted { $0.date < $1.date }
            .map { SelectedNote(id: $0.id, date: $0.date, text: $0.text) }

        let knownSymptomDays = Set(byDay.keys).count
        let missingWearableDays = wearableContext.map(\.missingDays).max() ?? resolved.completedDays
        let coverage = ReportingCoverage(expectedDays: resolved.completedDays,
                                         knownSymptomDays: knownSymptomDays,
                                         missingWearableDays: missingWearableDays)

        return DoctorVisitSummary(
            schemaVersion: DoctorVisitSummary.currentSchemaVersion,
            generatedAt: now, range: resolved, timeZone: resolved.timeZoneIdentifier, isDemo: isDemo,
            recordRevision: recordRevision, reportingCoverage: coverage, symptoms: symptoms,
            medicationLogs: medicationLogs, peakFlow: peakFlow, wearableContext: wearableContext,
            personalChanges: personalChanges, personalChangesOmittedReason: omittedReason,
            selectedNotes: selectedNotes, patientQuestions: options.patientQuestions,
            limitations: standardLimitations(isDemo: isDemo))
    }

    // MARK: Helpers

    static func metricKey(_ kind: HealthMetricKind) -> String {
        switch kind {
        case .respiratoryRate: "rr"; case .restingHeartRate: "rhr"; case .sleepAnalysis: "sleep"
        case .oxygenSaturation: "spo2"; case .stepCount: "steps"; case .workout: "workout"
        }
    }
    static func metricUnit(_ kind: HealthMetricKind) -> String {
        switch kind {
        case .respiratoryRate, .restingHeartRate: "count/min"; case .sleepAnalysis, .workout: "min"
        case .oxygenSaturation: "%"; case .stepCount: "count"
        }
    }
    static func standardLimitations(isDemo: Bool) -> [String] {
        var items = [
            "Patient-generated observations; not clinically validated.",
            "Self-reporting may be incomplete; unanswered days are not negatives.",
            "Comparisons are observational against your own history, not a diagnosis, prediction or treatment advice.",
            "Device and data availability vary and are not independently verified.",
            "Personal-change rules are experimental engineering thresholds, not validated asthma cutoffs."
        ]
        if isDemo { items.insert("DEMO: all values are synthetic test data, not a real health record.", at: 0) }
        return items
    }
}
