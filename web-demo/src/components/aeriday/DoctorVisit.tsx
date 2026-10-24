import { useBrowserDemo, useDataCall } from './BrowserDemoProvider';
import { DEMO_START, demoISO, DEMO_ZONE } from '@/lib/aeriday/browserDemo';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { BridgeError, callNative } from '@/lib/aeriday/nativeBridge';
import { calendarDay, customRange, rangeError, shiftedDay, type DoctorSummaryResult, type DoctorVisitSummary } from '@/lib/aeriday/doctorSummary';
import { ActionRow, ChoiceGroup, Sheet } from './kit';
import { Panel } from './ui';
import { useAeri } from './state';
import { useInsights } from './InsightsProvider';

const action = 't-body h-auto min-h-11 w-full whitespace-normal rounded-2xl border border-aeri-line px-4 py-3 text-aeri-ink';
const field = 't-body mt-2 min-h-11 w-full min-w-0 max-w-full rounded-2xl border border-aeri-line bg-aeri-mist px-3 py-3';
const unknown = (value: string | number | null | undefined) => value ?? 'Not supplied';
function printBrowserSummary(_summary: DoctorVisitSummary) {
  const preview = document.querySelector('[data-doctor-preview]');
  if (!preview) return;
  document.querySelector('[data-browser-print]')?.remove();
  const report = document.createElement('article');
  report.dataset['browserPrint'] = 'true';
  report.className = 'aeri-light aeri-type-std';
  report.appendChild(preview.cloneNode(true));
  report.querySelectorAll('details').forEach((element) => { element.open = true; });
  document.body.appendChild(report);
  window.print();
}
function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-2 border-t border-aeri-line pt-4"><h3 className="t-title font-semibold">{title}</h3>{children}</section>;
}
export function SummaryPreview({ summary: s }: { summary: DoctorVisitSummary }) {
  const stamp = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: s.range.timeZoneIdentifier });
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: s.range.timeZoneIdentifier, year: 'numeric', month: 'short', day: 'numeric' });
  // No clinical calculations, recategorization or inference: every value/text below is supplied by Swift.
  return <div className="t-body min-w-0 space-y-4 break-words" data-doctor-preview>
    <p className="t-meta font-semibold text-aeri-slate">Asthma Helper</p>
    <h2 className="t-title font-semibold">Doctor-visit summary</h2>
    <p className="font-semibold">{s.isDemo ? 'Synthetic report · Simulated Swift-engine examples' : 'Personal data'}</p>
    <p>{day(s.range.firstInclusiveDay)} – {day(s.range.lastInclusiveDay)} · {s.range.completedDays} completed days{s.range.includesPartialToday ? ' · Includes today (partial)' : ''}</p>
    <p className="t-meta text-aeri-slate">Time zone: {s.timeZone} · Range time zone: {s.range.timeZoneIdentifier}<br />Generated: {stamp(s.generatedAt)}<br />Schema {s.schemaVersion} · Record revision: {s.recordRevision}</p>
    <details><summary className="t-meta py-3">Exact interval</summary><p className="t-meta break-all">Start: {s.range.start}<br />End (exclusive): {s.range.endExclusive}<br />Generated ISO: {s.generatedAt}</p></details>
    <ReportSection title="Reporting coverage"><p>Expected: {s.reportingCoverage.expectedDays} days · Known symptoms: {s.reportingCoverage.knownSymptomDays}/{s.reportingCoverage.expectedDays} days · Missing wearable data: {s.reportingCoverage.missingWearableDays} days</p></ReportSection>
    <ReportSection title="Symptoms">{s.symptoms.length ? s.symptoms.map((r, i) => <p key={i}>{r.field}: {r.positiveDays} positive / {r.knownDays} known days · {r.unansweredDays} unanswered days</p>) : <p>No symptom rows supplied.</p>}</ReportSection>
    <ReportSection title="Medication logs">{s.medicationLogs.length ? s.medicationLogs.map((r, i) => <div key={i} className="space-y-1"><p className="font-semibold">{r.label}</p><p>Medication: {unknown(r.medicationName)} · Regimen: {r.regimen} · Purpose: {r.purpose}</p><p>{r.eventCount} events · {r.loggedDays} logged days · Total amount: {unknown(r.totalAmount)} · Unit: {unknown(r.unit)}</p></div>) : <p>No medication logs supplied.</p>}<p className="t-meta text-aeri-slate">Logs do not establish adherence. Unknown is not no.</p></ReportSection>
    <ReportSection title="Peak flow"><p>{s.peakFlow.validReadingCount} valid readings · Minimum: {unknown(s.peakFlow.minValue)} · Maximum: {unknown(s.peakFlow.maxValue)} {s.peakFlow.unit}</p><p>Percent of confirmed best: {s.peakFlow.percentOfConfirmedBestRange == null ? 'Not supplied' : s.peakFlow.percentOfConfirmedBestRange.map((n) => `${n}%`).join(' – ') || 'No values supplied'}</p></ReportSection>
    <ReportSection title="Wearable context">{s.wearableContext.length ? s.wearableContext.map((r, i) => <div key={i}><p className="font-semibold">{r.metricID} · {r.unit}</p><p>{r.usableDays} usable days · {r.missingDays} missing days · Observed minimum: {unknown(r.observedMin)} · Maximum: {unknown(r.observedMax)}</p><p>Sources: {r.sources.join(' · ') || 'Not supplied'} · Incompatible sources: {r.incompatibleSources ? 'Yes' : 'No'}</p></div>) : <p>No wearable context supplied.</p>}</ReportSection>
    <ReportSection title="Personal changes">{s.personalChanges.map((r, i) => <div key={i}><p className="font-semibold">{r.metricID} · {r.state}</p><p>Historical reference: {r.referenceStart == null ? 'Not supplied' : stamp(r.referenceStart)} – {r.referenceEnd == null ? 'Not supplied' : stamp(r.referenceEnd)}</p><p>{r.referenceValidDays} reference valid days · {r.recentValidDays} recent valid days · Observed difference: {unknown(r.observedDifference)} {r.unit} · Rule: {r.ruleVersion}</p></div>)}{s.personalChangesOmittedReason != null ? <p>{s.personalChangesOmittedReason}</p> : null}{!s.personalChanges.length && s.personalChangesOmittedReason == null ? <p>No personal changes supplied.</p> : null}</ReportSection>
    <ReportSection title="Selected notes">{s.selectedNotes.length ? s.selectedNotes.map((r) => <div key={r.id}><p className="t-meta text-aeri-slate">{stamp(r.date)}</p><p className="whitespace-pre-wrap">{r.text}</p></div>) : <p>No notes selected.</p>}</ReportSection>
    <ReportSection title="Patient questions">{s.patientQuestions.length ? s.patientQuestions.map((q, i) => <p key={i} className="whitespace-pre-wrap">{q}</p>) : <p>No questions supplied.</p>}</ReportSection>
    <ReportSection title="Limitations">{s.limitations.length ? s.limitations.map((text, i) => <p key={i}>{text}</p>) : <p>No limitations supplied.</p>}</ReportSection>
  </div>;
}

export function DoctorVisitSheet() {
  const { closeSheet, native } = useAeri();
  const demo = useBrowserDemo(), callNative = useDataCall();
  const { data } = useInsights();
  const today = demo?.store.day ?? calendarDay(new Date());
  const [kind, setKind] = useState<'last7' | 'last30' | 'custom'>('last7');
  const [start, setStart] = useState(shiftedDay(today, -7));
  const [end, setEnd] = useState(shiftedDay(today, -1));
  const [includeToday, setIncludeToday] = useState(false);
  const [selectedNoteIds, setNotes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>(['']);
  const [result, setResult] = useState<DoctorSummaryResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'exporting'>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const sequence = useRef(0);
  const active = useRef(true);
  const busy = status === 'loading' || status === 'exporting';
  const error = kind === 'custom' ? rangeError(start, end, today, includeToday) || (demo && start < DEMO_START ? 'Choose dates within Sep 20–Oct 24, the 35-day example timeline.' : null) : null;
  useEffect(() => { active.current = true; return () => { active.current = false; ++sequence.current; }; }, []);
  const invalidate = () => { ++sequence.current; setResult(null); setStatus('idle'); setNotice(null); if (demo) document.querySelector('[data-browser-print]')?.remove(); };
  const revision = `${demo?.store.revision ?? ''}:${native?.snapshot.generatedAt ?? ''}:${data?.generatedAt ?? ''}`;
  useEffect(() => { ++sequence.current; setResult(null); setStatus('idle'); }, [revision]);
  const generate = async (keepNotice = false) => {
    if ((!native && !demo) || error) return;
    const request = ++sequence.current;
    setResult(null); setStatus('loading'); if (!keepNotice) setNotice(null);
    try {
      const value = await callNative('getDoctorSummary', { range: kind === 'custom' ? demo ? { kind: 'custom', start: demoISO(start, '00:00'), end: demoISO(end, '00:00'), includeToday } : customRange(start, end, includeToday) : { kind, includeToday }, selectedNoteIds, patientQuestions: questions.filter((q) => q.trim().length > 0) });
      // Verify the supplied time zone is renderable; never silently substitute the device zone.
      new Intl.DateTimeFormat('en-US', { timeZone: value.summary.range.timeZoneIdentifier });
      if (active.current && sequence.current === request) { setResult(value); setStatus('ready'); }
    } catch {
      if (active.current && sequence.current === request) { setStatus('error'); setNotice(keepNotice ? 'Records changed — regenerate. Could not regenerate the report. Retry preview.' : 'Could not prepare the report. No demo report has replaced your data.'); }
    }
  };
  const exportPDF = async () => {
    if ((!native && !demo) || !result || busy) return;
    if (demo) { printBrowserSummary(result.summary); setNotice('Print dialog opened. Choose Save as PDF; saving is controlled by your browser.'); return; }
    setStatus('exporting'); setNotice(null);
    const request = sequence.current;
    try {
      await callNative('exportDoctorSummary', { token: result.token, format: 'pdf' });
      if (active.current && request === sequence.current) { setStatus('ready'); setNotice('Native PDF share request completed. Sharing or saving is controlled by the iPhone; delivery is not confirmed here.'); }
    } catch (cause) {
      if (!active.current || request !== sequence.current) return;
      if (cause instanceof BridgeError && cause.code === 'report_stale') { setResult(null); setNotice('Records changed — regenerate'); await generate(true); }
      else { setStatus('ready'); setNotice(cause instanceof BridgeError && /cancel/i.test(cause.code) ? 'Sharing canceled. The preview is unchanged.' : 'Could not open PDF sharing. No export success is confirmed. Try again.'); }
    }
  };
  return <Sheet title="Prepare for a doctor visit" onClose={closeSheet} closeLabel="Close" footer={<div className="space-y-2"><Button variant="ghost" className={action} disabled={busy || !!error || (!native && !demo)} onClick={() => void generate()}>{status === 'loading' ? 'Preparing report…' : status === 'error' ? 'Retry preview' : result ? 'Regenerate preview' : 'Prepare preview'}</Button>{result ? <Button variant="ghost" className={action} disabled={busy} onClick={() => void exportPDF()}>{status === 'exporting' ? 'Opening PDF sharing…' : demo ? 'Print / Save PDF' : 'Share PDF'}</Button> : null}</div>}>
    {!native && !demo ? <p>Native reporting is unavailable in this browser. No PDF export is simulated.</p> : null}
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <ChoiceGroup label="Report period" value={kind} options={[{ value: 'last7', label: '7 days' }, { value: 'last30', label: '30 days' }, { value: 'custom', label: 'Custom dates' }]} onChange={(v) => { invalidate(); setKind(v); }} />
      <p className="t-meta text-aeri-slate">{demo ? 'Ends the day before the selected timeline day. Dates are inclusive within Sep 20–Oct 24; today is partial.' : 'Ends yesterday unless today is included. Custom dates are inclusive, up to 90 calendar days.'}</p>
      <ChoiceGroup label="Include today · partial" value={includeToday ? 'yes' : 'no'} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes · partial today' }]} onChange={(v) => { invalidate(); setIncludeToday(v === 'yes'); if (kind === 'custom') setEnd(v === 'yes' ? today : shiftedDay(today, -1)); }} />
      {kind === 'custom' ? <><label className="t-body block">Start date<input type="date" className={field} value={start} max={end} onChange={(e) => { invalidate(); setStart(e.target.value); }} /></label><label className="t-body block">End date · inclusive<input type="date" className={field} value={end} min={start} max={includeToday ? today : shiftedDay(today, -1)} onChange={(e) => { invalidate(); setEnd(e.target.value); }} /></label>{error ? <p role="alert" className="t-body">{error}</p> : null}</> : null}
      <fieldset className="space-y-2"><legend className="t-body font-semibold">Selected notes · optional</legend><p className="t-meta text-aeri-slate">None selected by default.</p>{(demo?.store.notes.length || native?.snapshot.notes.length) ? (demo?.store.notes ?? native?.snapshot.notes ?? []).map((n) => <Button key={n.id} variant="ghost" aria-pressed={selectedNoteIds.includes(n.id)} className={`${action} text-left ${selectedNoteIds.includes(n.id) ? 'bg-aeri-mist' : ''}`} onClick={() => { invalidate(); setNotes((ids) => ids.includes(n.id) ? ids.filter((id) => id !== n.id) : [...ids, n.id]); }}>{new Date(n.date).toLocaleDateString('en-US', demo ? {timeZone:DEMO_ZONE} : undefined)} · {n.note}</Button>) : <p className="t-meta text-aeri-slate">No notes available.</p>}</fieldset>
      <div className="space-y-3"><h3 className="t-body font-semibold">Questions for your doctor · optional</h3>{questions.map((q, i) => <div key={i} className="space-y-2"><label className="t-body block">Question {i + 1}<textarea rows={2} className={field} value={q} onChange={(e) => { invalidate(); setQuestions((all) => all.map((text, index) => index === i ? e.target.value : text)); }} /></label><Button variant="ghost" className={action} onClick={() => { invalidate(); setQuestions((all) => all.filter((_, index) => index !== i)); }}>Remove question {i + 1}</Button></div>)}<Button variant="ghost" className={action} onClick={() => { invalidate(); setQuestions((all) => [...all, '']); }}>Add question</Button></div>
    </fieldset>
    {notice ? <p role={status === 'error' ? 'alert' : 'status'} aria-live="polite" className="t-body">{notice}</p> : null}
    {status === 'loading' ? <p role="status" className="t-body">{demo ? "Preparing example records…" : "Reading on-device records…"}</p> : null}
    {result ? <SummaryPreview summary={result.summary} /> : null}
  </Sheet>;
}
export function DoctorVisitEntry() {
  const { openSheet } = useAeri();
  return <Panel variant="B" title="Doctor visit"><ActionRow title="Prepare for a doctor visit" onClick={() => openSheet(<DoctorVisitSheet />)} /></Panel>;
}