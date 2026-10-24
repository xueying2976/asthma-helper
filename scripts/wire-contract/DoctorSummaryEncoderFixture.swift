import Foundation
// Emits the REAL JSONEncoder output of a DoctorVisitSummary built by the pure builder,
// so the v7 zod schema validates actual Swift serialization, not a handwritten fixture.
let cal = { () -> Calendar in var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "America/New_York")!; return c }()
func d(_ s: String) -> Date { ISO8601DateFormatter().date(from: s)! }
func dy(_ s: String) -> Date { ISO8601DateFormatter().date(from: s + "T12:00:00Z")! }
var e = LocalEntries()
e.symptomCheckIns = [ SymptomCheckIn(date: dy("2026-10-20"), cough: .mild, respiratoryNightWaking: .yes),
                      SymptomCheckIn(date: dy("2026-10-21"), wheeze: .moderate) ]
e.medicationUseEvents = [ MedicationUseEvent(date: dy("2026-10-20"), medicationName: "[DEMO] Sample inhaler A", purpose: .relief, regimen: .unknown, amount: 2, unit: .puff),
                          MedicationUseEvent(date: dy("2026-10-21"), medicationName: "[DEMO] Sample inhaler A", purpose: .relief, regimen: .unknown, amount: 1, unit: .puff) ]
e.peakFlowEntries = [ PeakFlowEntry(date: dy("2026-10-20"), value: 410, device: "DEMO meter"),
                      PeakFlowEntry(date: dy("2026-10-22"), value: 450, personalBest: 500, personalBestConfirmedByClinician: true) ]
e.notes = [ JournalEntry(date: dy("2026-10-20"), text: "DEMO synthetic note") ]
let wearable = [ DailyFeature(metric: .respiratoryRate, day: dy("2026-10-20"), sourceID: "WatchA", value: 16, unit: "count/min", sampleCount: 1),
                 DailyFeature(metric: .respiratoryRate, day: dy("2026-10-21"), sourceID: "WatchA", value: 17, unit: "count/min", sampleCount: 1) ]
let summary = try DoctorSummaryBuilder.build(from: e, findings: [], wearable: wearable,
    range: DoctorSummaryRange(kind: .custom, customStart: dy("2026-10-17"), customEnd: dy("2026-10-23")),
    options: DoctorSummaryOptions(selectedNoteIDs: e.notes.map(\.id), patientQuestions: ["Any change needed?"]),
    recordRevision: "demo-rev", isDemo: true, now: d("2026-10-24T16:00:00Z"), calendar: cal)
let enc = JSONEncoder(); enc.dateEncodingStrategy = .iso8601; enc.outputFormatting = [.sortedKeys]
let data = try enc.encode(summary)
FileHandle.standardOutput.write(data)
