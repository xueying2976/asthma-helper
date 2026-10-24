import { z } from 'zod';

const iso = z.string().datetime({ offset: true });
const count = z.number().finite();
const optionalNumber = count.nullish();
const optionalText = z.string().nullish();
const optionalDate = iso.nullish();
export const doctorSummarySchema = z.object({
  schemaVersion: count, generatedAt: iso,
  range: z.object({ start: iso, endExclusive: iso, completedDays: count, includesPartialToday: z.boolean(), timeZoneIdentifier: z.string(), firstInclusiveDay: iso, lastInclusiveDay: iso }),
  timeZone: z.string(), isDemo: z.boolean(), recordRevision: z.string(),
  reportingCoverage: z.object({ expectedDays: count, knownSymptomDays: count, missingWearableDays: count }),
  symptoms: z.array(z.object({ field: z.string(), knownDays: count, positiveDays: count, unansweredDays: count })),
  medicationLogs: z.array(z.object({ label: z.string(), medicationName: optionalText, regimen: z.string(), purpose: z.string(), eventCount: count, loggedDays: count, totalAmount: optionalNumber, unit: optionalText })),
  peakFlow: z.object({ validReadingCount: count, minValue: optionalNumber, maxValue: optionalNumber, unit: z.literal('L/min'), percentOfConfirmedBestRange: z.array(count).nullish() }),
  wearableContext: z.array(z.object({ metricID: z.string(), unit: z.string(), usableDays: count, missingDays: count, sources: z.array(z.string()), observedMin: optionalNumber, observedMax: optionalNumber, incompatibleSources: z.boolean() })),
  personalChanges: z.array(z.object({ metricID: z.string(), state: z.string(), referenceStart: optionalDate, referenceEnd: optionalDate, referenceValidDays: count, recentValidDays: count, observedDifference: optionalNumber, unit: z.string(), ruleVersion: z.string() })),
  personalChangesOmittedReason: optionalText,
  selectedNotes: z.array(z.object({ id: z.string(), date: iso, text: z.string() })),
  patientQuestions: z.array(z.string()), limitations: z.array(z.string()),
});
export const doctorSummaryRequestSchema = z.object({
  range: z.object({ kind: z.enum(['last7', 'last30', 'custom']), start: iso.optional(), end: iso.optional(), includeToday: z.boolean().optional() }).superRefine((r, ctx) => {
    if (r.kind === 'custom' && (!r.start || !r.end || Date.parse(r.end) < Date.parse(r.start))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom range needs ordered ISO start/end' });
  }),
  selectedNoteIds: z.array(z.string()).optional(), patientQuestions: z.array(z.string()).optional(),
});
export const doctorSummaryResultSchema = z.object({ summary: doctorSummarySchema, token: z.string().min(1) });
export const doctorExportRequestSchema = z.object({ token: z.string().min(1), format: z.literal('pdf') });
export const doctorExportResultSchema = z.object({ ok: z.literal(true), format: z.literal('pdf') });
export type DoctorVisitSummary = z.infer<typeof doctorSummarySchema>;
export type DoctorSummaryRequest = z.infer<typeof doctorSummaryRequestSchema>;
export type DoctorSummaryResult = z.infer<typeof doctorSummaryResultSchema>;
export function calendarDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftedDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() + amount); return calendarDay(date);
}
/** Calendar arithmetic only: no report aggregation or clinical analysis. */
export function inclusiveDays(start: string, end: string): number {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
}
export function rangeError(start: string, end: string, today: string, includeToday: boolean): string | null {
  const days = inclusiveDays(start, end);
  if (!Number.isFinite(days) || days < 1) return 'Choose valid dates in order.';
  if (days > 90) return 'Choose no more than 90 calendar days.';
  if (end > (includeToday ? today : shiftedDay(today, -1))) return includeToday ? 'The end date cannot be after today.' : 'To include today, choose Include today · partial.';
  return null;
}
export function customRange(start: string, end: string, includeToday: boolean): DoctorSummaryRequest['range'] {
  // Both dates are inclusive local calendar midnights; Swift owns endExclusive and the returned timezone.
  return { kind: 'custom', start: new Date(`${start}T00:00:00`).toISOString(), end: new Date(`${end}T00:00:00`).toISOString(), includeToday };
}