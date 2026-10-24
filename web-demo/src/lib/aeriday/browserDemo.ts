import { z } from 'zod';
import { insightsSchema, metricIds, metricNames, symptomSchema, useSchema, peakSchema, type InsightMetric, type Insights, type MetricSeries } from './insights';
import { doctorSummarySchema, inclusiveDays, shiftedDay, type DoctorSummaryRequest, type DoctorVisitSummary } from './doctorSummary';
import type { BridgeMethod, BridgeParams, BridgeResults, NativeNote, NativeMedication } from './nativeBridge';

export const DEMO_ZONE = 'America/New_York';
export const DEMO_TODAY = '2026-10-24';
export const DEMO_START = '2026-09-20';
export const DEMO_STORAGE_KEY = 'aeriday-judges-synthetic-v1';
export const demoDays = Array.from({ length: 35 }, (_, i) => shiftedDay(DEMO_START, i));
export const demoISO = (day: string, time = '19:00') => `${day}T${time}:00-04:00`;
export const demoDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: DEMO_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const demoStamp = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: DEMO_ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const stored = { id: z.string(), updatedAt: z.string() };
const storeSchema = z.object({ version: z.literal(1), revision: z.number().int(), day: z.enum(demoDays as [string, ...string[]]), example: z.enum(['changes', 'within', 'gaps']), enabled: z.boolean(), symptoms: z.array(symptomSchema.extend(stored)), uses: z.array(useSchema.extend(stored)), peaks: z.array(peakSchema.extend(stored)), notes: z.array(z.object({ id: z.string(), date: z.string(), note: z.string() })), medications: z.array(z.object({ id: z.string(), name: z.string(), remainingDoses: z.number().optional(), unit: z.enum(['puff', 'tablet', 'capsule', 'item']).optional(), confirmed: z.boolean().optional(), reminderEnabled: z.boolean().optional(), reminderHour: z.number().optional(), reminderMinute: z.number().optional() })) });
export type DemoStore = z.infer<typeof storeSchema>;
export function parseDemoStore(raw: string): DemoStore { return storeSchema.parse(JSON.parse(raw)); }
export function seedDemo(): DemoStore {
  const symptoms = [1, 3, 6, 10, 14, 18, 22, 26, 31, 32, 33, 34].map((i) => {
    const day = demoDays[i] ?? DEMO_TODAY;
    return { id: `symptom-${i}`, date: demoISO(day, '09:00'), updatedAt: demoISO(day), cough: i >= 32 ? 'mild' as const : 'none' as const, wheeze: 'none' as const, chestTightness: 'unknown' as const, breathlessness: 'none' as const, respiratoryNightWaking: 'unknown' as const, activityLimitation: 'no' as const, context: i >= 32 ? 'Cough after an outdoor walk.' : '' };
  });
  return { version: 1, revision: 0, day: DEMO_TODAY, example: 'changes', enabled: true, symptoms, uses: [30, 32, 33].map((i) => ({ id: `use-${i}`, date: demoISO(demoDays[i] ?? DEMO_TODAY, '09:15'), updatedAt: demoISO(DEMO_TODAY), medicationName: 'Albuterol inhaler', purpose: 'relief', regimen: 'saba', amount: 1, unit: 'puff', preExercise: 'unknown' })), peaks: [26, 29, 32, 34].map((i) => ({ id: `peak-${i}`, date: demoISO(demoDays[i] ?? DEMO_TODAY, '09:30'), updatedAt: demoISO(DEMO_TODAY), value: i >= 32 ? 410 : 440, unit: 'L/min', device: 'Handheld meter', personalBestConfirmedByClinician: false })), notes: [{ id: 'note-walk', date: demoISO('2026-10-23', '18:00'), note: 'Cough after walking near the river.' }, { id: 'note-question', date: demoISO('2026-10-21', '09:00'), note: 'Bring inhaler technique questions to the next visit.' }], medications: [{ id: 'med-controller', name: 'Budesonide inhaler', remainingDoses: 84, unit: 'puff', confirmed: true, reminderEnabled: true, reminderHour: 20, reminderMinute: 0 }, { id: 'med-relief', name: 'Albuterol inhaler', remainingDoses: 12, unit: 'puff', confirmed: true, reminderEnabled: false }] };
}
export function environment(day: string) {
  const i = demoDays.indexOf(day);
  return { aqi: 32 + (i * 7 % 57), pollen: Number((2.1 + (i * 13 % 64) / 10).toFixed(1)), temperature: 52 + (i * 3 % 17), humidity: 46 + (i * 5 % 34), condition: ['Clear', 'Partly cloudy', 'Cloudy', 'Light rain'][i % 4] ?? 'Clear', generatedAt: demoISO(day) };
}
const units: Record<InsightMetric, string> = { rr: 'breaths/min', rhr: 'bpm', sleep: 'h', spo2: '%', steps: 'steps', workout: 'min' };
const base: Record<InsightMetric, number> = { rr: 15, rhr: 64, sleep: 7.5, spo2: 97, steps: 6240, workout: 25 };
/** Explicit presentation fixture selection, NOT a clinical model or a Swift implementation. */
export function activeExample(s: DemoStore) {
  if (s.example !== 'changes') return s.example;
  const latest = [...s.symptoms].reverse().filter((r) => demoDay(r.date) <= s.day).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0];
  return latest && ['cough', 'wheeze', 'chestTightness', 'breathlessness'].some((k) => latest[k as 'cough'] !== 'none' && latest[k as 'cough'] !== 'unknown') ? 'changes' : 'within';
}
export function demoSeries(s: DemoStore, metricId: InsightMetric, days: number): MetricSeries {
  const end = demoDays.indexOf(s.day);
  const example = activeExample(s);
  const points = Array.from({ length: days }, (_, n) => {
    const index = end - days + n + 1;
    const date = demoISO(shiftedDay(s.day, n - days + 1));
    const missing = index < 0 || (example === 'gaps' && index % 3 !== 0) || index === 17;
    const change = example === 'changes' && index >= 32;
    const value = change ? ({ rr: 18.2, rhr: 74, sleep: 5.7, spo2: 97, steps: 5400, workout: 20 }[metricId]) : base[metricId] + (metricId === 'steps' ? (index % 5 - 2) * 180 : metricId === 'workout' ? index % 3 * 5 : metricId === 'rhr' ? index % 3 - 1 : metricId === 'spo2' ? 0 : (index % 3 - 1) * 0.1);
    return { date, value: missing ? null : Number(value.toFixed(1)), quality: missing ? 'Missing' : 'Available' };
  });
  const reference = end >= 27 && example !== 'gaps' ? { median: base[metricId], mad: metricId === 'steps' ? 180 : 1, referenceStart: demoISO(DEMO_START, '00:00'), referenceEnd: demoISO('2026-10-17', '00:00'), validDays: 27, frozenAt: demoISO('2026-10-18'), ruleVersion: 'Example 1' } : null;
  return { metricId, unit: units[metricId], sourceId: 'Simulated watch', points, baseline: reference?.median ?? null, reference };
}
const fields = ['cough', 'wheeze', 'chestTightness', 'breathlessness'] as const;
export function demoInsights(s: DemoStore): Insights {
  const series = metricIds.map((id) => demoSeries(s, id, 35));
  const example = activeExample(s);
  const current = s.symptoms.filter((r) => demoDay(r.date) <= s.day && demoDay(r.date) >= shiftedDay(s.day, -6));
  const windowCoverage = (offset: number) => {
    const rows = s.symptoms.filter((r) => demoDay(r.date) <= shiftedDay(s.day, offset) && demoDay(r.date) >= shiftedDay(s.day, offset - 6));
    return { reportingDays: new Set(rows.map((r) => demoDay(r.date))).size, expectedDays: 7 as const, perItemKnownCounts: Object.fromEntries(fields.map((k) => [k, new Set(rows.filter((r) => r[k] !== 'unknown').map((r) => demoDay(r.date))).size])), loggedMedicationCounts: { relief: s.uses.filter((r) => r.purpose === 'relief' && demoDay(r.date) <= shiftedDay(s.day, offset) && demoDay(r.date) >= shiftedDay(s.day, offset - 6)).length } };
  };
  const hasSymptoms = current.some((r) => fields.some((k) => r[k] !== 'unknown' && r[k] !== 'none'));
  const changed = example === 'changes' && s.day >= '2026-10-22';
  const findings = (changed ? ['rr', 'rhr', 'sleep'] as const : ['rr'] as const).map((metricId) => {
    const row = series.find((r) => r.metricId === metricId);
    const value = row?.points.at(-1)?.value ?? null;
    return { id: `finding-${metricId}`, metricId, state: example === 'gaps' || !row?.reference ? 'insufficientData' as const : changed ? 'sustainedPersonalDeviation' as const : 'noSustainedChangeDetected' as const, title: changed ? `${metricNames[metricId]} ${metricId === 'sleep' ? 'lower' : 'higher'} recently` : example === 'gaps' || !row?.reference ? 'Not enough data to compare' : 'No sustained change in this example', observation: value === null ? 'No value available for the selected day.' : `${metricNames[metricId]} is ${value} ${units[metricId]} on ${s.day}.`, interpretation: 'Simulated Swift-engine example, not HealthKit or browser clinical AI. Changes may accompany symptoms but are not specific to asthma.', alternatives: 'Activity, illness, sleep, device changes or measurement differences may contribute.', limitations: 'Illustrative only. No attack prediction, diagnosis, dose advice or assurance of safety.', baseline: row?.baseline ?? null, current: value, delta: value !== null && row?.baseline != null ? Number((value - row.baseline).toFixed(1)) : null, unit: units[metricId], referenceValidDays: row?.reference?.validDays ?? 0, recentValidDays: row?.points.slice(-3).filter((p) => p.value !== null).length ?? 0, durationDays: changed ? inclusiveDays('2026-10-22', s.day) : 0, evidenceIds: ['education'], sourceId: 'Simulated watch' };
  });
  return insightsSchema.parse({ schemaVersion: 1, generatedAt: demoISO(s.day), isDemo: true, enabled: s.enabled, experimental: true, historyState: '35-day example timeline', ruleVersion: 'Example 1', sourceOptions: metricIds.map((metricId) => ({ metricId, selectedSourceId: 'Simulated watch', sources: ['Simulated watch'] })), findings: s.enabled ? findings : [], series, records: { symptomCheckIns: s.symptoms.filter((r) => demoDay(r.date) <= s.day), medicationUseEvents: s.uses.filter((r) => demoDay(r.date) <= s.day), peakFlowEntries: s.peaks.filter((r) => demoDay(r.date) <= s.day) }, context: { reportedSymptomsPresent: hasSymptoms, reportedRespiratoryChange: false, changeAssessment: 'notEstablished', current7: windowCoverage(0), prior7: windowCoverage(-7), summary: hasSymptoms ? 'Symptoms entered in this example. Respiratory deterioration is not established.' : 'No positive symptoms entered in the recent example records. Unanswered is not none.' }, evidence: [{ id: 'education', title: 'GINA · Asthma management and prevention', url: 'https://ginasthma.org/reports/', limitations: 'Educational context: symptoms, history and clinical review matter. Passive measurements alone do not establish asthma control or predict attacks. This fixture is not an endorsed or validated analysis.' }], summary: changed ? 'Three recent changes in the selected example.' : example === 'gaps' ? 'Missing data limits comparison.' : 'No sustained change in the selected example. This does not establish safety.' });
}
export function demoReport(s: DemoStore, request: DoctorSummaryRequest): DoctorVisitSummary {
  const end = request.range.kind === 'custom' && request.range.end ? demoDay(request.range.end) : shiftedDay(s.day, request.range.includeToday ? 0 : -1);
  const requestedStart = request.range.kind === 'custom' && request.range.start ? demoDay(request.range.start) : shiftedDay(end, request.range.kind === 'last30' ? -29 : -6);
  const start = request.range.kind === 'custom' ? requestedStart : requestedStart < DEMO_START ? DEMO_START : requestedStart;
  if (start < DEMO_START || end > s.day || start > end || inclusiveDays(start, end) > 35) throw new Error('Choose dates within the 35-day example timeline.');
  const inRange = (r: { date: string }) => demoDay(r.date) >= start && demoDay(r.date) <= end;
  const symptoms = s.symptoms.filter(inRange), uses = s.uses.filter(inRange), peaks = s.peaks.filter(inRange);
  const expectedDays = inclusiveDays(start, end);
  const insight = demoInsights({ ...s, day: end });
  const wearableContext = metricIds.map((metricID) => { const series = demoSeries({ ...s, day: end }, metricID, expectedDays); const values = series.points.flatMap((p) => p.value === null ? [] : [p.value]); return { metricID, unit: units[metricID], usableDays: values.length, missingDays: expectedDays - values.length, sources: ['Simulated watch'], observedMin: values.length ? Math.min(...values) : null, observedMax: values.length ? Math.max(...values) : null, incompatibleSources: false }; });
  const groups = [...new Set(uses.map((r) => JSON.stringify([r.medicationName, r.regimen, r.purpose, r.unit])))];
  return doctorSummarySchema.parse({ schemaVersion: 1, generatedAt: demoISO(s.day), range: { start: demoISO(start, '00:00'), endExclusive: demoISO(shiftedDay(end, 1), '00:00'), completedDays: expectedDays - (end === s.day ? 1 : 0), includesPartialToday: end === s.day, timeZoneIdentifier: DEMO_ZONE, firstInclusiveDay: demoISO(start, '00:00'), lastInclusiveDay: demoISO(end, '00:00') }, timeZone: DEMO_ZONE, isDemo: true, recordRevision: String(s.revision), reportingCoverage: { expectedDays, knownSymptomDays: new Set(symptoms.filter((r) => fields.some((k) => r[k] !== 'unknown')).map((r) => demoDay(r.date))).size, missingWearableDays: wearableContext[0]?.missingDays ?? 0 }, symptoms: fields.map((field) => { const known = new Set(symptoms.filter((r) => r[field] !== 'unknown').map((r) => demoDay(r.date))).size; return { field: { cough: 'Cough', wheeze: 'Wheeze', chestTightness: 'Chest tightness', breathlessness: 'Breathlessness' }[field], knownDays: known, positiveDays: new Set(symptoms.filter((r) => r[field] !== 'none' && r[field] !== 'unknown').map((r) => demoDay(r.date))).size, unansweredDays: expectedDays - known }; }), medicationLogs: groups.map((key) => { const [medicationName, regimen, purpose, unit] = JSON.parse(key) as string[]; const rows = uses.filter((r) => JSON.stringify([r.medicationName, r.regimen, r.purpose, r.unit]) === key); return { label: medicationName, medicationName, regimen: regimen === 'unknown' ? 'Unknown' : regimen === 'other' ? 'Other' : regimen?.toUpperCase(), purpose: purpose ? purpose[0]?.toUpperCase() + purpose.slice(1) : 'Unknown', eventCount: rows.length, loggedDays: new Set(rows.map((r) => demoDay(r.date))).size, totalAmount: Number(rows.reduce((n, r) => n + r.amount, 0).toFixed(1)), unit }; }), peakFlow: { validReadingCount: peaks.length, minValue: peaks.length ? Math.min(...peaks.map((r) => r.value)) : null, maxValue: peaks.length ? Math.max(...peaks.map((r) => r.value)) : null, unit: 'L/min', percentOfConfirmedBestRange: null }, wearableContext: wearableContext.map((r) => ({ ...r, metricID: metricNames[r.metricID] })), personalChanges: s.enabled ? insight.findings.map((f) => ({ metricID: metricNames[f.metricId], state: f.state === 'sustainedPersonalDeviation' ? 'Simulated sustained change' : f.state === 'insufficientData' ? 'Not enough data' : 'No sustained change in example', referenceStart: insight.series.find((r) => r.metricId === f.metricId)?.reference?.referenceStart ?? null, referenceEnd: insight.series.find((r) => r.metricId === f.metricId)?.reference?.referenceEnd ?? null, referenceValidDays: f.referenceValidDays, recentValidDays: f.recentValidDays, observedDifference: f.delta, unit: f.unit, ruleVersion: 'Simulated Swift-engine example' })) : [], personalChangesOmittedReason: s.enabled ? null : 'Simulated changes are turned off.', selectedNotes: s.notes.filter((r) => request.selectedNoteIds?.includes(r.id) && inRange(r)).map((r) => ({ id: r.id, date: r.date, text: r.note })), patientQuestions: request.patientQuestions ?? [], limitations: ['Synthetic browser example only; no HealthKit, real location or clinical AI.', 'Change results are simulated Swift-engine examples, not clinical conclusions.', 'Missing or unknown information is not absence of symptoms. Logs do not establish adherence.', 'Notes outside the selected date range are excluded. No attack prediction, severity score or dose advice.'] });
}
export function mutateDemo<M extends BridgeMethod>(s: DemoStore, method: M, params: BridgeParams[M]): { store: DemoStore; result: BridgeResults[M] } {
  const next = structuredClone(s), p = params as unknown as Record<string, unknown>;
  const id = typeof p['id'] === 'string' ? p['id'] : `entry-${s.revision + 1}`;
  let result: unknown = { ok: true };
  const bucket = method.includes('SymptomCheckIn') ? 'symptoms' : method.includes('MedicationUse') ? 'uses' : method.includes('PeakFlow') ? 'peaks' : method.endsWith('Note') ? 'notes' : method.endsWith('Medication') ? 'medications' : null;
  if (bucket && method.startsWith('save')) {
    const parsed = bucket === 'symptoms' ? symptomSchema.parse(params) : bucket === 'uses' ? useSchema.parse(params) : bucket === 'peaks' ? peakSchema.parse(params) : params;
    if (bucket !== 'medications') { const date = (parsed as { date: string }).date; if (!demoDays.includes(demoDay(date)) || demoDay(date) > s.day || new Date(date).getTime() > new Date(demoISO(s.day)).getTime()) throw new Error('Choose a date in the selected example timeline, no later than 7 PM today.'); }
    const rows = next[bucket] as (NativeNote | NativeMedication | { id: string })[];
    const record = { ...parsed, id, updatedAt: demoISO(s.day) };
    const index = rows.findIndex((r) => r.id === id); if (index < 0) rows.push(record); else rows[index] = record;
    result = { id };
  } else if (bucket && method.startsWith('delete')) {
    const rows = next[bucket] as { id: string }[]; const index = rows.findIndex((r) => r.id === id); if (index >= 0) rows.splice(index, 1);
  } else if (method === 'setAnalysisEnabled') next.enabled = p['enabled'] === true;
  else throw new Error('This operation is unavailable in the browser example.');
  next.revision++;
  return { store: next, result: result as BridgeResults[M] };
}