import Foundation

public struct FreshnessPolicy: Sendable {
    public let staleAfter: TimeInterval

    public init(staleAfter: TimeInterval) {
        self.staleAfter = staleAfter
    }

    public func freshness(collectedAt: Date?, now: Date) -> DataFreshness {
        guard let collectedAt else { return .unavailable }
        return now.timeIntervalSince(collectedAt) > staleAfter ? .stale : .current
    }
}
