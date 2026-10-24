@testable import AeriDay
import AeriDayCore
import Foundation
import Testing

@MainActor
struct PersonalBridgeTests {
    private let now = Date(timeIntervalSince1970: 1_786_000_000)
    private var timestamp: String { ISO8601DateFormatter().string(from: now) }

    private func harness() -> BridgeHarness {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent("AeriDayBridgeTests-" + UUID().uuidString)
        let store = LocalEntriesStore(factory: { MemoryEntriesPersistence() }, now: { now },
                                      reminders: LocalReminderService(isEnabled: false))
        let insights = PersonalInsightsService(isDemo: true, baseDirectory: base)
        let provider = MockHealthDataProvider(snapshot: HealthSnapshot(availability: .sampleAvailable,
            provenance: DataProvenance(sourceName: "Synthetic bridge-test provider", collectedAt: now,
                                      freshness: .current, isSynthetic: true)))
        let coordinator = LovableWebView.Coordinator(store: store, healthData: provider, isDemo: true, insights: insights)
        return BridgeHarness(base: base, store: store, insights: insights, coordinator: coordinator)
    }
    private func rejects(_ coordinator: LovableWebView.Coordinator, method: String,
                         params: [String: Any]) async {
        do {
            _ = try await coordinator.perform(method, params: params)
            Issue.record("Bridge unexpectedly accepted invalid synthetic input for \(method)")
        } catch { /* Rejection is the expected contract. */ }
    }
    private func id(_ response: [String: Any]) throws -> String {
        let id = try #require(response["id"] as? String)
        #expect(UUID(uuidString: id) != nil)
        return id
    }

    @Test func structuredDefaultsStayUnknownAndRecordsUseISODateStrings() async throws {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        _ = try await h.coordinator.perform("saveSymptomCheckIn", params: ["date": timestamp])
        _ = try await h.coordinator.perform("saveMedicationUse", params: ["date": timestamp,
            "medicationName": "Synthetic inhaler", "amount": 2, "unit": "puff"])
        _ = try await h.coordinator.perform("savePeakFlow", params: ["date": timestamp, "value": 450])
        let symptom = try #require(h.store.entries.symptomCheckIns.first)
        #expect(symptom.cough == .unknown && symptom.wheeze == .unknown)
        #expect(symptom.respiratoryNightWaking == .unknown && symptom.activityLimitation == .unknown)
        let use = try #require(h.store.entries.medicationUseEvents.first)
        #expect(use.purpose == .unknown && use.regimen == .unknown && use.preExercise == .unknown)
        let peakFlow = try #require(h.store.entries.peakFlowEntries.first)
        #expect(peakFlow.unit == .litresPerMinute)
        #expect(!peakFlow.personalBestConfirmedByClinician && peakFlow.percentOfConfirmedPersonalBest == nil)
        let envelope = try await h.coordinator.perform("getInsights", params: [:])
        let records = try #require(envelope["records"] as? [String: Any])
        let flowRows = try #require(records["peakFlowEntries"] as? [[String: Any]])
        #expect(flowRows.first?["percentOfConfirmedPersonalBest"] is NSNull)
        for key in ["symptomCheckIns", "medicationUseEvents", "peakFlowEntries"] {
            let values = try #require(records[key] as? [[String: Any]])
            #expect(values.count == 1)
            let date = try #require(values.first?["date"] as? String)
            let updatedAt = try #require(values.first?["updatedAt"] as? String)
            #expect(ISO8601DateFormatter().date(from: date) == now)
            #expect(ISO8601DateFormatter().date(from: updatedAt) != nil)
        }
    }

    @Test func symptomActualUseAndPeakFlowCanEachBeEditedAndDeleted() async throws {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        let symptomID = try id(await h.coordinator.perform("saveSymptomCheckIn", params: ["date": timestamp, "cough": "mild"]))
        _ = try await h.coordinator.perform("saveSymptomCheckIn", params: ["id": symptomID, "date": timestamp, "cough": "none"])
        #expect(h.store.entries.symptomCheckIns.count == 1)
        #expect(h.store.entries.symptomCheckIns.first?.cough == SymptomSeverity.none)
        let useID = try id(await h.coordinator.perform("saveMedicationUse", params: ["date": timestamp,
            "medicationName": "Synthetic inhaler", "amount": 1, "unit": "puff"]))
        _ = try await h.coordinator.perform("saveMedicationUse", params: ["id": useID, "date": timestamp,
            "medicationName": "Synthetic inhaler", "amount": 2, "unit": "puff", "purpose": "relief", "regimen": "saba"])
        #expect(h.store.entries.medicationUseEvents.count == 1)
        #expect(h.store.entries.medicationUseEvents.first?.amount == 2)
        #expect(h.store.entries.medicationUseEvents.first?.regimen == .saba)
        let peakID = try id(await h.coordinator.perform("savePeakFlow", params: ["date": timestamp, "value": 400]))
        _ = try await h.coordinator.perform("savePeakFlow", params: ["id": peakID, "date": timestamp,
            "value": 450, "personalBest": 500, "personalBestConfirmedByClinician": true])
        #expect(h.store.entries.peakFlowEntries.count == 1)
        #expect(h.store.entries.peakFlowEntries.first?.percentOfConfirmedPersonalBest == 90)
        let envelope = try await h.coordinator.perform("getInsights", params: [:])
        let records = try #require(envelope["records"] as? [String: Any])
        let flows = try #require(records["peakFlowEntries"] as? [[String: Any]])
        #expect(flows.first?["percentOfConfirmedPersonalBest"] as? Double == 90)
        for (method, id) in [("deleteSymptomCheckIn", symptomID), ("deleteMedicationUse", useID), ("deletePeakFlow", peakID)] {
            let result = try await h.coordinator.perform(method, params: ["id": id])
            #expect((result["ok"] as? Bool) == true)
        }
        #expect(h.store.entries.symptomCheckIns.isEmpty && h.store.entries.medicationUseEvents.isEmpty && h.store.entries.peakFlowEntries.isEmpty)
    }

    @Test func malformedInputsCannotBecomeRecords() async {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        let invalid: [(String, [String: Any])] = [
            ("saveSymptomCheckIn", ["date": timestamp, "cough": "absent"]),
            ("saveSymptomCheckIn", ["date": timestamp, "activityLimitation": "maybe"]),
            ("saveSymptomCheckIn", ["date": timestamp, "id": "invalid-uuid"]),
            ("saveSymptomCheckIn", ["date": "not-a-date"]),
            ("saveSymptomCheckIn", ["date": "2999-01-01T00:00:00Z"]),
            ("saveMedicationUse", ["date": timestamp, "medicationName": "Synthetic", "amount": 1, "unit": "puff", "regimen": "guessed"]),
            ("saveMedicationUse", ["date": timestamp, "medicationName": "Synthetic", "amount": 1, "unit": "puff", "medicationID": "invalid-uuid"]),
            ("saveMedicationUse", ["date": timestamp, "medicationName": "Synthetic", "amount": Double.infinity, "unit": "puff"]),
            ("savePeakFlow", ["date": timestamp, "value": Double.nan]),
            ("savePeakFlow", ["date": timestamp, "value": 400, "unit": "L/sec"]),
            ("savePeakFlow", ["date": timestamp, "value": 400, "personalBestConfirmedByClinician": true]),
            ("deleteSymptomCheckIn", ["id": "invalid-uuid"]),
            ("deleteMedicationUse", ["id": "invalid-uuid"]),
            ("deletePeakFlow", ["id": "invalid-uuid"]),
            ("inventMedicalScore", [:])
        ]
        for (method, params) in invalid { await rejects(h.coordinator, method: method, params: params) }
        #expect(h.store.entries == LocalEntries())
    }

    @Test func actualUseCannotDecrementInventoryOrChangeReminders() async throws {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        let item = MedicationItem(name: "Synthetic inventory", unit: .puff, remaining: 50,
                                  confirmedAt: now, reminderHour: 20, reminderMinute: 0)
        #expect(h.store.saveMedication(item))
        let original = h.store.entries.medications, changes = h.store.entries.changes
        _ = try await h.coordinator.perform("saveMedicationUse", params: ["date": timestamp,
            "medicationID": item.id.uuidString, "medicationName": item.name,
            "amount": 2, "unit": "puff", "purpose": "relief"])
        #expect(h.store.entries.medications == original)
        #expect(h.store.entries.changes == changes)
        #expect(h.store.entries.medicationUseEvents.count == 1)
    }

    @Test func deletionRequiresConfirmationAndLeavesAnalysisDisabled() async throws {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        _ = try await h.coordinator.perform("saveSymptomCheckIn", params: ["date": timestamp])
        _ = try await h.coordinator.perform("saveMedicationUse", params: ["date": timestamp,
            "medicationName": "Synthetic", "amount": 1, "unit": "puff"])
        _ = try await h.coordinator.perform("savePeakFlow", params: ["date": timestamp, "value": 400])
        await rejects(h.coordinator, method: "deleteAll", params: [:])
        await rejects(h.coordinator, method: "deleteAll", params: ["confirm": false])
        #expect(h.store.entries.symptomCheckIns.count == 1)
        _ = try await h.coordinator.perform("deleteAll", params: ["confirm": true])
        #expect(h.store.entries == LocalEntries())
        #expect(!h.insights.enabled)
        let refreshed = try await h.coordinator.perform("getInsights", params: [:])
        #expect((refreshed["enabled"] as? Bool) == false)
        #expect((refreshed["findings"] as? [[String: Any]])?.isEmpty == true)
    }

    @Test func sourceReviewAndSeriesRejectInvalidMetricsAndMissingConfirmation() async {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        await rejects(h.coordinator, method: "setPreferredSource", params: ["metricId": "unknown", "sourceId": "Synthetic"])
        await rejects(h.coordinator, method: "reviewBaseline", params: ["metricId": "rr"])
        await rejects(h.coordinator, method: "reviewBaseline", params: ["metricId": "unknown", "confirm": true])
        await rejects(h.coordinator, method: "getMetricSeries", params: ["metricId": "unknown", "days": 7])
        await rejects(h.coordinator, method: "getMetricSeries", params: ["metricId": "rr", "days": 10000])
    }

    @Test func demoAuthorizationCannotClaimRealHealthPermission() async throws {
        let h = harness(); defer { try? FileManager.default.removeItem(at: h.base) }
        let result = try await h.coordinator.perform("requestHealthAuthorization", params: [:])
        #expect((result["authorized"] as? Bool) == false)
        #expect((result["isDemo"] as? Bool) == true)
    }
}

@MainActor
private struct BridgeHarness {
    let base: URL
    let store: LocalEntriesStore
    let insights: PersonalInsightsService
    let coordinator: LovableWebView.Coordinator
}
