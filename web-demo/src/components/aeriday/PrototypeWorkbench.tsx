import { useState } from "react";
import { AeriDayApp, type Tab } from "@/components/aeriday/AeriDayApp";
import { dict, type Lang } from "@/lib/aeriday/copy";
import { scenarioLabels, type Scenario } from "@/lib/aeriday/scenarios";
import { Button } from "@/components/ui/button";
import { BrowserDemoProvider, useBrowserDemo } from './BrowserDemoProvider';
import { demoDays, demoISO, demoStamp } from '@/lib/aeriday/browserDemo';

type Theme = "light" | "dark";
type Size = "std" | "lg";

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.65rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <div className="inline-flex flex-wrap rounded-lg border border-border p-0.5">
        {options.map((o) => (
          <Button
            variant="ghost"
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              "min-h-11 h-auto rounded-md px-3 py-1.5 text-sm transition-colors " +
              (o.value === value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Phone({
  lang,
  theme,
  size,
  tab,
  onTabChange,
  caption,
  scenario,
}: {
  lang: Lang;
  theme: Theme;
  size: Size;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  caption?: string;
  scenario: Scenario;
}) {
  const demo = useBrowserDemo();
  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className={
          "aeri-judges h-[812px] w-[min(375px,calc(100vw-32px))] shrink-0 overflow-hidden rounded-[2.25rem] border border-border " +
          (theme === "dark" ? "aeri-dark" : "aeri-light") +
          " " +
          (size === "lg" ? "aeri-type-lg" : "aeri-type-std")
        }
      >
        <AeriDayApp
          variant="B"
          lang={lang}
          tab={tab}
          onTabChange={onTabChange}
          scenario={scenario}
          dataLabel={demo ? '' : undefined}
          todayHeader={demo ? { title: 'Cambridge, Massachusetts', sub: `${demoStamp(demoISO(demo.store.day))} · New York time` } : undefined}
        />
      </div>
      {caption ? (
        <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function PrototypeWorkbench() {
  return <BrowserDemoProvider><JudgesWorkbench /></BrowserDemoProvider>;
}
function JudgesWorkbench() {
  const demo = useBrowserDemo();
  const [how, setHow] = useState(false);
  const [reset, confirmReset] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [size, setSize] = useState<Size>("std");
  const [tab, setTab] = useState<Tab>("today");
  const [scenario, setScenario] = useState<Scenario>("changes");
  const c = dict[lang];

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <header className="mx-auto max-w-6xl">
        <h1 className="text-xl font-semibold tracking-tight">Asthma Helper · Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Synthetic data only · Interactive browser example · America/New_York
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="outline" className="min-h-11" onClick={() => setHow(!how)} aria-expanded={how}>How to try</Button><Button variant="ghost" className="min-h-11" onClick={() => { if (!reset) { confirmReset(true); return; } demo?.reset(); setScenario('changes'); setTab('today'); confirmReset(false); }}>{reset ? 'Confirm reset example' : 'Reset synthetic demo'}</Button>{reset ? <Button variant="ghost" className="min-h-11" onClick={() => confirmReset(false)}>Cancel reset</Button> : null}<label className="text-sm text-muted-foreground">Timeline day <select aria-label="Timeline day" className="ml-2 min-h-11 rounded-md border border-border bg-background px-3 text-foreground" value={demo?.store.day} onChange={(e) => demo?.selectDay(e.target.value)}>{demoDays.map((day) => <option key={day} value={day}>{new Date(`${day}T12:00:00`).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</option>)}</select></label></div>
        {how ? <div className="mt-3 max-w-2xl space-y-1 text-sm text-muted-foreground"><p>1. Open History: add or edit a respiratory check-in. Choose Mild cough, then Save.</p><p>2. Open Today or Trends: explore the simulated Swift-engine example and daily chart.</p><p>3. In More, prepare a doctor visit: choose dates, notes and questions, then Print / Save PDF.</p><p>Changing the latest symptom record to None selects the no-change example; it does not establish safety. These are presentation fixtures, not HealthKit or browser clinical AI.</p><p>Only fictional entries belong here. Edits stay in this browser; reset restores the 35-day example.</p></div> : null}
        {demo?.storageNotice ? <p role="status" className="mt-2 text-sm text-muted-foreground">{demo.storageNotice}</p> : null}

        <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
          <Toggle
            label="Tab"
            value={tab}
            onChange={setTab}
            options={[
              { value: "today", label: c.tabToday },
              { value: "meds", label: c.tabMeds },
              { value: "trends", label: c.tabTrends },
              { value: "log", label: c.tabLog },
              { value: "more", label: c.tabMore },
            ]}
          />
          <Toggle
            label={c.ctrlLang}
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: "English" },
              { value: "zh", label: "简体中文" },
            ]}
          />
          <Toggle
            label={c.ctrlTheme}
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: c.light },
              { value: "dark", label: c.dark },
            ]}
          />
          <Toggle
            label={c.ctrlText}
            value={size}
            onChange={setSize}
            options={[
              { value: "std", label: c.sizeStd },
              { value: "lg", label: c.sizeLg },
            ]}
          />
          <Toggle
            label={lang === "zh" ? "示例" : "Example"}
            value={scenario}
            onChange={(value) => { setScenario(value); demo?.selectExample(value); }}
            options={(["changes", "within", "gaps"] as const).map((value) => ({
              value,
              label: scenarioLabels[lang][value],
            }))}
          />
        </div>
      </header>

      <div className="mx-auto mt-8 flex max-w-6xl justify-center gap-8 overflow-x-auto pb-4">
        <Phone
          lang={lang}
          theme={theme}
          size={size}
          tab={tab}
          onTabChange={setTab}
          scenario={scenario}
        />
      </div>
    </main>
  );
}
