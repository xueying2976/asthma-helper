import Foundation

public enum DataFreshness: String, CaseIterable, Codable, Sendable {
    case current
    case stale
    case unavailable
}

public struct DataProvenance: Equatable, Codable, Sendable {
    public let sourceName: String
    public let collectedAt: Date?
    public let freshness: DataFreshness
    public let isSynthetic: Bool

    public init(
        sourceName: String,
        collectedAt: Date?,
        freshness: DataFreshness,
        isSynthetic: Bool
    ) {
        self.sourceName = sourceName
        self.collectedAt = collectedAt
        self.freshness = freshness
        self.isSynthetic = isSynthetic
    }
}

