import SwiftUI

public struct ADScreen<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ADSpacing.standard) {
                content
            }
            .frame(maxWidth: ADLayout.maximumReadableWidth, alignment: .leading)
            .padding(ADLayout.pageInset)
            .frame(maxWidth: .infinity)
        }
        .background(ADColor.canvas.ignoresSafeArea())
    }
}

public struct ADSectionCard<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: ADSpacing.medium) {
            content
        }
        .padding(ADSpacing.standard)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ADColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: ADRadius.card, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: ADRadius.card, style: .continuous)
                .stroke(ADColor.divider, lineWidth: 1)
        }
    }
}

public struct ADMetricCard: View {
    private let title: LocalizedStringKey
    private let value: LocalizedStringKey
    private let detail: LocalizedStringKey
    private let symbol: String

    public init(
        title: LocalizedStringKey,
        value: LocalizedStringKey,
        detail: LocalizedStringKey,
        symbol: String
    ) {
        self.title = title
        self.value = value
        self.detail = detail
        self.symbol = symbol
    }

    public var body: some View {
        ADSectionCard {
            Label(title, systemImage: symbol)
                .font(ADTypography.sectionTitle)
                .foregroundStyle(ADColor.textPrimary)
            Text(value)
                .font(ADTypography.metric)
                .foregroundStyle(ADColor.brand)
            Text(detail)
                .font(ADTypography.supporting)
                .foregroundStyle(ADColor.textSecondary)
        }
    }
}

