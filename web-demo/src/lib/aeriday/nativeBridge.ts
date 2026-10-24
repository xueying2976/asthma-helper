/**
 * Typed adapter for the iOS WKWebView shell.
 * JS -> native: window.webkit.messageHandlers.aeriBridge.postMessage(BridgeRequest)
 * native -> JS: window.__aeriBridgeReceive(BridgeResponse)  (evaluateJavaScript)
 * Health data stays on device: this module never uses fetch/XHR.
 */
import type { Lang } from "./copy";
import { doctorSummaryRequestSchema, doctorSummaryResultSchema, doctorExportRequestSchema, doctorExportResultSchema, type DoctorSummaryRequest, type DoctorSummaryResult } from './doctorSummary';
import { insightsSchema, seriesSchema, symptomSchema, useSchema, peakSchema, preferredSourceSchema, reviewBaselineSchema, type Insights, type MetricSeries, type InsightMetric, type SymptomInput, type UseInput, type PeakInput } from "./insights";

export const BRIDGE_VERSION = 1;
export const BRIDGE_METHODS = [
  "getSnapshot",
  "requestHealthAuthorization",
  "saveNote",
  "deleteNote",
  "saveMedication",
  "deleteMedication",
  "setReminder",
  "deleteAll",
  "setLanguage",
  "getInsights", "setAnalysisEnabled", "getMetricSeries", "setPreferredSource", "reviewBaseline",
  "saveSymptomCheckIn", "deleteSymptomCheckIn", "saveMedicationUse", "deleteMedicationUse", "savePeakFlow", "deletePeakFlow",
  "getDoctorSummary", "exportDoctorSummary",
] as const;
export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

/** One metric supplied by the existing Swift services. Ranges/status are computed natively. */
export type NativeMetric = {
  id: string; // must match a known metric id (rr, rhr, hrv, sleep, …)
  current: number | null;
  band?: [number, number];
  status: "within" | "different" | "insufficient" | "changed";
  /** 30 native-supplied date-indexed values, oldest first; no JS aggregation. */
  points: (number | null)[];
  /** "HH:mm" of latest sample, or "missing" | "stale" | "changed". */
  freshness: string;
  source?: string;
  sampledAt?: string;
  unit?: string;
  semantics?: "latestSample";
};
/** Free-text note. metricId/value are optional (only for numeric entries). */
export type NativeNote = { id: string; date: string; note: string; metricId?: string; value?: number };
export type MedUnit = "puff" | "tablet" | "capsule" | "item";
export type NativeMedication = {
  id: string;
  name: string;
  remainingDoses?: number;
  confirmed?: boolean;
  unit?: MedUnit;
  reminderHour?: number;
  reminderMinute?: number;
  reminderEnabled?: boolean;
};
export type NativeSnapshot = {
  isDemo: boolean;
  generatedAt: string; // ISO 8601
  healthAuthorized: boolean;
  metrics: NativeMetric[];
  notes: NativeNote[];
  medications: NativeMedication[];
  language?: Lang;
};

export type BridgeParams = {
  getDoctorSummary: DoctorSummaryRequest;
  exportDoctorSummary: { token: string; format: 'pdf' };
  getInsights: Record<string, never>;
  setAnalysisEnabled: { enabled: boolean };
  setPreferredSource: { metricId: InsightMetric; sourceId: string | null };
  reviewBaseline: { metricId: InsightMetric; confirm: true };
  getMetricSeries: { metricId: InsightMetric; days: 7 | 30 | 90 };
  saveSymptomCheckIn: SymptomInput;
  deleteSymptomCheckIn: { id: string };
  saveMedicationUse: UseInput;
  deleteMedicationUse: { id: string };
  savePeakFlow: PeakInput;
  deletePeakFlow: { id: string };
  getSnapshot: Record<string, never>;
  requestHealthAuthorization: Record<string, never>;
  saveNote: Omit<NativeNote, "id"> & { id?: string };
  deleteNote: { id: string };
  saveMedication: Omit<NativeMedication, "id"> & { id?: string };
  deleteMedication: { id: string };
  setReminder: { id: string; time: string; enabled: boolean; kind: "dose" | "checkin" | "refill" };
  deleteAll: { confirm: true };
  setLanguage: { lang: Lang };
};
export type BridgeResults = {
  getDoctorSummary: DoctorSummaryResult;
  exportDoctorSummary: { ok: true; format: 'pdf' };
  getInsights: Insights;
  setAnalysisEnabled: { ok: true };
  setPreferredSource: { ok: true };
  reviewBaseline: { ok: true };
  getMetricSeries: MetricSeries;
  saveSymptomCheckIn: { id: string };
  deleteSymptomCheckIn: { ok: true };
  saveMedicationUse: { id: string };
  deleteMedicationUse: { ok: true };
  savePeakFlow: { id: string };
  deletePeakFlow: { ok: true };
  getSnapshot: NativeSnapshot;
  requestHealthAuthorization: { authorized: boolean };
  saveNote: { id: string };
  deleteNote: { ok: true };
  saveMedication: { id: string };
  deleteMedication: { ok: true };
  setReminder: { ok: true };
  deleteAll: { ok: true };
  setLanguage: { ok: true };
};

export type BridgeRequest<M extends BridgeMethod = BridgeMethod> = {
  v: typeof BRIDGE_VERSION;
  id: string;
  method: M;
  params: BridgeParams[M];
};
export type BridgeResponse =
  | { v: number; id: string; ok: true; result: unknown }
  | { v: number; id: string; ok: false; error: { code: string; message: string } };

export class BridgeError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Handler = { postMessage: (msg: unknown) => void };
declare global {
  interface Window {
    webkit?: { messageHandlers?: { aeriBridge?: Handler } };
    __aeriBridgeReceive?: (res: BridgeResponse) => void;
  }
}

function handler(): Handler | undefined {
  return typeof window === "undefined" ? undefined : window.webkit?.messageHandlers?.aeriBridge;
}

export function isNativeShell(): boolean {
  return !!handler();
}

const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
let seq = 0;

function ensureReceiver() {
  if (typeof window === "undefined" || window.__aeriBridgeReceive) return;
  window.__aeriBridgeReceive = (res) => {
    const p = res && pending.get(res.id);
    if (!p) return;
    pending.delete(res.id);
    clearTimeout(p.timer);
    if (res.ok) p.resolve(res.result);
    else p.reject(new BridgeError(res.error?.code ?? "native_error", res.error?.message ?? "Native error"));
  };
}

export function callNative<M extends BridgeMethod>(
  method: M,
  params: BridgeParams[M],
  timeoutMs = method === "getInsights" || method === "getDoctorSummary" || method === "exportDoctorSummary" ? 60000 : 15000,
): Promise<BridgeResults[M]> {
  if (!(BRIDGE_METHODS as readonly string[]).includes(method))
    return Promise.reject(new BridgeError("method_not_allowed", method));
  const h = handler();
  if (!h) return Promise.reject(new BridgeError("no_native_shell", "aeriBridge unavailable"));
  try {
    if (method === 'getDoctorSummary') doctorSummaryRequestSchema.parse(params);
    if (method === 'exportDoctorSummary') doctorExportRequestSchema.parse(params);
    if (method === "saveSymptomCheckIn") symptomSchema.parse(params);
    if (method === "saveMedicationUse") useSchema.parse(params);
    if (method === "savePeakFlow") peakSchema.parse(params);
    if (method === "setPreferredSource") preferredSourceSchema.parse(params);
    if (method === "reviewBaseline") reviewBaselineSchema.parse(params);
  } catch {
    return Promise.reject(new BridgeError("invalid_record", "Record is invalid"));
  }
  ensureReceiver();
  const id = `${Date.now().toString(36)}-${(++seq).toString(36)}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new BridgeError("timeout", `${method} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve: (value) => {
      try {
        const parsed = method === 'getDoctorSummary' ? doctorSummaryResultSchema.parse(value) : method === 'exportDoctorSummary' ? doctorExportResultSchema.parse(value) : method === "getInsights" ? insightsSchema.parse(value) : method === "getMetricSeries" ? seriesSchema.parse(value) : value;
        resolve(parsed as BridgeResults[M]);
      } catch { reject(new BridgeError("invalid_response", "Native response does not match the approved contract")); }
    }, reject, timer });
    const req: BridgeRequest<M> = { v: BRIDGE_VERSION, id, method, params };
    try {
      h.postMessage(req);
    } catch (e) {
      pending.delete(id);
      clearTimeout(timer);
      reject(new BridgeError("post_failed", String(e)));
    }
  });
}
