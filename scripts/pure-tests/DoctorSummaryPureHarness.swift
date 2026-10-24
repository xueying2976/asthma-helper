import Foundation
// DoctorSummaryBuilder pure-logic verification harness (Kiro).
// Reproducible from tracked source: compiled against AeriDayCore/Sources with no macros and no app
// host, so it runs inside or outside the Kiro sandbox. Run via scripts/run_pure_report_tests.sh.
// This mirrors AeriDayTests/DoctorSummaryBuilderTests.swift (Swift Testing) for environments where
// the full app/XCTest host cannot build (macro plugin sandbox). Synthetic data only.
// Minimal assertion harness (no XCTest / no Swift Testing macros).
var failures = 0, checks = 0
func ok(_ c: Bool, _ m: String) { checks += 1; if !c { failures += 1; print("FAIL: \(m)") } }
func cal(_ z: String = "UTC") -> Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: z)!; return c }
func dt(_ v: String) -> Date { ISO8601DateFormatter().date(from: v)! }
func dy(_ v: String) -> Date { ISO8601DateFormatter().date(from: v + "T12:00:00Z")! }
func build(_ e: LocalEntries, range: DoctorSummaryRange = .last7, findings: [ChangeFinding] = [],
           wearable: [DailyFeature] = [], options: DoctorSummaryOptions = .init(),
           now: String = "2026-10-24T12:00:00Z", isDemo: Bool = false, z: String = "UTC") throws -> DoctorVisitSummary {
    try DoctorSummaryBuilder.build(from: e, findings: findings, wearable: wearable, range: range, options: options,
                                   recordRevision: "rev", isDemo: isDemo, now: dt(now), calendar: cal(z))
}

// last7 ends yesterday, 7 completed days
var s = try build(LocalEntries())
ok(s.range.completedDays == 7, "last7 completedDays==7 got \(s.range.completedDays)")
ok(s.range.lastInclusiveDay == dt("2026-10-23T00:00:00Z"), "last7 ends yesterday")
ok(s.range.firstInclusiveDay == dt("2026-10-17T00:00:00Z"), "last7 starts 7 days back")

// reversed / future / over-limit
do { _ = try build(LocalEntries(), range: .init(kind: .custom, customStart: dy("2026-10-20"), customEnd: dy("2026-10-10"))); ok(false, "reversed should throw") }
catch DoctorSummaryError.rangeReversed { ok(true, "reversed throws") } catch { ok(false, "reversed wrong error \(error)") }
do { _ = try build(LocalEntries(), range: .init(kind: .custom, customStart: dy("2026-10-20"), customEnd: dy("2026-10-24"))); ok(false, "future should throw") }
catch DoctorSummaryError.rangeInFuture { ok(true, "future throws") } catch { ok(false, "future wrong error \(error)") }
do { _ = try build(LocalEntries(), range: .init(kind: .custom, customStart: dy("2026-06-01"), customEnd: dy("2026-10-23"))); ok(false, "overlimit should throw") }
catch DoctorSummaryError.rangeTooLong(let m) { ok(m == 90, "overlimit throws max 90") } catch { ok(false, "overlimit wrong error \(error)") }

// DST
s = try build(LocalEntries(), now: "2026-03-10T16:00:00Z", z: "America/New_York")
ok(s.range.completedDays == 7, "DST completedDays==7 got \(s.range.completedDays)")
ok(s.timeZone == "America/New_York", "tz recorded")

// positive<=known<=expected, same-day once, unknown not negative
var e = LocalEntries()
e.symptomCheckIns = [SymptomCheckIn(date: dy("2026-10-20"), cough: .mild),
                     SymptomCheckIn(date: dy("2026-10-20"), cough: SymptomSeverity.none),
                     SymptomCheckIn(date: dy("2026-10-21"), cough: .unknown)]
s = try build(e)
let cough = s.symptoms.first(where: { $0.field == "cough" })!
ok(cough.positiveDays <= cough.knownDays && cough.knownDays <= s.reportingCoverage.expectedDays, "invariant chain")
ok(cough.knownDays == 1 && cough.positiveDays == 1, "unknown not counted; same-day once (k=\(cough.knownDays) p=\(cough.positiveDays))")

// positive wins over negative; unknown != no
e = LocalEntries()
e.symptomCheckIns = [SymptomCheckIn(date: dy("2026-10-19"), respiratoryNightWaking: .no),
                     SymptomCheckIn(date: dy("2026-10-19"), respiratoryNightWaking: .yes),
                     SymptomCheckIn(date: dy("2026-10-18"), respiratoryNightWaking: .unknown)]
let wk = (try build(e)).symptoms.first { $0.field == "respiratoryNightWaking" }!
ok(wk.knownDays == 1 && wk.positiveDays == 1, "positive wins, unknown excluded (k=\(wk.knownDays) p=\(wk.positiveDays))")

// permutation invariance
e = LocalEntries()
let baseSym = [SymptomCheckIn(date: dy("2026-10-20"), cough: .mild),
               SymptomCheckIn(date: dy("2026-10-21"), wheeze: .severe),
               SymptomCheckIn(date: dy("2026-10-22"), breathlessness: .moderate)]
e.symptomCheckIns = baseSym; let pa = try build(e)
e.symptomCheckIns = baseSym.reversed(); let pb = try build(e)
ok(pa.symptoms == pb.symptoms, "permutation invariant")

// duplicate id no inflation
e = LocalEntries(); let did = UUID()
let one = SymptomCheckIn(id: did, date: dy("2026-10-20"), cough: .mild)
e.symptomCheckIns = [one, one]
let dcough = (try build(e)).symptoms.first(where: { $0.field == "cough" })!
ok(dcough.knownDays == 1 && dcough.positiveDays == 1, "dup id no inflate")

// medication grouping + total + unknown stays unknown
e = LocalEntries()
e.medicationUseEvents = [MedicationUseEvent(date: dy("2026-10-20"), medicationName: "Synthetic Reliever", amount: 2, unit: .puff),
                         MedicationUseEvent(date: dy("2026-10-20"), medicationName: "Synthetic Reliever", amount: 1, unit: .puff),
                         MedicationUseEvent(date: dy("2026-10-21"), medicationName: "Synthetic Reliever", amount: 2, unit: .puff)]
let mlog = (try build(e)).medicationLogs.first { $0.medicationName == "Synthetic Reliever" }!
ok(mlog.eventCount == 3 && mlog.loggedDays == 2 && mlog.totalAmount == 5 && mlog.unit == .puff, "med group/total")
ok(mlog.regimen == .unknown && mlog.purpose == .unknown, "med unknown stays unknown")

// mixed units suppress total
e = LocalEntries()
e.medicationUseEvents = [MedicationUseEvent(date: dy("2026-10-20"), medicationName: "Synthetic Mix", amount: 2, unit: .puff),
                         MedicationUseEvent(date: dy("2026-10-21"), medicationName: "Synthetic Mix", amount: 1, unit: .tablet)]
let mix = (try build(e)).medicationLogs.first { $0.medicationName == "Synthetic Mix" }!
ok(mix.totalAmount == nil && mix.unit == nil, "mixed units suppress total")

// peak flow range + no percent without confirmed best
e = LocalEntries()
e.peakFlowEntries = [PeakFlowEntry(date: dy("2026-10-20"), value: 420),
                     PeakFlowEntry(date: dy("2026-10-21"), value: 380),
                     PeakFlowEntry(date: dy("2026-10-22"), value: 450, personalBest: 500, personalBestConfirmedByClinician: false)]
s = try build(e)
ok(s.peakFlow.validReadingCount == 3 && s.peakFlow.minValue == 380 && s.peakFlow.maxValue == 450, "peak range")
ok(s.peakFlow.percentOfConfirmedBestRange == nil, "no percent without confirmed best")
e = LocalEntries(); e.peakFlowEntries = [PeakFlowEntry(date: dy("2026-10-20"), value: 400, personalBest: 500, personalBestConfirmedByClinician: true)]
ok((try build(e)).peakFlow.percentOfConfirmedBestRange == [80, 80], "percent from confirmed best")

// future isolation
e = LocalEntries(); e.symptomCheckIns = [SymptomCheckIn(date: dy("2026-10-20"), cough: .mild)]
let fa = try build(e); e.symptomCheckIns.append(SymptomCheckIn(date: dy("2026-10-26"), cough: .severe))
let fb = try build(e)
ok(fa.symptoms == fb.symptoms, "future records cannot change past summary")

// notes excluded unless selected
e = LocalEntries(); let note = JournalEntry(date: dy("2026-10-20"), text: "Synthetic note"); e.notes = [note]
ok((try build(e)).selectedNotes.isEmpty, "notes excluded by default")
ok((try build(e, options: .init(selectedNoteIDs: [note.id]))).selectedNotes.count == 1, "notes included when selected")

// empty honest report + demo label
s = try build(LocalEntries())
ok(s.symptoms.allSatisfy { $0.knownDays == 0 && $0.positiveDays == 0 } && s.medicationLogs.isEmpty && !s.limitations.isEmpty, "empty honest report")
ok((try build(LocalEntries(), isDemo: true)).limitations.first!.hasPrefix("DEMO"), "demo label present")

// custom range: valid 30-day equals last30 span; midnight boundary half-open (endExclusive excludes today)
e = LocalEntries()
let custom = try build(e, range: .init(kind: .custom, customStart: dy("2026-10-10"), customEnd: dy("2026-10-23")))
ok(custom.range.completedDays == 14, "custom 10-23 inclusive = 14 days (got \(custom.range.completedDays))")
ok(custom.range.endExclusive == dt("2026-10-24T00:00:00Z"), "endExclusive is start-of-today (half-open)")

// all-unknown symptoms: known days 0, not negatives
e = LocalEntries()
e.symptomCheckIns = [SymptomCheckIn(date: dy("2026-10-20")), SymptomCheckIn(date: dy("2026-10-21"))]
s = try build(e)
ok(s.symptoms.allSatisfy { $0.knownDays == 0 && $0.positiveDays == 0 }, "all-unknown -> no known/positive days")
ok(s.reportingCoverage.knownSymptomDays == 2, "but check-in days are known-coverage days (got \(s.reportingCoverage.knownSymptomDays))")

// mixed answers on one day across fields
e = LocalEntries()
e.symptomCheckIns = [SymptomCheckIn(date: dy("2026-10-20"), cough: .mild, wheeze: SymptomSeverity.none, breathlessness: .unknown)]
s = try build(e)
ok(s.symptoms.first(where: { $0.field == "cough" })!.positiveDays == 1, "mixed day: cough positive")
ok(s.symptoms.first(where: { $0.field == "wheeze" })!.knownDays == 1 && s.symptoms.first(where: { $0.field == "wheeze" })!.positiveDays == 0, "mixed day: wheeze known-negative")
ok(s.symptoms.first(where: { $0.field == "breathlessness" })!.knownDays == 0, "mixed day: breathlessness unknown")

// multiple medicines distinct groups
e = LocalEntries()
e.medicationUseEvents = [MedicationUseEvent(date: dy("2026-10-20"), medicationName: "Synthetic A", amount: 1, unit: .puff),
                         MedicationUseEvent(date: dy("2026-10-21"), medicationName: "Synthetic B", amount: 1, unit: .tablet)]
ok((try build(e)).medicationLogs.count == 2, "two medicines -> two groups")

// wearable incompatible sources flagged, values not combined
e = LocalEntries()
let wf = [DailyFeature(metric: .respiratoryRate, day: dy("2026-10-20"), sourceID: "WatchA", value: 16, unit: "count/min", sampleCount: 1),
          DailyFeature(metric: .respiratoryRate, day: dy("2026-10-21"), sourceID: "WatchB", value: 18, unit: "count/min", sampleCount: 1)]
let ws = try build(e, wearable: wf)
let rrList = ws.wearableContext.filter { $0.metricID == "rr" }
ok(rrList.count == 1 && rrList[0].incompatibleSources && rrList[0].sources.count == 2, "incompatible wearable sources flagged")

// personal-change finding whose recent window is AFTER the report endpoint is omitted with a reason
e = LocalEntries()
let afterEndpoint = ChangeFinding(metric: .respiratoryRate, sourceID: "WatchA", state: .singleDayChange,
    baseline: nil,
    recent: [ChangeDayComparison(day: dy("2026-10-30"), value: 20, difference: 4, robustZ: 3, qualifies: true)],
    referenceValidDays: 21, recentValidDays: 2, referenceExpectedDays: 28, recentExpectedDays: 3,
    reasons: [], explanationID: "x", evidenceIDs: [], ruleVersion: "test")
let pastReport = try build(e, range: .init(kind: .custom, customStart: dy("2026-10-10"), customEnd: dy("2026-10-20")),
    findings: [afterEndpoint])
ok(pastReport.personalChanges.isEmpty && pastReport.personalChangesOmittedReason != nil, "future-window finding omitted from past report")

print("CHECKS=\(checks) FAILURES=\(failures)")
if failures > 0 { exit(1) }
