import { useState } from "react";
import { dict, type Lang } from "@/lib/aeriday/copy";
import { u } from "@/lib/aeriday/copy2";
import { t as td } from "@/lib/aeriday/todayCopy";
import { d as dd } from "@/lib/aeriday/copy3";
import { ahMetrics, ahStatusKey } from "@/lib/aeriday/today";
import { getMetrics, metricValue } from "@/lib/aeriday/scenarios";
import { useAeri, type CheckIn, type Severity, type Zone } from "./state";
import {
  ChoiceGroup,
  InlineNote,
  MultiChoice,
  Sheet,
  SheetButton,
  Stepper,
  TextField,
} from "./kit";
import {
  IconAlertLine,
  IconCheckCircle,
  IconClipboard,
  IconDashedCircle,
  IconSourceSwap,
} from "./icons";
import { TrendChart, levelText } from "./ui";

const now = () => "09:12";

/* ---------------- Check-in ---------------- */

const symptomKeys = ["wheeze", "cough", "tight", "breath", "night", "activity"] as const;

export function CheckInSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const { closeSheet, saveCheckin, checkin } = useAeri();
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState<Partial<Record<string, Severity>>>(
    checkin?.symptoms ?? {},
  );
  const [reliever, setReliever] = useState(checkin?.reliever ?? 0);
  const [preExercise, setPre] = useState<boolean | null>(checkin?.preExercise ?? null);
  const [pef, setPef] = useState(checkin?.pef ?? "");
  const [pefUnit, setPefUnit] = useState(checkin?.pefUnit ?? "L/min");
  const [pefTime, setPefTime] = useState(checkin?.pefTime ?? "");
  const [exposures, setExposures] = useState<string[]>(checkin?.exposures ?? []);
  const [note, setNote] = useState(checkin?.note ?? "");
  const [saved, setSaved] = useState(false);

  const sevOptions: { value: Severity; label: string }[] = [
    { value: "none", label: k.ciNone },
    { value: "mild", label: k.ciMild },
    { value: "moderate", label: k.ciModerate },
    { value: "marked", label: k.ciMarked },
  ];
  const labels: Record<string, string> = {
    wheeze: k.ciWheeze,
    cough: k.ciCough,
    tight: k.ciTight,
    breath: k.ciBreath,
    night: k.ciNight,
    activity: k.ciActivity,
  };
  const set = (id: string, v: Severity) => setSymptoms((s) => ({ ...s, [id]: v }));

  if (saved) {
    return (
      <Sheet title={k.ciSavedTitle} onClose={closeSheet} closeLabel={k.close}>
        <div className="flex items-start gap-3">
          <IconCheckCircle className="mt-0.5 size-6 shrink-0 text-aeri-good" />
          <p className="t-body">{k.ciSavedLine.replace("{t}", now())}</p>
        </div>
        <InlineNote>{k.ciReviewNote}</InlineNote>
        <InlineNote>{k.ovNoConclusion}</InlineNote>
        <SheetButton tone="quiet" onClick={closeSheet}>
          {k.done}
        </SheetButton>
      </Sheet>
    );
  }

  const titles = [k.ciS1, k.ciS2, k.ciS3, k.ciS4];

  return (
    <Sheet
      title={k.ciTitle}
      subtitle={`${k.ciStep} ${step} ${k.ciOf} 4 · ${titles[step - 1]}`}
      onClose={closeSheet}
      closeLabel={k.close}
      footer={
        <div className="flex gap-2">
          {step > 1 ? (
            <SheetButton tone="quiet" onClick={() => setStep(step - 1)}>
              {k.ciBack}
            </SheetButton>
          ) : null}
          {step < 4 ? (
            <SheetButton onClick={() => setStep(step + 1)}>{k.ciNext}</SheetButton>
          ) : (
            <SheetButton
              onClick={() => {
                const payload: CheckIn = {
                  savedAt: now(),
                  symptoms,
                  reliever,
                  preExercise,
                  pef,
                  pefUnit,
                  pefTime,
                  exposures,
                  note,
                };
                saveCheckin(payload);
                setSaved(true);
              }}
            >
              {k.ciSave}
            </SheetButton>
          )}
        </div>
      }
    >
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-aeri-teal" : "bg-aeri-line"}`}
          />
        ))}
      </div>

      {step === 1
        ? symptomKeys.slice(0, 4).map((id, i) => (
            <ChoiceGroup
              key={id}
              label={labels[id]!}
              hint={i === 0 ? `${k.ciIntensity} · ${k.ciIntensityHint}` : k.ciIntensity}
              value={symptoms[id]}
              options={sevOptions}
              onChange={(v) => set(id, v)}
            />
          ))
        : null}

      {step === 2 ? (
        <>
          {symptomKeys.slice(4).map((id, i) => (
            <ChoiceGroup
              key={id}
              label={labels[id]!}
              hint={i === 0 ? `${k.ciIntensity} · ${k.ciIntensityHint}` : k.ciIntensity}
              value={symptoms[id]}
              options={sevOptions}
              onChange={(v) => set(id, v)}
            />
          ))}
          <MultiChoice
            label={k.ciExposure}
            values={exposures}
            options={[
              { value: "none", label: k.ciExpNone },
              { value: "pollen", label: k.ciExpPollen },
              { value: "smoke", label: k.ciExpSmoke },
              { value: "dust", label: k.ciExpDust },
              { value: "cold", label: k.ciExpCold },
              { value: "pets", label: k.ciExpPets },
            ]}
            onToggle={(v) =>
              setExposures((e) => (e.includes(v) ? e.filter((x) => x !== v) : [...e, v]))
            }
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Stepper label={k.ciRelieverCount} value={reliever} onChange={setReliever} />
          <ChoiceGroup
            label={k.ciPreExercise}
            value={preExercise === null ? undefined : preExercise ? "y" : "n"}
            options={[
              { value: "y", label: k.ciYes },
              { value: "n", label: k.ciNo },
            ]}
            onChange={(v) => setPre(v === "y")}
          />
          <TextField label={k.ciPef} value={pef} onChange={setPef} inputMode="numeric" />
          <ChoiceGroup
            label={k.ciPefUnit}
            value={pefUnit}
            options={[
              { value: "L/min", label: "L/min" },
              { value: "%", label: "% personal best" },
            ]}
            onChange={setPefUnit}
          />
          <TextField label={k.ciPefTime} value={pefTime} onChange={setPefTime} placeholder="08:30" />
          <TextField label={k.ciNote} value={note} onChange={setNote} placeholder={k.ciNotePh} />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <ul className="divide-y divide-aeri-line">
            {symptomKeys.map((id) => (
              <li key={id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="t-body">{labels[id]}</span>
                <span className="t-body font-medium">
                  {symptoms[id] ? sevOptions.find((o) => o.value === symptoms[id])!.label : k.ciNotAnswered}
                </span>
              </li>
            ))}
            <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="t-body">{k.ciRelieverCount}</span>
              <span className="t-body font-medium tabular-nums">{reliever}</span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="t-body">{k.ciPreExercise}</span>
              <span className="t-body font-medium">
                {preExercise === null ? k.ciNotAnswered : preExercise ? k.ciYes : k.ciNo}
              </span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="t-body">{k.ciPef}</span>
              <span className="t-body font-medium">
                {pef ? `${pef} ${pefUnit}${pefTime ? ` · ${pefTime}` : ""}` : k.ciNotAnswered}
              </span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="t-body">{k.ciExposure}</span>
              <span className="t-body font-medium">
                {exposures.length ? exposures.join(" · ") : k.ciNotAnswered}
              </span>
            </li>
            {note ? (
              <li className="py-2">
                <span className="t-body">{k.ciNote}</span>
                <p className="t-body font-medium">{note}</p>
              </li>
            ) : null}
          </ul>
          <InlineNote>{k.ciReviewNote}</InlineNote>
        </>
      ) : null}
    </Sheet>
  );
}

/* ---------------- Emergency ---------------- */

export function EmergencySheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const { closeSheet } = useAeri();
  return (
    <Sheet title={k.emgTitle} subtitle={k.emgSub} onClose={closeSheet} closeLabel={k.close}>
      <div className="flex items-start gap-3 rounded-2xl border border-aeri-amber/60 p-3">
        <IconAlertLine className="mt-0.5 size-5 shrink-0 text-aeri-amber" />
        <p className="t-body font-medium text-aeri-amber">{k.emgHead}</p>
      </div>
      <ol className="space-y-3">
        {[k.emgS1, k.emgS2, k.emgS3].map((s, i) => (
          <li key={s} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="t-meta grid size-7 shrink-0 place-items-center rounded-full bg-aeri-mist font-semibold tabular-nums">
              {i + 1}
            </span>
            <span className="t-body">{s}</span>
          </li>
        ))}
      </ol>
      <InlineNote>{k.emgNote}</InlineNote>
      <InlineNote>{k.emgContact}</InlineNote>
    </Sheet>
  );
}

/* ---------------- Action-plan zone ---------------- */

export function ZoneSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const x = td[lang];
  const { closeSheet, setZone, zone } = useAeri();
  const opts: { value: Exclude<Zone, null>; label: string; text: string; tone: string }[] = [
    { value: "green", label: k.planZoneGreen, text: x.planGreenTxt, tone: "text-aeri-good" },
    { value: "yellow", label: k.planZoneYellow, text: x.planYellowTxt, tone: "text-aeri-amber" },
    { value: "red", label: k.planZoneRed, text: x.planRedTxt, tone: "text-aeri-amber" },
  ];
  return (
    <Sheet
      title={k.planPickTitle}
      subtitle={k.planEnteredBy}
      onClose={closeSheet}
      closeLabel={k.close}
    >
      <ul className="space-y-2.5">
        {opts.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => {
                setZone(o.value);
                closeSheet();
              }}
              className={`w-full rounded-2xl border p-3.5 text-left ${
                zone === o.value ? "border-aeri-teal bg-aeri-teal/10" : "border-aeri-line"
              }`}
            >
              <span className={`t-body block font-semibold ${o.tone}`}>{o.label}</span>
              <span className="t-meta mt-1 block text-aeri-slate">{o.text}</span>
            </button>
          </li>
        ))}
      </ul>
      <InlineNote>{k.planPickNote}</InlineNote>
      {zone ? (
        <SheetButton
          tone="quiet"
          onClick={() => {
            setZone(null);
            closeSheet();
          }}
        >
          {k.planClear}
        </SheetButton>
      ) : null}
    </Sheet>
  );
}

/* ---------------- Full clinician action plan ---------------- */

export function PlanSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const x = td[lang];
  const { closeSheet } = useAeri();
  const rows = [
    { label: k.planZoneGreen, text: x.planGreenTxt, tone: "text-aeri-good", shape: "rounded-full" },
    { label: k.planZoneYellow, text: x.planYellowTxt, tone: "text-aeri-amber", shape: "rounded-sm rotate-45" },
    { label: k.planZoneRed, text: x.planRedTxt, tone: "text-aeri-amber", shape: "rounded-none" },
  ];
  return (
    <Sheet
      title={x.planTitle}
      subtitle={`${k.planEnteredBy} · ${k.planLastEdited}`}
      onClose={closeSheet}
      closeLabel={k.close}
    >
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
            <span className={`mt-[0.45em] shrink-0 ${r.tone}`}>
              <span className={`block size-2.5 bg-current ${r.shape}`} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={`t-body block font-semibold ${r.tone}`}>{r.label}</span>
              <span className="t-body block break-words">{r.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <InlineNote>{k.planFullNote}</InlineNote>
      <InlineNote>{k.ovNoConclusion}</InlineNote>
    </Sheet>
  );
}

/* ---------------- Medication actions ---------------- */

export function MedLogSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const { closeSheet, addLog } = useAeri();
  const [puffs, setPuffs] = useState(1);
  const [when, setWhen] = useState<"now" | "earlier">("now");
  const [ok, setOk] = useState(false);
  return (
    <Sheet
      title={k.medLogTitle}
      onClose={closeSheet}
      closeLabel={k.close}
      footer={
        ok ? undefined : (
          <SheetButton
            onClick={() => {
              addLog(`${k.medPuffs} ${puffs}`, when === "now" ? now() : "08:20");
              setOk(true);
            }}
          >
            {k.medSave}
          </SheetButton>
        )
      }
    >
      {ok ? (
        <p className="t-body flex items-start gap-2">
          <IconCheckCircle className="mt-0.5 size-5 shrink-0 text-aeri-good" />
          {k.medSaved}
        </p>
      ) : (
        <>
          <Stepper label={k.medPuffs} value={puffs} onChange={setPuffs} min={1} max={10} />
          <ChoiceGroup
            label={k.medWhen}
            value={when}
            options={[
              { value: "now", label: k.medNow },
              { value: "earlier", label: k.medEarlier },
            ]}
            onChange={setWhen}
          />
        </>
      )}
    </Sheet>
  );
}

export function MedCorrectSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const { closeSheet, relieverDoses, correctReliever } = useAeri();
  const [n, setN] = useState(relieverDoses);
  return (
    <Sheet
      title={k.medCorrectTitle}
      onClose={closeSheet}
      closeLabel={k.close}
      footer={
        <SheetButton
          onClick={() => {
            correctReliever(n);
            closeSheet();
          }}
        >
          {k.medSave}
        </SheetButton>
      }
    >
      <Stepper label={k.medPuffs} value={n} onChange={setN} min={0} max={200} />
      <InlineNote>{k.medCorrectNote}</InlineNote>
    </Sheet>
  );
}

export function MedHistorySheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const c = dict[lang];
  const { closeSheet, logs, relieverConfirmed, relieverDoses } = useAeri();
  const rows = [
    ...logs.map((l) => ({ t: l.label, s: `${c.medRelieverName} · ${l.time}` })),
    ...(relieverConfirmed
      ? [{ t: `${k.medCorrect} → ${relieverDoses}`, s: k.medConfirmedTag }]
      : []),
    { t: c.medRelieverStock, s: k.medEstimateTag },
    { t: c.medControllerStock, s: `${k.medConfirmedTag} · Aug 2` },
  ];
  return (
    <Sheet title={k.medHistory} onClose={closeSheet} closeLabel={k.close}>
      <ul className="divide-y divide-aeri-line">
        {rows.map((r, i) => (
          <li key={i} className="py-2.5">
            <p className="t-body">{r.t}</p>
            <p className="t-meta text-aeri-slate">{r.s}</p>
          </li>
        ))}
      </ul>
      <InlineNote>{k.medHistoryNote}</InlineNote>
    </Sheet>
  );
}

/* ---------------- Ask AI prompt preview ---------------- */

export function AskSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const { closeSheet, checkin, scenario } = useAeri();
  const [copied, setCopied] = useState(false);
  const zh = lang === "zh";
  const sep = zh ? "：" : ": ";
  const ms = getMetrics(scenario);
  const val = (id: string) => {
    const m = ms.find((x) => x.id === id);
    return m ? metricValue(m, lang) : "—";
  };
  const fields = [
    `${k.ciS1}${sep}${checkin ? Object.entries(checkin.symptoms).map(([a, b]) => `${a}=${b}`).join(", ") : zh ? "未记录" : "Not recorded"}`,
    `${zh ? "今日缓解药" : "Reliever today"}${sep}${checkin?.reliever ?? 0} ${zh ? "次" : (checkin?.reliever ?? 0) === 1 ? "use" : "uses"}`,
    `${zh ? "环境" : "Environment"}${sep}AQI 58 · ${zh ? "花粉" : "pollen"} 8.2/10 · 26 °C · ${zh ? "湿度" : "humidity"} 71%`,
    `${zh ? "设备数据（模拟）" : "Device data (simulated)"}${sep}${zh ? "呼吸频率" : "respiratory rate"} ${val("rr")} · ${zh ? "静息心率" : "resting heart rate"} ${val("rhr")} · ${zh ? "睡眠" : "sleep"} ${val("sleep")}`,
  ];
  const prompt = fields.join("\n");
  return (
    <Sheet
      title={k.askTitle}
      subtitle={k.askSub}
      onClose={closeSheet}
      closeLabel={k.close}
      footer={
        <SheetButton
          onClick={() => {
            void navigator.clipboard?.writeText(prompt).catch(() => {});
            setCopied(true);
          }}
        >
          <IconClipboard className="size-5 shrink-0" />
          {copied ? k.askCopied : k.askCopy}
        </SheetButton>
      }
    >
      <p className="t-body font-medium">{k.askFields}</p>
      <pre className="t-meta rounded-2xl bg-aeri-mist p-3 break-words whitespace-pre-wrap">
        {prompt}
      </pre>
      <div className="flex items-start gap-2 rounded-2xl border border-aeri-amber/60 p-3">
        <IconAlertLine className="mt-0.5 size-5 shrink-0 text-aeri-amber" />
        <p className="t-meta text-aeri-amber">{k.askWarn}</p>
      </div>
      <InlineNote>{k.askNoSend}</InlineNote>
    </Sheet>
  );
}

/* ---------------- Generic info sheet (More rows) ---------------- */

export function InfoSheet({
  lang,
  title,
  body,
  onBack,
}: {
  lang: Lang;
  title: string;
  body: string[];
  onBack?: () => void;
}) {
  const k = u[lang];
  const { closeSheet } = useAeri();
  return (
    <Sheet title={title} onClose={onBack ?? closeSheet} closeLabel={onBack ? (lang === "zh" ? "返回" : "Back") : k.close}>
      {body.map((b) => (
        <p key={b} className="t-body">
          {b}
        </p>
      ))}
    </Sheet>
  );
}

/* ---------------- Health trends detail ---------------- */

export function HealthSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const g = dd[lang];
  const x = td[lang];
  const zh = lang === "zh";
  const { closeSheet } = useAeri();
  return (
    <Sheet title={g.hlSheetT} subtitle={g.hlMeta} onClose={closeSheet} closeLabel={k.close}>
      <ul className="divide-y divide-aeri-line">
        {ahMetrics.map((m) => {
          const unit = zh ? m.unitZh : m.unitEn;
          const source = zh ? m.sourceZh : m.sourceEn;
          const status = x[ahStatusKey[m.status]];
          const cov = g.hlCoverage.replace("{n}", String(m.coverage7 ?? 0));
          const valueText = m.value ? `${m.value}${unit ? ` ${unit}` : ""}` : "—";
          const tone =
            m.status === "different" ? "high" : m.status === "within" ? "good" : "unknown";
          const hasChart =
            m.status !== "changed" && (m.series7?.some((p) => p !== null) ?? false);
          return (
            <li key={m.id} className="py-3.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <span className="min-w-0">
                  <span className="t-body block break-words font-medium">
                    {zh ? m.labelZh : m.labelEn}
                  </span>
                  <span className="t-meta flex items-center gap-1 break-words text-aeri-slate">
                    {m.status === "changed" ? (
                      <IconSourceSwap className="size-3.5 shrink-0" />
                    ) : m.status === "insufficient" ? (
                      <IconDashedCircle className="size-3.5 shrink-0" />
                    ) : null}
                    {status}
                  </span>
                  <span className="t-meta block break-words text-aeri-slate">{source}</span>
                  <span className="t-meta block break-words text-aeri-slate">
                    {g.hlRange7} · {cov}
                  </span>
                </span>
                <span className="t-body shrink-0 text-right font-semibold tabular-nums">
                  {m.value ?? <span className="t-meta font-normal text-aeri-slate">—</span>}
                  {m.value && unit ? (
                    <span className="t-meta ml-1 font-normal text-aeri-slate">{unit}</span>
                  ) : null}
                </span>
              </div>
              {hasChart ? (
                <div className="mt-2">
                  <TrendChart
                    points={m.series7!}
                    band={m.baseline?.band}
                    tone={tone}
                    startLabel={g.hlAxisStart}
                    endLabel={g.hlAxisEnd}
                  />
                  <p className="t-meta mt-1 break-words text-aeri-slate">
                    {m.baseline ? `${g.hlBandNote} · ` : ""}
                    {g.hlGapNote}
                  </p>
                </div>
              ) : (
                <p
                  className={`t-meta mt-2 break-words ${m.status === "changed" ? "text-aeri-slate" : levelText.unknown}`}
                >
                  {m.status === "changed" ? g.hlNoChart : g.hlNoData}
                </p>
              )}
              <p className="sr-only">
                {g.hlSummary
                  .replace("{v}", valueText)
                  .replace("{s}", status)
                  .replace("{c}", `${cov} · ${source}`)}
              </p>
            </li>
          );
        })}
      </ul>
      <InlineNote>{g.iRangeB[0]}</InlineNote>
      <InlineNote>{g.iRangeB[1]}</InlineNote>
    </Sheet>
  );
}

/* ---------------- Environment details / source status ---------------- */

export function EnvSheet({ lang }: { lang: Lang }) {
  const k = u[lang];
  const g = dd[lang];
  const { closeSheet } = useAeri();
  const rows: { label: string; value: string; src: string }[] = [
    { label: g.envAirRow, value: `${g.airValue} ${g.airUnit} · ${g.airCat}`, src: g.airSrc },
    { label: g.envPollenRow, value: `${g.pollenValue} ${g.pollenUnit} · ${g.pollenCat}`, src: g.pollenSrc },
    { label: g.envWxRow, value: `${g.wxTemp} ${g.wxUnit} · ${g.wxHum} ${g.wxHumVal}`, src: g.wxSrc },
    { label: g.envIndoorRow, value: g.envSensorNone, src: g.indoorStale },
  ];
  return (
    <Sheet title={g.envSheetT} subtitle={g.envSheetSub} onClose={closeSheet} closeLabel={k.close}>
      <ul className="divide-y divide-aeri-line">
        {rows.map((r) => (
          <li key={r.label} className="py-3">
            <p className="t-body break-words font-medium">{r.label}</p>
            <p className="t-body break-words">{r.value}</p>
            <p className="t-meta break-words text-aeri-slate">{r.src}</p>
          </li>
        ))}
      </ul>
      <InlineNote>{g.iFreshB[0]}</InlineNote>
      <InlineNote>{g.iFreshB[1]}</InlineNote>
      <InlineNote>{g.iIndoorB[0]}</InlineNote>
    </Sheet>
  );
}
