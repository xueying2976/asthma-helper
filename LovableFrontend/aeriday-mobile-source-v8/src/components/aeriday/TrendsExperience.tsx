import { RecentChangesLayout, MetricChartLayout, HistorySection } from "./previewLayouts";
import { InsightsTrends, StructuredHistory } from "./PersonalInsights";
import { NativeHistory } from "./NativeScreens";
import { useState } from "react";
import type { Lang } from "@/lib/aeriday/copy";
import {
  getMetrics,
  withEntries,
  headlines,
  metricValue,
  unitFor,
  type Metric,
  isNativeData,
  anchorDate,
  windowStart,
} from "@/lib/aeriday/scenarios";
import { useAeri } from "./state";
import { ActionRow, ChoiceGroup, Sheet, SheetButton, TextField } from "./kit";
import { Button } from "@/components/ui/button";
import { IconBreath, IconInfo, IconLog, IconMeds, IconTrends } from "./icons";
import { InfoSheet } from "./sheets";
import { nc, fmtLocal } from "@/lib/aeriday/nativeCopy";

const baseCopy = {
  en: {
    overnight: "Sleep and overnight",
    activity: "Activity",
    records: "Your entries",
    environment: "Environment",
    back: "Back",
    device: "Device data",
    manual: "Manual entries",
    manualOne: "Manual entry",
    envSource: "Environment",
    simulated: "simulated",
    info: "About these data",
    rangeInfo: "About usual range",
    range: "Usual range (example)",
    source: "Source",
    fresh: "Latest",
    coverage: "Coverage",
    gaps: "Gaps",
    above: "Above your usual range",
    below: "Below your usual range",
    within: "Within your usual range",
    missing: "No entry today",
    stale: "Last data Aug 2",
    changed: "Data source changed",
    withheld: "Not enough data to compare",
    night: "Night of Aug 3–4",
    daily: "Daily totals · to Aug 4",
    add: "Add entry",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved",
    type: "Type",
    value: "Value",
    date: "Date and time",
    note: "Note (optional)",
    days: "days",
    samples: "Daily values",
    demo: "Demo data",
    view: "View changes",
    usual: "usual",
    scope:
      "Demo data only. Not every device records every metric. Symptoms and medicines come only from what you enter.",
    baseline:
      "Your usual range is an example based on your own recent days. It isn’t a clinical threshold and doesn’t explain why a value changed.",
    missingInfo:
      "A gap means no data that day, not zero. If the source changed or there isn’t enough data, we don’t compare.",
  },
  zh: {
    overnight: "睡眠与夜间",
    activity: "活动",
    records: "个人记录",
    environment: "环境",
    back: "返回",
    device: "设备数据",
    manual: "手动记录",
    manualOne: "手动记录",
    envSource: "环境",
    simulated: "模拟",
    info: "关于数据",
    rangeInfo: "什么是平时范围",
    range: "平时范围（示例）",
    source: "来源",
    fresh: "最近更新",
    coverage: "有数据天数",
    gaps: "缺失",
    above: "高于平时范围",
    below: "低于平时范围",
    within: "在平时范围内",
    missing: "今天未记录",
    stale: "最近数据：8 月 2 日",
    changed: "数据来源已更换",
    withheld: "数据不足，暂无法比较",
    night: "8 月 3 日夜间至 4 日晨",
    daily: "每日数据 · 截至 8 月 4 日",
    add: "添加记录",
    save: "保存",
    cancel: "取消",
    saved: "已保存",
    type: "类型",
    value: "数值",
    date: "日期和时间",
    note: "备注（选填）",
    days: "天",
    samples: "每日数据",
    demo: "示例数据",
    view: "查看变化",
    usual: "平时",
    scope: "仅为示例数据。并非所有设备都能记录每项指标。症状和用药只来自你的手动记录。",
    baseline: "平时范围是根据你近期数据给出的示例，不是临床标准，也不说明数值变化的原因。",
    missingInfo: "空缺表示当天没有数据，不等于零。来源更换或数据不足时不做比较。",
  },
};
function fmtDay(iso: string, lang: Lang) {
  const [, mo, da] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return lang === "zh" ? `${mo} 月 ${da} 日` : `${months[(mo ?? 1) - 1]} ${da}`;
}
/** Copy with demo-only wording replaced when real on-device data is shown. */
function cp(lang: Lang) {
  const b = baseCopy[lang];
  if (!isNativeData()) return b;
  const day = fmtDay(anchorDate(), lang);
  const zh = lang === "zh";
  return {
    ...b,
    simulated: zh ? "Apple 健康" : "Apple Health",
    demo: zh ? "本机数据" : "On this iPhone",
    range: zh ? "平时范围" : "Usual range",
    baseline: zh ? "范围由本机提供，前端不计算基线。" : "Range supplied on this iPhone; this viewer does not calculate baselines.",
    samples: zh ? "按日期提供的数据" : "Values supplied by date",
    stale: zh ? "数据较旧" : "Data is old",
    night: zh ? `采样记录 · 截至 ${day}` : `Sample records · to ${day}`,
    daily: zh ? `采样记录 · 截至 ${day}` : `Sample records · to ${day}`,
    scope: zh
      ? "数据来自 Apple 健康和你的记录，仅保存在这台 iPhone。并非每台设备都记录所有指标。"
      : "From Apple Health and your entries, stored on this iPhone. Not every device records every metric.",
  };
}

function status(m: Metric, lang: Lang) {
  const c = cp(lang);
  if (m.status === "changed") return c.changed;
  if (m.status === "insufficient")
    return m.freshness === "stale" ? c.stale : m.source === "manual" ? c.missing : c.withheld;
  if (m.status === "different" && m.band)
    return m.band && m.current !== null && m.current < m.band[0] ? c.below : c.above;
  return m.band ? c.within : "";
}
function StatusLine({ m, lang }: { m: Metric; lang: Lang }) {
  const text = status(m, lang);
  if (!text) return null;
  if (m.status === "different")
    return (
      <p className="t-meta flex items-center gap-1 font-medium text-aeri-ink">
        <span aria-hidden className="text-aeri-slate">{m.band && m.current !== null && m.current < m.band[0] ? "↓" : "↑"}</span>
        {text}
      </p>
    );
  if (m.status === "within") return <p className="t-meta text-aeri-slate">{text}</p>;
  return <p className="t-meta italic text-aeri-slate underline decoration-dashed underline-offset-4">{text}</p>;
}
function groupSource(group: Metric["group"], lang: Lang) {
  const c = cp(lang);
  return group === "records" ? c.manual : group === "environment" ? c.envSource : c.device;
}
function source(m: Metric, lang: Lang) {
  const c = cp(lang);
  if (isNativeData()) return m.sourceLabel || (m.source === "environment" ? (lang === "zh" ? "环境 · 未连接" : "Environment · not connected") : nc[lang].sourceUnknown);
  if (m.source === "manual") return c.manual;
  if (m.source === "environment")
    return `${c.envSource} · ${lang === "zh" ? "本地预报" : "local forecast"} · ${c.simulated}`;
  return `${c.device} · ${m.source === "watch" ? (lang === "zh" ? "手表" : "watch") : "iPhone"} · ${c.simulated}`;
}
/** Shared "Recent changes" highlight for Today and Trends (changes scenario only). */
export function RecentChanges({ lang, onView }: { lang: Lang; onView: () => void }) {
  const { scenario } = useAeri();
  if (scenario !== "changes" && !isNativeData()) return null;
  const c = cp(lang);
  const ms = getMetrics(scenario).filter((m) => m.status === "different" && m.band);
  if (!ms.length) return null;
  return (
    <RecentChangesLayout title={headlines[lang].changes} badge={c.demo} date={c.night} onView={onView} viewLabel={c.view}>
      <ul className="t-meta mt-2 space-y-1">
        {ms.map((m) => (
          <li key={m.id} className="flex flex-wrap justify-between gap-x-3">
            <span>{lang === "zh" ? m.zh : m.en}</span>
            <span className="tabular-nums">
              <span className="font-semibold text-aeri-ink"><span className="text-aeri-slate">{m.band && m.current !== null && m.current < m.band[0] ? "↓" : "↑"}</span> {metricValue(m, lang)}</span>
              <span className="text-aeri-slate">
                {" · "}
                {c.usual} {m.band ? `${m.band[0]}–${m.band[1]} ${m.id === "sleep" ? (lang === "zh" ? "小时" : "h") : unitFor(m, 2, lang)}` : "—"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </RecentChangesLayout>
  );
}
function fmtWhen(date: string, lang: Lang) {
  const [d, time] = date.split("T");
  const [, mo, da] = (d ?? "").split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const day = lang === "zh" ? `${mo} 月 ${da} 日` : `${months[(mo ?? 1) - 1]} ${da}`;
  return `${day} · ${time ?? ""}`;
}
function dateAt(i: number, lang: Lang) {
  const d = new Date(windowStart() + i * 86400000);
  return lang === "zh"
    ? `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function Period({
  value,
  onChange,
  lang,
}: {
  value: 7 | 30;
  onChange: (v: 7 | 30) => void;
  lang: Lang;
}) {
  return (
    <div className="flex gap-1" aria-label={lang === "zh" ? "时间范围" : "Chart period"}>
      {([7, 30] as const).map((n) => (
        <Button
          key={n}
          variant="ghost"
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={`t-meta h-auto min-h-11 rounded-lg px-3 ${value === n ? "bg-aeri-blue/10 text-aeri-blue" : "text-aeri-slate"}`}
        >
          {n} {cp(lang).days}
        </Button>
      ))}
    </div>
  );
}
function MetricChart({ m, period, lang }: { m: Metric; period: 7 | 30; lang: Lang }) {
  const points = m.points.slice(-period),
    vals = points.filter((v): v is number => v !== null);
  const all = [...vals, ...(m.band ?? [])],
    min = all.length ? Math.min(...all) : 0,
    max = all.length ? Math.max(...all) : 1,
    pad = Math.max((max - min) * 0.2, 0.5);
  const low = min - pad,
    high = max + pad,
    x = (i: number) => 36 + (i / (period - 1)) * 252,
    y = (v: number) => 126 - ((v - low) / (high - low)) * 100;
  let drawing = "";
  let connected = false;
  points.forEach((v, i) => {
    if (v === null) {
      connected = false;
      return;
    }
    drawing += `${connected ? "L" : "M"}${x(i)} ${y(v)} `;
    connected = true;
  });
  const c = cp(lang);
  return (
    <figure aria-label={`${lang === "zh" ? m.zh : m.en} · ${period} ${c.days}`} className="min-w-0">
      <p className="t-meta mb-2 text-aeri-slate">
        {unitFor(m, 2, lang)} · {m.group === "overnight" ? c.night : c.daily}
      </p>
      <svg
        role="img"
        aria-label={`${period} ${c.days}; ${vals.length} ${c.coverage}; ${status(m, lang)}`}
        viewBox="0 0 310 154"
        className="block w-full text-aeri-blue"
      >
        <rect x="279" y="16" width="18" height="116" className="fill-aeri-slate/10" />
        {m.band ? (
          <rect
            x="36"
            y={y(m.band[1])}
            width="252"
            height={y(m.band[0]) - y(m.band[1])}
            className="fill-aeri-slate/15"
          />
        ) : null}
        {[low, (low + high) / 2, high].map((v) => (
          <g key={v}>
            <path d={`M36 ${y(v)}H288`} className="stroke-aeri-line" />
            <text x="30" y={y(v) + 3} textAnchor="end" className="fill-aeri-slate text-[9px]">
              {v.toFixed(m.id === "steps" ? 0 : 1)}
            </text>
          </g>
        ))}
        <path d={drawing} stroke="currentColor" strokeWidth="2" fill="none" />
        {points.map((v, i) =>
          v === null ? (
            <path key={i} d={`M${x(i) - 2} 139h4`} className="stroke-aeri-slate" strokeWidth="2">
              <title>
                {dateAt(30 - period + i, lang)} · {c.gaps}
              </title>
            </path>
          ) : (
            <circle key={i} cx={x(i)} cy={y(v)} r={i === period - 1 ? 4 : 2} fill="currentColor" className={i === period - 1 && m.status === "different" ? "text-aeri-blue/70" : undefined}>
              <title>
                {dateAt(30 - period + i, lang)} · {v} {unitFor(m, v, lang)}
              </title>
            </circle>
          ),
        )}
      </svg>
      <figcaption className="t-meta flex justify-between text-aeri-slate">
        <span>{dateAt(30 - period, lang)}</span>
        <span>{dateAt(29, lang)}</span>
      </figcaption>
      {m.band ? (
        <p className="t-meta mt-2 text-aeri-slate">
          {c.range}: {m.band[0]}–{m.band[1]} {unitFor(m, 2, lang)}
        </p>
      ) : m.status === "changed" || m.status === "insufficient" ? (
        <p className="t-meta mt-2 text-aeri-slate">
          {c.withheld} · {c.gaps}: {period - vals.length}
        </p>
      ) : null}
    </figure>
  );
}
export function MetricDetail({ id, lang }: { id: string; lang: Lang }) {
  const { scenario, entries, closeSheet, openSheet } = useAeri();
  const m = withEntries(getMetrics(scenario), entries).find((v) => v.id === id);
  const [period, setPeriod] = useState<7 | 30>(7);
  const c = cp(lang);
  if (!m) return null;
  const points = m.points.slice(-period),
    coverage = points.filter((v) => v !== null).length;
  return (
    <Sheet
      title={lang === "zh" ? m.zh : m.en}
      subtitle={source(m, lang)}
      closeLabel={c.back}
      onClose={closeSheet}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-title font-semibold tabular-nums">{metricValue(m, lang)}</p>
        <Period value={period} onChange={setPeriod} lang={lang} />
      </div>
      <StatusLine m={m} lang={lang} />
      {isNativeData() && m.semantics === "latestSample" ? <p className="t-meta text-aeri-slate">{m.id === "sleep" ? nc[lang].sleepSegmentInfo : nc[lang].notAggregate}</p> : null}
      {isNativeData() && !m.band ? <p className="t-meta text-aeri-slate">{nc[lang].noBaseline}</p> : null}
      <MetricChart m={m} period={period} lang={lang} />
      <dl className="t-meta space-y-2 text-aeri-slate">
        <div>
          <dt className="inline">{c.source}: </dt>
          <dd className="inline">
            {source(m, lang)}
            {m.status === "changed" && !isNativeData()
              ? lang === "zh"
                ? " · 手表 → 睡眠应用（模拟）"
                : " · watch → sleep app (simulated)"
              : ""}
          </dd>
        </div>
        <div>
          <dt className="inline">{c.fresh}: </dt>
          <dd className="inline">
            {isNativeData() ? (m.sampledAt ? fmtLocal(m.sampledAt, lang) : nc[lang].sampleTimeUnknown) : m.freshness === "stale"
              ? c.stale
              : m.freshness === "missing"
                ? c.missing
                : `${fmtDay(anchorDate(), lang)} · ${m.freshness === "changed" ? (isNativeData() ? c.changed : "06:14") : m.freshness}`}
          </dd>
        </div>
        <div>
          <dt className="inline">{c.coverage}: </dt>
          <dd className="inline">
            {coverage}/{period} {c.days} · {c.gaps}: {period - coverage}
          </dd>
        </div>
      </dl>
      <Button
        variant="ghost"
        className="t-meta h-auto min-h-11 text-aeri-blue"
        onClick={() =>
          openSheet(
            <InfoSheet
              lang={lang}
              title={m.band ? c.rangeInfo : c.info}
              body={m.band ? [c.baseline, c.scope] : [c.scope, c.missingInfo]}
              onBack={() => openSheet(<MetricDetail id={id} lang={lang} />)}
            />,
          )
        }
      >
        <IconInfo />
        {m.band ? c.rangeInfo : c.info}
      </Button>
      <details className="border-t border-aeri-line pt-3">
        <summary className="t-meta min-h-11 cursor-pointer">{c.samples}</summary>
        <ul className="t-meta divide-y divide-aeri-line">
          {points.map((v, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>{dateAt(30 - period + i, lang)}</span>
              <span>
                {v === null ? "—" : `${v} ${unitFor(m, v, lang)}`}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </Sheet>
  );
}
export function TrendsExperience({ lang }: { lang: Lang }) {
  const { scenario, entries, openSheet, selectedMetric, setSelectedMetric, native } = useAeri();
  const metrics = withEntries(getMetrics(scenario), entries),
    c = cp(lang);
  const [period, setPeriod] = useState<7 | 30>(7);
  const m = metrics.find((v) => v.id === selectedMetric) ?? metrics[0];
  if (native) return <InsightsTrends />;
  if (!m) return null;
  return (
    <>
      <section className="px-1 py-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="t-title font-semibold">{isNativeData() ? (lang === "zh" ? "最近数据" : "Latest data") : scenario === "changes" ? <span className="sr-only">{headlines[lang].changes}</span> : headlines[lang][scenario]}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0 text-aeri-slate"
            aria-label={c.info}
            onClick={() =>
              openSheet(
                <InfoSheet
                  lang={lang}
                  title={c.info}
                  body={isNativeData() ? [c.scope, c.missingInfo] : [c.scope, c.baseline, c.missingInfo]}
                />,
              )
            }
          >
            <IconInfo />
          </Button>
        </div>
      </section>
      <RecentChanges
        lang={lang}
        onView={() => {
          setSelectedMetric("rr");
          openSheet(<MetricDetail id="rr" lang={lang} />);
        }}
      />
      <MetricChartLayout header={<>
          <Button
            variant="ghost"
            className="t-body h-auto min-h-11 whitespace-normal px-0 text-aeri-ink"
            onClick={() => openSheet(<MetricDetail id={m.id} lang={lang} />)}
          >
            {lang === "zh" ? m.zh : m.en}
          </Button>
          <Period value={period} onChange={setPeriod} lang={lang} />
        </>} value={metricValue(m, lang)} status={<><StatusLine m={m} lang={lang} />
          {isNativeData() ? <p className="t-meta text-aeri-slate">{source(m, lang)} · {m.sampledAt ? fmtLocal(m.sampledAt, lang) : nc[lang].sampleTimeUnknown}</p> : null}
          {isNativeData() && m.semantics === "latestSample" ? <p className="t-meta text-aeri-slate">{m.id === "sleep" ? nc[lang].sleepSegmentInfo : nc[lang].notAggregate}</p> : null}
        </>}>
        <MetricChart m={m} period={period} lang={lang} />
      </MetricChartLayout>
      {(["overnight", "activity", "records", "environment"] as const).map((group) => (
        <section key={group} className="px-1">
          <h3 className="t-cap border-b border-aeri-line py-3 text-aeri-slate">
            {group === "overnight" || group === "activity" ? `${c[group]} · ${groupSource(group, lang)}` : c[group]}
          </h3>
          <ul className="divide-y divide-aeri-line">
            {metrics
              .filter((v) => v.group === group)
              .map((v) => (
                <li key={v.id}>
                  <ActionRow
                    Icon={
                      group === "overnight"
                        ? IconBreath
                        : group === "records"
                          ? IconLog
                          : IconTrends
                    }
                    title={lang === "zh" ? v.zh : v.en}
                    subtitle={isNativeData() ? `${source(v, lang)}${v.sampledAt ? ` · ${fmtLocal(v.sampledAt, lang)}` : ""}` : `${v.status === "different" ? (v.band && v.current !== null && v.current < v.band[0] ? "↓ " : "↑ ") : ""}${status(v, lang)}`}
                    trailing={
                      <span className="t-meta max-w-28 whitespace-normal text-right tabular-nums">
                        {metricValue(v, lang)}
                      </span>
                    }
                    onClick={() => {
                      setSelectedMetric(v.id);
                      openSheet(<MetricDetail id={v.id} lang={lang} />);
                    }}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
export function AddEntrySheet({ lang }: { lang: Lang }) {
  const { native, addLog, addEntry, checkin, saveCheckin, closeSheet } = useAeri();
  const c = cp(lang);
  const [type, setType] = useState("symptoms"),
    [value, setValue] = useState(""),
    [note, setNote] = useState(""),
    [date, setDate] = useState("2026-08-04T09:12"),
    [saved, setSaved] = useState(false);
  const labels: Record<string, string> =
    lang === "zh"
      ? {
          symptoms: "症状",
          waking: "夜间醒来",
          reliever: "缓解药",
          controller: "控制药",
          pef: "峰流速",
        }
      : {
          symptoms: "Symptoms",
          waking: "Nighttime waking",
          reliever: "Reliever",
          controller: "Controller",
          pef: "Peak flow",
        };
  if (native) return <Sheet title={c.add} closeLabel={c.back} onClose={closeSheet}><p className="t-body">{nc[lang].numericUnavailable}</p></Sheet>;
  const valid =
    type === "symptoms"
      ? ["none", "mild", "moderate", "marked"].includes(value)
      : value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
  return (
    <Sheet
      title={saved ? c.saved : c.add}
      closeLabel={saved ? c.back : c.cancel}
      onClose={closeSheet}
      footer={
        !saved ? (
          <SheetButton
            disabled={!valid || !date}
            onClick={() => {
              const val =
                type === "symptoms"
                  ? lang === "zh"
                    ? { none: "无", mild: "轻度", moderate: "中度", marked: "明显" }[value]
                    : value
                  : `${value} ${type === "pef" ? "L/min" : type === "reliever" ? (lang === "zh" ? "吸" : "puffs") : lang === "zh" ? "次" : "times"}`;
              addLog(
                `${labels[type]} · ${val}${note ? ` · ${note}` : ""}`,
                fmtWhen(date, lang),
              );
              addEntry({
                id: type,
                value:
                  type === "symptoms"
                    ? ["none", "mild", "moderate", "marked"].indexOf(value)
                    : Number(value),
                date,
              });
              if (type === "symptoms" || type === "pef")
                saveCheckin({
                  savedAt: date.slice(11),
                  symptoms:
                    type === "symptoms"
                      ? {
                          ...checkin?.symptoms,
                          cough: value as "none" | "mild" | "moderate" | "marked",
                        }
                      : (checkin?.symptoms ?? {}),
                  reliever: checkin?.reliever ?? 0,
                  preExercise: checkin?.preExercise ?? null,
                  pef: type === "pef" ? value : (checkin?.pef ?? ""),
                  pefUnit: "L/min",
                  pefTime: date,
                  exposures: [],
                  note,
                });
              setSaved(true);
            }}
          >
            {c.save}
          </SheetButton>
        ) : undefined
      }
    >
      {saved ? (
        <p className="t-body">
          {labels[type]} · {fmtWhen(date, lang)}
        </p>
      ) : (
        <>
          <ChoiceGroup
            label={c.type}
            value={type}
            options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
            onChange={(v) => {
              setType(v);
              setValue("");
            }}
          />
          {type === "symptoms" ? (
            <ChoiceGroup
              label={lang === "zh" ? "咳嗽" : "Cough"}
              value={value}
              options={["none", "mild", "moderate", "marked"].map((v, i) => ({
                value: v,
                label:
                  lang === "zh"
                    ? (["无", "轻度", "中度", "明显"][i] ?? v)
                    : (["None", "Mild", "Moderate", "Marked"][i] ?? v),
              }))}
              onChange={setValue}
            />
          ) : (
            <TextField
              label={`${c.value} · ${type === "pef" ? "L/min" : type === "reliever" ? (lang === "zh" ? "吸" : "puffs") : lang === "zh" ? "次" : "times"}`}
              value={value}
              onChange={setValue}
              inputMode="numeric"
            />
          )}
          <label className="t-body block">
            {c.date}
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="t-meta mt-2 min-h-11 w-full rounded-lg border border-aeri-line bg-aeri-mist px-3"
            />
          </label>
          <TextField label={c.note} value={note} onChange={setNote} />
        </>
      )}
    </Sheet>
  );
}
export function HistoryExperience({ lang }: { lang: Lang }) {
  const { scenario, logs, openSheet, native } = useAeri();
  const c = cp(lang);
  const metrics = getMetrics(scenario);
  const rr = metrics.find((m) => m.id === "rr");
  if (native) return <><StructuredHistory /><NativeHistory variant="B" lang={lang} /></>;
  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="t-meta h-auto min-h-11 text-aeri-blue"
          onClick={() => openSheet(<AddEntrySheet lang={lang} />)}
        >
          + {c.add}
        </Button>
      </div>
      <HistorySection title={lang === "zh" ? "8 月 4 日" : "Aug 4"}>
        {logs.map((l, i) => (
          <ActionRow
            key={i}
            Icon={IconLog}
            title={l.label}
            subtitle={`${c.manualOne} · ${l.time}`}
            onClick={() =>
              openSheet(<InfoSheet lang={lang} title={l.label} body={[`${c.manualOne} · ${l.time}`]} />)
            }
          />
        ))}
        <ActionRow
          Icon={IconBreath}
          title={rr ? `${lang === "zh" ? rr.zh : rr.en} · ${status(rr, lang) || headlines[lang][scenario]}` : headlines[lang][scenario]}
          subtitle={`${c.device} · ${c.simulated} · 06:14`}
          trailing={<span className="t-meta">{rr ? metricValue(rr, lang) : "—"}</span>}
          onClick={() => openSheet(<MetricDetail id="rr" lang={lang} />)}
        />
        <ActionRow
          Icon={IconMeds}
          title={lang === "zh" ? "控制药 · 1 吸" : "Controller · 1 inhalation"}
          subtitle={`${c.manualOne} · 08:00`}
          onClick={() => openSheet(<MetricDetail id="controller" lang={lang} />)}
        />
      </HistorySection>
      <HistorySection title={lang === "zh" ? "8 月 3 日" : "Aug 3"}>
        <ActionRow
          Icon={IconLog}
          title={lang === "zh" ? "咳嗽 · 轻度" : "Cough · mild"}
          subtitle={`${c.manualOne} · 08:05`}
          onClick={() => openSheet(<MetricDetail id="symptoms" lang={lang} />)}
        />
      </HistorySection>
    </>
  );
}
