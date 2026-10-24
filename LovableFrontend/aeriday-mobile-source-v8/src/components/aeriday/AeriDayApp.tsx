import { useState, type ReactNode } from "react";
import { dict, type CopyKey, type Lang } from "@/lib/aeriday/copy";
import { TodayBody } from "./TodayScreen";
import { MedsBody, MoreBody } from "./screens";
import { IconLog, IconMeds, IconMore, IconPin, IconToday, IconTrends } from "./icons";
import { AeriProvider } from "./state";
import type { Variant } from "./ui";
import type { Scenario } from "@/lib/aeriday/scenarios";
import { HistoryExperience, TrendsExperience } from "./TrendsExperience";
import { InsightsProvider } from "./InsightsProvider";

export type Tab = "today" | "log" | "meds" | "trends" | "more";

const tabs = [
  { id: "today" as const, key: "tabToday" as CopyKey, Icon: IconToday },
  { id: "meds" as const, key: "tabMeds" as CopyKey, Icon: IconMeds },
  { id: "trends" as const, key: "tabTrends" as CopyKey, Icon: IconTrends },
  { id: "log" as const, key: "tabLog" as CopyKey, Icon: IconLog },
  { id: "more" as const, key: "tabMore" as CopyKey, Icon: IconMore },
];

export function AeriDayApp({
  variant,
  lang,
  tab: controlled,
  onTabChange,
  scenario = "changes",
  dataLabel,
  native,
  todayHeader,
  nativeEnglishTrial = false,
}: {
  variant: Variant;
  lang: Lang;
  tab?: Tab;
  onTabChange?: (t: Tab) => void;
  scenario?: Scenario;
  /** Overrides the header data badge (e.g. native mode). Defaults to "Demo data". */
  dataLabel?: string | undefined;
  /** Native mode: replaces the demo location/date on Today. */
  todayHeader?: { title: string; sub: string } | undefined;
  native?: Parameters<typeof AeriProvider>[0]["native"];
  nativeEnglishTrial?: boolean;
}) {
  const c = dict[lang];
  const [internal, setInternal] = useState<Tab>("today");
  const tab = controlled ?? internal;
  const setTab = (t: Tab) => (onTabChange ? onTabChange(t) : setInternal(t));
  const [sheet, setSheet] = useState<ReactNode>(null);

  const header: Record<Tab, { title: string; sub: string; pin: boolean }> = {
    today: todayHeader ? { ...todayHeader, pin: false } : { title: c.location, sub: c.dateLine, pin: true },
    log: { title: c.logTitle, sub: c.logSub, pin: false },
    meds: { title: c.medsTitle, sub: c.medsSub, pin: false },
    trends: { title: c.trendsTitle, sub: c.trendsSub, pin: false },
    more: { title: c.moreTitle, sub: c.moreSub, pin: false },
  };
  const base = header[tab];
  // Native mode: demo subtitles (dates, counts) are replaced by the real sync time.
  const h = todayHeader ? { ...base, sub: todayHeader.sub } : base;

  return (
    <AeriProvider
      lang={lang}
      scenario={scenario}
      onShowTrends={() => setTab("trends")}
      onSheetChange={setSheet}
      native={native}
    >
      <InsightsProvider>
      <div className="relative flex h-full flex-col overflow-hidden bg-aeri-paper text-aeri-ink">
        <header className="shrink-0 bg-aeri-paper px-4 pt-5 pb-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="t-title flex min-w-0 items-center gap-1.5 font-semibold tracking-tight">
                {h.pin ? <IconPin className="size-4 shrink-0 text-aeri-teal" /> : null}
                <span className="min-w-0">{h.title}</span>
              </p>
              <p className="t-meta text-aeri-slate">{h.sub}</p>
            </div>
            <span className="t-cap aeri-soft-sm shrink-0 rounded-full bg-aeri-surface px-3 py-1.5 tracking-normal text-aeri-slate normal-case">
              {dataLabel ?? c.synthetic}
            </span>
          </div>
        </header>

        <div key={tab} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-24">
          {tab === "today" ? <TodayBody variant={variant} lang={lang} /> : null}
          {tab === "log" ? <HistoryExperience lang={lang} /> : null}
          {tab === "meds" ? <MedsBody variant={variant} lang={lang} /> : null}
          {tab === "trends" ? <TrendsExperience lang={lang} /> : null}
          {tab === "more" ? <MoreBody variant={variant} lang={lang} hideLanguage={nativeEnglishTrial} /> : null}
        </div>

        <nav className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
          <div className="pointer-events-auto grid grid-cols-5 items-center gap-1 rounded-full bg-aeri-nav p-1.5 shadow-lg">
            {tabs.map(({ id, key, Icon }) => {
              const active = id === tab;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 transition-colors " +
                    (active ? "bg-aeri-teal text-aeri-teal-fg" : "text-aeri-nav-fg")
                  }
                >
                  <Icon className="size-5" />
                  <span className="t-cap tracking-normal normal-case leading-none">{c[key]}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {sheet}
      </div>
      </InsightsProvider>
    </AeriProvider>
  );
}
