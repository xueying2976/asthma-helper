import Foundation

/// A bounded full-query rebuild. No persisted anchor is advanced and deleted/edited
/// Health samples disappear on the next successful rebuild.
public struct HealthHistorySnapshot: Sendable {
    public let features: [DailyFeature]
    public let failedKinds: Set<HealthMetricKind>
    public let queriedAt: Date
    public let startDate: Date
    public let isSynthetic: Bool
    public let availability: HealthSnapshot.Availability

    public init(features: [DailyFeature], failedKinds: Set<HealthMetricKind> = [], queriedAt: Date,
                startDate: Date, isSynthetic: Bool, availability: HealthSnapshot.Availability) {
        self.features = features
        self.failedKinds = failedKinds
        self.queriedAt = queriedAt
        self.startDate = startDate
        self.isSynthetic = isSynthetic
        self.availability = availability
    }
}
