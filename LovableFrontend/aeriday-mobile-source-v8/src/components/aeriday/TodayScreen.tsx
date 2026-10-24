import { dict, type Lang } from "@/lib/aeriday/copy";
import { t as td } from "@/lib/aeriday/todayCopy";
import { u } from "@/lib/aeriday/copy2";
import { d as dd } from "@/lib/aeriday/copy3";
import { ahStatusKey } from "@/lib/aeriday/today";
import { todayMetrics } from "@/lib/aeriday/scenarios";
import { AirflowMotif, DashboardBlock as Block } from "./previewLayouts";
import { NativeTodayContent } from "./NativeScreens";
import { RecentChanges } from "./TrendsExperience";
import { Button } from "@/components/ui/button";
import type { Level } from "@/lib/aeriday/data";
import {
  IconAir,
  IconAlertLine,
  IconArrow,
  IconBreath,
  IconCheckCircle,
  IconChevron,
  IconClipboard,
  IconDashedCircle,
  IconDrop,
  IconHeartLine,
  IconInfo,
  IconMeds,
  IconMoon,
  IconSourceSwap,
  IconTrends,
} from "./icons";
import {
  Card,
  DayArc,
  IconChip,
  Pips,
  RangeMarker,
  ScaleBar,
  levelText,
  type IconCmp,
  type Variant,
} from "./ui";
import { useAeri } from "./state";
import {
  AskSheet,
  CheckInSheet,
  EmergencySheet,
  EnvSheet,
  HealthSheet,
  InfoSheet,
  MedCorrectSheet,
  PlanSheet,
  ZoneSheet,
} from "./sheets";

type Props = { variant: Variant; lang: Lang };

/** Small accessible info affordance — opens a concise explanation sheet. */
function InfoDot({
  lang,
  title,
  body,
  label,
}: {
  lang: Lang;
  title: string;
  body: string[];
  label: string;
}) {
  const { openSheet } = useAeri();
  return (
    <button
      type="button"
      aria-label={`${label} — ${title}`}
      onClick={() => openSheet(<InfoSheet lang={lang} title={title} body={body} />)}
      className="grid size-11 shrink-0 place-items-center text-aeri-slate"
    >
      <IconInfo className="size-4" />
    </button>
  );
}

const ahIcon: Record<string, IconCmp> = {
  rr: IconBreath,
  rhr: IconHeartLine,
  sleep: IconMoon,
  spo2: IconInfo,
  steps: IconTrends,
  workout: IconTrends,
};

const hlStatusTone: Record<string, Level> = {
  within: "good",
  different: "high",
  changed: "watch",
  insufficient: "unknown",
};

export function TodayBody({ variant, lang }: Props) {
  const c = dict[lang];
  const x = td[lang];
  const k = u[lang];
  const g = dd[lang];
  const zh = lang === "zh";
  const { checkin, nothingToNote, markNothingToNote, zone, openSheet, scenario, showTrends, native } = useAeri();
  const ahMetrics = todayMetrics(scenario);

  const reported = checkin
    ? Object.entries(checkin.symptoms).filter(([, v]) => v && v !== "none")
    : [];
  const hasSymptoms = reported.length > 0;
  const hlHighlights = ahMetrics.filter((m) => m.status !== "within").slice(0, 2);
  const danger = reported.some(([, v]) => v === "marked") || (checkin?.reliever ?? 0) >= 4;

  const zoneLabel =
    zone === "green"
      ? k.planZoneGreen
      : zone === "yellow"
        ? k.planZoneYellow
        : zone === "red"
          ? k.planZoneRed
          : g.planUnset;

  if (native) return <NativeTodayContent variant={variant} lang={lang} />;

  return (
    <>
      {/* 0 — Reported symptoms always outrank passive data */}
      {hasSymptoms ? (
        <Card
          variant={variant}
          className={`py-3.5 ${danger ? "border border-aeri-amber/70" : ""}`}
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
            <IconChip Icon={IconAlertLine} level={danger ? "high" : "watch"} className="size-9" />
            <div className="min-w-0">
              <p className="t-body font-semibold break-words text-aeri-amber">{g.reportedTitle}</p>
              <p className="t-meta break-words text-aeri-slate">
                {g.reportedSub.replace("{t}", checkin?.savedAt ?? "")}
              </p>
              <p className="t-meta mt-1 break-words">
                {reported
                  .map(([key, v]) => {
                    const name = k[`ci${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof typeof k];
                    const lvl =
                      v === "mild" ? k.ciMild : v === "moderate" ? k.ciModerate : k.ciMarked;
                    return `${String(name ?? key)} · ${lvl}`;
                  })
                  .join(" / ")}
              </p>
            </div>
          </div>
          <div className="aeri-adapt-grid mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openSheet(<EmergencySheet lang={lang} />)}
              className="t-meta min-h-11 rounded-xl bg-aeri-amber px-3 py-2 font-medium text-aeri-surface"
            >
              {g.reportedEmergency}
            </button>
            <button
              type="button"
              onClick={() => openSheet(<PlanSheet lang={lang} />)}
              className="t-meta min-h-11 rounded-xl border border-aeri-line px-3 py-2 font-medium"
            >
              {g.reportedOpenPlan}
            </button>
          </div>
        </Card>
      ) : null}

      <RecentChanges lang={lang} onView={() => showTrends("rr")} />

      {/* 1 — Automated dashboard, one viewport */}
      <Card variant={variant} className="relative overflow-hidden py-4">
        <AirflowMotif />

        <div className="relative flex items-center gap-1">
          <h2 className="t-title font-semibold tracking-tight">{g.dashTitle}</h2>
          <button
            type="button"
            aria-label={`${g.info} — ${g.envSheetT}`}
            onClick={() => openSheet(<EnvSheet lang={lang} />)}
            className="grid size-11 shrink-0 place-items-center text-aeri-slate"
          >
            <IconInfo className="size-4" />
          </button>
          <button
            type="button"
            aria-label={g.emergency}
            onClick={() => openSheet(<EmergencySheet lang={lang} />)}
            className="ml-auto grid size-11 shrink-0 place-items-center rounded-full border border-aeri-amber/60 text-aeri-amber"
          >
            <IconAlertLine className="size-5" />
          </button>
        </div>
        <p className="relative t-meta text-aeri-slate">{g.dashMeta}</p>

        {/* Air — primary metric of the composition */}
        <div className="relative mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <p className="t-cap text-aeri-slate">{g.airTitle}</p>
            <p className="t-hero font-semibold tracking-tight tabular-nums text-aeri-amber">
              {g.airValue}
              <span className="t-body ml-1.5 font-medium text-aeri-slate">{g.airUnit}</span>
            </p>
            <p className="t-meta break-words">
              {g.airCat} · {g.airDom}
            </p>
          </div>
          <InfoDot lang={lang} title={g.iAqiT} body={g.iAqiB} label={g.info} />
        </div>
        <ScaleBar pct={58} bands={5} tone="watch" className="relative mt-2" />

        {/* Pollen + weather highlights */}
        <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-aeri-line pt-3.5 aeri-adapt-grid">
          <div className="min-w-0">
            <p className="t-cap text-aeri-slate">{g.pollenTitle}</p>
            <p className="t-body font-semibold tabular-nums text-aeri-amber">
              {g.pollenValue}
              <span className="t-meta ml-1 font-normal text-aeri-slate">{g.pollenUnit}</span>
            </p>
            <p className="t-meta break-words">{g.pollenCat}</p>
            <Pips value={8.2} total={10} tone="high" className="mt-1.5 h-3 w-20" />
          </div>
          <div className="min-w-0">
            <p className="t-cap text-aeri-slate">{g.wxTitle}</p>
            <p className="t-body font-semibold tabular-nums">
              {g.wxTemp}
              <span className="t-meta ml-1 font-normal text-aeri-slate">{g.wxUnit}</span>
            </p>
            <p className="t-meta break-words">{g.wxDelta}</p>
            <p className="t-meta flex items-center gap-1 break-words text-aeri-slate">
              <IconDrop className="size-3.5 shrink-0 text-aeri-blue" />
              {g.wxHumVal}
            </p>
          </div>
        </div>

        {/* Actionable weather alert */}
        <div className="mt-2.5 flex items-start gap-1.5">
          <IconAlertLine className="mt-0.5 size-4 shrink-0 text-aeri-amber" />
          <span className="t-meta break-words text-aeri-amber">{g.wxAlert}</span>
        </div>

        {/* Medication: next dose + actionable low inventory */}
        <Block title={g.medTitle}>
          <div className="flex items-center gap-2.5">
            <IconMeds className="size-5 shrink-0 text-aeri-blue" />
            <span className="min-w-0">
              <span className="t-body block break-words">{g.medNext}</span>
              <span className="t-meta block break-words text-aeri-slate">{g.medTaken}</span>
            </span>
            <IconCheckCircle className="ml-auto size-5 shrink-0 text-aeri-good" />
          </div>
          <button
            type="button"
            onClick={() => openSheet(<MedCorrectSheet lang={lang} />)}
            className="mt-2.5 grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-aeri-amber/60 px-3 py-2.5 text-left"
          >
            <IconAlertLine className="size-5 shrink-0 text-aeri-amber" />
            <span className="min-w-0">
              <span className="t-body block break-words font-medium text-aeri-amber">
                {g.medLow}
              </span>
              <span className="t-meta block break-words text-aeri-slate">
                {c.medRelieverName} · {g.medLowSub}
              </span>
            </span>
            <IconChevron className="size-5 shrink-0 text-aeri-amber" />
          </button>
        </Block>

        {/* Health trends — compact disclosure, at most two highlights */}
        <section className="mt-3.5 border-t border-aeri-line pt-3.5">
          <div className="flex items-center gap-2">
            <h3 className="t-cap text-aeri-slate">{g.hlTitle}</h3>
            <button
              type="button"
              onClick={() => showTrends(hlHighlights[0]?.id ?? "rr")}
              className="t-meta ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 font-medium text-aeri-blue"
            >
              {g.hlSeeAll}
              <IconChevron className="size-4" />
            </button>
          </div>
          {hlHighlights.length ? (
            <ul className="mt-1.5 space-y-3">
              {hlHighlights.map((m) => {
                const tone = hlStatusTone[m.status] ?? "unknown";
                const Icon =
                  m.status === "changed"
                    ? IconSourceSwap
                    : m.status === "insufficient"
                      ? IconDashedCircle
                      : (ahIcon[m.id] ?? IconInfo);
                const unit = zh ? m.unitZh : m.unitEn;
                const showRange = m.status === "different" && Boolean(m.baseline);
                const statusText =
                  m.status === "different"
                    ? showRange
                      ? m.direction === "below"
                        ? g.hlBelow
                        : g.hlAbove
                      : x[ahStatusKey[m.status]]
                    : m.status === "changed"
                      ? g.hlSourceChanged
                      : m.status === "insufficient"
                        ? g.hlNoData
                        : g.hlSteady;
                return (
                  <li key={m.id}>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5">
                      <Icon className={`mt-0.5 size-5 shrink-0 ${levelText[tone]}`} />
                      <span className="min-w-0">
                        <span className="t-body block break-words">
                          <Button variant="ghost" onClick={() => showTrends(m.id)} className="t-body h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left text-aeri-ink">
                            {zh ? m.labelZh : m.labelEn}
                          </Button>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className={`t-meta block break-words ${m.status === "different" ? "font-medium text-aeri-ink" : m.status === "within" ? "text-aeri-slate" : levelText[tone]}`}>
                            {m.status === "different" ? (m.direction === "below" ? "↓ " : "↑ ") : ""}{statusText}
                          </span>
                          {showRange ? (
                            <InfoDot
                              lang={lang}
                              title={g.iRecentT}
                              body={g.iRecentB}
                              label={g.info}
                            />
                          ) : null}
                        </span>
                      </span>
                      <span className="t-body shrink-0 text-right font-semibold tabular-nums">
                        {m.value ?? <span className="t-meta font-normal text-aeri-slate">—</span>}
                        {m.value && unit ? (
                          <span className="t-meta ml-1 font-normal text-aeri-slate">{unit}</span>
                        ) : null}
                      </span>
                    </div>
                    {showRange && m.baseline ? (
                      <RangeMarker
                        band={m.baseline.band}
                        value={m.baseline.value}
                        tone={tone}
                        className="mt-1.5"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="t-meta mt-1 flex items-center gap-1.5 break-words text-aeri-good">
              <IconCheckCircle className="size-4 shrink-0" />
              {g.hlAllSteady}
            </p>
          )}

        </section>
      </Card>


      {/* 2 — Action plan, one source-aware row */}
      <button
        type="button"
        onClick={() => openSheet(zone ? <PlanSheet lang={lang} /> : <ZoneSheet lang={lang} />)}
        className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-aeri-line px-3.5 py-3 text-left"
      >
        <IconClipboard className="size-5 shrink-0 text-aeri-blue" />
        <span className="min-w-0">
          <span className="t-body block break-words font-medium">{g.planRow}</span>
          <span
            className={`t-meta block break-words ${zone ? "text-aeri-good" : "text-aeri-slate"}`}
          >
            {zoneLabel}
          </span>
          <span className="t-meta block break-words text-aeri-slate">{g.planSrc}</span>
        </span>
        <IconChevron className="size-5 shrink-0 text-aeri-slate" />
      </button>

      {/* 3 — Low-effort manual input, explicit only */}
      <Card variant={variant} className="py-3.5">
        <div className="flex items-center gap-2.5">
          <IconBreath className="size-5 shrink-0 text-aeri-blue" />
          <p className="t-body min-w-0 break-words font-medium">{g.askTitle}</p>
        </div>
        {nothingToNote ? (
          <p className="t-meta mt-2 flex items-start gap-1.5 break-words text-aeri-good">
            <IconCheckCircle className="mt-0.5 size-4 shrink-0" />
            {g.noteSaved.replace("{t}", nothingToNote)}
          </p>
        ) : null}
        {checkin ? (
          <p className="t-meta mt-2 break-words text-aeri-slate">
            {k.ciSavedLine.replace("{t}", checkin.savedAt)}
          </p>
        ) : null}
        <div className="aeri-adapt-grid mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => markNothingToNote("09:12")}
            aria-pressed={Boolean(nothingToNote)}
            className={`t-meta min-h-11 rounded-xl border px-3 py-2 font-medium ${
              nothingToNote
                ? "border-aeri-good text-aeri-good"
                : "border-aeri-line text-aeri-ink"
            }`}
          >
            {g.askNone}
          </button>
          <button
            type="button"
            onClick={() => openSheet(<CheckInSheet lang={lang} />)}
            className="t-meta min-h-11 rounded-xl bg-aeri-teal px-3 py-2 font-medium text-aeri-teal-fg"
          >
            {checkin ? g.reportedView : g.askLog}
          </button>
        </div>
      </Card>

      {/* 4 — Ask AI preview (copy only) */}
      <button
        type="button"
        onClick={() => openSheet(<AskSheet lang={lang} />)}
        className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left"
      >
        <IconAir className="size-5 shrink-0 text-aeri-slate" />
        <span className="min-w-0">
          <span className="t-body block break-words text-aeri-slate">{k.askTitle}</span>
        </span>

        <IconArrow className="size-5 shrink-0 text-aeri-slate" />
      </button>
    </>
  );
}
