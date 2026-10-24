import Foundation
import SwiftUI

enum AppLanguage: String, CaseIterable, Identifiable, Sendable {
    case system
    case simplifiedChinese = "zh-Hans"
    case englishUS = "en-US"

    static var storageKey: String {
        preferenceStorageKey(arguments: ProcessInfo.processInfo.arguments)
    }

    static func preferenceStorageKey(arguments: [String]) -> String {
        #if DEBUG
        if arguments.contains("-demo") { return "app.language.preference.demo" }
        if arguments.contains(where: { $0.hasPrefix("-uiTest") }) {
            return "app.language.preference.uiTests"
        }
        #endif
        return "app.language.preference"
    }

    var id: String { rawValue }

    var locale: Locale? {
        switch self {
        case .system: nil
        case .simplifiedChinese: Locale(identifier: "zh-Hans")
        case .englishUS: Locale(identifier: "en-US")
        }
    }

    var localizedTitle: LocalizedStringKey {
        switch self {
        case .system: "language.system"
        case .simplifiedChinese: "language.zh_hans"
        case .englishUS: "language.en_us"
        }
    }
}
