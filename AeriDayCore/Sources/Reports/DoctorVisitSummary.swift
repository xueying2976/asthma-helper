import Foundation

// Immutable, versioned doctor-visit summary DTO. Foundation-only; no platform frameworks.
// Built from one consistent local snapshot. Every number is derived in the pure builder, so a
// preview and its exported PDF describe the exact same snapshot.

public enum DoctorSummaryRangeKind: String, Codable, Sendable { case last7, last30, custom }

/// Requested reporting range. Dates are day granularity; validation lives in the builder.
public struct DoctorSummaryRange: Codable, Equatable, Sendable {
    public let kind: DoctorSummaryRangeKind
    public let customStart: Date?
    public let customEnd: Date?
    public let includeToday: Bool
    public init(kind: DoctorSummaryRangeKind, customStart: Date? = nil, customEnd: Date? = nil,
                includeToday: Bool = false) {
        self.kind = kind; self.customStart = customStart; self.customEnd = customEnd
        self.includeToday = includeToday
    }
    public static let last7 = DoctorSummaryRange(kind: .last7)
    public static let last30 = DoctorSummaryRange(kind: .last30)
}

public struct DoctorSummaryOptions: Codable, Equatable, Sendable {
    /// Note IDs the user chose to include. Default: none (notes are excluded until selected).
    public let selectedNoteIDs: [UUID]
    /// User-written, user-editable questions. Never parsed into asserted facts.
    public let patientQuestions: [String]
    public init(selectedNoteIDs: [UUID] = [], patientQuestions: [String] = []) {
        self.selectedNoteIDs = selectedNoteIDs; self.patientQuestions = patientQuestions
    }
}

public enum DoctorSummaryError: Error, Equatable, Sendable {
    case rangeReversed
    case rangeInFuture
    case rangeTooLong(maxDays: Int)
    case invalidRange
}

/// The inclusive resolved period, with explicit partial-today handling.
public struct ResolvedReportRange: Codable, Equatable, Sendable {
    public let start: Date            // start of first completed day (inclusive)
    public let endExclusive: Date     // start of day after the last completed day
    public let completedDays: Int
    public let includesPartialToday: Bool
    public let timeZoneIdentifier: String
    public let firstInclusiveDay: Date
    public let lastInclusiveDay: Date // last completed day (start-of-day)
}

public struct SymptomFieldSummary: Codable, Equatable, Sendable {
    public let field: String
    public let knownDays: Int
    public let positiveDays: Int
    public let unansweredDays: Int
}

public struct MedicationUseSummary: Codable, Equatable, Sendable {
    /// Grouping key: exact recorded name when identifiable, else "regimen/purpose".
    public let label: String
    public let medicationName: String?
    public let regimen: MedicationRegimen
    public let purpose: MedicationUsePurpose
    public let eventCount: Int
    public let loggedDays: Int
    /// Total amount only when every event shares one compatible unit; else nil.
    public let totalAmount: Double?
    public let unit: SupplyUnit?
}

public struct PeakFlowSummary: Codable, Equatable, Sendable {
    public let validReadingCount: Int
    public let minValue: Double?
    public let maxValue: Double?
    public let unit: PeakFlowUnit
    /// Only present when a clinician-confirmed personal best drove it; otherwise nil.
    public let percentOfConfirmedBestRange: [Double]?
}

public struct WearableMetricSummary: Codable, Equatable, Sendable {
    public let metricID: String
    public let unit: String
    public let usableDays: Int
    public let missingDays: Int
    public let sources: [String]
    public let observedMin: Double?
    public let observedMax: Double?
    public let incompatibleSources: Bool
}

public struct PersonalChangeSummary: Codable, Equatable, Sendable {
    public let metricID: String
    public let state: String
    public let referenceStart: Date?
    public let referenceEnd: Date?
    public let referenceValidDays: Int
    public let recentValidDays: Int
    public let observedDifference: Double?
    public let unit: String
    public let ruleVersion: String
}

public struct ReportingCoverage: Codable, Equatable, Sendable {
    public let expectedDays: Int
    public let knownSymptomDays: Int
    public let missingWearableDays: Int
}

public struct SelectedNote: Codable, Equatable, Sendable {
    public let id: UUID
    public let date: Date
    public let text: String
}

public struct DoctorVisitSummary: Codable, Equatable, Sendable {
    public static let currentSchemaVersion = 1

    public let schemaVersion: Int
    public let generatedAt: Date
    public let range: ResolvedReportRange
    public let timeZone: String
    public let isDemo: Bool
    public let recordRevision: String
    public let reportingCoverage: ReportingCoverage
    public let symptoms: [SymptomFieldSummary]
    public let medicationLogs: [MedicationUseSummary]
    public let peakFlow: PeakFlowSummary
    public let wearableContext: [WearableMetricSummary]
    public let personalChanges: [PersonalChangeSummary]
    public let personalChangesOmittedReason: String?
    public let selectedNotes: [SelectedNote]
    public let patientQuestions: [String]
    public let limitations: [String]
}
