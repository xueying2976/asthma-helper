import AeriDayCore

struct MockEnvironmentProvider: EnvironmentProviding {
    let snapshot: EnvironmentalSnapshot

    func latestSnapshot() async -> EnvironmentalSnapshot {
        snapshot
    }
}

