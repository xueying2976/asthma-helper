import SwiftUI

public struct ADPrimaryButton: View {
    private let title: LocalizedStringKey
    private let action: () -> Void

    public init(_ title: LocalizedStringKey, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: ADLayout.minimumTouchTarget)
        }
        .buttonStyle(.borderedProminent)
        .tint(ADColor.brand)
    }
}

public struct ADSecondaryButton: View {
    private let title: LocalizedStringKey
    private let action: () -> Void

    public init(_ title: LocalizedStringKey, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: ADLayout.minimumTouchTarget)
        }
        .buttonStyle(.bordered)
        .tint(ADColor.brand)
    }
}

public struct ADEmptyState: View {
    private let title: LocalizedStringKey
    private let message: LocalizedStringKey
    private let symbol: String

    public init(title: LocalizedStringKey, message: LocalizedStringKey, symbol: String) {
        self.title = title
        self.message = message
        self.symbol = symbol
    }

    public var body: some View {
        ADSectionCard {
            Image(systemName: symbol)
                .font(.title2)
                .foregroundStyle(ADColor.neutral)
                .accessibilityHidden(true)
            Text(title)
                .font(ADTypography.sectionTitle)
                .foregroundStyle(ADColor.textPrimary)
            Text(message)
                .font(ADTypography.body)
                .foregroundStyle(ADColor.textSecondary)
        }
    }
}

public struct ADDisclosureBanner: View {
    private let message: LocalizedStringKey

    public init(_ message: LocalizedStringKey) {
        self.message = message
    }

    public var body: some View {
        Label(message, systemImage: "shield.lefthalf.filled")
            .font(ADTypography.supporting)
            .foregroundStyle(ADColor.textPrimary)
            .padding(ADSpacing.standard)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(ADColor.information.opacity(0.10))
            .clipShape(RoundedRectangle(cornerRadius: ADRadius.control, style: .continuous))
    }
}
