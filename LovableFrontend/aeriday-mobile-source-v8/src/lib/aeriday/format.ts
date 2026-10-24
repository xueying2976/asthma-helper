// Display-only formatting for native-supplied numbers and labels. No analysis, no rounding that
// feeds back into logic — these functions only shape what the user sees. Swift remains the source
// of truth for every value; we render it readably.

const UNIT_LABEL: Record<string, string> = {
  rr: "breaths/min",
  rhr: "bpm",
  spo2: "%",
  steps: "steps",
  workout: "min",
  // sleep handled specially (hours/minutes)
};

/** Format a metric value for display. `metricId` picks precision + a human unit label. */
export function fmtMetric(metricId: string | undefined, value: number | null | undefined, rawUnit?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  switch (metricId) {
    case "rr":
      return `${value.toFixed(1)} breaths/min`;
    case "rhr":
      return `${Math.round(value)} bpm`;
    case "spo2":
      return `${Math.round(value)}%`;
    case "steps":
      return `${Math.round(value).toLocaleString("en-US")} steps`;
    case "sleep":
      return fmtDuration(value); // native supplies minutes
    case "workout":
      return `${Math.round(value)} min`;
    default:
      // Unknown metric: 1 decimal max, drop a trailing .0, keep any supplied unit.
      return `${trim(value)}${rawUnit ? ` ${rawUnit}` : ""}`;
  }
}

/** A PEF reading in L/min, always whole. */
export function fmtPeakFlow(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} L/min`;
}

/** Minutes → "Xh Ym" (or "Ym"). Used for sleep. */
export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Trim a float to at most 1 decimal, dropping a trailing .0. */
export function trim(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const r = Math.round(value * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Strip repetitive DEMO/boilerplate ONLY from synthetic demo record text and source labels, so a
 * single global synthetic indicator carries the message instead of every row. Never alters real
 * user text meaningfully: it only removes the bracketed/suffix demo markers the fixtures add.
 */
export function stripDemo(text: string | null | undefined): string {
  if (!text) return "";
  let t = text;
  t = t.replace(/\[DEMO\]\s*/gi, "");
  t = t.replace(/\bDEMO\s*[—–-]\s*/gi, "");
  t = t.replace(/\bDEMO\s*note\s*[—–-]?\s*/gi, "");
  t = t.replace(/\bDEMO\s*[—–-]?\s*simulated\s+(sample|meter|device)\b/gi, "Simulated");
  t = t.replace(/[.,;]?\s*(not a personal health record|synthetic data|synthetic check-in for testing)[.,;]?/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  // Collapse an empty/puncutation-only remainder.
  return /[a-z0-9]/i.test(t) ? t : "";
}
