import SwiftUI

public struct ADDataSourceRow: View {
    private let title: LocalizedStringKey
    private let source: LocalizedStringKey
    private let detail: LocalizedStringKey
    private let symbol: String

    public init(
        title: LocalizedStringKey,
        source: LocalizedStringKey,
        detail: LocalizedStringKey,
        symbol: String
    ) {
        self.title = title
        self.source = source
        self.detail = detail
        self.symbol = symbol
    }

    public var body: some View {
        HStack(alignment: .top, spacing: ADSpacing.medium) {
            Image(systemName: symbol)
                .foregroundStyle(ADColor.information)
                .frame(width: ADLayout.minimumTouchTarget, height: ADLayout.minimumTouchTarget)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: ADSpacing.xSmall) {
                Text(title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(ADColor.textPrimary)
                Text(source)
                    .font(ADTypography.supporting)
                    .foregroundStyle(ADColor.textSecondary)
                Text(detail)
                    .font(ADTypography.supporting)
                    .foregroundStyle(ADColor.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }
}
