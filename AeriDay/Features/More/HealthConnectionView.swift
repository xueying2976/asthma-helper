import AeriDayCore
import AeriDayDesignSystem
import SwiftUI
import UIKit

struct HealthConnectionView: View {
    @Environment(\.appEnvironment) private var appEnvironment
    @Environment(\.openURL) private var openURL
    @State private var snapshot: HealthSnapshot?
    @State private var isRequesting = false

    var body: some View {
        ADScreen {
            ADDisclosureBanner("health.disclosure.read_only")

            if let snapshot {
                if snapshot.availability == .accessNotRequested {
                    authorizationEducation
                } else {
                    statusCard(snapshot)
                    metricsCard(snapshot)
                    controlsCard
                }
            } else {
                ADEmptyState(
                    title: "common.loading.title",
                    message: "health.loading.message",
                    symbol: "heart.text.square"
                )
            }
        }
        .navigationTitle("health.connection.title")
        .task { await refresh() }
        .refreshable { await refresh() }
    }

    private var authorizationEducation: some View {
        Group {
            ADSectionCard {
                Text("health.education.introduction")
                    .font(ADTypography.body)
                    .foregroundStyle(ADColor.textPrimary)

                ForEach(HealthMetricKind.allCases, id: \.self) { kind in
                    Label(metricTitle(kind), systemImage: metricSymbol(kind))
                        .foregroundStyle(ADColor.textPrimary)
                }
            }

            ADSectionCard {
                Text("health.education.privacy.title")
                    .font(ADTypography.sectionTitle)
                Label("health.education.privacy.read_only", systemImage: "arrow.down.heart")
                Label("health.education.privacy.memory_only", systemImage: "memorychip")
                Label("health.education.privacy.no_upload", systemImage: "icloud.slash")
                Text("health.education.boundary")
                    .font(ADTypography.supporting)
                    .foregroundStyle(ADColor.textSecondary)
            }

            ADPrimaryButton("health.connection.continue") {
                Task { await requestAuthorization() }
            }
            .disabled(isRequesting)
            .accessibilityIdentifier("health.connect.button")
        }
    }

    private func statusCard(_ snapshot: HealthSnapshot) -> some View {
        ADSectionCard {
            ADStatusBadge(statusTitle(snapshot), style: statusStyle(snapshot))
            Text(statusMessage(snapshot))
                .font(ADTypography.body)
                .foregroundStyle(ADColor.textSecondary)
            if let collectedAt = snapshot.provenance.collectedAt {
                Label {
                    Text(collectedAt, format: .dateTime.month().day().hour().minute())
                } icon: {
                    Image(systemName: "clock")
                }
                .font(ADTypography.supporting)
                .foregroundStyle(ADColor.textSecondary)
            }
        }
    }

    private func metricsCard(_ snapshot: HealthSnapshot) -> some View {
        ADSectionCard {
            Text("health.metrics.title")
                .font(ADTypography.sectionTitle)

            ForEach(Array(HealthMetricKind.allCases.enumerated()), id: \.element) { index, kind in
                if index > 0 { Divider() }
                metricRow(kind, snapshot: snapshot)
            }
        }
        .privacySensitive()
    }

    private func metricRow(_ kind: HealthMetricKind, snapshot: HealthSnapshot) -> some View {
        let summaries = snapshot.metrics.filter { $0.kind == kind }
        let latest = summaries.max(by: { $0.endDate < $1.endDate })
        let sourceCount = Set(summaries.map(\.sourceBundleIdentifier)).count

        return VStack(alignment: .leading, spacing: ADSpacing.xSmall) {
            Label(metricTitle(kind), systemImage: metricSymbol(kind))
                .font(.body.weight(.semibold))
                .foregroundStyle(ADColor.textPrimary)

            if let latest, let value = latest.value {
                HStack(alignment: .firstTextBaseline, spacing: ADSpacing.xSmall) {
                    Text(value, format: .number.precision(.fractionLength(kind == .stepCount ? 0 : 1)))
                        .font(ADTypography.metric)
                        .foregroundStyle(ADColor.brand)
                    Text(metricUnit(kind))
                        .font(ADTypography.supporting)
                        .foregroundStyle(ADColor.textSecondary)
                }
                Text(latest.endDate, format: .dateTime.month().day().hour().minute())
                    .font(ADTypography.supporting)
                    .foregroundStyle(ADColor.textSecondary)
                Text(sourceCount > 1 ? "health.metric.multiple_sources" : "health.metric.source")
                    .font(ADTypography.supporting)
                    .foregroundStyle(ADColor.textSecondary)
                Text(latest.sourceName)
                    .font(ADTypography.supporting)
                    .foregroundStyle(ADColor.textSecondary)
            } else {
                Text(snapshot.failedKinds.contains(kind) ? "data.read_failed" : "health.metric.no_data")
                    .font(ADTypography.body)
                    .foregroundStyle(ADColor.textSecondary)
            }

            Text(metricDisclaimer(kind))
                .font(ADTypography.supporting)
                .foregroundStyle(ADColor.textSecondary)
            if let latest, latest.isOlder(than: Date()) {
                Label("data.older", systemImage: "clock.badge.exclamationmark").font(.caption)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var controlsCard: some View {
        ADSectionCard {
            ADSecondaryButton("health.connection.refresh") {
                Task { await refresh() }
            }
            ADSecondaryButton("health.connection.manage_access") {
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    openURL(settingsURL)
                }
            }
            Text("health.access.detail").font(.caption).foregroundStyle(.secondary)
            ADSecondaryButton("health.disconnect") {
                Task { snapshot = await appEnvironment.healthData.disconnect() }
            }
        }
    }

    private func refresh() async {
        snapshot = await appEnvironment.healthData.latestSnapshot()
    }

    private func requestAuthorization() async {
        isRequesting = true
        snapshot = await appEnvironment.healthData.requestAuthorization()
        isRequesting = false
    }

    private func statusTitle(_ snapshot: HealthSnapshot) -> LocalizedStringKey {
        switch snapshot.availability {
        case .sampleAvailable: "health.connection.available.title"
        case .noAvailableData: "health.connection.no_data.title"
        case .accessNotRequested: "health.connection.not_requested.title"
        case .serviceUnavailable: "health.connection.unavailable.title"
        }
    }

    private func statusMessage(_ snapshot: HealthSnapshot) -> LocalizedStringKey {
        switch snapshot.availability {
        case .sampleAvailable:
            snapshot.metrics.map(\.kind).uniquedCount < HealthMetricKind.allCases.count
                ? "health.connection.partial.message"
                : "health.connection.available.message"
        case .noAvailableData: "health.connection.no_data.message"
        case .accessNotRequested: "health.connection.not_requested.message"
        case .serviceUnavailable: "health.connection.error.message"
        }
    }

    private func statusStyle(_ snapshot: HealthSnapshot) -> ADStatusStyle {
        snapshot.availability == .sampleAvailable ? .informational : .unavailable
    }

    private func metricTitle(_ kind: HealthMetricKind) -> LocalizedStringKey {
        switch kind {
        case .respiratoryRate: "health.metric.respiratory_rate.title"
        case .restingHeartRate: "health.metric.resting_heart_rate.title"
        case .sleepAnalysis: "health.metric.sleep.title"
        case .oxygenSaturation: "health.metric.oxygen_saturation.title"
        case .stepCount: "health.metric.steps.title"
        case .workout: "health.metric.workouts.title"
        }
    }

    private func metricDisclaimer(_ kind: HealthMetricKind) -> LocalizedStringKey {
        switch kind {
        case .respiratoryRate: "health.metric.respiratory_rate.disclaimer"
        case .restingHeartRate: "health.metric.resting_heart_rate.disclaimer"
        case .sleepAnalysis: "health.metric.sleep.disclaimer"
        case .oxygenSaturation: "health.metric.oxygen_saturation.disclaimer"
        case .stepCount: "health.metric.steps.disclaimer"
        case .workout: "health.metric.workouts.disclaimer"
        }
    }

    private func metricUnit(_ kind: HealthMetricKind) -> LocalizedStringKey {
        switch kind {
        case .respiratoryRate: "health.metric.respiratory_rate.unit"
        case .restingHeartRate: "health.metric.resting_heart_rate.unit"
        case .sleepAnalysis: "health.metric.sleep.unit"
        case .oxygenSaturation: "health.metric.oxygen_saturation.unit"
        case .stepCount: "health.metric.steps.unit"
        case .workout: "health.metric.workouts.unit"
        }
    }

    private func metricSymbol(_ kind: HealthMetricKind) -> String {
        switch kind {
        case .respiratoryRate: "lungs"
        case .restingHeartRate: "heart"
        case .sleepAnalysis: "bed.double"
        case .oxygenSaturation: "drop"
        case .stepCount: "figure.walk"
        case .workout: "figure.run"
        }
    }
}

private extension Sequence where Element: Hashable {
    var uniquedCount: Int { Set(self).count }
}

#Preview("Apple Health — English") {
    NavigationStack { HealthConnectionView() }
        .aeriDayPreview(locale: "en-US", colorScheme: .light, scenario: .accessNotRequested)
}

#Preview("Apple 健康 — 中文大字") {
    NavigationStack { HealthConnectionView() }
        .aeriDayPreview(
            locale: "zh-Hans",
            colorScheme: .dark,
            dynamicTypeSize: .accessibility3,
            scenario: .multipleSources
        )
}
