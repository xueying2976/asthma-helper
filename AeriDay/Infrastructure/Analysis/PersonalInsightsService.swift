import AeriDayCore
import Foundation
import CryptoKit

/// Analysis artifacts use the same protected, backup-excluded namespace as local entries.
@MainActor
final class PersonalInsightsService {
    private struct Archive: Codable {
        var schemaVersion = 1
        var enabled = true
        var runs: [AnalysisRun] = []
        var preferredSources: [String: String] = [:]
        var referenceDigests: [String: String] = [:]
        var clearedMetrics: [String] = []
        init() {}
        enum CodingKeys: String, CodingKey { case schemaVersion, enabled, runs, preferredSources, referenceDigests, clearedMetrics }
        init(from decoder: any Decoder) throws {
            let values = try decoder.container(keyedBy: CodingKeys.self)
            schemaVersion = try values.decode(Int.self, forKey: .schemaVersion)
            enabled = try values.decode(Bool.self, forKey: .enabled)
            runs = try values.decode([AnalysisRun].self, forKey: .runs)
            preferredSources = try values.decodeIfPresent([String:String].self, forKey: .preferredSources) ?? [:]
            referenceDigests = try values.decodeIfPresent([String:String].self, forKey: .referenceDigests) ?? [:]
            clearedMetrics = try values.decodeIfPresent([String].self, forKey: .clearedMetrics) ?? []
        }
    }
    private var archive = Archive()
    private var file: URL?
    private(set) var available = true
    private let isDemo: Bool
    private let calendar: Calendar
    private var cachedHistory: HealthHistorySnapshot?
    private var generation = 0

    init(isDemo: Bool, arguments: [String] = ProcessInfo.processInfo.arguments, calendar: Calendar = .current, baseDirectory: URL? = nil) {
        self.isDemo = isDemo
        self.calendar = calendar
        let testing = arguments.contains { $0.hasPrefix("-uiTest") } || isDemo
            || ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
        do {
            let base = testing ? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                .appendingPathComponent(isDemo ? "AeriDayDemo" : "AeriDayUITests", isDirectory: true) : nil
            let directory = try LocalStorageDirectoryPolicy.prepareDirectory(in: baseDirectory ?? base)
            file = directory.appendingPathComponent("personal-insights-v1.json")
            if testing && arguments.contains("-uiTestReset"), let file, FileManager.default.fileExists(atPath: file.path) {
                try FileManager.default.removeItem(at: file)
            }
            if let file, FileManager.default.fileExists(atPath: file.path) {
                archive = try JSONDecoder().decode(Archive.self, from: Data(contentsOf: file))
                guard archive.schemaVersion == 1 else { available = false; return }
            }
        } catch { file = nil; available = false }
    }

    var enabled: Bool { archive.enabled }

    func invalidate() { generation += 1; cachedHistory = nil }

    func setEnabled(_ enabled: Bool) throws {
        generation += 1
        var next = archive; next.enabled = enabled
        try persist(next)
        cachedHistory = nil
    }

    func clear() throws {
        generation += 1
        var empty = Archive(); empty.enabled = false
        try persist(empty)
        cachedHistory = nil
    }

    func refresh(provider: any HealthDataProviding, entries: LocalEntries) async throws -> [String: Any] {
        guard available else { throw CocoaError(.fileReadNoPermission) }
        guard enabled else { return envelope(run: nil, history: nil, entries: entries) }
        generation += 1
        let refreshGeneration = generation
        let history = await provider.history(days: 90, calendar: calendar)
        guard refreshGeneration == generation, enabled else { throw CancellationError() }
        // Never let a mistakenly injected synthetic provider supply personal insights.
        guard isDemo || !history.isSynthetic else { throw CocoaError(.coderInvalidValue) }
        // A full bounded rebuild intentionally recalculates history after HealthKit deletions.
        // Only reuse a frozen reference when its exact source/date/value summary is still valid.
        let previous = archive.runs.last(where: { $0.timeZoneIdentifier == calendar.timeZone.identifier })?.baselines ?? []
        let validPrevious = previous.filter { !archive.clearedMetrics.contains(Self.key($0.metric)) }.map { baseline in
            if baseline.frozenAt != nil && archive.referenceDigests[Self.key(baseline.metric)] != referenceDigest(baseline, features: history.features) {
                return baseline.requiringReview(reason: "referenceInputsChanged")
            }
            return baseline
        }
        let selected = history.features.filter { feature in
            let preference = archive.preferredSources[Self.key(feature.metric)]
            return preference == nil || preference == feature.sourceID
        }
        let run = PersonalChangeEngine.evaluate(features: selected, asOf: history.queriedAt,
                                               calendar: calendar, previousBaselines: validPrevious)
        var next = archive
        next.referenceDigests = Dictionary(uniqueKeysWithValues: run.baselines.map {
            (Self.key($0.metric), referenceDigest($0, features: history.features))
        })
        next.clearedMetrics = []
        next.runs.append(run)
        next.runs = Array(next.runs.suffix(30))
        try persist(next)
        cachedHistory = history
        return envelope(run: run, history: history, entries: entries)
    }

    /// Report inputs for the doctor summary: the latest run's findings and the wearable daily
    /// features as of the last refresh. Findings are empty when analysis is disabled. Wearable
    /// features come from the cached history snapshot so the report matches what the user saw;
    /// nil cache yields no wearable context rather than a fresh (possibly different) query.
    func reportInputs() -> (findings: [ChangeFinding], wearable: [DailyFeature]) {
        guard enabled else { return ([], []) }
        let findings = archive.runs.last?.findings ?? []
        let wearable = cachedHistory?.features ?? []
        return (findings, wearable)
    }

    func series(metricID: String, days: Int) throws -> [String: Any] {
        guard enabled, [7, 30, 90].contains(days), let kind = Self.kind(metricID) else { throw CocoaError(.coderInvalidValue) }
        return makeSeries(kind, history: cachedHistory, days: days, baseline: archive.runs.last?.baselines.first { $0.metric == kind })
    }

    func setPreferredSource(metricID: String, sourceID: String?) throws {
        guard Self.kind(metricID) != nil, sourceID.map({ !$0.isEmpty && $0.count <= 2000 }) ?? true else { throw CocoaError(.coderInvalidValue) }
        generation += 1
        var next = archive
        next.preferredSources[metricID] = sourceID
        next.referenceDigests.removeValue(forKey: metricID)
        next.clearedMetrics.append(metricID)
        try persist(next)
        cachedHistory = nil
    }

    func reviewBaseline(metricID: String) throws {
        guard Self.kind(metricID) != nil else { throw CocoaError(.coderInvalidValue) }
        generation += 1
        var next = archive; next.clearedMetrics.append(metricID)
        try persist(next)
        cachedHistory = nil
    }

    private func referenceDigest(_ baseline: BaselineSnapshot, features: [DailyFeature]) -> String {
        let rows = features.filter { $0.metric == baseline.metric && $0.sourceID == baseline.sourceID
            && $0.day >= baseline.referenceStart && $0.day <= baseline.referenceEnd }
            .sorted { $0.day == $1.day ? ($0.value ?? -.infinity) < ($1.value ?? -.infinity) : $0.day < $1.day }
        let encoder = JSONEncoder(); encoder.outputFormatting = .sortedKeys
        guard let data = try? encoder.encode(rows) else { return "invalid" }
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private func persist(_ next: Archive) throws {
        guard available, let file else { throw CocoaError(.fileWriteNoPermission) }
        let data = try JSONEncoder().encode(next)
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        try LocalStorageDirectoryPolicy.reapplyBackupExclusion(recursivelyAt: file.deletingLastPathComponent())
        archive = next
    }

    private func envelope(run: AnalysisRun?, history: HealthHistorySnapshot?, entries: LocalEntries) -> [String: Any] {
        let now = history?.queriedAt ?? Date()
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
        func array<T: Encodable>(_ records: T) -> Any {
            guard let data = try? encoder.encode(records), let json = try? JSONSerialization.jsonObject(with: data) else { return [] }
            return json
        }
        let context = PersonalContextSummary.resolve(records: entries, now: now, calendar: calendar)
        // Shape the context to the approved v7 wire schema (insights.ts reportingWindowSchema):
        // each window exposes reportingDays, expectedDays==7 and camelCase count records; the
        // frontend renders supplied counts and never infers deterioration from symptom presence.
        func window(_ w: PersonalContextWindow) -> [String: Any] {
            var known: [String: Int] = [:]
            for s in w.symptoms { known[s.field] = s.knownDays }
            var logged: [String: Int] = [:]
            for m in w.medicationLogs {
                // Key by regimen/purpose so distinct logged concepts stay separate and countable.
                logged["\(m.regimen.rawValue)/\(m.purpose.rawValue)", default: 0] += m.eventCount
            }
            return ["reportingDays": w.reportingDays, "expectedDays": 7,
                    "perItemKnownCounts": known, "loggedMedicationCounts": logged]
        }
        let contextJSON: [String: Any] = [
            "reportedRespiratoryChange": false,
            "reportedSymptomsPresent": context.reportedSymptomsPresent,
            "changeAssessment": context.changeAssessment,
            "current7": window(context.current7),
            "prior7": window(context.prior7),
            "summary": context.summary,
        ]
        let findings: [[String: Any]] = (run?.findings ?? []).map { finding in
            let explanation = EvidenceExplanation.forFinding(finding)
            let last = finding.recent.last
            return ["id": "\(Self.key(finding.metric)).\(finding.state.rawValue)", "metricId": Self.key(finding.metric),
                    "state": finding.state.rawValue, "title": Self.title(finding),
                    "observation": Self.observation(finding), "interpretation": explanation.possibleMeaning,
                    "alternatives": explanation.alternatives.joined(separator: "; "),
                    "limitations": (explanation.limitations + finding.reasons).joined(separator: " "),
                    "baseline": finding.baseline?.median as Any? ?? NSNull(), "current": last?.value as Any? ?? NSNull(),
                    "delta": last?.difference as Any? ?? NSNull(), "unit": finding.baseline?.unit ?? Self.unit(finding.metric),
                    "referenceValidDays": finding.referenceValidDays, "recentValidDays": finding.recentValidDays,
                    "durationDays": finding.recent.filter(\.qualifies).count,
                    "evidenceIds": finding.evidenceIDs, "sourceId": finding.sourceID as Any? ?? NSNull()]
        }
        return ["schemaVersion": 1, "generatedAt": ISO8601DateFormatter().string(from: now),
                "isDemo": isDemo, "enabled": enabled, "experimental": true,
                "historyState": history?.availability.rawValue ?? (enabled ? "noAvailableData" : "disabled"),
                "failedMetricIds": (history?.failedKinds ?? []).map(Self.key).sorted(),
                "ruleVersion": PersonalChangeEngine.ruleVersion, "findings": findings,
                "sourceOptions": HealthMetricKind.allCases.map { kind -> [String: Any] in
                    ["metricId": Self.key(kind), "selectedSourceId": archive.preferredSources[Self.key(kind)] as Any? ?? NSNull(),
                     "sources": Array(Set(history?.features.filter { $0.metric == kind }.map(\.sourceID) ?? [])).sorted()]
                },
                "series": HealthMetricKind.allCases.map { kind in
                    makeSeries(kind, history: history, days: 90, baseline: run?.baselines.first { $0.metric == kind })
                },
                "records": ["symptomCheckIns": array(entries.symptomCheckIns),
                            "medicationUseEvents": array(entries.medicationUseEvents), "peakFlowEntries": entries.peakFlowEntries.map { entry -> [String: Any] in
                                var row = array(entry) as? [String: Any] ?? [:]
                                row["percentOfConfirmedPersonalBest"] = entry.percentOfConfirmedPersonalBest as Any? ?? NSNull()
                                return row
                            }],
                "context": contextJSON,
                "evidence": EvidenceExplanation.references.map { ["id": $0.id, "title": $0.title, "url": $0.url, "limitations": $0.limitation] },
                "summary": enabled ? "Experimental personal comparisons, not clinically validated asthma predictions. A historical reference is not a healthy range." : "Personal analysis is off. Your original records are preserved."]
    }

    private func makeSeries(_ kind: HealthMetricKind, history: HealthHistorySnapshot?, days: Int, baseline: BaselineSnapshot?) -> [String: Any] {
        let today = calendar.startOfDay(for: history?.queriedAt ?? Date())
        let features = history?.features.filter { $0.metric == kind && $0.day < today } ?? []
        // If simultaneous sources are unresolved, expose no chosen curve instead of mixing them.
        let latestDay = features.map(\.day).max()
        let latestSources = Set(features.filter { $0.day == latestDay }.map(\.sourceID))
        let preference = archive.preferredSources[Self.key(kind)]
        let source = preference ?? (latestSources.count == 1 ? latestSources.first : nil)
        let selected = features.filter { $0.sourceID == source }
        let points: [[String: Any]] = (1...days).reversed().compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: -offset, to: today) else { return nil }
            let rows = selected.filter { calendar.isDate($0.day, inSameDayAs: date) }
            let row = rows.count == 1 ? rows.first : nil
            return ["date": ISO8601DateFormatter().string(from: date),
                    "value": row?.quality == .usable && row?.unit == Self.unit(kind) && row?.value?.isFinite == true && (row?.value ?? -1) >= 0 && (row?.sampleCount ?? 0) > 0
                        && !(row?.flags.contains(.timeZoneChanged) ?? false)
                        && !(row?.flags.contains(.sleepContextUnconfirmed) ?? false)
                        && !(row?.flags.contains(.duplicateDay) ?? false) && !(row?.flags.contains(.invalidUnit) ?? false)
                        ? (row?.value as Any? ?? NSNull()) : NSNull(),
                    "quality": row?.quality.rawValue ?? (source == nil && !features.isEmpty ? "incompatible" : "missing")]
        }
        let reference = baseline?.sourceID == source && baseline?.reviewReason == nil ? baseline : nil
        var result: [String: Any] = ["metricId": Self.key(kind), "unit": Self.unit(kind), "sourceId": source as Any? ?? NSNull(),
                "points": points, "baseline": reference?.median as Any? ?? NSNull(), "reference": NSNull(), "referenceBand": NSNull()]
        if let reference {
            let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
            if let data = try? encoder.encode(reference), var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                // JSONEncoder omits nil Optionals, but the v7 wire schema (insights.ts referenceSchema)
                // requires `frozenAt` to be PRESENT and nullable. Emit explicit null when not frozen so
                // the native response matches the contract (a non-frozen reference is the normal case).
                if json["frozenAt"] == nil { json["frozenAt"] = NSNull() }
                result["reference"] = json
            }
            if reference.mad > 0 {
                result["referenceBand"] = ["lower": reference.median - 3 * 1.4826 * reference.mad,
                                           "upper": reference.median + 3 * 1.4826 * reference.mad]
            }
        }
        return result
    }

    static func key(_ kind: HealthMetricKind) -> String {
        switch kind { case .respiratoryRate: "rr"; case .restingHeartRate: "rhr"; case .sleepAnalysis: "sleep"
        case .oxygenSaturation: "spo2"; case .stepCount: "steps"; case .workout: "workout" }
    }
    static func kind(_ key: String) -> HealthMetricKind? { HealthMetricKind.allCases.first { Self.key($0) == key } }
    static func unit(_ kind: HealthMetricKind) -> String {
        switch kind { case .respiratoryRate, .restingHeartRate: "count/min"; case .sleepAnalysis, .workout: "min"
        case .oxygenSaturation: "%"; case .stepCount: "count" }
    }
    private static func median(_ sorted: [Double]) -> Double? {
        guard !sorted.isEmpty else { return nil }; let m = sorted.count / 2
        return sorted.count % 2 == 0 ? (sorted[m-1] + sorted[m]) / 2 : sorted[m]
    }
    private static func title(_ f: ChangeFinding) -> String {
        let name: String = switch f.metric { case .respiratoryRate: "Respiratory rate"; case .restingHeartRate: "Resting heart rate"
        case .sleepAnalysis: "Sleep"; case .oxygenSaturation: "Oxygen saturation"; case .stepCount: "Steps"; case .workout: "Workouts" }
        let state: String = switch f.state { case .sustainedPersonalDeviation: "sustained personal change"
        case .singleDayChange: "single-day change"; case .noSustainedChangeDetected: "no sustained change detected"
        case .baselineReviewNeeded: "reference needs review"; case .indeterminate: "comparison indeterminate"
        case .contextOnly: "context only"; case .reportedRespiratoryChange: "reported change"
        case .insufficientData: "building your reference" }
        return "\(name): \(state)"
    }
    private static func observation(_ f: ChangeFinding) -> String {
        guard let baseline = f.baseline, let last = f.recent.last else {
            return "\(f.referenceValidDays)/28 comparable reference days; \(f.recentValidDays)/3 recent days."
        }
        return "Latest completed-day value \(last.value.formatted(.number.precision(.fractionLength(1)))) \(baseline.unit); personal reference median \(baseline.median.formatted(.number.precision(.fractionLength(1)))). \(f.recent.filter(\.qualifies).count) of 3 recent days met the experimental comparison rule."
    }
}
