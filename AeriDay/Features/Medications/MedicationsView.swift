import AeriDayCore
import AeriDayDesignSystem
import SwiftUI

struct MedicationsView: View {
    @EnvironmentObject private var store: LocalEntriesStore
    @State private var editing: MedicationItem?
    var body: some View {
        ADScreen {
            Button { editing = MedicationItem(name: "", unit: .puff, remaining: 0, confirmedAt: Date()) } label: {
                Label("medication.add", systemImage: "plus").frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.borderedProminent).accessibilityIdentifier("medication.add")
            if store.entries.medications.isEmpty {
                ADEmptyState(title: "medications.empty.title", message: "medication.empty.detail", symbol: "pills")
            }
            ForEach(store.entries.medications) { item in
                Button { editing = item } label: {
                    ADSectionCard {
                        Text(item.name).font(.headline).foregroundStyle(ADColor.textPrimary)
                        SupplyLabel(item: item)
                        Text(item.confirmedAt, format: .dateTime.month().day().hour().minute()).font(.caption).foregroundStyle(.secondary)
                        if let hour = item.reminderHour, let minute = item.reminderMinute {
                            Label { Text(reminderDate(hour, minute), format: .dateTime.hour().minute()) } icon: { Image(systemName: "bell") }
                                .foregroundStyle(.secondary)
                        }
                    }
                }.buttonStyle(.plain)
            }
        }
        .navigationTitle("tab.medications")
        .sheet(item: $editing) { MedicationEditor(item: $0) }
    }
}

struct SupplyLabel: View {
    let item: MedicationItem
    var body: some View {
        HStack {
            Text("medication.confirmed")
            Text(item.remaining, format: .number)
            Text(LocalizedStringKey("supply.unit." + item.unit.rawValue))
        }.font(.subheadline).foregroundStyle(.secondary)
    }
}

private func reminderDate(_ hour: Int, _ minute: Int) -> Date {
    Calendar.current.date(from: DateComponents(year: 2001, month: 1, day: 1, hour: hour, minute: minute)) ?? .distantPast
}

struct MedicationEditor: View {
    @EnvironmentObject private var store: LocalEntriesStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale
    @State var item: MedicationItem
    @State private var remaining = ""
    @State private var wantsReminder = false
    @State private var time = reminderDate(20, 0)
    @State private var isSaving = false
    @State private var confirmsDeletion = false
    var body: some View {
        NavigationStack {
            Form {
                TextField("medication.name", text: $item.name).accessibilityIdentifier("medication.name")
                Section("medication.supply") {
                    TextField("medication.remaining", text: $remaining).keyboardType(.numberPad).accessibilityIdentifier("medication.remaining")
                    Picker("medication.unit", selection: $item.unit) {
                        ForEach(SupplyUnit.allCases, id: \.self) { unit in
                            Text(LocalizedStringKey("supply.unit." + unit.rawValue)).tag(unit)
                        }
                    }.disabled(store.entries.medications.contains { $0.id == item.id })
                    Text("medication.supply.detail").font(.caption).foregroundStyle(.secondary)
                }
                Section {
                    Toggle("reminder.enable", isOn: $wantsReminder).accessibilityIdentifier("reminder.toggle")
                    if wantsReminder { DatePicker("reminder.time", selection: $time, displayedComponents: .hourAndMinute) }
                } footer: { Text("reminder.detail") }
                if store.entries.medications.contains(where: { $0.id == item.id }) {
                    Button("common.delete", role: .destructive) { confirmsDeletion = true }.accessibilityIdentifier("medication.delete")
                }
            }
            .disabled(isSaving)
            .navigationTitle("medication.editor")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("common.cancel") { dismiss() }.disabled(isSaving) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.save") { Task { await save() } }
                        .disabled(isSaving || item.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || Int(remaining) == nil)
                        .accessibilityIdentifier("medication.save")
                }
            }
            .onAppear {
                remaining = String(item.remaining)
                wantsReminder = item.reminderHour != nil
                if let hour = item.reminderHour, let minute = item.reminderMinute { time = reminderDate(hour, minute) }
            }
            .confirmationDialog("medication.delete.confirm", isPresented: $confirmsDeletion, titleVisibility: .visible) {
                Button("common.delete", role: .destructive) { store.deleteMedication(item.id); if store.errorKey == nil { dismiss() } }
            }
            .interactiveDismissDisabled(isSaving)
            .localStoreErrors()
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        if wantsReminder, !(await store.reminders.authorize()) { store.errorKey = "reminder.denied"; return }
        item.remaining = Int(remaining) ?? -1
        item.reminderHour = wantsReminder ? Calendar.current.component(.hour, from: time) : nil
        item.reminderMinute = wantsReminder ? Calendar.current.component(.minute, from: time) : nil
        guard store.saveMedication(item) else { return }
        do { try await store.reminders.schedule(item, locale: locale); dismiss() }
        catch { store.errorKey = "reminder.failed" }
    }
}

#Preview { NavigationStack { MedicationsView() }.aeriDayPreview(locale: "zh-Hans", colorScheme: .light) }
