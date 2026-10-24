import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { demoISO, demoStamp, environment, demoSeries } from '@/lib/aeriday/browserDemo';
import { useBrowserDemo } from './BrowserDemoProvider';
import { useAeri } from './state';
import { Sheet, TextField, ActionRow } from './kit';
import { Panel } from './ui';
import { HistorySection } from './previewLayouts';
import { StructuredHistory, ActualUseEntry } from './PersonalInsights';
import { DoctorVisitEntry } from './DoctorVisit';
import { RecordEditor } from './InsightRecords';
import { IconInfo, IconLog } from './icons';

export function BrowserNoteEditor({ id }: { id?: string }) {
  const demo = useBrowserDemo(), { closeSheet } = useAeri();
  const record = demo?.store.notes.find((r) => r.id === id);
  const [text, setText] = useState(record?.note ?? ''), [date, setDate] = useState(record?.date.slice(0, 10) ?? demo?.store.day ?? ''), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const save = async () => { if (!demo || !text.trim()) return; try { await demo.call('saveNote', { ...(id ? { id } : {}), date: demoISO(date, '09:00'), note: text.trim() }); closeSheet(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); } };
  return <Sheet title={id ? 'Edit note' : 'Add note'} onClose={closeSheet} closeLabel="Cancel" footer={<div className="space-y-2"><Button className="min-h-11 w-full bg-aeri-teal text-aeri-teal-fg" disabled={!text.trim()} onClick={() => void save()}>Save note</Button>{id ? <Button variant="ghost" className="min-h-11 w-full" onClick={async () => { if (!confirm) { setConfirm(true); return; } await demo?.call('deleteNote', { id }); closeSheet(); }}>{confirm ? 'Confirm delete note' : 'Delete note'}</Button> : null}</div>}><TextField label="Note" value={text} onChange={setText} /><label className="t-body block">Date<input aria-label="Note date" type="date" value={date} min="2026-09-20" max={demo?.store.day} onChange={(e) => setDate(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-aeri-line bg-aeri-mist px-3 text-base" /></label>{error ? <p role="alert">{error}</p> : null}</Sheet>;
}
export function BrowserHistory() {
  const demo = useBrowserDemo(), { openSheet } = useAeri();
  return <><StructuredHistory /><HistorySection title="Notes">{demo?.store.notes.filter((r) => r.date.slice(0, 10) <= demo.store.day).map((r) => <ActionRow key={r.id} Icon={IconLog} title={r.note} subtitle={demoStamp(r.date)} onClick={() => openSheet(<BrowserNoteEditor id={r.id} />)} />)}<Button variant="outline" className="min-h-11 w-full border-aeri-line bg-aeri-surface text-aeri-ink" onClick={() => openSheet(<BrowserNoteEditor />)}>Add note</Button></HistorySection></>;
}
export function BrowserMeds() {
  const demo = useBrowserDemo(), { openSheet } = useAeri();
  return <><Panel variant="B" title="Today’s schedule">{demo?.store.medications.map((m) => <ActionRow key={m.id} title={m.name} subtitle={m.reminderEnabled ? `Reminder ${String(m.reminderHour ?? 0).padStart(2,'0')}:${String(m.reminderMinute ?? 0).padStart(2,'0')} · Not evidence of actual use` : 'No scheduled reminder'} onClick={() => openSheet(<RecordEditor kind="use" medication={m} />)} />)}</Panel><ActualUseEntry /><Panel variant="B" title="Inventory">{demo?.store.medications.map((m) => <ActionRow key={m.id} title={m.name} subtitle={m.remainingDoses === undefined ? 'Count not supplied' : `${m.remainingDoses} ${m.unit ?? 'item'}${m.remainingDoses === 1 ? '' : 's'} left · ${m.confirmed ? 'User confirmed' : 'Not confirmed'}`} onClick={() => openSheet(<RecordEditor kind="use" medication={m} />)} />)}<p className="t-meta text-aeri-slate">Logging actual use does not change inventory.</p></Panel></>;
}
export function BrowserMore() {
  const { openSheet } = useAeri();
  return <><DoctorVisitEntry /><Panel variant="B" title="About this example"><ActionRow Icon={IconInfo} title="Simulated personal changes" subtitle="Swift-engine presentation examples" onClick={() => openSheet(<Sheet title="Simulated personal changes" onClose={() => openSheet(null)} closeLabel="Close"><p className="t-body">Record edits select a coherent Swift-engine example. This browser does not run Swift, read HealthKit, or provide clinical AI. It cannot predict attacks, diagnose disease, or recommend doses.</p><p className="t-body">Only fictional records are stored in this browser. Do not enter real health information.</p></Sheet>)} /><p className="t-meta text-aeri-slate">Cambridge, Massachusetts · America/New_York</p></Panel></>;
}
export function BrowserEnvironment() {
  const demo = useBrowserDemo(); if (!demo) return null;
  const env = environment(demo.store.day);
  return <p className="t-meta py-3 text-aeri-slate">{env.aqi} AQI · Pollen {env.pollen}/10 · {env.temperature}°F · {env.condition} · {demoStamp(env.generatedAt)}</p>;
}
export function browserSamples(demo: NonNullable<ReturnType<typeof useBrowserDemo>>) {
  return demo.data.series.map((s) => ({ id: s.metricId, current: demoSeries(demo.store, s.metricId, 7).points.at(-1)?.value ?? null, unit: s.unit, source: 'Simulated watch', sampledAt: demoISO(demo.store.day) }));
}