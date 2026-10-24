import SwiftUI
import UIKit

public enum ADColor {
    public static let brand = Color(uiColor: adaptive(light: 0x0B6B6F, dark: 0x70CDD0))
    public static let information = Color(uiColor: adaptive(light: 0x246A9F, dark: 0x70B7F0))
    public static let canvas = Color(uiColor: adaptive(light: 0xF4F8F7, dark: 0x0C1718))
    public static let surface = Color(uiColor: adaptive(light: 0xFFFFFF, dark: 0x162526))
    public static let textPrimary = Color(uiColor: adaptive(light: 0x112526, dark: 0xF3FAF9))
    public static let textSecondary = Color(uiColor: adaptive(light: 0x344748, dark: 0xD5E0E0))
    public static let stable = Color(uiColor: adaptive(light: 0x167C5A, dark: 0x65D6A4))
    public static let attention = Color(uiColor: adaptive(light: 0xA85D00, dark: 0xF6B85F))
    public static let critical = Color(uiColor: adaptive(light: 0xB42318, dark: 0xFF8A80))
    public static let neutral = Color(uiColor: adaptive(light: 0x667085, dark: 0xC3C9D4))
    public static let divider = Color(uiColor: adaptive(light: 0xDCE6E4, dark: 0x344546))

    private static func adaptive(light: Int, dark: Int) -> UIColor {
        UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        }
    }
}

private extension UIColor {
    convenience init(hex: Int) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
