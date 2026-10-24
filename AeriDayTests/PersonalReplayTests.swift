import AeriDayCore
import Foundation
import Testing

struct PersonalReplayTests {
    @Test func rollingReplayMatchesOnlyInformationAvailableAtEachDate() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/New_York")!
        let start = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 1)))
        func day(_ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: start)! }
        var features = [DailyFeature]()
        for offset in 0..<100 {
            if offset % 19 == 0 { continue } // A missing day must stay missing in replay.
            let source = offset < 85 ? "Synthetic watch A" : "Synthetic watch B"
            let shifted = offset >= 60
            features.append(DailyFeature(metric: .respiratoryRate, day: day(offset), sourceID: source,
                                         value: 15 + sin(Double(offset)) * 0.15 + (shifted ? 3 : 0),
                                         unit: "count/min", sampleCount: 8))
        }
        var fullPrevious = [BaselineSnapshot]()
        var pastPrevious = [BaselineSnapshot]()
        var sustained = false
        var review = false
        for offset in 40..<95 {
            let asOf = calendar.date(byAdding: .hour, value: 12, to: day(offset))!
            let full = PersonalChangeEngine.evaluate(features: features, asOf: asOf, calendar: calendar,
                                                     previousBaselines: fullPrevious)
            let availableThen = features.filter { $0.day < calendar.startOfDay(for: asOf) }
            let past = PersonalChangeEngine.evaluate(features: availableThen, asOf: asOf, calendar: calendar,
                                                     previousBaselines: pastPrevious)
            #expect(full == past, "Future observations changed replay at day \(offset)")
            let rr = try #require(full.findings.first { $0.metric == .respiratoryRate })
            sustained = sustained || rr.state == .sustainedPersonalDeviation
            review = review || rr.state == .baselineReviewNeeded
            #expect(rr.recent.allSatisfy { $0.day < calendar.startOfDay(for: asOf) })
            fullPrevious = full.baselines
            pastPrevious = past.baselines
        }
        #expect(sustained)
        #expect(review)
    }
}
