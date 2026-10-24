import SwiftUI

private struct AeriDayPreviewModifier: ViewModifier {
    let localeIdentifier: String
    let colorScheme: ColorScheme
    let dynamicTypeSize: DynamicTypeSize
    let scenario: SyntheticScenario

    func body(content: Content) -> some View {
        content
            .environmentObject(LocalEntriesStore.preview())
            .environment(\.locale, Locale(identifier: localeIdentifier))
            .environment(\.dynamicTypeSize, dynamicTypeSize)
            .environment(\.appEnvironment, .synthetic(scenario))
            .preferredColorScheme(colorScheme)
    }
}

extension View {
    func aeriDayPreview(
        locale: String,
        colorScheme: ColorScheme,
        dynamicTypeSize: DynamicTypeSize = .large,
        scenario: SyntheticScenario = .content
    ) -> some View {
        modifier(
            AeriDayPreviewModifier(
                localeIdentifier: locale,
                colorScheme: colorScheme,
                dynamicTypeSize: dynamicTypeSize,
                scenario: scenario
            )
        )
    }
}
