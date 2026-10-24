import AeriDayCore
import SwiftUI

struct AppEnvironment: Sendable {
    let localRecords: any LocalRecordRepository
    let healthData: any HealthDataProviding
    let environmentData: any EnvironmentProviding
    let scenario: SyntheticScenario

    static func synthetic(_ scenario: SyntheticScenario = .content) -> AppEnvironment {
        return AppEnvironment(
            localRecords: InMemoryLocalRecordRepository(summary: SyntheticFixtures.localRecords(for: scenario)),
            healthData: MockHealthDataProvider(snapshot: SyntheticFixtures.health(for: scenario)),
            environmentData: MockEnvironmentProvider(snapshot: SyntheticFixtures.environment(for: scenario)),
            scenario: scenario
        )
    }

    static func live() -> AppEnvironment {
        return AppEnvironment(
            localRecords: InMemoryLocalRecordRepository(summary: SyntheticFixtures.localRecords(for: .insufficientData)),
            healthData: HealthKitDataProvider(),
            environmentData: MockEnvironmentProvider(snapshot: SyntheticFixtures.environment(for: .insufficientData)),
            scenario: .insufficientData
        )
    }

    static func demo() -> AppEnvironment {
        AppEnvironment(localRecords: InMemoryLocalRecordRepository(summary: SyntheticFixtures.localRecords(for: .content)),
                       healthData: MockHealthDataProvider(snapshot: DemoFixtures.health()),
                       environmentData: MockEnvironmentProvider(snapshot: SyntheticFixtures.environment(for: .insufficientData)),
                       scenario: .content)
    }
}

private struct AppEnvironmentKey: EnvironmentKey {
    static let defaultValue = AppEnvironment.synthetic()
}

extension EnvironmentValues {
    var appEnvironment: AppEnvironment {
        get { self[AppEnvironmentKey.self] }
        set { self[AppEnvironmentKey.self] = newValue }
    }
}
