import Foundation

public enum DailyFeatureQuality: String, Codable, Sendable { case usable, missing, incompatible, incomplete }
public enum DailyQualityFlag: String, Codable, Sendable {
    case sleepContextUnconfirmed, sourceChanged, timeZoneChanged, coverageUnknown, duplicateDay, invalidUnit
}

/// One comparable summary for a completed local day. Source ID includes material device identity.
public struct DailyFeature: Codable, Equatable, Sendable {
    public let metric: HealthMetricKind
    public let day: Date
    public let sourceID: String
    public let value: Double?
    public let unit: String
    public let sampleCount: Int
    public let quality: DailyFeatureQuality
    public let flags: [DailyQualityFlag]
    public init(metric: HealthMetricKind, day: Date, sourceID: String, value: Double?, unit: String,
                sampleCount: Int, quality: DailyFeatureQuality = .usable, flags: [DailyQualityFlag] = []) {
        self.metric = metric; self.day = day; self.sourceID = sourceID; self.value = value
        self.unit = unit; self.sampleCount = sampleCount; self.quality = quality; self.flags = flags
    }
}

public enum ChangeFindingState: String, Codable, Sendable {
    case insufficientData, noSustainedChangeDetected, singleDayChange, sustainedPersonalDeviation
    case reportedRespiratoryChange, baselineReviewNeeded, contextOnly, indeterminate
}
public struct BaselineSnapshot: Codable, Equatable, Sendable {
    public let metric: HealthMetricKind
    public let sourceID: String
    public let unit: String
    public let referenceStart: Date
    public let referenceEnd: Date
    public let validDays: Int
    public let median: Double
    public let mad: Double
    public let frozenAt: Date?
    public let ruleVersion: String
    public let reviewReason: String?
    public init(metric: HealthMetricKind, sourceID: String, unit: String, referenceStart: Date,
                referenceEnd: Date, validDays: Int, median: Double, mad: Double, frozenAt: Date? = nil,
                ruleVersion: String = PersonalChangeEngine.ruleVersion, reviewReason: String? = nil) {
        self.metric = metric; self.sourceID = sourceID; self.unit = unit
        self.referenceStart = referenceStart; self.referenceEnd = referenceEnd; self.validDays = validDays
        self.median = median; self.mad = mad; self.frozenAt = frozenAt; self.ruleVersion = ruleVersion
        self.reviewReason = reviewReason
    }

    public func requiringReview(reason: String) -> BaselineSnapshot {
        BaselineSnapshot(metric: metric, sourceID: sourceID, unit: unit, referenceStart: referenceStart,
                         referenceEnd: referenceEnd, validDays: validDays, median: median, mad: mad,
                         frozenAt: frozenAt, ruleVersion: ruleVersion, reviewReason: reason)
    }
}
public struct ChangeDayComparison: Codable, Equatable, Sendable {
    public let day: Date
    public let value: Double
    public let difference: Double
    public let robustZ: Double?
    public let qualifies: Bool
}
public struct ChangeFinding: Codable, Equatable, Sendable {
    public let metric: HealthMetricKind
    public let sourceID: String?
    public let state: ChangeFindingState
    public let baseline: BaselineSnapshot?
    public let recent: [ChangeDayComparison]
    public let referenceValidDays: Int
    public let recentValidDays: Int
    public let referenceExpectedDays: Int
    public let recentExpectedDays: Int
    public let reasons: [String]
    public let explanationID: String
    public let evidenceIDs: [String]
    public let ruleVersion: String
}
public struct AnalysisRun: Codable, Equatable, Sendable {
    public let ruleVersion: String
    public let generatedAt: Date
    public let latestCompletedDay: Date
    public let calendarIdentifier: String
    public let timeZoneIdentifier: String
    public let findings: [ChangeFinding]
    public let baselines: [BaselineSnapshot]
    public let experimental: Bool
}
