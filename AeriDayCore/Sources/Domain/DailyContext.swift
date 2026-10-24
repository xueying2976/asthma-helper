import Foundation

public struct LocalRecordSummary: Equatable, Sendable {
    public let entryCount: Int
    public let latestEntryAt: Date?
    public let provenance: DataProvenance

    public init(entryCount: Int, latestEntryAt: Date?, provenance: DataProvenance) {
        self.entryCount = entryCount
        self.latestEntryAt = latestEntryAt
        self.provenance = provenance
    }
}

public struct HealthSnapshot: Equatable, Sendable {
    public enum Availability: String, Sendable {
        case sampleAvailable
        case noAvailableData
        case accessNotRequested
        case serviceUnavailable
    }

    public let availability: Availability
    public let metrics: [HealthMetricSummary]
    public let failedKinds: Set<HealthMetricKind>
    public let earliestAuthorizedSampleDate: Date?
    public let provenance: DataProvenance

    public init(
        availability: Availability,
        metrics: [HealthMetricSummary] = [],
        failedKinds: Set<HealthMetricKind> = [],
        earliestAuthorizedSampleDate: Date? = nil,
        provenance: DataProvenance
    ) {
        self.availability = availability
        self.metrics = metrics
        self.failedKinds = failedKinds
        self.earliestAuthorizedSampleDate = earliestAuthorizedSampleDate
        self.provenance = provenance
    }
}

public enum HealthMetricKind: String, CaseIterable, Codable, Hashable, Sendable {
    case respiratoryRate
    case restingHeartRate
    case sleepAnalysis
    case oxygenSaturation
    case stepCount
    case workout
}

public struct HealthMetricSummary: Equatable, Sendable {
    public let kind: HealthMetricKind
    public let value: Double?
    public let unit: String?
    public let startDate: Date
    public let endDate: Date
    public let sourceName: String
    public let sourceBundleIdentifier: String
    public let deviceName: String?
    public let sampleCount: Int

    public init(
        kind: HealthMetricKind,
        value: Double?,
        unit: String?,
        startDate: Date,
        endDate: Date,
        sourceName: String,
        sourceBundleIdentifier: String,
        deviceName: String?,
        sampleCount: Int = 1
    ) {
        self.kind = kind
        self.value = value
        self.unit = unit
        self.startDate = startDate
        self.endDate = endDate
        self.sourceName = sourceName
        self.sourceBundleIdentifier = sourceBundleIdentifier
        self.deviceName = deviceName
        self.sampleCount = sampleCount
    }
}

public struct EnvironmentalSnapshot: Equatable, Sendable {
    public enum Availability: String, Sendable {
        case sampleAvailable
        case noCoverage
        case serviceUnavailable
    }

    public let availability: Availability
    public let provenance: DataProvenance

    public init(availability: Availability, provenance: DataProvenance) {
        self.availability = availability
        self.provenance = provenance
    }
}

public struct DailyContext: Equatable, Sendable {
    public let localRecords: LocalRecordSummary
    public let health: HealthSnapshot
    public let environment: EnvironmentalSnapshot

    public init(
        localRecords: LocalRecordSummary,
        health: HealthSnapshot,
        environment: EnvironmentalSnapshot
    ) {
        self.localRecords = localRecords
        self.health = health
        self.environment = environment
    }
}
