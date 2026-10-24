@testable import AeriDay
import AeriDayCore
import Foundation
import Testing

struct HarnessTests {
    @Test func demoRuntimeIsIsolatedAndDoesNotResetData() {
        let runtime = AppRuntimeConfiguration.current(arguments: ["AeriDay", "-demo"])
        #expect(runtime.isDemo)
        #expect(runtime.usesSyntheticServices)
        #expect(runtime.testsLovableInterface)
        #expect(!runtime.resetsPreferences)
        #expect(AppLanguage.preferenceStorageKey(arguments: ["AeriDay", "-demo"]) == "app.language.preference.demo")
    }

    @Test func demoMetricsHaveExplicitSyntheticSourcesAndMissingDays() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let snapshot = DemoFixtures.health(now: now)
        #expect(snapshot.provenance.isSynthetic)
        #expect(snapshot.metrics.count == 6)
        for metric in snapshot.metrics {
            #expect(metric.sourceName.contains("DEMO"))
            #expect(metric.endDate <= now)
            let points = DemoFixtures.points(kind: metric.kind)
            #expect(points.count == 30)
            #expect(points.filter { $0 is NSNull }.count == 2)
            #expect(points.last is Double)
        }
    }

    @Test func fixedClockIsDeterministic() {
        let expected = Date(timeIntervalSince1970: 1_786_000_000)
        #expect(FixedClock(now: expected).now == expected)
    }

    @Test func contentScenarioUsesOnlySyntheticProvenance() async {
        let environment = AppEnvironment.synthetic(.content)
        let health = await environment.healthData.latestSnapshot()
        let environmental = await environment.environmentData.latestSnapshot()
        let local = await environment.localRecords.summary()

        #expect(health.provenance.isSynthetic)
        #expect(environmental.provenance.isSynthetic)
        #expect(local.provenance.isSynthetic)
    }

    @Test func missingHealthDataRemainsMissing() async {
        let health = await AppEnvironment.synthetic(.insufficientData).healthData.latestSnapshot()
        #expect(health.availability != .sampleAvailable)
        #expect(health.metrics.isEmpty)
    }

    @Test func unavailableServiceRemainsUnavailable() async {
        let health = await AppEnvironment.synthetic(.serviceUnavailable).healthData.latestSnapshot()
        #expect(health.availability == .serviceUnavailable)
    }

    @Test func languageIdentifiersAreStable() {
        #expect(AppLanguage.system.rawValue == "system")
        #expect(AppLanguage.simplifiedChinese.locale?.identifier == "zh-Hans")
        #expect(AppLanguage.englishUS.locale?.identifier == "en-US")
    }

    @Test func uiTestLanguagePreferencesDoNotOverwriteTrialPreferences() {
        #expect(AppLanguage.preferenceStorageKey(arguments: ["AeriDay"]) == "app.language.preference")
        #expect(AppLanguage.preferenceStorageKey(arguments: ["AeriDay", "-uiTestLovable"])
                == "app.language.preference.uiTests")
        #expect(AppLanguage.preferenceStorageKey(arguments: ["AeriDay", "-uiTestLocale", "en-US"])
                == "app.language.preference.uiTests")
    }

    @Test func uiTestRuntimeArgumentsAreDeterministic() {
        let configuration = AppRuntimeConfiguration.current(arguments: [
            "AeriDay",
            "-uiTestLocale", "zh-Hans",
            "-uiTestTheme", "dark",
            "-uiTestContentSize", "accessibility3",
            "-uiTestScenario", "staleData",
            "-uiTestReset"
        ])

        #expect(configuration.localeOverride == .simplifiedChinese)
        #expect(configuration.colorSchemeOverride == .dark)
        #expect(configuration.dynamicTypeOverride == .accessibility3)
        #expect(configuration.scenario == .staleData)
        #expect(configuration.resetsPreferences)
    }
}
