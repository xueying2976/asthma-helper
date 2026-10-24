import AeriDayCore
import AeriDayDesignSystem
import SwiftUI

struct LogView: View {
    @EnvironmentObject private var store: LocalEntriesStore
    @State private var editing: JournalEntry?
    var body: some View {
        ADScreen {
            Button { editing = JournalEntry(date: Date(), text: "") } label: {
                Label("entry.add", systemImage: "plus").frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.borderedProminent).accessibilityIdentifier("entry.add")
            if store.entries.notes.isEmpty {
                ADEmptyState(title: "entry.empty", message: "entry.empty.detail", symbol: "note.text")
            }
            ForEach(store.entries.notes) { note in
                Button { editing = note } label: {
                    ADSectionCard {
                        Text(note.date, format: .dateTime.month().day().hour().minute()).font(.caption).foregroundStyle(.secondary)
                        Text(note.text).foregroundStyle(ADColor.textPrimary).frame(maxWidth: .infinity, alignment: .leading)
                    }
                }.buttonStyle(.plain)
            }
        }
        .navigationTitle("tab.log")
        .sheet(item: $editing) { NoteEditor(note: $0) }
    }
}

struct NoteEditor: View {
    @EnvironmentObject private var store: LocalEntriesStore
    @Environment(\.dismiss) private var dismiss
    @State var note: JournalEntry
    @State private var confirmsDeletion = false
    var body: some View {
        NavigationStack {
            Form {
                DatePicker("entry.date", selection: $note.date, in: ...Date())
                Section("entry.text") {
                    TextEditor(text: $note.text).frame(minHeight: 160).accessibilityIdentifier("entry.text")
                    Text("entry.limit").font(.caption).foregroundStyle(.secondary)
                }
                if store.entries.notes.contains(where: { $0.id == note.id }) {
                    Button("common.delete", role: .destructive) { confirmsDeletion = true }.accessibilityIdentifier("entry.delete")
                }
            }
            .navigationTitle("entry.editor")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("common.cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.save") { if store.saveNote(note) { dismiss() } }
                        .disabled(note.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || note.text.count > 2000)
                        .accessibilityIdentifier("entry.save")
                }
            }
            .confirmationDialog("entry.delete.confirm", isPresented: $confirmsDeletion, titleVisibility: .visible) {
                Button("common.delete", role: .destructive) { store.deleteNote(note.id); if store.errorKey == nil { dismiss() } }
            }
            .localStoreErrors()
        }
    }
}

#Preview { NavigationStack { LogView() }.aeriDayPreview(locale: "en-US", colorScheme: .light) }
