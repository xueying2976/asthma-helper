import AeriDayDesignSystem
import SwiftUI

struct RootTabView: View {
    @Binding var languageRawValue: String

    var body: some View {
        TabView {
            NavigationStack {
                TodayView()
            }
            .tabItem {
                Label("tab.today", systemImage: "sun.max")
                    .accessibilityIdentifier("tab.today")
            }

            NavigationStack {
                LogView()
            }
            .tabItem {
                Label("tab.log", systemImage: "square.and.pencil")
                    .accessibilityIdentifier("tab.log")
            }

            NavigationStack {
                MedicationsView()
            }
            .tabItem {
                Label("tab.medications", systemImage: "cross.case")
                    .accessibilityIdentifier("tab.medications")
            }

            NavigationStack {
                TrendsView()
            }
            .tabItem {
                Label("tab.trends", systemImage: "chart.xyaxis.line")
                    .accessibilityIdentifier("tab.trends")
            }

            NavigationStack {
                MoreView(languageRawValue: $languageRawValue)
            }
            .tabItem {
                Label("tab.more", systemImage: "ellipsis.circle")
                    .accessibilityIdentifier("tab.more")
            }
        }
        .tint(ADColor.brand)
    }
}

#Preview("English Light") {
    RootTabView(languageRawValue: .constant(AppLanguage.englishUS.rawValue))
        .aeriDayPreview(locale: "en-US", colorScheme: .light, scenario: .content)
}

#Preview("中文 Dark Large") {
    RootTabView(languageRawValue: .constant(AppLanguage.simplifiedChinese.rawValue))
        .aeriDayPreview(
            locale: "zh-Hans",
            colorScheme: .dark,
            dynamicTypeSize: .accessibility3,
            scenario: .staleData
        )
}

