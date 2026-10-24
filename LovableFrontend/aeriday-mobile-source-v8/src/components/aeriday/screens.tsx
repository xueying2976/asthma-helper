import { NativeMeds, NativeMore } from "./NativeScreens";
import { ActualUseEntry, AnalysisSettings } from "./PersonalInsights";
import { DoctorVisitEntry } from "./DoctorVisit";
import { useState } from "react";
import { dict, type CopyKey, type Lang } from "@/lib/aeriday/copy";
import { u } from "@/lib/aeriday/copy2";
import { meds } from "@/lib/aeriday/data";
import { coverageDays } from "@/lib/aeriday/today";
import {
  IconAir,
  IconAlertLine,
  IconArrow,
  IconBreath,
  IconCheckCircle,
  IconClipboard,
  IconDrop,
  IconHeartLine,
  IconInfo,
  IconLeaf,
  IconLog,
  IconMeds,
  IconMoon,
  IconMore,
  IconPin,
  IconPollen,
  IconSun,
  IconToday,
  IconTrends,
} from "./icons";
import {
  Card,
  Divider,
  Meter,
  Panel,
  PrimaryButton,
  Row,
  Sparkline,
  StatTile,
  Tag,
  type Variant,
} from "./ui";
import { ActionRow, ArrowCta, InlineNote } from "./kit";
import { useAeri } from "./state";
import {
  AskSheet,
  CheckInSheet,
  EmergencySheet,
  InfoSheet,
  MedCorrectSheet,
  MedHistorySheet,
  MedLogSheet,
  ZoneSheet,
} from "./sheets";

type Props = { variant: Variant; lang: Lang };

/* ---------------- Log ---------------- */

export function LogBody({ variant, lang }: Props) {
  const c = dict[lang];
  const k = u[lang];
  const { checkin, openSheet, logs } = useAeri();

  return (
    <>
      <Card variant={variant} className="py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="t-cap text-aeri-slate">{k.ciTitle}</p>
            <p className="t-title mt-0.5 font-semibold">
              {checkin ? k.ovComplete : k.ovIncomplete}
            </p>
          </div>
          <IconCheckCircle
            className={`size-8 shrink-0 ${checkin ? "text-aeri-good" : "text-aeri-slate"}`}
          />
        </div>
        <div className="mt-3">
          <Meter pct={checkin ? 100 : 0} tone={checkin ? "good" : "watch"} />
        </div>
        <div className="mt-3">
          <ArrowCta onClick={() => openSheet(<CheckInSheet lang={lang} />)}>
            {checkin ? k.ciEdit : c.logStart}
          </ArrowCta>
        </div>
        <InlineNote>{k.ciReviewNote}</InlineNote>
      </Card>

      <Panel variant={variant} title={c.logQuick}>
        <div className="aeri-adapt-grid grid grid-cols-2 gap-2">
          {[
            { Icon: IconBreath, label: c.qSymptom, detail: c.qSymptomSub, go: () => openSheet(<CheckInSheet lang={lang} />) },
            { Icon: IconMeds, label: c.qReliever, detail: c.qRelieverSub, go: () => openSheet(<MedLogSheet lang={lang} />) },
            { Icon: IconTrends, label: c.qPeak, detail: c.qPeakSub, go: () => openSheet(<CheckInSheet lang={lang} />) },
            { Icon: IconPollen, label: c.qTrigger, detail: c.qTriggerSub, go: () => openSheet(<CheckInSheet lang={lang} />) },
          ].map(({ Icon, label, detail, go }) => (
            <button
              key={label}
              type="button"
              onClick={go}
              className="min-h-11 min-w-0 rounded-xl border border-aeri-line px-3 py-2.5 text-left"
            >
              <Icon className="size-5 text-aeri-teal" />
              <span className="t-body mt-1.5 block font-medium">{label}</span>
              <span className="t-meta block text-aeri-slate">{detail}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel variant={variant} title={c.logRecent}>
        <ul>
          {[
            ...logs.map((l) => ({ Icon: IconMeds, t: l.label, s: l.time })),
            ...(checkin
              ? [{ Icon: IconCheckCircle, t: k.ciTitle, s: `${k.ovSaved} ${checkin.savedAt}` }]
              : []),
            { Icon: IconMeds, t: c.logE1T, s: c.logE1S },
            { Icon: IconBreath, t: c.logE2T, s: c.logE2S },
            { Icon: IconCheckCircle, t: c.logE3T, s: c.logE3S },
          ].map((e, i) => (
            <li key={`${e.t}-${i}`}>
              {i > 0 ? <Divider /> : null}
              <Row Icon={e.Icon} title={e.t} subtitle={e.s} />
            </li>
          ))}
        </ul>
        <p className="t-meta mt-2 text-aeri-slate">{c.logNote}</p>
      </Panel>

      <button
        type="button"
        onClick={() => openSheet(<EmergencySheet lang={lang} />)}
        className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-aeri-amber/60 px-3.5 py-3 text-left"
      >
        <IconAlertLine className="size-5 shrink-0 text-aeri-amber" />
        <span className="t-body min-w-0 font-medium text-aeri-amber">{k.emgTitle}</span>
        <IconArrow className="size-5 shrink-0 text-aeri-amber" />
      </button>

      <p className="t-meta flex items-start gap-2 px-1 pt-1 pb-2 text-aeri-slate">
        <IconInfo className="mt-0.5 size-4 shrink-0" />
        {c.privacyNote}
      </p>
    </>
  );
}

/* ---------------- Medications ---------------- */

export function MedsBody({ variant, lang }: Props) {
  const c = dict[lang];
  const k = u[lang];
  const { openSheet, relieverConfirmed, relieverDoses, native } = useAeri();

  if (native) return <NativeMeds variant={variant} lang={lang} actualUse={<ActualUseEntry />} />;
  return (
    <>
      <Panel variant={variant} title={c.medsScheduleTitle}>
        <ul>
          {[
            { text: c.medsSched1, done: true },
            { text: c.medsSched2, done: false },
          ].map((s, i) => (
            <li key={s.text}>
              {i > 0 ? <Divider /> : null}
              <Row
                Icon={s.done ? IconCheckCircle : IconMoon}
                tone={s.done ? "text-aeri-good" : "text-aeri-blue"}
                title={s.text}
                trailing={
                  <Tag tone={s.done ? "good" : "watch"}>{s.done ? c.medsTaken : c.medsUpcoming}</Tag>
                }
                chevron={false}
              />
            </li>
          ))}
        </ul>
        <p className="t-meta mt-2 text-aeri-slate">{c.medsAdherence}</p>
      </Panel>

      <Panel variant={variant} title={c.medsInventory}>
        <ul className="space-y-4">
          {meds.map((m) => {
            const isReliever = m.low;
            return (
              <li key={m.id} className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <p className="t-body min-w-0 font-medium">{c[m.nameKey as CopyKey]}</p>
                  {m.low ? <Tag tone="high">{c.medLowTag}</Tag> : null}
                </div>
                <p className="t-meta text-aeri-slate">{c[m.doseKey as CopyKey]}</p>
                <Meter pct={m.pct} tone={m.low ? "high" : "good"} />
                <p className="t-meta mt-1">
                  {isReliever && relieverConfirmed
                    ? `${relieverDoses}`
                    : c[m.stockKey as CopyKey]}
                </p>
                <p className="t-meta flex items-center gap-1.5 text-aeri-slate">
                  {m.low && !relieverConfirmed ? (
                    <IconInfo className="size-4 shrink-0" />
                  ) : (
                    <IconCheckCircle className="size-4 shrink-0" />
                  )}
                  {isReliever && relieverConfirmed
                    ? k.medConfirmedTag
                    : c[m.sourceKey as CopyKey]}
                </p>
                <div className="aeri-adapt-grid mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openSheet(<MedLogSheet lang={lang} />)}
                    className="t-meta min-h-11 rounded-xl border border-aeri-teal px-3 py-2 font-medium text-aeri-teal"
                  >
                    {k.medLogUse}
                  </button>
                  <button
                    type="button"
                    onClick={() => openSheet(<MedCorrectSheet lang={lang} />)}
                    className="t-meta min-h-11 rounded-xl border border-aeri-line px-3 py-2 font-medium"
                  >
                    {k.medCorrect}
                  </button>
                </div>
                {m.low ? (
                  <div className="mt-2">
                    <PrimaryButton
                      outline
                      onClick={() =>
                        openSheet(
                          <InfoSheet
                            lang={lang}
                            title={c.medsRefillCta}
                            body={
                              lang === "zh"
                                ? ["缓解药约 5 天后用完。", "请联系药房或诊所续药。这是示例，不会发送请求。"]
                                : ["Reliever runs out in about 5 days.", "Contact your pharmacy or clinic to refill. Demo only — no request is sent."]
                            }
                          />,
                        )
                      }
                    >
                      {c.medsRefillCta}
                      <IconArrow className="size-5 shrink-0" />
                    </PrimaryButton>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <ActionRow
          Icon={IconClipboard}
          title={k.medHistory}
          subtitle={k.medHistoryNote}
          onClick={() => openSheet(<MedHistorySheet lang={lang} />)}
        />
        <p className="t-meta text-aeri-slate">{c.medsFootnote}</p>
      </Panel>

      <Panel variant={variant} title={c.secPlan}>
        <ActionRow
          Icon={IconClipboard}
          title={c.planCta}
          subtitle={k.planEnteredBy}
          onClick={() => openSheet(<ZoneSheet lang={lang} />)}
        />
      </Panel>
    </>
  );
}

/* ---------------- Trends ---------------- */

const days7 = [1, 0, 2, 1, 0, 3, 1];
const days30 = [3, 5, 2, 6, 4, 7, 0, 5];

export function TrendsBody({ variant, lang }: Props) {
  const c = dict[lang];
  const k = u[lang];
  const [range, setRange] = useState<"7" | "30">("7");
  const series = range === "7" ? days7 : days30;
  const max = Math.max(...series, 1);
  const total = series.reduce((a, b) => a + b, 0);

  return (
    <>
      <Card variant={variant} className="py-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-aeri-line p-1">
          {(
            [
              ["7", c.range7],
              ["30", c.range30],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setRange(v)}
              aria-pressed={range === v}
              className={`t-meta min-h-11 rounded-lg px-2 py-1.5 ${
                range === v ? "bg-aeri-teal text-aeri-teal-fg" : "text-aeri-slate"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="t-meta mt-2 text-aeri-slate">
          {k.trSource} · {k.trFresh}
        </p>
      </Card>

      {/* One question per chart */}
      <Panel variant={variant} title={k.trQ1}>
        <div className="flex h-28 items-end gap-2">
          {series.map((v, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="t-meta tabular-nums text-aeri-slate">{v || "–"}</span>
              <span
                className={`block w-full rounded-md ${v === 0 ? "bg-aeri-line" : "bg-aeri-teal"}`}
                style={{ height: `${Math.max(4, (v / max) * 74)}px` }}
              />
              <span className="t-meta tabular-nums text-aeri-slate">{i + 1}</span>
            </div>
          ))}
        </div>
        <p className="t-body mt-2">
          {total} · {c.trSymptomDays}
        </p>
        <p className="t-meta text-aeri-slate">{k.trGapNote}</p>
      </Panel>

      <Panel variant={variant} title={k.trQ2}>
        <div className="aeri-adapt-grid grid grid-cols-2 gap-2">
          <StatTile
            variant={variant}
            Icon={IconMeds}
            label={c.trReliever}
            value={range === "7" ? "4" : "14"}
            unit={range === "7" ? "/ 7" : "/ 30"}
            level="watch"
            spark={[1, 3, 2, 4, 3, 5, 1, 4]}
          />
          <StatTile
            variant={variant}
            Icon={IconMoon}
            label={c.trNights}
            value={range === "7" ? "1" : "3"}
            unit={range === "7" ? "/ 7" : "/ 30"}
            level="watch"
            pct={12}
          />
        </div>
        <p className="t-meta mt-2 text-aeri-slate">{k.trNoCause}</p>
      </Panel>

      <Panel variant={variant} title={k.trQ3}>
        <p className="t-body">{c.trCompleteSub}</p>
        <Meter pct={70} tone="watch" />
        <div className="mt-3 flex flex-wrap gap-1" aria-hidden="true">
          {coverageDays.slice(0, range === "7" ? 7 : 28).map((has, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-[3px] ${
                has ? "bg-aeri-blue/60" : "border border-dashed border-aeri-amber/70"
              }`}
            />
          ))}
        </div>
        <p className="t-meta mt-2 text-aeri-slate">
          {k.trCoverage} · {k.trSource}
        </p>
      </Panel>

      <Panel variant={variant} title={c.trPatternTitle}>
        <div className="flex gap-2.5">
          <IconLeaf className="mt-0.5 size-5 shrink-0 text-aeri-teal" />
          <div className="min-w-0">
            <p className="t-body">{c.trPattern1}</p>
            <p className="t-meta mt-1 text-aeri-slate">{k.trNoCause}</p>
            <Sparkline points={[2, 3, 2.4, 4, 3.2, 4.6, 3]} tone="watch" className="mt-2 h-6 w-24" />
          </div>
        </div>
      </Panel>
    </>
  );
}

/* ---------------- More ---------------- */

export function MoreBody({ variant, lang, hideLanguage = false }: Props & { hideLanguage?: boolean }) {
  const c = dict[lang];
  const k = u[lang];
  const { openSheet, native } = useAeri();
  const info = (title: string, body: string[]) => () =>
    openSheet(<InfoSheet lang={lang} title={title} body={body} />);

  const groups = [
    {
      title: k.mGrpCare,
      rows: [
        { Icon: IconClipboard, t: k.mPlan, s: k.mPlanSub, go: () => openSheet(<ZoneSheet lang={lang} />) },
        { Icon: IconAlertLine, t: k.emgTitle, s: k.emgSub, go: () => openSheet(<EmergencySheet lang={lang} />) },
        { Icon: IconPin, t: k.mVisit, s: k.mVisitSub, go: info(k.mVisit, [k.mVisitSub, c.privacyNote]) },
      ],
    },
    {
      title: k.mGrpData,
      rows: [
        { Icon: IconHeartLine, t: k.mSources, s: k.mSourcesSub, go: info(k.mSources, [k.mSourcesSub, c.bodyNote]) },
        { Icon: IconAir, t: k.mEnvDetail, s: k.mEnvDetailSub, go: info(k.mEnvDetail, [k.mEnvDetailSub]) },
        { Icon: IconClipboard, t: k.mAsk, s: k.mAskSub, go: () => openSheet(<AskSheet lang={lang} />) },
        { Icon: IconLog, t: k.mExportItem, s: k.mExportSubItem, go: info(k.mExportItem, [k.mExportSubItem, c.privacyNote]) },
      ],
    },
    {
      title: k.mGrpApp,
      rows: [
        { Icon: IconSun, t: k.mLang, s: k.mLangSub, go: info(k.mLang, [k.mLangSub]) },
        { Icon: IconDrop, t: k.mNotif, s: k.mNotifSub, go: info(k.mNotif, [k.mNotifSub]) },
        { Icon: IconInfo, t: k.mPrivacyItem, s: k.mPrivacySubItem, go: info(k.mPrivacyItem, [c.privacyNote, k.askNoSend]) },
        { Icon: IconMore, t: k.mDelete, s: k.mDeleteSub, go: info(k.mDelete, [k.mDeleteSub]) },
        { Icon: IconToday, t: k.mAboutItem, s: k.mAboutSubItem, go: info(k.mAboutItem, [k.mAboutSubItem]) },
      ],
    },
  ];

  if (native) return <><DoctorVisitEntry /><AnalysisSettings /><NativeMore variant={variant} lang={lang} hideLanguage={hideLanguage} /></>;
  return (
    <>
      {groups.map((g) => (
        <Panel key={g.title} variant={variant} title={g.title}>
          <ul>
            {g.rows.map((r, i) => (
              <li key={r.t}>
                {i > 0 ? <Divider /> : null}
                <ActionRow Icon={r.Icon} title={r.t} subtitle={r.s} onClick={r.go} />
              </li>
            ))}
          </ul>
        </Panel>
      ))}

    </>
  );
}
