import AeriDayCore
import Foundation
import Testing

struct FreshnessPolicyTests {
    private let now = Date(timeIntervalSince1970: 1_786_000_000)

    @Test func missingTimestampIsUnavailable() {
        let policy = FreshnessPolicy(staleAfter: 3_600)
        #expect(policy.freshness(collectedAt: nil, now: now) == .unavailable)
    }

    @Test func recentTimestampIsCurrent() {
        let policy = FreshnessPolicy(staleAfter: 3_600)
        #expect(policy.freshness(collectedAt: now.addingTimeInterval(-300), now: now) == .current)
    }

    @Test func oldTimestampIsStale() {
        let policy = FreshnessPolicy(staleAfter: 3_600)
        #expect(policy.freshness(collectedAt: now.addingTimeInterval(-7_200), now: now) == .stale)
    }
}

