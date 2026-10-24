import AeriDayCore
import Foundation

extension HealthMetricSummary {
    var titleKey: String { "health.metric." + keyName + ".title" }
    var unitKey: String { "health.metric." + keyName + ".unit" }
    private var keyName: String {
        switch kind {
        case .respiratoryRate: "respiratory_rate"
        case .restingHeartRate: "resting_heart_rate"
        case .sleepAnalysis: "sleep"
        case .oxygenSaturation: "oxygen_saturation"
        case .stepCount: "steps"
        case .workout: "workouts"
        }
    }
    func isOlder(than now: Date) -> Bool {
        FreshnessPolicy(staleAfter: 48 * 3600).freshness(collectedAt: endDate, now: now) == .stale
    }
}
