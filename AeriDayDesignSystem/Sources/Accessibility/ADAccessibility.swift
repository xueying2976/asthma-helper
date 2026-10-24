import SwiftUI

public extension View {
    func adMinimumTouchTarget() -> some View {
        frame(minWidth: ADLayout.minimumTouchTarget, minHeight: ADLayout.minimumTouchTarget)
    }
}
