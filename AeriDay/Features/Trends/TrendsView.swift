import AeriDayCore
import AeriDayDesignSystem
import SwiftUI

struct TrendsView: View {
    @EnvironmentObject private var store: LocalEntriesStore
    @State private var days = 7
    @State private var editing: JournalEntry?
    private var start: Date { Calendar.current.date(byAdding: .day, value: -(days - 1), to: Calendar.current.startOfDay(for: Date())) ?? .distantPast }
    private var items: [HistoryItem] {
        let notes = store.entries.notes.map { HistoryItem(id: $0.id, date: $0.date, note: $0, change: nil) }
        let changes = store.entries.changes.map { HistoryItem(id: $0.id, date: $0.date, note: nil, change: $0) }
        return (notes + changes).filter { $0.date >= start }.sorted { $0.date > $1.date }
    }
    var body: some View {
        ADScreen {
            Picker("history.range", selection: $days) {
                Text("history.week").tag(7)
                Text("history.month").tag(30)
            }.pickerStyle(.segmented)
            if items.isEmpty { ADEmptyState(title: "history.empty", message: "history.empty.detail", symbol: "clock") }
            ForEach(items) { row in
                ADSectionCard {
                    Text(row.date, format: .dateTime.month().day().hour().minute()).font(.caption).foregroundStyle(.secondary)
                    if let note = row.note {
                        Button { editing = note } label: { Text(note.text).foregroundStyle(ADColor.textPrimary).frame(maxWidth: .infinity, alignment: .leading) }
                            .buttonStyle(.plain)
                    } else if let change = row.change, let medication = store.entries.medications.first(where: { $0.id == change.medicationID }) {
                        Text(medication.name).font(.headline)
                        Text("history.supply")
                        HStack {
                            Text(change.before, format: .number)
                            Image(systemName: "arrow.right").accessibilityLabel("history.changed_to")
                            Text(change.after, format: .number)
                            Text(LocalizedStringKey("supply.unit." + medication.unit.rawValue))
                        }
                    }
                }
            }
        }
        .navigationTitle("tab.trends")
        .sheet(item: $editing) { NoteEditor(note: $0) }
    }
}

private struct HistoryItem: Identifiable {
    let id: UUID
    let date: Date
    let note: JournalEntry?
    let change: SupplyChange?
}

#Preview { NavigationStack { TrendsView() }.aeriDayPreview(locale: "en-US", colorScheme: .light) }
