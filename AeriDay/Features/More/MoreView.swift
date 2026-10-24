import AeriDayDesignSystem
import SwiftUI

struct MoreView: View {
    @Binding var languageRawValue: String
    @EnvironmentObject private var store: LocalEntriesStore
    @State private var confirmsDeletion = false
    var body: some View {
        Form {
            Section {
                NavigationLink { HealthConnectionView() } label: {
                    Label("health.connection.title", systemImage: "heart.text.square")
                }.accessibilityIdentifier("health.connection.entry")
                Picker("more.language.title", selection: $languageRawValue) {
                    ForEach(AppLanguage.allCases) { language in
                        Text(language.localizedTitle).tag(language.rawValue)
                    }
                }.accessibilityIdentifier("language.picker")
            }
            Section("more.privacy.title") {
                Text("more.privacy.local")
                Text("more.privacy.no_cloud")
                Text("storage.backup_warning").font(.footnote).foregroundStyle(.secondary)
                Button("storage.delete_all", role: .destructive) { confirmsDeletion = true }
                    .accessibilityIdentifier("storage.delete_all")
            }
            Section("more.boundaries.title") {
                Text("more.boundaries.message").foregroundStyle(.secondary)
            }
            #if DEBUG
            Section {
                NavigationLink("more.scenarios.title") { ScenarioGalleryView() }
            }
            #endif
        }
        .navigationTitle("tab.more")
        .confirmationDialog("storage.delete_confirm", isPresented: $confirmsDeletion, titleVisibility: .visible) {
            Button("storage.delete_all", role: .destructive) { store.deleteAll() }
        } message: { Text("storage.delete_detail") }
        .localStoreErrors()
    }
}

#Preview { NavigationStack { MoreView(languageRawValue: .constant("en-US")) }.aeriDayPreview(locale: "en-US", colorScheme: .light) }
