import AeriDayCore
import Combine
import Foundation

@MainActor
final class LocalEntriesStore: ObservableObject {
    @Published private(set) var entries = LocalEntries()
    @Published private(set) var isAvailable = false
    @Published var errorKey: String?
    private var persistence: (any LocalEntriesPersisting)?
    private let factory: () throws -> any LocalEntriesPersisting
    private let now: () -> Date
    let reminders: LocalReminderService

    init(factory: @escaping () throws -> any LocalEntriesPersisting,
         now: @escaping () -> Date = Date.init, reminders: LocalReminderService = LocalReminderService()) {
        self.factory = factory; self.now = now; self.reminders = reminders
        reload()
    }

    static func preview() -> LocalEntriesStore {
        LocalEntriesStore(factory: { MemoryEntriesPersistence() }, now: { SyntheticFixtures.now },
                          reminders: LocalReminderService(isEnabled: false))
    }

    func reload() {
        do {
            if persistence == nil { persistence = try factory() }
            entries = try persistence!.load()
            isAvailable = true; errorKey = nil
        } catch {
            isAvailable = false; errorKey = "storage.unavailable"
        }
    }

    @discardableResult
    private func commit(_ next: LocalEntries) -> Bool {
        guard isAvailable, let persistence else { errorKey = "storage.unavailable"; return false }
        do {
            try persistence.save(next)
            entries = next
            errorKey = nil
            return true
        } catch {
            // Reload after failure: a post-save protection check may fail after the transaction committed.
            reload()
            errorKey = "storage.save_error"
            return false
        }
    }

    @discardableResult
    func saveNote(_ note: JournalEntry) -> Bool {
        guard !note.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              note.text.count <= 2000, note.date <= now().addingTimeInterval(60) else {
            errorKey = "entry.invalid"; return false
        }
        var next = entries
        next.notes.removeAll { $0.id == note.id }; next.notes.append(note)
        next.notes.sort { $0.date > $1.date }
        return commit(next)
    }

    func deleteNote(_ id: UUID) {
        var next = entries; next.notes.removeAll { $0.id == id }; commit(next)
    }

    @discardableResult
    func saveMedication(_ medication: MedicationItem) -> Bool {
        guard !medication.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              medication.name.count <= 100, (0...99999).contains(medication.remaining),
              medication.reminderHour.map({ (0...23).contains($0) }) ?? true,
              medication.reminderMinute.map({ (0...59).contains($0) }) ?? true,
              (medication.reminderHour == nil) == (medication.reminderMinute == nil) else {
            errorKey = "medication.invalid"; return false
        }
        guard entries.medications.contains(where: { $0.id == medication.id }) || entries.medications.count < 50 else {
            errorKey = "medication.limit"; return false
        }
        var next = entries
        let old = next.medications.first { $0.id == medication.id }
        var item = medication
        if let old, old.unit != item.unit {
            errorKey = "medication.unit_locked"
            return false
        }
        if old == nil || old?.remaining != item.remaining || old?.unit != item.unit {
            item.confirmedAt = now()
            next.changes.append(SupplyChange(medicationID: item.id, date: now(),
                                            before: old?.unit == item.unit ? (old?.remaining ?? item.remaining) : item.remaining,
                                            after: item.remaining))
        }
        next.medications.removeAll { $0.id == item.id }; next.medications.append(item)
        return commit(next)
    }

    func deleteMedication(_ id: UUID) {
        var next = entries
        next.medications.removeAll { $0.id == id }; next.changes.removeAll { $0.medicationID == id }
        if commit(next) { reminders.cancel(id) }
    }

    @discardableResult
    func saveSymptomCheckIn(_ entry: SymptomCheckIn) -> Bool {
        guard validRecordDate(entry.date), entry.context.count <= 2000 else {
            errorKey = "entry.invalid"; return false
        }
        var next = entries
        var saved = entry; saved.updatedAt = now()
        next.symptomCheckIns.removeAll { $0.id == entry.id }
        next.symptomCheckIns.append(saved)
        next.symptomCheckIns.sort { $0.date > $1.date }
        return commit(next)
    }

    @discardableResult
    func deleteSymptomCheckIn(_ id: UUID) -> Bool {
        var next = entries; next.symptomCheckIns.removeAll { $0.id == id }
        return commit(next)
    }

    @discardableResult
    func saveMedicationUse(_ entry: MedicationUseEvent) -> Bool {
        guard validRecordDate(entry.date), entry.amount.isFinite, entry.amount > 0,
              entry.amount <= 99999,
              !entry.medicationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              entry.medicationName.count <= 100 else {
            errorKey = "entry.invalid"; return false
        }
        var next = entries
        var saved = entry; saved.updatedAt = now()
        next.medicationUseEvents.removeAll { $0.id == entry.id }
        next.medicationUseEvents.append(saved)
        next.medicationUseEvents.sort { $0.date > $1.date }
        // Actual use is a separate observation: it never changes inventory or reminder state.
        return commit(next)
    }

    @discardableResult
    func deleteMedicationUse(_ id: UUID) -> Bool {
        var next = entries; next.medicationUseEvents.removeAll { $0.id == id }
        return commit(next)
    }

    @discardableResult
    func savePeakFlow(_ entry: PeakFlowEntry) -> Bool {
        guard validRecordDate(entry.date), entry.value.isFinite, entry.value > 0,
              entry.value <= 2000, entry.device.count <= 200,
              entry.personalBest.map({ $0.isFinite && $0 > 0 && $0 <= 2000 }) ?? true,
              !entry.personalBestConfirmedByClinician || entry.personalBest != nil else {
            errorKey = "entry.invalid"; return false
        }
        var next = entries
        var saved = entry; saved.updatedAt = now()
        next.peakFlowEntries.removeAll { $0.id == entry.id }
        next.peakFlowEntries.append(saved)
        next.peakFlowEntries.sort { $0.date > $1.date }
        return commit(next)
    }

    @discardableResult
    func deletePeakFlow(_ id: UUID) -> Bool {
        var next = entries; next.peakFlowEntries.removeAll { $0.id == id }
        return commit(next)
    }

    private func validRecordDate(_ date: Date) -> Bool {
        date.timeIntervalSince1970.isFinite && date <= now().addingTimeInterval(60)
    }

    func deleteAll() {
        if commit(LocalEntries()) { reminders.cancelAll() }
    }
}
