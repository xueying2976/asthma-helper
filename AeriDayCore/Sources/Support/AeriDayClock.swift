import Foundation

public protocol AeriDayClock: Sendable {
    var now: Date { get }
}

public struct SystemClock: AeriDayClock {
    public init() {}

    public var now: Date { Date() }
}

public struct FixedClock: AeriDayClock, Equatable {
    public let now: Date

    public init(now: Date) {
        self.now = now
    }
}

