import AeriDayCore
import AeriDayDesignSystem
import SwiftUI

struct TodayView: View {
    @Environment(\.appEnvironment) private var appEnvironment
    @Environment(\.scenePhase) private var scenePhase
    @EnvironmentObject private var store: LocalEntriesStore
    @State private var snapshot: HealthSnapshot?
    @State private var loadedAt: Date?
    @State private var editing: JournalEntry?
    @State private var isLoading = false

    private var highlights: [HealthMetricSummary] {
        let kinds: [HealthMetricKind] = [.restingHeartRate, .respiratoryRate, .sleepAnalysis, .stepCount, .oxygenSaturation, .workout]
        return Array(kinds.compactMap { kind in
            snapshot?.metrics.filter { $0.kind == kind && $0.value != nil }
                .sorted { $0.endDate == $1.endDate ? $0.sourceBundleIdentifier < $1.sourceBundleIdentifier : $0.endDate > $1.endDate }.first
        }.prefix(2))
    }

    var body: some View {
        ADScreen {
            HStack {
                Text(Date(), format: .dateTime.month().day().weekday()).foregroundStyle(.secondary)
                Spacer()
                if isLoading { ProgressView().accessibilityLabel("common.loading.title") }
            }
            if snapshot?.provenance.isSynthetic == true {
                Label("trial.sample", systemImage: "testtube.2").font(.caption).foregroundStyle(.secondary)
            }
            ADSectionCard {
                Label("today.environment.title", systemImage: "cloud.sun")
                    .font(.headline)
                Label("today.environment.unavailable.title", systemImage: "cloud.slash")
                    .font(.subheadline)
                Text("today.sheet.environment.message")
                    .font(.caption).foregroundStyle(.secondary)
            }.accessibilityIdentifier("today.environment")
            ADSectionCard {
                HStack {
                    Label("today.health.title", systemImage: "heart.text.square").font(.headline)
                    Spacer()
                    NavigationLink { HealthConnectionView() } label: {
                        Image(systemName: "chevron.right").frame(minWidth: 44, minHeight: 44)
                    }.accessibilityLabel("today.health.see_all")
                }
                if highlights.isEmpty {
                    NavigationLink { HealthConnectionView() } label: {
                        Label(emptyTitle, systemImage: "arrow.right.circle")
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    }
                }
                ForEach(highlights, id: \.kind) { metric in
                    Divider()
                    VStack(alignment: .leading, spacing: 8) {
                        Text(LocalizedStringKey(metric.titleKey)).font(.subheadline)
                        HStack(alignment: .firstTextBaseline) {
                            Text(metric.value ?? 0, format: .number.precision(.fractionLength(metric.kind == .stepCount ? 0 : 1)))
                                .font(.title2.weight(.semibold))
                            Text(LocalizedStringKey(metric.unitKey)).font(.caption).foregroundStyle(.secondary)
                        }
                        Text(metric.endDate, format: .dateTime.month().day().hour().minute()).font(.caption).foregroundStyle(.secondary)
                        Text(metric.sourceName).font(.caption).foregroundStyle(.secondary)
                        if metric.isOlder(than: Date()) {
                            Label("data.older", systemImage: "clock.badge.exclamationmark").font(.caption)
                        }
                    }
                }
            }.accessibilityIdentifier("today.dashboard")

            if !store.entries.medications.isEmpty {
                ADSectionCard {
                    NavigationLink { MedicationsView() } label: {
                        Label("medications.inventory.title", systemImage: "pills").font(.headline)
                    }
                    ForEach(Array(store.entries.medications.prefix(3))) { item in
                        Text(item.name).font(.subheadline)
                        SupplyLabel(item: item)
                    }
                }
            }
            Button { editing = JournalEntry(date: Date(), text: "") } label: {
                Label("entry.add", systemImage: "plus").frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.bordered).accessibilityIdentifier("today.add_entry")

            DisclosureGroup("today.sources.compact") {
                VStack(alignment: .leading, spacing: 8) {
                    if let loadedAt {
                        Text("data.checked")
                        Text(loadedAt, format: .dateTime.month().day().hour().minute())
                    }
                    Text("data.timestamps.detail")
                    Text("today.environment.unavailable.detail")
                }.font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .navigationTitle("tab.today")
        .task(id: scenePhase) { if scenePhase == .active { await refresh() } }
        .refreshable { await refresh() }
        .sheet(item: $editing) { NoteEditor(note: $0) }
    }

    private var emptyTitle: LocalizedStringKey {
        switch snapshot?.availability {
        case .accessNotRequested: "today.health.connect.title"
        case .serviceUnavailable: "today.health.unavailable.title"
        default: "today.health.no_data.title"
        }
    }

    private func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        snapshot = await appEnvironment.healthData.latestSnapshot()
        loadedAt = Date()
    }
}

#Preview("English") {
    NavigationStack { TodayView() }.aeriDayPreview(locale: "en-US", colorScheme: .light)
}
#Preview("中文大字") {
    NavigationStack { TodayView() }.aeriDayPreview(locale: "zh-Hans", colorScheme: .dark, dynamicTypeSize: .accessibility3)
}
