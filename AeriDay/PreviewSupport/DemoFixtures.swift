import AeriDayCore
import Foundation

/// Explicit test data for an isolated, user-editable local demo database.
enum DemoFixtures {
    static func health(now: Date = Date()) -> HealthSnapshot {
        let source = SyntheticFixtures.health(for: .content)
        let shift = now.timeIntervalSince(SyntheticFixtures.now)
        // Latest value for each metric is the shared generator's most-recent day (offset 1), so the
        // homepage "current" number agrees with the latest point in the historical series.
        let metrics = source.metrics.map {
            HealthMetricSummary(kind: $0.kind,
                                value: MockHealthDataProvider.syntheticValue(kind: $0.kind, offset: 1),
                                unit: MockHealthDataProvider.unit(for: $0.kind),
                                startDate: $0.startDate.addingTimeInterval(shift),
                                endDate: $0.endDate.addingTimeInterval(shift),
                                sourceName: "Simulated device",
                                sourceBundleIdentifier: "com.aeriday.demo", deviceName: "Simulated device")
        }
        return HealthSnapshot(availability: .sampleAvailable, metrics: metrics,
                              provenance: DataProvenance(sourceName: "Synthetic data",
                                                        collectedAt: now, freshness: .current, isSynthetic: true))
    }

    static func points(kind: HealthMetricKind) -> [Any] {
        let base: Double
        let scale: Double
        switch kind {
        case .respiratoryRate: (base, scale) = (15.2, 0.7)
        case .restingHeartRate: (base, scale) = (62, 3)
        case .sleepAnalysis: (base, scale) = (1.4, 0.3)
        case .oxygenSaturation: (base, scale) = (97, 1)
        case .stepCount: (base, scale) = (328, 80)
        case .workout: (base, scale) = (24, 5)
        }
        return (0..<30).map { day -> Any in
            if day == 8 || day == 19 { return NSNull() }
            return day == 29 ? base : (base + sin(Double(day) * 0.6) * scale)
        }
    }

    @MainActor static func seedPersonalRecords(store: LocalEntriesStore, now: Date = Date()) {
        let key = "demo.personalRecords.seeded.v3"
        // DEMO-only FRESH seeding into the isolated v3 store (AeriDayDemoV3). It is keyed on its own
        // v3 flag AND an empty structured store, NOT on the app-wide v2 flag — a v2 install carries
        // `seeded.v2=true` in shared UserDefaults, but its old `AeriDayDemo` store is left untouched
        // and the new v3 store starts empty, so the full coherent v3 scenario seeds cleanly here.
        // The real `make run` store uses a different database and is never seeded.
        guard !UserDefaults.standard.bool(forKey: key),
              store.isAvailable,
              store.entries.symptomCheckIns.isEmpty, store.entries.medicationUseEvents.isEmpty,
              store.entries.peakFlowEntries.isEmpty else { return }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)
        var success = true

        // Coherent deterministic 28-day scenario (all synthetic, clearly labelled):
        //  - Reference period (4..28 days ago): mostly settled breathing — a stable personal
        //    reference. Two days are deliberately left UNLOGGED (realistic gaps) so coverage is
        //    honest; >=21 of 28 remain usable for the engine.
        //  - Recent window (1..3 days ago): a short symptomatic stretch — cough, some night waking
        //    and reliever use — so the engine has >=2 of 3 recent usable days and something to show.
        // Nothing here asserts adherence, a clinician-confirmed best, a cause, or any treatment.
        let unloggedReferenceDays: Set<Int> = [12, 21]   // honest missing days inside the reference
        for back in 1...28 {
            if unloggedReferenceDays.contains(back) { continue }
            // Vary the time of day deterministically (07:00–20:00) so entries do not all read 09:00.
            let hour = 7 + (back * 3) % 13
            let minute = (back * 17) % 60
            guard let day = calendar.date(byAdding: .day, value: -back, to: today),
                  let noon = calendar.date(byAdding: .minute, value: hour * 60 + minute, to: day) else { continue }

            let recent = back <= 3
            let isolatedMildReferenceDay = (back == 15 || back == 24)
            let cough: SymptomSeverity = recent ? (back == 1 ? .moderate : .mild)
                : (isolatedMildReferenceDay ? .mild : .none)
            let wheeze: SymptomSeverity = (recent && back <= 2) ? .mild : .none
            let nightWaking: ReportedAnswer = (recent && back <= 2) ? .yes : .no
            let activity: ReportedAnswer = (back == 1) ? .yes : .no

            let symptom = SymptomCheckIn(
                date: noon, cough: cough, wheeze: wheeze, chestTightness: .unknown,
                breathlessness: (recent && back == 1) ? .mild : .none,
                respiratoryNightWaking: nightWaking, activityLimitation: activity,
                context: recent && back == 1 ? "Noticed more coughing today." : "")
            success = store.saveSymptomCheckIn(symptom) && success

            // Reliever use only on days with reported symptoms (recent + the isolated mild days).
            if recent || isolatedMildReferenceDay {
                let puffs = (back == 1) ? 2.0 : 1.0
                let use = MedicationUseEvent(date: noon, medicationName: "Albuterol inhaler",
                    purpose: .relief, regimen: .unknown, amount: puffs, unit: .puff, preExercise: .unknown)
                success = store.saveMedicationUse(use) && success
            }

            // Manual peak flow roughly twice a week, varied, with an UNCONFIRMED personal best only
            // (never a fabricated clinician-confirmed best). Recent readings dip a little.
            if back % 4 == 1 {
                let value = recent ? 380.0 + Double(back % 3) * 10 : 440.0 + Double(back % 5) * 8
                let flow = PeakFlowEntry(date: noon, value: value, device: "Peak flow meter",
                                         personalBest: 500, personalBestConfirmedByClinician: false)
                success = store.savePeakFlow(flow) && success
            }
        }

        // Narrative demo notes, consistent with the records above (synthetic, not a real record).
        success = writeV3Notes(store: store, now: now) && success

        if success { UserDefaults.standard.set(true, forKey: key) }
    }

    /// The v3 narrative demo notes, keyed by days-ago with a stable deterministic ID so adding them
    /// twice does not duplicate. Written as natural human-readable entries; the single global
    /// synthetic-data indicator (and PDF provenance) carries the DEMO disclosure, not each row.
    private static let v3Notes: [(daysAgo: Int, text: String)] = [
        (1, "Woke twice last night with a cough and used the reliever once this morning."),
        (2, "Chest felt a little tight after walking uphill; eased with rest."),
        (16, "Settled week overall — breathing felt normal most days."),
    ]

    @MainActor private static func writeV3Notes(store: LocalEntriesStore, now: Date) -> Bool {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)
        var ok = true
        for (back, text) in v3Notes {
            let id = UUID(uuidString: String(format: "D2000000-0000-0000-0000-%012d", back))!
            if store.entries.notes.contains(where: { $0.id == id }) { continue }
            if let day = calendar.date(byAdding: .day, value: -back, to: today),
               let noon = calendar.date(byAdding: .hour, value: 20, to: day) {
                ok = store.saveNote(JournalEntry(id: id, date: noon, text: text)) && ok
            }
        }
        return ok
    }

    /// Suggested doctor-visit questions for the DEMO scenario. The frontend keeps these user-editable;
    /// they are prompts, never asserted facts, adherence, or treatment advice.
    static let demoPatientQuestions = [
        "The last few days had more coughing and some night waking — is this a change worth reviewing?",
        "My recent peak-flow readings looked a bit lower than usual — what range should I watch for?",
        "Should I keep logging reliever use the way I have been?",
    ]

    @MainActor static func seed(store: LocalEntriesStore, now: Date = Date()) {
        let key = "demo.fixtures.seeded.v3"
        guard !UserDefaults.standard.bool(forKey: key), store.isAvailable,
              store.entries.notes.isEmpty, store.entries.medications.isEmpty else { return }
        var success = true
        let starterNotes = [
            "Picked up a refill for the reliever inhaler.",
            "Pollen felt high today — kept the windows shut.",
            "Good run this morning, no tightness afterwards.",
        ]
        for (index, text) in starterNotes.enumerated() {
            let id = UUID(uuidString: String(format: "D0000000-0000-0000-0000-%012d", index + 1))!
            success = store.saveNote(JournalEntry(id: id, date: now.addingTimeInterval(-Double(index) * 86_400 - 3_600),
                text: text)) && success
        }
        let supplies: [(String, SupplyUnit, Int, Int?)] = [
            ("Albuterol inhaler", .puff, 180, 20),
            ("Fluticasone inhaler", .puff, 120, nil)
        ]
        for (index, item) in supplies.enumerated() {
            let id = UUID(uuidString: String(format: "D1000000-0000-0000-0000-%012d", index + 1))!
            success = store.saveMedication(MedicationItem(id: id, name: item.0, unit: item.1,
                remaining: item.2, confirmedAt: now, reminderHour: item.3,
                reminderMinute: item.3 == nil ? nil : 0)) && success
        }
        if success { UserDefaults.standard.set(true, forKey: key) }
    }
}
