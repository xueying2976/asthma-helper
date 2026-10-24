import Foundation

/// Experimental, deterministic personal comparisons. Thresholds are engineering hypotheses,
/// not clinically validated asthma cutoffs. No probability, diagnosis, or treatment output.
public enum PersonalChangeEngine {
    public static let ruleVersion = "personal-change-1.0.0-experimental"

    public static func evaluate(features: [DailyFeature], asOf: Date, calendar: Calendar = .current,
                                previousBaselines: [BaselineSnapshot] = []) -> AnalysisRun {
        let today = calendar.startOfDay(for: asOf)
        func offset(_ n: Int, from date: Date) -> Date { calendar.date(byAdding: .day, value: n, to: date)! }
        let t = offset(-1, from: today)
        let start = offset(-31, from: t), end = offset(-4, from: t), recentStart = offset(-2, from: t)
        let eligible = features.filter { $0.day < today && $0.day >= start }
        let findings = HealthMetricKind.allCases.map { metric -> ChangeFinding in
            let all = eligible.filter { $0.metric == metric }
            let latest = all.max { $0.day == $1.day ? $0.sourceID < $1.sourceID : $0.day < $1.day }
            let source = latest?.sourceID
            // Keep review-blocked episode state in the returned run. Dropping it here would
            // let the next refresh silently adopt a rolling reference without user review.
            let frozenPrior = previousBaselines.first { $0.metric == metric && ($0.frozenAt != nil || $0.reviewReason != nil) }
            var reasons: [String] = []
            func result(_ state: ChangeFindingState, _ baseline: BaselineSnapshot? = nil,
                        _ recent: [ChangeDayComparison] = [], _ refCount: Int = 0,
                        _ recentCount: Int = 0) -> ChangeFinding {
                ChangeFinding(metric: metric, sourceID: source, state: state, baseline: baseline, recent: recent,
                              referenceValidDays: refCount, recentValidDays: recentCount,
                              referenceExpectedDays: 28, recentExpectedDays: 3, reasons: reasons,
                              explanationID: explanation(metric: metric, state: state), evidenceIDs: evidence(metric),
                              ruleVersion: ruleVersion)
            }
            if let prior = frozenPrior, let reviewReason = prior.reviewReason {
                reasons.append(reviewReason)
                return result(.baselineReviewNeeded, prior)
            }
            guard let source, !source.isEmpty else {
                reasons.append("noComparableSource")
                return result(frozenPrior == nil ? .insufficientData : .baselineReviewNeeded, frozenPrior)
            }
            if let latestDay = latest.map({ calendar.startOfDay(for: $0.day) }),
               Set(all.filter { calendar.startOfDay(for: $0.day) == latestDay }.map(\.sourceID)).count > 1 {
                reasons.append("ambiguousActiveSourceRequiresSelection")
                return result(.baselineReviewNeeded, frozenPrior)
            }
            if let frozenPrior, frozenPrior.sourceID != source {
                reasons.append("frozenBaselineSourceChangedRequiresReview")
                return result(.baselineReviewNeeded, frozenPrior)
            }
            // A transition back to a previously used device starts another segment too.
            let foreignLatest = all.filter { $0.sourceID != source }.map(\.day).max()
            let same = all.filter { $0.sourceID == source && (foreignLatest == nil || $0.day > foreignLatest!) }
            if foreignLatest != nil { reasons.append("sourceSegmentRestarted") }
            let grouped = Dictionary(grouping: same, by: { calendar.startOfDay(for: $0.day) })
            let valid = grouped.compactMap { day, entries -> DailyFeature? in
                guard entries.count == 1, let item = entries.first, item.quality == .usable,
                      item.sampleCount > 0, let value = item.value, value.isFinite, value >= 0,
                      item.unit == canonicalUnit(metric),
                      !item.flags.contains(.sleepContextUnconfirmed), !item.flags.contains(.timeZoneChanged),
                      !item.flags.contains(.invalidUnit), !item.flags.contains(.duplicateDay) else { return nil }
                return DailyFeature(metric: item.metric, day: day, sourceID: item.sourceID, value: value,
                                    unit: item.unit, sampleCount: item.sampleCount, flags: item.flags)
            }.sorted { $0.day < $1.day }
            if grouped.values.contains(where: { $0.count > 1 }) { reasons.append("ambiguousDuplicateDaysExcluded") }
            if same.contains(where: { $0.quality != .usable || $0.flags.contains(.timeZoneChanged) }) {
                reasons.append("incomparableDaysExcluded")
            }
            let reference = valid.filter { $0.day >= start && $0.day <= end }
            let recent = valid.filter { $0.day >= recentStart && $0.day <= t }
            if ![HealthMetricKind.respiratoryRate, .restingHeartRate, .sleepAnalysis].contains(metric) {
                reasons.append("contextOnlyNoAnomalyTrigger")
                return result(.contextOnly, nil, [], reference.count, recent.count)
            }
            guard reference.count >= 21, recent.count >= 2 else {
                reasons.append("requires21ReferenceAnd2RecentDays")
                return result(frozenPrior == nil ? .insufficientData : .baselineReviewNeeded,
                              frozenPrior, [], reference.count, recent.count)
            }
            let values = reference.compactMap(\.value)
            let center = median(values), mad = median(values.map { abs($0 - center) })
            var baseline = BaselineSnapshot(metric: metric, sourceID: source, unit: canonicalUnit(metric),
                                            referenceStart: start, referenceEnd: end, validDays: values.count,
                                            median: center, mad: mad)
            // Frozen comparisons expire after 14 completed days; require explicit baseline review.
            if let prior = frozenPrior {
                guard prior.ruleVersion == ruleVersion, prior.unit == canonicalUnit(metric),
                      prior.referenceEnd <= end, prior.referenceStart <= prior.referenceEnd,
                      prior.validDays >= 21, prior.median.isFinite, prior.median >= 0,
                      prior.mad.isFinite, prior.mad >= 0, let frozen = prior.frozenAt,
                      frozen <= t, (calendar.dateComponents([.day], from: frozen, to: t).day ?? 99) <= 14,
                      foreignLatest == nil || prior.referenceStart > foreignLatest! else {
                    reasons.append("frozenBaselineExpiredOrIncompatible")
                    return result(.baselineReviewNeeded, prior, [], reference.count, recent.count)
                }
                baseline = prior; reasons.append("baselineFrozenDuringChangeEpisode")
            }
            let scale = 1.4826 * baseline.mad
            guard scale > 1e-9 else {
                reasons.append("zeroVarianceNoValidatedNoiseFloor")
                let comparisons = recent.map { ChangeDayComparison(day: $0.day, value: $0.value!, difference: $0.value! - baseline.median, robustZ: nil, qualifies: false) }
                return result(.indeterminate, baseline, comparisons, baseline.validDays, recent.count)
            }
            let absoluteFloor: Double = metric == .respiratoryRate ? 1 : metric == .restingHeartRate ? 5 : 60
            let relativeFloor = baseline.median * (metric == .sleepAnalysis ? 0.2 : 0.1)
            let threshold = max(absoluteFloor, relativeFloor)
            let comparisons = recent.map { item -> ChangeDayComparison in
                let value = item.value!, delta = value - baseline.median, z = delta / scale
                let qualifies = metric == .sleepAnalysis ? z <= -3 && -delta >= threshold : z >= 3 && delta >= threshold
                return ChangeDayComparison(day: item.day, value: value, difference: delta, robustZ: z, qualifies: qualifies)
            }
            let count = comparisons.filter(\.qualifies).count
            let state: ChangeFindingState = count >= 2 ? .sustainedPersonalDeviation : count == 1 ? .singleDayChange : .noSustainedChangeDetected
            reasons.append("unvalidatedEngineeringThresholds")
            if count >= 2 && baseline.frozenAt == nil {
                baseline = BaselineSnapshot(metric: metric, sourceID: source, unit: baseline.unit,
                                            referenceStart: baseline.referenceStart, referenceEnd: baseline.referenceEnd,
                                            validDays: baseline.validDays, median: baseline.median, mad: baseline.mad, frozenAt: t)
            }
            // Release a prior freeze only once all recent days stop meeting the candidate threshold.
            if count == 0 && baseline.frozenAt != nil {
                reasons.append("episodeQuietBaselineReviewRequired")
                return result(.baselineReviewNeeded, baseline, comparisons, baseline.validDays, recent.count)
            }
            return result(state, baseline, comparisons, baseline.validDays, recent.count)
        }
        return AnalysisRun(ruleVersion: ruleVersion, generatedAt: asOf, latestCompletedDay: t,
                           calendarIdentifier: String(describing: calendar.identifier), timeZoneIdentifier: calendar.timeZone.identifier,
                           findings: findings, baselines: findings.compactMap(\.baseline), experimental: true)
    }

    public static func canonicalUnit(_ metric: HealthMetricKind) -> String {
        switch metric {
        case .respiratoryRate, .restingHeartRate: return "count/min"
        case .sleepAnalysis, .workout: return "min"
        case .oxygenSaturation: return "%"
        case .stepCount: return "count"
        }
    }
    private static func median(_ values: [Double]) -> Double {
        let sorted = values.sorted(), n = sorted.count
        return n % 2 == 0 ? sorted[n / 2 - 1] / 2 + sorted[n / 2] / 2 : sorted[n / 2]
    }
    private static func evidence(_ metric: HealthMetricKind) -> [String] {
        switch metric {
        case .respiratoryRate, .sleepAnalysis: return ["R1", "R2"]
        case .restingHeartRate: return ["R2"]
        case .oxygenSaturation: return ["R6"]
        default: return ["R1"]
        }
    }
    private static func explanation(metric: HealthMetricKind, state: ChangeFindingState) -> String {
        "personalChange.\(metric.rawValue).\(state.rawValue)"
    }
}
