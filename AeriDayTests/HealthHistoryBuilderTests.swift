import AeriDayCore
import XCTest
@testable import AeriDay

final class HealthHistoryBuilderTests: XCTestCase {
    private var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)!
        return value
    }
    private func date(_ day: Int, _ hour: Int = 0) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: 10, day: day, hour: hour))!
    }
    private func sample(_ metric: HealthMetricKind, _ start: Date, _ end: Date, _ value: Double,
                        source: String = "synthetic-source|watch-A", id: UUID = UUID()) -> HistorySample {
        HistorySample(id: id, metric: metric, start: start, end: end, value: value,
                      sourceID: source, timeZoneID: "GMT")
    }
    private func build(_ rows: [HistorySample]) -> [DailyFeature] {
        HealthHistoryBuilder.build(samples: rows, start: date(1), now: date(18, 12), calendar: calendar)
    }

    func testOverlappingSleepUnionAndRespiratorySleepContext() throws {
        let rows = [sample(.sleepAnalysis, date(15, 23), date(16, 5), 360),
                    sample(.sleepAnalysis, date(16, 3), date(16, 7), 240),
                    sample(.respiratoryRate, date(16, 4), date(16, 4), 15)]
        let features = build(rows)
        let sleep = try XCTUnwrap(features.first { $0.metric == .sleepAnalysis })
        XCTAssertEqual(sleep.value, 480)
        XCTAssertEqual(sleep.day, date(16))
        let respiratory = try XCTUnwrap(features.first { $0.metric == .respiratoryRate })
        XCTAssertEqual(respiratory.quality, .usable)
        XCTAssertEqual(respiratory.unit, "count/min")
    }

    func testRespiratoryUnconfirmedOrDifferentDeviceIsNotOvernightFeature() throws {
        let features = build([sample(.sleepAnalysis, date(15, 23), date(16, 7), 480),
                              sample(.respiratoryRate, date(16, 4), date(16, 4), 19, source: "other|watch-B")])
        let respiratory = try XCTUnwrap(features.first { $0.metric == .respiratoryRate })
        XCTAssertEqual(respiratory.quality, .incompatible)
        XCTAssertTrue(respiratory.flags.contains(.sleepContextUnconfirmed))
    }

    func testSourcesRemainSeparateAndMissingNeverBecomesZero() {
        let features = build([sample(.stepCount, date(16, 8), date(16, 9), 300),
                              sample(.stepCount, date(16, 8), date(16, 9), 400, source: "other|phone")])
        XCTAssertEqual(features.count, 2)
        XCTAssertEqual(Set(features.compactMap(\.value)), [300, 400])
        XCTAssertFalse(features.contains { $0.day == date(17) })
        XCTAssertTrue(build([]).isEmpty)
    }

    func testRebuildDropsDeletedSamplesDeduplicatesUUIDAndExcludesCurrentDay() {
        let id = UUID()
        let row = sample(.stepCount, date(16, 8), date(16, 9), 300, id: id)
        let current = sample(.stepCount, date(18, 8), date(18, 9), 200)
        let features = build([row, row, current])
        XCTAssertEqual(features.count, 1)
        XCTAssertEqual(features.first?.value, 300)
        XCTAssertTrue(build([]).isEmpty, "Full rebuild after deletion retains no stale features")
    }

    func testCrossMidnightAndOverlappingStepsAreWithheld() throws {
        let cross = try XCTUnwrap(build([sample(.stepCount, date(15, 23), date(16, 1), 200)]).first)
        XCTAssertEqual(cross.quality, .incompatible)
        let overlaps = try XCTUnwrap(build([sample(.stepCount, date(16, 8), date(16, 10), 200),
                                            sample(.stepCount, date(16, 9), date(16, 11), 300)]).first)
        XCTAssertEqual(overlaps.quality, .incompatible)
    }
}
