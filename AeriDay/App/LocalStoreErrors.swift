import SwiftUI

private struct LocalStoreErrors: ViewModifier {
    @EnvironmentObject private var store: LocalEntriesStore
    func body(content: Content) -> some View {
        content.alert("common.notice", isPresented: Binding(
            get: { store.errorKey != nil }, set: { if !$0 { store.errorKey = nil } }
        )) {
            Button("common.ok") { store.errorKey = nil }
        } message: { Text(LocalizedStringKey(store.errorKey ?? "storage.save_error")) }
    }
}

extension View {
    func localStoreErrors() -> some View { modifier(LocalStoreErrors()) }
}
