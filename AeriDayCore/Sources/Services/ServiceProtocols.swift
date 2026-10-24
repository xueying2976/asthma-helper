import Foundation

public protocol LocalRecordRepository: Sendable {
    func summary() async -> LocalRecordSummary
}

public protocol HealthDataProviding: Sendable {
    func latestSnapshot() async -> HealthSnapshot
    func history(days: Int, calendar: Calendar) async -> HealthHistorySnapshot
    func requestAuthorization() async -> HealthSnapshot
    func disconnect() async -> HealthSnapshot
}

public extension HealthDataProviding {
    func history(days: Int = 90, calendar: Calendar = .current) async -> HealthHistorySnapshot {
        let snapshot = await latestSnapshot()
        let now = Date()
        return HealthHistorySnapshot(features: [], queriedAt: now,
            startDate: calendar.date(byAdding: .day, value: -min(max(days, 1), 90), to: calendar.startOfDay(for: now)) ?? now,
            isSynthetic: snapshot.provenance.isSynthetic, availability: snapshot.availability)
    }

    func disconnect() async -> HealthSnapshot {
        HealthSnapshot(availability: .accessNotRequested,
            provenance: DataProvenance(sourceName: "Apple Health", collectedAt: nil,
                                      freshness: .unavailable, isSynthetic: true))
    }
    func requestAuthorization() async -> HealthSnapshot {
        await latestSnapshot()
    }
}

public protocol EnvironmentProviding: Sendable {
    func latestSnapshot() async -> EnvironmentalSnapshot
}
