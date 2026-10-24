import SwiftUI

public enum ADStatusStyle: Sendable {
    case informational
    case attention
    case critical
    case unavailable

    var color: Color {
        switch self {
        case .informational: ADColor.information
        case .attention: ADColor.attention
        case .critical: ADColor.critical
        case .unavailable: ADColor.neutral
        }
    }

    var symbol: String {
        switch self {
        case .informational: "info.circle.fill"
        case .attention: "exclamationmark.triangle.fill"
        case .critical: "exclamationmark.octagon.fill"
        case .unavailable: "questionmark.circle"
        }
    }
}

public struct ADStatusBadge: View {
    private let title: LocalizedStringKey
    private let style: ADStatusStyle

    public init(_ title: LocalizedStringKey, style: ADStatusStyle) {
        self.title = title
        self.style = style
    }

    public var body: some View {
        Label(title, systemImage: style.symbol)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(style.color)
            .padding(.horizontal, ADSpacing.medium)
            .padding(.vertical, ADSpacing.small)
            .background(style.color.opacity(0.12))
            .clipShape(Capsule())
    }
}

public struct ADFreshnessLabel: View {
    private let title: LocalizedStringKey
    private let isStale: Bool

    public init(_ title: LocalizedStringKey, isStale: Bool) {
        self.title = title
        self.isStale = isStale
    }

    public var body: some View {
        Label(title, systemImage: isStale ? "clock.badge.exclamationmark" : "clock")
            .font(ADTypography.supporting)
            .foregroundStyle(isStale ? ADColor.attention : ADColor.textSecondary)
    }
}

