#if DEBUG
import AeriDayDesignSystem
import SwiftUI

struct ScenarioGalleryView: View {
    var body: some View {
        ADScreen {
            ForEach(SyntheticScenario.allCases) { scenario in
                ADSectionCard {
                    ADStatusBadge(statusTitle(for: scenario), style: statusStyle(for: scenario))
                    Text(verbatim: scenario.rawValue)
                        .font(.body.monospaced())
                    Text("scenarios.synthetic_only")
                        .foregroundStyle(ADColor.textSecondary)
                }
            }
        }
        .navigationTitle("more.scenarios.title")
    }

    private func statusTitle(for scenario: SyntheticScenario) -> LocalizedStringKey {
        switch scenario {
        case .content, .multipleSources: "scenario.content"
        case .insufficientData, .accessNotRequested: "scenario.empty"
        case .staleData: "scenario.stale"
        case .serviceUnavailable: "scenario.error"
        }
    }

    private func statusStyle(for scenario: SyntheticScenario) -> ADStatusStyle {
        switch scenario {
        case .content, .multipleSources: .informational
        case .insufficientData, .accessNotRequested, .staleData, .serviceUnavailable: .unavailable
        }
    }
}

#Preview("Scenario Gallery") {
    NavigationStack { ScenarioGalleryView() }
        .aeriDayPreview(locale: "en-US", colorScheme: .light, scenario: .serviceUnavailable)
}
#endif
