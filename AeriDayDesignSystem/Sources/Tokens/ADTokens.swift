import SwiftUI

public enum ADSpacing {
    public static let xSmall: CGFloat = 4
    public static let small: CGFloat = 8
    public static let medium: CGFloat = 12
    public static let standard: CGFloat = 16
    public static let large: CGFloat = 24
    public static let xLarge: CGFloat = 32
}

public enum ADRadius {
    public static let control: CGFloat = 12
    public static let card: CGFloat = 16
}

public enum ADLayout {
    public static let pageInset: CGFloat = 16
    public static let minimumTouchTarget: CGFloat = 44
    public static let maximumReadableWidth: CGFloat = 720
}

public enum ADTypography {
    public static let pageTitle = Font.largeTitle.weight(.bold)
    public static let sectionTitle = Font.title3.weight(.semibold)
    public static let metric = Font.title2.weight(.semibold)
    public static let body = Font.body
    public static let supporting = Font.subheadline
}

