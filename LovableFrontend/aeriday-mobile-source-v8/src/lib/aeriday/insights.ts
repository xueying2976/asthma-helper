import { z } from 'zod';
export const metricIds = ['rr', 'rhr', 'sleep', 'spo2', 'steps', 'workout'] as const;
export const insightStates = ['insufficientData', 'noSustainedChangeDetected', 'singleDayChange', 'sustainedPersonalDeviation', 'reportedRespiratoryChange', 'baselineReviewNeeded', 'contextOnly', 'indeterminate'] as const;
const iso = z.string().datetime({ offset: true });
const number = z.number().finite();
const nullable = number.nullable();
const severity = z.enum(['unknown', 'none', 'mild', 'moderate', 'severe']);
const answer = z.enum(['unknown', 'no', 'yes']);
export const symptomSchema = z.object({ id: z.string().optional(), date: iso, cough: severity, wheeze: severity, chestTightness: severity, breathlessness: severity, respiratoryNightWaking: answer, activityLimitation: answer, context: z.string() });
export const useSchema = z.object({ id: z.string().optional(), date: iso, medicationID: z.string().optional(), medicationName: z.string().min(1), purpose: z.enum(['unknown', 'maintenance', 'relief']), regimen: z.enum(['unknown', 'saba', 'air', 'mart', 'other']), amount: number.positive(), unit: z.enum(['puff', 'tablet', 'capsule', 'item']), preExercise: answer });
export const peakSchema = z.object({ id: z.string().optional(), date: iso, value: number.positive(), unit: z.literal('L/min'), device: z.string(), personalBest: number.positive().optional(), personalBestConfirmedByClinician: z.boolean() });
export type SymptomInput = z.infer<typeof symptomSchema>;
export type UseInput = z.infer<typeof useSchema>;
export type PeakInput = z.infer<typeof peakSchema>;
const stored = { id: z.string(), updatedAt: iso };
export const referenceSchema = z.object({ median: number, mad: number.nonnegative(), referenceStart: iso, referenceEnd: iso, validDays: z.number().int().nonnegative(), frozenAt: iso.nullable(), ruleVersion: z.string(), reviewReason: z.string().nullable().optional() });
export const reviewBaselineSchema = z.object({ metricId: z.enum(metricIds), confirm: z.literal(true) });
export const sourceOptionSchema = z.object({ metricId: z.enum(metricIds), selectedSourceId: z.string().nullable(), sources: z.array(z.string().min(1)) }).refine((o) => o.selectedSourceId === null || o.sources.includes(o.selectedSourceId), 'Selected source must be a returned ID');
export type SourceOption = z.infer<typeof sourceOptionSchema>;
export function sourceIsAmbiguous(option: SourceOption | undefined): boolean { return !!option && option.selectedSourceId === null && option.sources.length > 1; }
export function sourceChoiceAllowed(option: SourceOption, sourceId: string | null): boolean { return sourceId === null || option.sources.includes(sourceId); }
export const preferredSourceSchema = z.object({ metricId: z.enum(metricIds), sourceId: z.string().min(1).nullable() });
export const reportingWindowSchema = z.object({ reportingDays: z.number().int().min(0).max(7), expectedDays: z.literal(7), perItemKnownCounts: z.record(z.string(), z.number().int().nonnegative()), loggedMedicationCounts: z.record(z.string(), z.number().int().nonnegative()) });
export const seriesSchema = z.object({ metricId: z.enum(metricIds), unit: z.string(), sourceId: z.string().nullable(), points: z.array(z.object({ date: iso, value: nullable, quality: z.string() })), baseline: nullable, reference: referenceSchema.nullable(), referenceBand: z.object({ lower: number, upper: number }).refine((b) => b.lower <= b.upper, 'Band bounds must be ordered').nullable().optional() });
export const findingSchema = z.object({ id: z.string(), metricId: z.enum(metricIds), state: z.enum(insightStates), title: z.string(), observation: z.string(), interpretation: z.string(), alternatives: z.string(), limitations: z.string(), baseline: nullable, current: nullable, delta: nullable, unit: z.string(), referenceValidDays: z.number().int().nonnegative(), recentValidDays: z.number().int().nonnegative(), durationDays: z.number().int().nonnegative(), evidenceIds: z.array(z.string()), sourceId: z.string().nullable() });
export const insightsSchema = z.object({ schemaVersion: z.literal(1), generatedAt: iso, isDemo: z.boolean(), enabled: z.boolean(), experimental: z.literal(true), historyState: z.string(), ruleVersion: z.string(), sourceOptions: z.array(sourceOptionSchema), findings: z.array(findingSchema), series: z.array(seriesSchema), records: z.object({ symptomCheckIns: z.array(symptomSchema.extend(stored)), medicationUseEvents: z.array(useSchema.extend(stored)), peakFlowEntries: z.array(peakSchema.extend(stored)) }), context: z.object({ reportedRespiratoryChange: z.boolean(), reportedSymptomsPresent: z.boolean(), changeAssessment: z.literal('notEstablished'), current7: reportingWindowSchema, prior7: reportingWindowSchema, summary: z.string() }), evidence: z.array(z.object({ id: z.string(), title: z.string(), url: z.string(), limitations: z.string() })), summary: z.string() });
export type Insights = z.infer<typeof insightsSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type MetricSeries = z.infer<typeof seriesSchema>;
export function visibleReferenceBand(series: MetricSeries) { return series.reference?.reviewReason !== undefined && series.reference.reviewReason !== null ? null : series.referenceBand ?? null; }
export type InsightMetric = typeof metricIds[number];
export const metricNames: Record<InsightMetric, string> = { rr: 'Respiratory rate', rhr: 'Resting heart rate', sleep: 'Sleep', spo2: 'Oxygen saturation', steps: 'Steps', workout: 'Workout' };
export const stateNames: Record<typeof insightStates[number], string> = { insufficientData: 'Not enough data', noSustainedChangeDetected: 'No sustained change detected', singleDayChange: 'Single-day change', sustainedPersonalDeviation: 'Sustained personal change', reportedRespiratoryChange: 'Reported respiratory change', baselineReviewNeeded: 'Reference needs review', contextOnly: 'Context only', indeterminate: 'Unable to determine' };
export const safetySentence = 'If you have severe breathing difficulty, seek emergency help now. Do not wait for this app.';
/** Display only; never infer a clinical zone or reference. */
export function confirmedPeakPercent(entry: PeakInput): number | null {
  return entry.personalBestConfirmedByClinician && entry.personalBest && entry.personalBest > 0 ? entry.value / entry.personalBest * 100 : null;
}
