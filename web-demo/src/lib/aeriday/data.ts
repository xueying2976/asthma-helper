import type { CopyKey } from "./copy";

export type Freshness = "fresh" | "stale" | "missing" | "multi";
export type Level = "good" | "watch" | "high" | "unknown";

/* ---------- Overview tiles ---------- */

export type Tile = {
  id: "weather" | "air" | "pollen" | "breathing";
  labelKey: CopyKey;
  value: string | null;
  detailEn: string;
  detailZh: string;
  level: Level;
};

export const tiles: Tile[] = [
  {
    id: "weather",
    labelKey: "tileWeather",
    value: "26°",
    detailEn: "Sunny · 71% RH",
    detailZh: "晴 · 湿度 71%",
    level: "good",
  },
  {
    id: "air",
    labelKey: "tileAir",
    value: "58",
    detailEn: "Moderate · PM2.5",
    detailZh: "中等 · PM2.5",
    level: "watch",
  },
  {
    id: "pollen",
    labelKey: "tilePollen",
    value: "8.2",
    detailEn: "High · mostly tree",
    detailZh: "高 · 树木花粉为主",
    level: "high",
  },
  {
    id: "breathing",
    labelKey: "tileBreathing",
    value: "15.2",
    detailEn: "RR · steady",
    detailZh: "呼吸频率 · 平稳",
    level: "good",
  },
];

/* ---------- Environment detail ---------- */

export type EnvItem = {
  id: string;
  labelKey: CopyKey;
  value: string | null;
  detailEn: string;
  detailZh: string;
  level: Level;
};

export const envItems: EnvItem[] = [
  {
    id: "aqi",
    labelKey: "envAqi",
    value: "58",
    detailEn: "Moderate · PM2.5 led",
    detailZh: "中等 · 以 PM2.5 为主",
    level: "watch",
  },
  {
    id: "pollen",
    labelKey: "envPollen",
    value: "8.2",
    detailEn: "High",
    detailZh: "偏高",
    level: "high",
  },
  {
    id: "temp",
    labelKey: "envTempHum",
    value: "26 °C / 71%",
    detailEn: "Outdoor",
    detailZh: "室外",
    level: "good",
  },
  {
    id: "wind",
    labelKey: "envWind",
    value: null,
    detailEn: "",
    detailZh: "",
    level: "unknown",
  },
];

export const pollenBreakdown: { labelKey: CopyKey; pct: number; level: Level }[] = [
  { labelKey: "envTreePollen", pct: 82, level: "high" },
  { labelKey: "envGrassPollen", pct: 41, level: "watch" },
  { labelKey: "envWeedPollen", pct: 12, level: "good" },
];

/* ---------- Body metrics ---------- */

export type HealthMetric = {
  id: string;
  labelKey: CopyKey;
  value: string | null;
  unitEn: string;
  unitZh: string;
  sourceEn: string;
  sourceZh: string;
  freshness: Freshness;
  flagged?: boolean;
};

export const healthMetrics: HealthMetric[] = [
  {
    id: "rr",
    labelKey: "mRR",
    value: "15.2",
    unitEn: "breaths/min",
    unitZh: "次/分",
    sourceEn: "Apple Watch · today 06:14",
    sourceZh: "Apple Watch · 今天 06:14",
    freshness: "fresh",
  },
  {
    id: "rhr",
    labelKey: "mRHR",
    value: "64",
    unitEn: "bpm",
    unitZh: "次/分",
    sourceEn: "Apple Watch · today 06:14",
    sourceZh: "Apple Watch · 今天 06:14",
    freshness: "fresh",
    flagged: true,
  },
  {
    id: "spo2",
    labelKey: "mSpO2",
    value: "97",
    unitEn: "%",
    unitZh: "%",
    sourceEn: "Apple Watch · Aug 1 22:05",
    sourceZh: "Apple Watch · 8 月 1 日 22:05",
    freshness: "stale",
  },
  {
    id: "sleep",
    labelKey: "mSleep",
    value: "7 h 18 m",
    unitEn: "",
    unitZh: "",
    sourceEn: "Apple Watch, third-party app · last night",
    sourceZh: "Apple Watch、第三方应用 · 昨夜",
    freshness: "multi",
  },
  {
    id: "steps",
    labelKey: "mSteps",
    value: "6,240",
    unitEn: "steps",
    unitZh: "步",
    sourceEn: "iPhone · today 09:05",
    sourceZh: "iPhone · 今天 09:05",
    freshness: "fresh",
  },
  {
    id: "workout",
    labelKey: "mWorkout",
    value: null,
    unitEn: "",
    unitZh: "",
    sourceEn: "Apple Health",
    sourceZh: "Apple Health",
    freshness: "missing",
  },
];

/* ---------- Medications ---------- */

export type Med = {
  id: string;
  nameKey: CopyKey;
  doseKey: CopyKey;
  stockKey: CopyKey;
  sourceKey: CopyKey;
  pct: number;
  low: boolean;
};

export const meds: Med[] = [
  {
    id: "controller",
    nameKey: "medControllerName",
    doseKey: "medControllerDose",
    stockKey: "medControllerStock",
    sourceKey: "medControllerSource",
    pct: 70,
    low: false,
  },
  {
    id: "reliever",
    nameKey: "medRelieverName",
    doseKey: "medRelieverDose",
    stockKey: "medRelieverStock",
    sourceKey: "medRelieverSource",
    pct: 15,
    low: true,
  },
];
