import AeriDayDesignSystem
import SwiftUI

struct AppRootView: View {
    @Environment(\.appEnvironment) private var appEnvironment
    @EnvironmentObject private var store: LocalEntriesStore
    @Environment(\.dynamicTypeSize) private var systemDynamicTypeSize
    @Environment(\.scenePhase) private var scenePhase
    @Binding var languageRawValue: String
    let runtime: AppRuntimeConfiguration

    private var language: AppLanguage {
        AppLanguage(rawValue: languageRawValue) ?? .system
    }

    private var locale: Locale {
        language.locale
            ?? Locale.autoupdatingCurrent
    }

    var body: some View {
        Group {
            if store.isAvailable {
                if runtime.usesSyntheticServices && !runtime.testsLovableInterface {
                    RootTabView(languageRawValue: $languageRawValue)
                } else {
                    LovableWebView(store: store, healthData: appEnvironment.healthData, isDemo: runtime.isDemo)
                        .ignoresSafeArea()
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "lock.doc")
                    Text("storage.unavailable")
                    Button("common.retry") { store.reload() }
                }.padding()
            }
        }
            .environment(\.locale, locale)
            .environment(\.dynamicTypeSize, runtime.dynamicTypeOverride ?? systemDynamicTypeSize)
            .preferredColorScheme(runtime.colorSchemeOverride)
            .task(id: scenePhase) {
                if scenePhase == .active && store.isAvailable {
                    await store.reminders.reconcile { store.entries.medications }
                }
            }
            .overlay {
                if scenePhase != .active {
                    ZStack {
                        ADColor.canvas.ignoresSafeArea()
                        VStack(spacing: ADSpacing.medium) {
                            Image(systemName: "lock.shield")
                                .font(.largeTitle)
                            Text("privacy.cover.title")
                                .font(ADTypography.sectionTitle)
                        }
                        .foregroundStyle(ADColor.textPrimary)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
    }
}
