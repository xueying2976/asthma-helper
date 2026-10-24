import type { TodayCopy } from "./todayCopy";

export type AhStatus = "within" | "different" | "insufficient" | "changed";

export type AhMetric = {
  id: string;
  labelEn: string;
  labelZh: string;
  value: string | null;
  unitEn: string;
  unitZh: string;
  sourceEn: string;
  sourceZh: string;
  status: AhStatus;
  /** Direction vs the user's own recent range (only when status = "different"). */
  direction?: "above" | "below";
  /** Numeric current value + personal range band; only when a stable baseline exists. */
  baseline?: { value: number; band: [number, number] };
  /** Last 7 days, null = no data that day. Detail sheet only. */
  series7?: (number | null)[];
  /** Days with data out of 7. */
  coverage7?: number;
};

export const ahStatusKey: Record<AhStatus, keyof TodayCopy> = {
  within: "ahWithin",
  different: "ahDifferent",
  insufficient: "ahInsufficient",
  changed: "ahChanged",
};

export const ahMetrics: AhMetric[] = [
  {
    id: "rr",
    labelEn: "Respiratory rate",
    labelZh: "呼吸频率",
    value: "15.2",
    unitEn: "breaths/min",
    unitZh: "次/分",
    sourceEn: "Apple Watch · today 06:14",
    sourceZh: "Apple Watch · 今天 06:14",
    status: "within",
    baseline: { value: 15.2, band: [14.4, 15.8] },
    series7: [14.6, 15, 14.8, 15.4, 15.1, 15.2, 15.2],
    coverage7: 7,
  },
  {
    id: "rhr",
    labelEn: "Resting heart rate",
    labelZh: "静息心率",
    value: "72",
    unitEn: "bpm",
    unitZh: "次/分",
    sourceEn: "Apple Watch · today 06:14",
    sourceZh: "Apple Watch · 今天 06:14",
    status: "different",
    direction: "above",
    baseline: { value: 72, band: [61, 68] },
    series7: [62, 63, null, 64, 67, 70, 72],
    coverage7: 6,
  },
  {
    id: "sleep",
    labelEn: "Sleep",
    labelZh: "睡眠",
    value: "7 h 18 m",
    unitEn: "",
    unitZh: "",
    sourceEn: "Apple Watch → third-party app · last night",
    sourceZh: "Apple Watch → 第三方应用 · 昨夜",
    status: "changed",
    series7: [7.6, 7.2, 7.9, null, 7.1, 7.4, 7.3],
    coverage7: 6,
  },
  {
    id: "spo2",
    labelEn: "Oxygen saturation",
    labelZh: "血氧饱和度",
    value: "97",
    unitEn: "%",
    unitZh: "%",
    sourceEn: "Apple Watch · Aug 1 22:05",
    sourceZh: "Apple Watch · 8 月 1 日 22:05",
    status: "insufficient",
    series7: [null, null, 97, null, null, null, null],
    coverage7: 1,
  },
  {
    id: "steps",
    labelEn: "Steps",
    labelZh: "步数",
    value: "6,240",
    unitEn: "steps",
    unitZh: "步",
    sourceEn: "iPhone · today 09:05",
    sourceZh: "iPhone · 今天 09:05",
    status: "within",
    baseline: { value: 6240, band: [5200, 8400] },
    series7: [7100, 6800, 5400, 8100, 6000, 7300, 6240],
    coverage7: 7,
  },
  {
    id: "workout",
    labelEn: "Workouts",
    labelZh: "训练",
    value: null,
    unitEn: "",
    unitZh: "",
    sourceEn: "Apple Health · no entry in 7 days",
    sourceZh: "Apple Health · 近 7 天无记录",
    status: "insufficient",
    series7: [null, null, null, null, null, null, null],
    coverage7: 0,
  },
];

/** 4-week record coverage (28 days). */
export const coverage: { key: keyof TodayCopy; days: number }[] = [
  { key: "recDaytime", days: 21 },
  { key: "recNight", days: 19 },
  { key: "recActivity", days: 16 },
  { key: "recReliever", days: 24 },
];

/** Per-day entry map for the last 28 days: true = has an entry. */
export const coverageDays: boolean[] = Array.from({ length: 28 }, (_, i) =>
  ![2, 3, 9, 14, 15, 22, 26].includes(i),
);

export const pollutants: { key: keyof TodayCopy; value: string; sub: string }[] = [
  { key: "envPm25", value: "16.4", sub: "µg/m³" },
  { key: "envO3", value: "48", sub: "ppb" },
  { key: "envNo2", value: "11", sub: "ppb" },
];
