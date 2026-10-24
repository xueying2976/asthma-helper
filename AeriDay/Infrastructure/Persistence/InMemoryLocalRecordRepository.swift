import AeriDayCore
import Foundation

actor InMemoryLocalRecordRepository: LocalRecordRepository {
    private var storedSummary: LocalRecordSummary

    init(summary: LocalRecordSummary) {
        storedSummary = summary
    }

    func summary() async -> LocalRecordSummary {
        storedSummary
    }

    func replaceSummary(_ summary: LocalRecordSummary) {
        storedSummary = summary
    }
}

