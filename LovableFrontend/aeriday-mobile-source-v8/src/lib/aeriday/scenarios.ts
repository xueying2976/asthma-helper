import type { Lang } from "./copy";
import type { AhMetric, AhStatus } from "./today";
import type { NativeMetric } from "./nativeBridge";

export type Scenario = "changes" | "within" | "gaps";
export type Metric = {
  id: string;
  en: string;
  zh: string;
  unit: string;
  unitZh?: string | undefined;
  group: "overnight" | "activity" | "records" | "environment";
  source: "watch" | "phone" | "manual" | "environment";
  current: number | null;
  band?: [number, number] | undefined;
  status: AhStatus;
  points: (number | null)[];
  freshness: string;
  sourceLabel?: string | undefined;
  sampledAt?: string | undefined;
  semantics?: "latestSample" | undefined;
  nativeSample?: boolean;
};
export const demoDate = "2026-08-04";
export const scenarioLabels = {
  en: {
    changes: "Changes",
    within: "Usual range",
    gaps: "Missing data",
  },
  zh: { changes: "有变化", within: "平时范围", gaps: "数据不足" },
};
export const headlines = {
  en: {
    changes: "Recent changes",
    within: "Within your usual range",
    gaps: "Not enough data to compare",
  },
  zh: { changes: "近期变化", within: "在平时范围内", gaps: "数据不足，暂无法比较" },
};
type Seed = Omit<Metric, "status" | "points" | "freshness">;
const seeds: Seed[] = [
  {
    id: "rr",
    en: "Respiratory rate",
    zh: "呼吸频率",
    unit: "breaths/min",
    unitZh: "次/分",
    group: "overnight",
    source: "watch",
    current: 15.2,
    band: [14, 16],
  },
  {
    id: "rhr",
    en: "Resting heart rate",
    zh: "静息心率",
    unit: "bpm",
    unitZh: "次/分",
    group: "overnight",
    source: "watch",
    current: 64,
    band: [60, 68],
  },
  {
    id: "hrv",
    en: "HRV (SDNN)",
    zh: "心率变异性（SDNN）",
    unit: "ms",
    unitZh: "毫秒",
    group: "overnight",
    source: "watch",
    current: 42,
    band: [35, 50],
  },
  {
    id: "sleep",
    en: "Sleep duration",
    zh: "睡眠时长",
    unit: "h",
    unitZh: "小时",
    group: "overnight",
    source: "watch",
    current: 7.5,
    band: [7, 8],
  },
  {
    id: "interruptions",
    en: "Sleep interruptions",
    zh: "睡眠中断",
    unit: "times",
    unitZh: "次",
    group: "overnight",
    source: "watch",
    current: 2,
  },
  {
    id: "spo2",
    en: "Oxygen saturation",
    zh: "血氧饱和度",
    unit: "%",
    group: "overnight",
    source: "watch",
    current: 97,
  },
  {
    id: "temperature",
    en: "Wrist temperature deviation",
    zh: "腕温偏差",
    unit: "°C",
    group: "overnight",
    source: "watch",
    current: 0.1,
    band: [-0.2, 0.3],
  },
  {
    id: "steps",
    en: "Steps",
    zh: "步数",
    unit: "steps",
    unitZh: "步",
    group: "activity",
    source: "phone",
    current: 6240,
    band: [5200, 8400],
  },
  {
    id: "activity",
    en: "Active minutes",
    zh: "活动时长",
    unit: "min",
    unitZh: "分钟",
    group: "activity",
    source: "watch",
    current: 32,
  },
  {
    id: "workout",
    en: "Workouts",
    zh: "运动训练",
    unit: "min",
    unitZh: "分钟",
    group: "activity",
    source: "watch",
    current: 20,
  },
  {
    id: "symptoms",
    en: "Recorded symptoms",
    zh: "已记录症状",
    unit: "level",
    unitZh: "程度",
    group: "records",
    source: "manual",
    current: null,
  },
  {
    id: "waking",
    en: "Nighttime waking",
    zh: "夜间醒来",
    unit: "times",
    unitZh: "次",
    group: "records",
    source: "manual",
    current: null,
  },
  {
    id: "reliever",
    en: "Reliever use",
    zh: "缓解药使用",
    unit: "puffs",
    unitZh: "吸",
    group: "records",
    source: "manual",
    current: null,
  },
  {
    id: "controller",
    en: "Controller use",
    zh: "控制药使用",
    unit: "doses",
    unitZh: "次",
    group: "records",
    source: "manual",
    current: 1,
  },
  {
    id: "pef",
    en: "Peak flow",
    zh: "峰流速",
    unit: "L/min",
    unitZh: "升/分",
    group: "records",
    source: "manual",
    current: null,
  },
  {
    id: "aqi",
    en: "Air quality",
    zh: "空气质量",
    unit: "AQI",
    group: "environment",
    source: "environment",
    current: 58,
  },
  {
    id: "pm25",
    en: "PM2.5",
    zh: "PM2.5",
    unit: "µg/m³",
    group: "environment",
    source: "environment",
    current: 16.4,
  },
  {
    id: "pollen",
    en: "Pollen",
    zh: "花粉",
    unit: "/ 10",
    group: "environment",
    source: "environment",
    current: 8.2,
  },
  {
    id: "outdoorTemp",
    en: "Outdoor temperature",
    zh: "室外温度",
    unit: "°C",
    group: "environment",
    source: "environment",
    current: 26,
  },
  {
    id: "humidity",
    en: "Outdoor humidity",
    zh: "室外湿度",
    unit: "%",
    group: "environment",
    source: "environment",
    current: 71,
  },
];
/** Native (on-device) metrics. When set, they fully replace synthetic values; never mixed. */
let nativeMetrics: Metric[] | null = null;
let nativeAnchor: string | null = null;
/** Last day (YYYY-MM-DD) of the 30-day window: snapshot date in native mode, demo date otherwise. */
export function anchorDate() {
  return nativeAnchor ?? demoDate;
}
/** UTC ms of window day 0. */
export function windowStart() {
  const [y, m, d] = anchorDate().split("-").map(Number);
  return Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) - 29);
}
export function isNativeData() {
  return nativeMetrics !== null;
}
/** Map native snapshot metrics onto known metric metadata. Missing ids become "no data", never demo. */
export function setNativeMetrics(
  list: NativeMetric[] | null,
  anchor?: string,
) {
  if (!list) {
    nativeMetrics = null;
    nativeAnchor = null;
    return;
  }
  nativeAnchor = anchor ?? new Date().toISOString().slice(0, 10);
  nativeMetrics = seeds.map((seed) => {
    const n = list.find((m) => m.id === seed.id);
    const points = Array.from({ length: 30 }, (_, i) => n?.points?.[i] ?? null);
    return {
      ...seed,
      en: n?.semantics === "latestSample" && seed.id === "sleep" ? "Latest asleep segment" : n?.semantics === "latestSample" && seed.id === "steps" ? "Steps · latest sample" : seed.en,
      zh: n?.semantics === "latestSample" && seed.id === "sleep" ? "最近一段睡眠" : n?.semantics === "latestSample" && seed.id === "steps" ? "步数 · 最近一条" : seed.zh,
      unit: n?.unit ?? "",
      unitZh: n?.unit,
      sourceLabel: n?.source,
      sampledAt: n?.sampledAt,
      semantics: n?.semantics,
      nativeSample: true,
      current: n?.current ?? null,
      band: n?.band,
      status: !n || n.current === null ? "insufficient" : n.status === "changed" ? "changed" : n.band ? n.status : "within",
      points,
      freshness: n?.freshness ?? "missing",
    };
  });
}
export function getMetrics(scenario: Scenario): Metric[] {
  if (nativeMetrics) return nativeMetrics;
  return seeds.map((seed, index) => {
    const current =
      scenario === "changes"
        ? ({ rr: 18.2, rhr: 74, sleep: 17 / 3 }[seed.id] ?? seed.current)
        : seed.current;
    const midpoint = seed.band
      ? (seed.band[0] + seed.band[1]) / 2
      : (seed.current ?? (seed.id === "pef" ? 420 : 1));
    const points: (number | null)[] = Array.from({ length: 30 }, (_, i) => {
      if (seed.source === "manual") {
        if (i === 29) return current;
        if (i % 3 === 0) return null;
        if (seed.id === "symptoms") return i % 4 === 0 ? 1 : 0;
        if (seed.id === "pef") return 410 + (i % 4) * 10;
        return seed.id === "controller" ? 2 : i % 3;
      }
      if (scenario === "gaps" && seed.group !== "environment" && i % 3 !== 0 && i !== 29)
        return null;
      if (i === 29)
        return scenario === "gaps" && seed.id !== "sleep" && seed.group !== "environment"
          ? null
          : current;
      const amplitude = seed.band
        ? (seed.band[1] - seed.band[0]) * 0.12
        : Math.max(Math.abs(midpoint) * 0.06, 0.1);
      const sample = midpoint + Math.sin(i * 1.7 + index) * amplitude;
      return ["interruptions", "steps", "activity", "workout", "aqi"].includes(seed.id)
        ? Math.round(sample)
        : Number(sample.toFixed(1));
    });
    const unavailable = scenario === "gaps" && (seed.source === "watch" || seed.source === "phone");
    const actual = points[29] ?? null;
    const different =
      seed.band && actual !== null && (actual < seed.band[0] || actual > seed.band[1]);
    return {
      ...seed,
      current: actual,
      band: unavailable ? undefined : seed.band,
      status: unavailable
        ? seed.id === "sleep"
          ? "changed"
          : "insufficient"
        : actual === null
          ? "insufficient"
          : different
            ? "different"
            : "within",
      points,
      freshness: unavailable
        ? seed.id === "sleep"
          ? "changed"
          : "stale"
        : actual === null
          ? "missing"
          : seed.source === "manual"
            ? "09:00"
            : seed.source === "environment"
              ? "08:40"
              : seed.source === "phone"
                ? "09:05"
                : "06:14",
    };
  });
}
export function withEntries(
  metrics: Metric[],
  entries: { id: string; value: number; date: string }[],
): Metric[] {
  return metrics.map((m) => {
    const matching = entries.filter((e) => e.id === m.id);
    if (!matching.length) return m;
    const points = [...m.points];
    for (const e of matching) {
      const day = Math.round(
        (Date.parse(`${e.date.slice(0, 10)}T00:00:00Z`) - windowStart()) / 86400000,
      );
      if (day >= 0 && day < 30) points[day] = e.value;
    }
    const latest = matching[matching.length - 1];
    const current = points[29] ?? null;
    return {
      ...m,
      points,
      current,
      status: current === null ? "insufficient" : "within",
      freshness: latest?.date.startsWith(anchorDate()) ? latest.date.slice(11) : m.freshness,
    };
  });
}
export function metricValue(m: Metric, lang: Lang): string {
  if (m.current === null) return "—";
  if (m.id === "sleep" && (!m.nativeSample || m.unit === "h" || m.unit === "hours")) {
    const mins = Math.round(m.current * 60);
    return lang === "zh"
      ? `${Math.floor(mins / 60)} 小时 ${mins % 60} 分`
      : `${Math.floor(mins / 60)} h ${mins % 60} m`;
  }
  if (m.id === "symptoms")
    return lang === "zh"
      ? (["无", "轻度", "中度", "明显"][m.current] ?? "—")
      : (["None", "Mild", "Moderate", "Marked"][m.current] ?? "—");
  return `${m.id === "temperature" && m.current > 0 ? "+" : ""}${m.current.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unitFor(m, m.current, lang)}`;
}
const singular: Record<string, string> = { times: "time", doses: "dose", puffs: "puff", steps: "step" };
/** Unit label with English singular/plural handled (1 dose, 2 doses). */
export function unitFor(m: Pick<Metric, "unit" | "unitZh">, value: number | null, lang: Lang): string {
  if (lang === "zh") return m.unitZh ?? m.unit;
  return value === 1 ? (singular[m.unit] ?? m.unit) : m.unit;
}
export function todayMetrics(scenario: Scenario): AhMetric[] {
  return getMetrics(scenario)
    .filter((m) => ["rr", "rhr", "sleep", "spo2", "steps", "workout"].includes(m.id))
    .map((m) => ({
      id: m.id,
      labelEn: m.en,
      labelZh: m.zh,
      value:
        m.current === null ? null : m.id === "sleep" ? metricValue(m, "en") : String(m.current),
      unitEn: m.id === "sleep" ? "" : m.unit,
      unitZh: m.id === "sleep" ? "" : (m.unitZh ?? m.unit),
      sourceEn: nativeMetrics ? "Apple Health" : "Device data · simulated",
      sourceZh: nativeMetrics ? "Apple 健康" : "设备数据 · 模拟",
      status: m.status,
      direction: m.band && m.current !== null && m.current < m.band[0] ? "below" : "above",
      ...(m.band && m.current !== null ? { baseline: { band: m.band, value: m.current } } : {}),
      series7: m.points.slice(-7),
      coverage7: m.points.slice(-7).filter((v) => v !== null).length,
    }));
}
