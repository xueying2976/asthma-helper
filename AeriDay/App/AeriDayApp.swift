import SwiftUI

@main
struct AeriDayApp: App {
    @StateObject private var localStore: LocalEntriesStore
    @AppStorage(AppLanguage.storageKey) private var languageRawValue = AppLanguage.system.rawValue

    private let runtime: AppRuntimeConfiguration
    private let appEnvironment: AppEnvironment

    init() {
        let runtime = AppRuntimeConfiguration.current()
        if runtime.resetsPreferences {
            UserDefaults.standard.removeObject(forKey: AppLanguage.storageKey)
        }
        if let language = runtime.localeOverride {
            UserDefaults.standard.set(language.rawValue, forKey: AppLanguage.storageKey)
        }
        self.runtime = runtime
        let isTesting = runtime.usesSyntheticServices
            || ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
        let store = LocalEntriesStore(factory: {
            // DEMO uses a NEW isolated namespace (AeriDayDemoV3) so an install that previously ran
            // the v2 demo in `AeriDayDemo` gets the full, coherent v3 synthetic scenario from an
            // empty store — WITHOUT deleting the old demo store or any personal records. UI tests
            // keep their own namespace; the real store (nil base) is never synthetic.
            let base = isTesting
                ? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                    .appendingPathComponent(runtime.isDemo ? "AeriDayDemoV3" : "AeriDayUITests", isDirectory: true)
                : nil
            return try SwiftDataEntriesPersistence(baseDirectory: base)
        }, reminders: LocalReminderService(isEnabled: !isTesting))
        if isTesting && runtime.resetsPreferences { store.deleteAll() }
        #if DEBUG
        if runtime.isDemo {
            DemoFixtures.seed(store: store)
            DemoFixtures.seedPersonalRecords(store: store)
        }
        #endif
        _localStore = StateObject(wrappedValue: store)
        appEnvironment = runtime.isDemo ? .demo() : isTesting
            ? .synthetic(runtime.scenario)
            : .live()
    }

    var body: some Scene {
        WindowGroup {
            AppRootView(
                languageRawValue: $languageRawValue,
                runtime: runtime
            )
            .environment(\.appEnvironment, appEnvironment)
            .environmentObject(localStore)
        }
    }
}
