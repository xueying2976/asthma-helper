import AeriDayCore
import Foundation

struct MockHealthDataProvider: HealthDataProviding {
    let snapshot: HealthSnapshot

    /// One deterministic synthetic daily value per metric/offset, shared by `history` and (via
    /// DemoFixtures) the latest snapshot so the homepage number and the historical latest agree.
    /// Shape: a stable multi-week reference, a mild shift over the recent 3 days, gentle day-to-day
    /// variation (not a flat line). Synthetic only; no clinical meaning.
    static func syntheticValue(kind: HealthMetricKind, offset: Int) -> Double {
        let base: Double
        switch kind {
        case .respiratoryRate: base = 15
        case .restingHeartRate: base = 62
        case .sleepAnalysis: base = 450
        case .oxygenSaturation: base = 97
        case .stepCount: base = 5_000
        case .workout: base = 25
        }
        let wobble = sin(Double(offset) * 0.8) * (kind == .sleepAnalysis ? 16 : kind == .stepCount ? 600 : base * 0.02)
        let recentShift: Double
        switch kind {
        case .respiratoryRate: recentShift = offset <= 3 ? 2.6 : 0
        case .restingHeartRate: recentShift = offset <= 3 ? 3 : 0
        case .sleepAnalysis: recentShift = offset <= 3 ? -25 : 0
        default: recentShift = 0
        }
        return base + wobble + recentShift
    }

    static func unit(for kind: HealthMetricKind) -> String {
        switch kind {
        case .respiratoryRate, .restingHeartRate: "count/min"
        case .sleepAnalysis, .workout: "min"
        case .oxygenSaturation: "%"
        case .stepCount: "count"
        }
    }

    /// Wearable days deliberately missing from history (honest gaps), inside the reference window.
    static let missingWearableOffsets: Set<Int> = [9, 18]

    func history(days: Int = 90, calendar: Calendar = .current) async -> HealthHistorySnapshot {
        let now = Date()
        let today = calendar.startOfDay(for: now)
        // A coherent ~5-week synthetic record (not a flat uniform 90 days), capped by the request.
        let count = min(max(days, 1), 35)
        let start = calendar.date(byAdding: .day, value: -count, to: today) ?? today
        guard snapshot.provenance.isSynthetic, snapshot.availability == .sampleAvailable else {
            return HealthHistorySnapshot(features: [], queriedAt: now, startDate: start,
                isSynthetic: snapshot.provenance.isSynthetic, availability: snapshot.availability)
        }
        var features = [DailyFeature]()
        for offset in 1...count {
            if Self.missingWearableOffsets.contains(offset) { continue } // honest gaps
            guard let day = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
            for kind in HealthMetricKind.allCases {
                features.append(DailyFeature(metric: kind, day: day, sourceID: "synthetic-device",
                    value: Self.syntheticValue(kind: kind, offset: offset), unit: Self.unit(for: kind),
                    sampleCount: 12, flags: [.coverageUnknown]))
            }
        }
        return HealthHistorySnapshot(features: features, queriedAt: now, startDate: start,
            isSynthetic: true, availability: .sampleAvailable)
    }

    func latestSnapshot() async -> HealthSnapshot {
        snapshot
    }
}
