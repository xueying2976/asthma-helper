@testable import AeriDay
import AeriDayCore
import Foundation
import HealthKit
import Testing

@MainActor
struct LocalEntriesTests {
    private let now = Date(timeIntervalSince1970: 1_786_000_000)
    private func store(_ persistence: any LocalEntriesPersisting) -> LocalEntriesStore {
        LocalEntriesStore(factory: { persistence }, now: { now }, reminders: LocalReminderService(isEnabled: false))
    }

    @Test func notesSaveEditAndDelete() {
        let subject = store(MemoryEntriesPersistence())
        var note = JournalEntry(date: now, text: "Synthetic note")
        #expect(subject.saveNote(note))
        note.text = "Edited synthetic note"
        #expect(subject.saveNote(note))
        #expect(subject.entries.notes.count == 1)
        #expect(subject.entries.notes.first?.text == note.text)
        subject.deleteNote(note.id)
        #expect(subject.entries.notes.isEmpty)
    }

    @Test func invalidInputsDoNotChangeStore() {
        let subject = store(MemoryEntriesPersistence())
        #expect(!subject.saveNote(JournalEntry(date: now, text: "  ")))
        #expect(!subject.saveNote(JournalEntry(date: now, text: String(repeating: "x", count: 2001))))
        #expect(!subject.saveNote(JournalEntry(date: now.addingTimeInterval(3600), text: "future")))
        #expect(!subject.saveMedication(MedicationItem(name: "Sample", unit: .puff, remaining: -1, confirmedAt: now)))
        #expect(subject.entries.notes.isEmpty && subject.entries.medications.isEmpty)
    }

    @Test func supplyChangesAreAtomicAndUnitIsFixed() {
        let subject = store(MemoryEntriesPersistence())
        var medication = MedicationItem(name: "Synthetic item", unit: .puff, remaining: 30, confirmedAt: now)
        #expect(subject.saveMedication(medication))
        medication.remaining = 28
        #expect(subject.saveMedication(medication))
        #expect(subject.entries.changes.last?.before == 30)
        #expect(subject.entries.changes.last?.after == 28)
        medication.unit = .tablet
        #expect(!subject.saveMedication(medication))
        #expect(subject.entries.medications.first?.unit == .puff)
        subject.deleteMedication(medication.id)
        #expect(subject.entries.medications.isEmpty && subject.entries.changes.isEmpty)
    }

    @Test func failedWriteKeepsPreviousData() {
        let persistence = FailingEntriesPersistence()
        let subject = store(persistence)
        #expect(!subject.saveNote(JournalEntry(date: now, text: "Synthetic note")))
        #expect(subject.entries.notes.isEmpty)
        #expect(subject.errorKey == "storage.save_error")
    }

    @Test func failedReadDoesNotBecomeEmptyWritableStore() {
        let subject = LocalEntriesStore(factory: { throw CocoaError(.fileReadCorruptFile) }, reminders: LocalReminderService(isEnabled: false))
        #expect(!subject.isAvailable)
        #expect(!subject.saveNote(JournalEntry(date: now, text: "Synthetic note")))
    }

    @Test func swiftDataRoundTripAndDeleteAll() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent("AeriDayTest-" + UUID().uuidString, isDirectory: true)
        let persistence = try SwiftDataEntriesPersistence(baseDirectory: base)
        let subject = store(persistence)
        #expect(subject.saveNote(JournalEntry(date: now, text: "Synthetic persistence test")))
        let second = try SwiftDataEntriesPersistence(baseDirectory: base)
        #expect(try second.load().notes.count == 1)
        let files = try FileManager.default.contentsOfDirectory(at: persistence.directory, includingPropertiesForKeys: [.isExcludedFromBackupKey])
        #expect(!files.isEmpty)
        for file in files {
            #expect(try file.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true)
        }
        subject.deleteAll()
        let third = try SwiftDataEntriesPersistence(baseDirectory: base)
        #expect(try third.load().notes.isEmpty)
    }

    @Test func sleepExcludesAwakeAndInBed() {
        #expect(!HealthKitDataProvider.isAsleep(HKCategoryValueSleepAnalysis.awake.rawValue))
        #expect(!HealthKitDataProvider.isAsleep(HKCategoryValueSleepAnalysis.inBed.rawValue))
        #expect(HealthKitDataProvider.isAsleep(HKCategoryValueSleepAnalysis.asleepREM.rawValue))
        #expect(HealthKitDataProvider.isAsleep(HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue))
    }

    @Test func metricFreshnessUsesItsOwnTime() {
        let sample = HealthMetricSummary(kind: .restingHeartRate, value: 60, unit: "count/min",
            startDate: now.addingTimeInterval(-3 * 86400), endDate: now.addingTimeInterval(-3 * 86400),
            sourceName: "Synthetic", sourceBundleIdentifier: "synthetic", deviceName: nil)
        #expect(sample.isOlder(than: now))
        #expect(!sample.isOlder(than: now.addingTimeInterval(-3 * 86400)))
    }
}

@MainActor
private final class FailingEntriesPersistence: LocalEntriesPersisting {
    func load() throws -> LocalEntries { LocalEntries() }
    func save(_ entries: LocalEntries) throws { throw CocoaError(.fileWriteOutOfSpace) }
}
