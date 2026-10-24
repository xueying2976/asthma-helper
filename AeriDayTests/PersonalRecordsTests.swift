@testable import AeriDay
import AeriDayCore
import Foundation
import Testing

@MainActor
struct PersonalRecordsTests {
    private let now = Date(timeIntervalSince1970: 1_786_000_000)
    private func store(_ persistence: any LocalEntriesPersisting) -> LocalEntriesStore {
        LocalEntriesStore(factory: { persistence }, now: { now },
                          reminders: LocalReminderService(isEnabled: false))
    }

    @Test func legacyPayloadPreservesRecordsAndDefaultsNewArrays() throws {
        var original = LocalEntries()
        original.notes = [JournalEntry(date: now, text: "Synthetic legacy note")]
        original.medications = [MedicationItem(name: "Synthetic supply", unit: .puff,
                                               remaining: 40, confirmedAt: now)]
        let encoded = try JSONEncoder().encode(original)
        var json = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        json.removeValue(forKey: "symptomCheckIns")
        json.removeValue(forKey: "medicationUseEvents")
        json.removeValue(forKey: "peakFlowEntries")
        let decoded = try JSONDecoder().decode(LocalEntries.self, from: JSONSerialization.data(withJSONObject: json))
        #expect(decoded == original)
        #expect(decoded.symptomCheckIns.isEmpty && decoded.medicationUseEvents.isEmpty && decoded.peakFlowEntries.isEmpty)
    }

    @Test func unansweredSymptomsDoNotBecomeAbsenceAndEditsKeepIdentity() throws {
        let subject = store(MemoryEntriesPersistence())
        var entry = SymptomCheckIn(date: now, cough: .none, respiratoryNightWaking: .yes)
        #expect(subject.saveSymptomCheckIn(entry))
        #expect(subject.entries.symptomCheckIns.first?.cough == SymptomSeverity.none)
        #expect(subject.entries.symptomCheckIns.first?.wheeze == .unknown)
        #expect(subject.entries.symptomCheckIns.first?.activityLimitation == .unknown)
        entry.wheeze = .mild
        #expect(subject.saveSymptomCheckIn(entry))
        #expect(subject.entries.symptomCheckIns.count == 1)
        #expect(subject.entries.symptomCheckIns.first?.updatedAt == now)
        let roundTrip = try JSONDecoder().decode(LocalEntries.self, from: JSONEncoder().encode(subject.entries))
        #expect(roundTrip == subject.entries)
        #expect(subject.deleteSymptomCheckIn(entry.id))
        #expect(subject.entries.symptomCheckIns.isEmpty)
    }

    @Test func actualUseIsSeparateFromInventoryAndRegimenStaysUnknown() {
        let subject = store(MemoryEntriesPersistence())
        let medication = MedicationItem(name: "Synthetic inhaler", unit: .puff, remaining: 40,
                                        confirmedAt: now, reminderHour: 20, reminderMinute: 0)
        #expect(subject.saveMedication(medication))
        let originalInventory = subject.entries.medications
        let originalChanges = subject.entries.changes
        let event = MedicationUseEvent(date: now, medicationID: medication.id,
                                      medicationName: medication.name, purpose: .relief,
                                      amount: 2, unit: .puff)
        #expect(subject.saveMedicationUse(event))
        #expect(subject.entries.medications == originalInventory)
        #expect(subject.entries.changes == originalChanges)
        #expect(subject.entries.medicationUseEvents.first?.regimen == .unknown)
        #expect(subject.entries.medicationUseEvents.first?.preExercise == .unknown)
        subject.deleteMedication(medication.id)
        #expect(subject.entries.medicationUseEvents.count == 1)
        #expect(subject.entries.medicationUseEvents.first?.medicationName == medication.name)
        #expect(subject.deleteMedicationUse(event.id))
    }

    @Test func peakFlowNeedsExplicitConfirmedBestForPercentage() {
        let subject = store(MemoryEntriesPersistence())
        var entry = PeakFlowEntry(date: now, value: 400, device: "Synthetic meter", personalBest: 500)
        #expect(entry.percentOfConfirmedPersonalBest == nil)
        #expect(subject.savePeakFlow(entry))
        entry.personalBestConfirmedByClinician = true
        #expect(entry.percentOfConfirmedPersonalBest == 80)
        #expect(subject.savePeakFlow(entry))
        #expect(subject.entries.peakFlowEntries.count == 1)
        entry.personalBest = nil
        #expect(!subject.savePeakFlow(entry))
        #expect(subject.entries.peakFlowEntries.first?.personalBest == 500)
        #expect(subject.deletePeakFlow(entry.id))
    }

    @Test func invalidStructuredInputsDoNotReplaceExistingRecords() {
        let subject = store(MemoryEntriesPersistence())
        #expect(!subject.saveSymptomCheckIn(SymptomCheckIn(date: now.addingTimeInterval(3600))))
        #expect(!subject.saveSymptomCheckIn(SymptomCheckIn(date: now, context: String(repeating: "x", count: 2001))))
        for value in [Double.nan, .infinity, -1, 0, 2001] {
            #expect(!subject.savePeakFlow(PeakFlowEntry(date: now, value: value)))
        }
        for amount in [Double.nan, .infinity, -1, 0] {
            #expect(!subject.saveMedicationUse(MedicationUseEvent(date: now, medicationName: "Synthetic",
                                                                amount: amount, unit: .puff)))
        }
        #expect(subject.entries == LocalEntries())
    }

    @Test func failedStructuredWriteKeepsPriorData() {
        let persistence = StructuredFailingPersistence()
        persistence.value.notes = [JournalEntry(date: now, text: "Synthetic preserved note")]
        let subject = store(persistence)
        let original = subject.entries
        #expect(!subject.saveSymptomCheckIn(SymptomCheckIn(date: now, cough: .mild)))
        #expect(subject.entries == original)
        #expect(subject.errorKey == "storage.save_error")
    }

    @Test func protectedPersistenceRoundTripAndDeleteAllIncludesStructuredRecords() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent("AeriDayPersonalRecords-" + UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: base) }
        let persistence = try SwiftDataEntriesPersistence(baseDirectory: base)
        let subject = store(persistence)
        #expect(subject.saveSymptomCheckIn(SymptomCheckIn(date: now, cough: .none)))
        #expect(subject.saveMedicationUse(MedicationUseEvent(date: now, medicationName: "Synthetic", amount: 1, unit: .puff)))
        #expect(subject.savePeakFlow(PeakFlowEntry(date: now, value: 450)))
        let reloaded = try SwiftDataEntriesPersistence(baseDirectory: base).load()
        #expect(reloaded == subject.entries)
        subject.deleteAll()
        #expect(try SwiftDataEntriesPersistence(baseDirectory: base).load() == LocalEntries())
    }
}

@MainActor
private final class StructuredFailingPersistence: LocalEntriesPersisting {
    var value = LocalEntries()
    func load() throws -> LocalEntries { value }
    func save(_ entries: LocalEntries) throws { throw CocoaError(.fileWriteOutOfSpace) }
}
