import SwiftUI

struct AppRuntimeConfiguration: Sendable {
    let localeOverride: AppLanguage?
    let colorSchemeOverride: ColorScheme?
    let dynamicTypeOverride: DynamicTypeSize?
    let scenario: SyntheticScenario
    let resetsPreferences: Bool
    let usesSyntheticServices: Bool
    let testsLovableInterface: Bool
    let isDemo: Bool

    static func current(arguments: [String] = ProcessInfo.processInfo.arguments) -> AppRuntimeConfiguration {
        #if !DEBUG
        return AppRuntimeConfiguration(localeOverride: nil, colorSchemeOverride: nil,
            dynamicTypeOverride: nil, scenario: .insufficientData, resetsPreferences: false,
            usesSyntheticServices: false, testsLovableInterface: false, isDemo: false)
        #else
        let locale: AppLanguage?
        switch value(after: "-uiTestLocale", in: arguments) {
        case "zh-Hans": locale = .simplifiedChinese
        case "en-US": locale = .englishUS
        default: locale = nil
        }

        let colorScheme: ColorScheme?
        switch value(after: "-uiTestTheme", in: arguments) {
        case "dark": colorScheme = .dark
        case "light": colorScheme = .light
        default: colorScheme = nil
        }

        let dynamicType: DynamicTypeSize? = value(after: "-uiTestContentSize", in: arguments) == "accessibility3"
            ? .accessibility3
            : nil
        let scenario = value(after: "-uiTestScenario", in: arguments)
            .flatMap(SyntheticScenario.init(rawValue:)) ?? .content

        let demo = arguments.contains("-demo")
        return AppRuntimeConfiguration(
            localeOverride: demo ? .englishUS : locale,
            colorSchemeOverride: colorScheme,
            dynamicTypeOverride: dynamicType,
            scenario: scenario,
            resetsPreferences: arguments.contains("-uiTestReset"),
            usesSyntheticServices: demo || arguments.contains { $0.hasPrefix("-uiTest") },
            testsLovableInterface: demo || arguments.contains("-uiTestLovable"),
            isDemo: demo
        )
        #endif
    }

    private static func value(after flag: String, in arguments: [String]) -> String? {
        guard let index = arguments.firstIndex(of: flag), arguments.indices.contains(index + 1) else {
            return nil
        }
        return arguments[index + 1]
    }
}
