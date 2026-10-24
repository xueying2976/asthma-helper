import AeriDayCore
import Foundation

/// Normalized transient samples only; no raw Health records are written to disk.
struct HistorySample: Sendable {
    let id: UUID
    let metric: HealthMetricKind
    let start: Date
    let end: Date
    let value: Double
    let sourceID: String
    let timeZoneID: String?
}

enum HealthHistoryBuilder {
    static func build(samples: [HistorySample], start: Date, now: Date, calendar: Calendar) -> [DailyFeature] {
        let today = calendar.startOfDay(for: now)
        let unique = Dictionary(samples.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first }).values
            .filter { $0.end >= start && $0.end <= now && $0.end >= $0.start && $0.value.isFinite && $0.value >= 0 }
        let sleep = Dictionary(grouping: unique.filter { $0.metric == .sleepAnalysis }, by: \.sourceID)
        var sleepEpisodes = [(source: String, day: Date, intervals: [HistorySample])]()
        for (source, values) in sleep {
            var episode = [HistorySample]()
            var episodeEnd = Date.distantPast
            func appendEpisode() {
                guard let end = episode.map(\.end).max() else { return }
                let hour = calendar.component(.hour, from: end)
                // Explicit overnight heuristic; daytime naps are not nightly duration.
                guard (3...15).contains(hour) else { return }
                sleepEpisodes.append((source, calendar.startOfDay(for: end), episode))
            }
            for sample in values.sorted(by: { $0.start < $1.start }) {
                if !episode.isEmpty && sample.start.timeIntervalSince(episodeEnd) > 3 * 3_600 {
                    appendEpisode(); episode = []
                }
                episode.append(sample); episodeEnd = max(episodeEnd, sample.end)
            }
            appendEpisode()
        }
        struct Key: Hashable { let metric: HealthMetricKind; let day: Date; let source: String }
        var grouped = [Key: [HistorySample]]()
        for sample in unique where sample.metric != .sleepAnalysis {
            var day = calendar.startOfDay(for: sample.end)
            if sample.metric == .respiratoryRate {
                guard let episode = sleepEpisodes.first(where: {
                    $0.source == sample.sourceID && $0.intervals.contains { sample.start >= $0.start && sample.end <= $0.end }
                }) else {
                    grouped[Key(metric: sample.metric, day: day, source: sample.sourceID), default: []].append(sample)
                    continue
                }
                day = episode.day
            }
            grouped[Key(metric: sample.metric, day: day, source: sample.sourceID), default: []].append(sample)
        }
        var features = [DailyFeature]()
        for episode in sleepEpisodes {
            let key = Key(metric: .sleepAnalysis, day: episode.day, source: episode.source)
            grouped[key, default: []] += episode.intervals
        }
        for (key, rows) in grouped where key.day >= start && key.day < today {
            var flags: [DailyQualityFlag] = [.coverageUnknown]
            var quality = DailyFeatureQuality.usable
            if rows.contains(where: { $0.timeZoneID.map { $0 != calendar.timeZone.identifier } ?? false }) {
                flags.append(.timeZoneChanged); quality = .incompatible
            }
            let value: Double
            let unit: String
            switch key.metric {
            case .sleepAnalysis:
                value = unionDuration(rows) / 60; unit = "min"
            case .respiratoryRate:
                let confirmed = rows.allSatisfy { row in
                    sleepEpisodes.contains { episode in
                        episode.source == key.source && episode.day == key.day && episode.intervals.contains {
                            row.start >= $0.start && row.end <= $0.end
                        }
                    }
                }
                if !confirmed { quality = .incompatible; flags.append(.sleepContextUnconfirmed) }
                let hours = Dictionary(grouping: rows) { Int($0.end.timeIntervalSince1970 / 3_600) }
                value = median(hours.values.map { median($0.map(\.value)) }); unit = "count/min"
            case .restingHeartRate:
                value = median(rows.map(\.value)); unit = "count/min"
            case .oxygenSaturation:
                value = median(rows.map(\.value)); unit = "%"
            case .stepCount:
                // Cross-midnight cumulative intervals cannot be allocated to a day without assumptions.
                let crossesMidnight = rows.contains { calendar.startOfDay(for: $0.start) != key.day }
                let sorted = rows.sorted { $0.start < $1.start }
                let overlaps = zip(sorted, sorted.dropFirst()).contains { $0.end > $1.start }
                if crossesMidnight || overlaps { quality = .incompatible; flags.append(.duplicateDay) }
                value = rows.reduce(0) { $0 + $1.value }; unit = "count"
            case .workout:
                // Pick non-overlapping workouts within the selected source, excluding duplicate sessions.
                var end = Date.distantPast
                var total = 0.0
                for row in rows.sorted(by: { $0.start < $1.start }) where row.start >= end {
                    total += min(row.value, row.end.timeIntervalSince(row.start) / 60); end = row.end
                }
                value = total; unit = "min"
            }
            features.append(DailyFeature(metric: key.metric, day: key.day, sourceID: key.source,
                value: value, unit: unit, sampleCount: rows.count, quality: quality, flags: flags))
        }
        // Keep simultaneous devices separate. The engine withholds ambiguous baselines
        // until explicit source selection; source priority is never silently guessed.
        let selected = features
        var previous = [HealthMetricKind: String]()
        return selected.sorted { $0.day == $1.day ? $0.metric.rawValue < $1.metric.rawValue : $0.day < $1.day }.map { feature in
            var flags = feature.flags
            if let old = previous[feature.metric], old != feature.sourceID { flags.append(.sourceChanged) }
            previous[feature.metric] = feature.sourceID
            return DailyFeature(metric: feature.metric, day: feature.day, sourceID: feature.sourceID,
                value: feature.value, unit: feature.unit, sampleCount: feature.sampleCount, quality: feature.quality, flags: flags)
        }
    }

    private static func median(_ values: [Double]) -> Double {
        let sorted = values.sorted(); guard !sorted.isEmpty else { return 0 }
        let index = sorted.count / 2
        return sorted.count.isMultiple(of: 2) ? (sorted[index - 1] + sorted[index]) / 2 : sorted[index]
    }

    private static func unionDuration(_ rows: [HistorySample]) -> Double {
        var end = Date.distantPast
        var total = 0.0
        for row in rows.sorted(by: { $0.start < $1.start }) {
            total += max(0, row.end.timeIntervalSince(max(end, row.start))); end = max(end, row.end)
        }
        return total
    }
}
