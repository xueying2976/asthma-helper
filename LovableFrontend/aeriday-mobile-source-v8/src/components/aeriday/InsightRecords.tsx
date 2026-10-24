import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { callNative } from '@/lib/aeriday/nativeBridge';
import { confirmedPeakPercent, symptomSchema, useSchema, peakSchema, type SymptomInput, type UseInput, type PeakInput } from '@/lib/aeriday/insights';
import { useAeri } from './state';
import { useInsights } from './InsightsProvider';
import { ChoiceGroup, Sheet, TextField } from './kit';
import { fmtLocal } from '@/lib/aeriday/nativeCopy';
export type RecordKind = 'symptom' | 'use' | 'peak';
export const recordNames: Record<RecordKind, string> = { symptom: 'Respiratory check-in', use: 'Actual medication use', peak: 'Peak flow' };
export type StructuredRecord = (SymptomInput | UseInput | PeakInput) & { id: string; updatedAt: string };
const choices = <T extends string>(values: readonly T[]) => values.map((value) => ({ value, label: value === 'unknown' ? 'Unknown' : value === 'saba' || value === 'air' || value === 'mart' ? value.toUpperCase() : value.charAt(0).toUpperCase() + value.slice(1) }));
function localInput(iso: string) {
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function RecordEditor({ kind, record, medication }: { kind: RecordKind; record?: StructuredRecord; medication?: { id: string; name: string } }) {
  const { closeSheet, native } = useAeri();
  const { write, status } = useInsights();
  const savedId = useRef(record?.id);
  const [when, setWhen] = useState(localInput(record?.date ?? new Date().toISOString()));
  const [symptom, setSymptom] = useState<SymptomInput>(() => record && 'cough' in record ? record : { date: '', cough: 'unknown', wheeze: 'unknown', chestTightness: 'unknown', breathlessness: 'unknown', respiratoryNightWaking: 'unknown', activityLimitation: 'unknown', context: '' });
  const [use, setUse] = useState<UseInput>(() => record && 'medicationName' in record ? record : { date: '', ...(medication ? { medicationID: medication.id } : {}), medicationName: medication?.name ?? '', purpose: 'unknown', regimen: 'unknown', amount: 1, unit: 'puff', preExercise: 'unknown' });
  const [amount, setAmount] = useState(record && 'amount' in record ? String(record.amount) : '');
  const [peak, setPeak] = useState<PeakInput>(() => record && 'device' in record ? record : { date: '', value: 0, unit: 'L/min', device: '', personalBestConfirmedByClinician: false });
  const [peakValue, setPeakValue] = useState(record && 'value' in record ? String(record.value) : '');
  const [best, setBest] = useState(record && 'personalBest' in record && record.personalBest ? String(record.personalBest) : '');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const date = new Date(when); const iso = Number.isNaN(date.getTime()) ? '' : date.toISOString();
  const base = { date: iso, ...(savedId.current ? { id: savedId.current } : {}) };
  const symptomPayload = { ...symptom, ...base };
  const usePayload = { ...use, amount: Number(amount), ...base };
  const peakPayload = { ...peak, value: Number(peakValue), personalBest: best.trim() ? Number(best) : undefined, ...base };
  const valid = kind === 'symptom' ? symptomSchema.safeParse(symptomPayload).success : kind === 'use' ? useSchema.safeParse(usePayload).success : peakSchema.safeParse(peakPayload).success;
  const save = async () => {
    if (!valid || busy || status === 'error') return;
    setBusy(true); setFailure(null);
    const ok = await write(async () => {
      const result = kind === 'symptom' ? await callNative('saveSymptomCheckIn', symptomPayload) : kind === 'use' ? await callNative('saveMedicationUse', usePayload) : await callNative('savePeakFlow', peakPayload);
      savedId.current = result.id;
    });
    if (ok) closeSheet(); else setFailure('The change may have saved. Check the current records before retrying.');
    setBusy(false);
  };
  const remove = async () => {
    if (!record || busy) return;
    setBusy(true);
    const ok = await write(() => kind === 'symptom' ? callNative('deleteSymptomCheckIn', { id: record.id }) : kind === 'use' ? callNative('deleteMedicationUse', { id: record.id }) : callNative('deletePeakFlow', { id: record.id }));
    if (ok) closeSheet(); else setFailure('Could not complete deletion. Check the current records.');
    setBusy(false);
  };
  return <Sheet title={`${record ? 'Edit' : 'Add'} ${recordNames[kind].toLowerCase()}`} onClose={closeSheet} closeLabel="Cancel" footer={<div className="space-y-2">
    <Button disabled={!valid || busy || status !== 'ready'} onClick={save} className="t-body h-auto min-h-11 w-full rounded-2xl bg-aeri-teal px-4 py-3 text-aeri-teal-fg">{busy ? 'Saving…' : 'Save'}</Button>
    {record ? <Button variant="ghost" disabled={busy || status !== 'ready'} onClick={() => confirm ? void remove() : setConfirm(true)} className="t-body h-auto min-h-11 w-full">{confirm ? 'Confirm delete record' : 'Delete record'}</Button> : null}
  </div>}>
    {failure ? <p role="alert" className="t-body">{failure}</p> : null}
    <label className="t-body block font-medium">Date and time<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="t-body mt-2 min-h-11 w-full min-w-0 rounded-2xl border border-aeri-line bg-aeri-mist px-3 py-2" /></label>
    {record ? <p className="t-meta text-aeri-slate">Updated {fmtLocal(record.updatedAt, 'en')}</p> : null}
    {kind === 'symptom' ? <>
      {(['cough', 'wheeze', 'chestTightness', 'breathlessness'] as const).map((key) => <ChoiceGroup key={key} label={{ cough: 'Cough', wheeze: 'Wheeze', chestTightness: 'Chest tightness', breathlessness: 'Breathlessness' }[key]} value={symptom[key]} options={choices(['unknown', 'none', 'mild', 'moderate', 'severe'] as const)} onChange={(v) => setSymptom((s) => ({ ...s, [key]: v }))} />)}
      <ChoiceGroup label="Respiratory night waking" value={symptom.respiratoryNightWaking} options={choices(['unknown', 'no', 'yes'] as const)} onChange={(v) => setSymptom((s) => ({ ...s, respiratoryNightWaking: v }))} />
      <ChoiceGroup label="Activity limitation" value={symptom.activityLimitation} options={choices(['unknown', 'no', 'yes'] as const)} onChange={(v) => setSymptom((s) => ({ ...s, activityLimitation: v }))} />
      <TextField label="Context" value={symptom.context} onChange={(v) => setSymptom((s) => ({ ...s, context: v }))} />
    </> : null}
    {kind === 'use' ? <>
      <ChoiceGroup label="Linked inventory item" value={use.medicationID ?? 'unlinked'} options={[{ value: 'unlinked', label: 'Not linked' }, ...(native?.snapshot.medications ?? []).map((m) => ({ value: m.id, label: m.name }))]} onChange={(id) => setUse((u) => ({ ...u, medicationID: id === 'unlinked' ? undefined : id, medicationName: native?.snapshot.medications.find((m) => m.id === id)?.name ?? u.medicationName }))} />
      <TextField label="Medication name" value={use.medicationName} onChange={(v) => setUse((u) => ({ ...u, medicationName: v }))} />
      <ChoiceGroup label="Purpose" value={use.purpose} options={choices(['unknown', 'maintenance', 'relief'] as const)} onChange={(v) => setUse((u) => ({ ...u, purpose: v }))} />
      <ChoiceGroup label="Regimen" value={use.regimen} options={choices(['unknown', 'saba', 'air', 'mart', 'other'] as const)} onChange={(v) => setUse((u) => ({ ...u, regimen: v }))} />
      <TextField label="Amount used" value={amount} inputMode="numeric" onChange={setAmount} />
      <ChoiceGroup label="Unit" value={use.unit} options={choices(['puff', 'tablet', 'capsule', 'item'] as const)} onChange={(v) => setUse((u) => ({ ...u, unit: v }))} />
      <ChoiceGroup label="Pre-exercise use" value={use.preExercise} options={choices(['unknown', 'no', 'yes'] as const)} onChange={(v) => setUse((u) => ({ ...u, preExercise: v }))} />
      <p className="t-meta text-aeri-slate">Actual use is separate from inventory. No adherence or dose advice.</p>
    </> : null}
    {kind === 'peak' ? <>
      <TextField label="Peak flow · L/min" value={peakValue} inputMode="numeric" onChange={setPeakValue} />
      <TextField label="Device" value={peak.device} onChange={(v) => setPeak((p) => ({ ...p, device: v }))} />
      <TextField label="Personal best · L/min (optional)" value={best} inputMode="numeric" onChange={setBest} />
      <ChoiceGroup label="Personal best confirmed by a clinician" value={peak.personalBestConfirmedByClinician ? 'yes' : 'no'} options={choices(['no', 'yes'] as const)} onChange={(v) => setPeak((p) => ({ ...p, personalBestConfirmedByClinician: v === 'yes' }))} />
      {confirmedPeakPercent(peakPayload) !== null ? <p className="t-meta text-aeri-slate">{confirmedPeakPercent(peakPayload)?.toFixed(0)}% of clinician-confirmed personal best</p> : null}
    </> : null}
  </Sheet>;
}
export function recordSummary(kind: RecordKind, record: StructuredRecord): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (kind === 'symptom' && 'cough' in record) {
    // Concise chips: only the fields that were actually answered (not "unknown"). Full detail on tap.
    const sev: [string, string][] = [['Cough', record.cough], ['Wheeze', record.wheeze], ['Tightness', record.chestTightness], ['Breathless', record.breathlessness]];
    const parts = sev.filter(([, v]) => v !== 'unknown').map(([k, v]) => `${k} ${v}`);
    if (record.respiratoryNightWaking === 'yes') parts.push('Night waking');
    if (record.activityLimitation === 'yes') parts.push('Activity limited');
    return parts.length ? parts.join(' · ') : 'No symptoms answered';
  }
  if (kind === 'use' && 'amount' in record) {
    const extra = record.purpose !== 'unknown' ? ` · ${cap(record.purpose)}` : '';
    return `${record.medicationName} · ${record.amount} ${record.unit}${extra}`;
  }
  if ('value' in record) {
    const percent = confirmedPeakPercent(record);
    return `${Math.round(record.value)} L/min${percent === null ? '' : ` · ${percent.toFixed(0)}% of confirmed best`}`;
  }
  return '';
}
