/**
 * Native facts and operation adapters mounted inside the shared preview screens.
 * Layout shells come from the browser preview; native editors retain real CRUD.
 * All values come from the native snapshot;
 * services that aren't connected show as unavailable — never as sample facts.
 */
import { useRef, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/aeriday/copy";
import { getMetrics, metricValue } from "@/lib/aeriday/scenarios";
import { callNative, type MedUnit, type NativeMedication, type NativeNote } from "@/lib/aeriday/nativeBridge";
import { fmtLocal, medUnits, nc, pad2, unitLabel } from "@/lib/aeriday/nativeCopy";
import {
  IconAir,
  IconBreath,
  IconClipboard,
  IconChevron,
  IconMoon,
  IconDashedCircle,
  IconDrop,
  IconHeartLine,
  IconInfo,
  IconLog,
  IconMeds,
  IconMore,
  IconSun,
  IconToday,
  IconTrends,
} from "./icons";
import { Card, Divider, Panel, PrimaryButton, Tag, type Variant } from "./ui";
import { ActionRow, ChoiceGroup, Sheet, SheetButton, Stepper, TextField } from "./kit";
import { useAeri, type NativeLink } from "./state";
import { NativeRecentChanges } from "./PersonalInsights";
import { useInsights } from "./InsightsProvider";
import { sourceIsAmbiguous, safetySentence } from "@/lib/aeriday/insights";
import { RecordEditor } from "./InsightRecords";
import { AirflowMotif, DashboardBlock, HistorySection } from "./previewLayouts";
import { saveMedicineThenReminder, writeAndRefresh } from "@/lib/aeriday/nativeOperations";
import { Button } from "@/components/ui/button";

type Props = { variant: Variant; lang: Lang };

function useNative(): NativeLink {
  const { native } = useAeri();
  if (!native) throw new Error("Native screens need a native link");
  return native;
}

/** Run a bridge write, refresh the snapshot, report failure (never hidden). */
function useWrite() {
  const n = useNative();
  const { closeSheet } = useAeri();
  return async (method: string, run: () => Promise<unknown>, close = true) => {
    try {
      await writeAndRefresh(run, n.refresh);
      if (close) closeSheet();
    } catch (e) {
      n.onError(method, e);
    }
  };
}

function MsgSheet({ lang, title, body }: { lang: Lang; title: string; body: string[] }) {
  const { closeSheet } = useAeri();
  return (
    <Sheet title={title} onClose={closeSheet} closeLabel={nc[lang].close}>
      {body.map((b) => (
        <p key={b} className="t-body">
          {b}
        </p>
      ))}
    </Sheet>
  );
}

function reminderText(m: NativeMedication, lang: Lang) {
  const state = m.reminderEnabled === true ? nc[lang].on : m.reminderEnabled === false ? nc[lang].off : nc[lang].reminderUnknown;
  const time = typeof m.reminderHour === "number" ? `${pad2(m.reminderHour)}:${pad2(m.reminderMinute ?? 0)}` : "";
  return `${state}${time ? ` · ${time}` : ""}`;
}
function leftText(m: NativeMedication, lang: Lang) {
  if (typeof m.remainingDoses !== "number") return null;
  const n = m.remainingDoses;
  return lang === "zh" ? `剩余 ${n} ${unitLabel(m.unit, n, lang)}` : `${n} ${unitLabel(m.unit, n, lang)} left`;
}

/* ---------------- Today ---------------- */

export function NativeTodayContent({ variant, lang }: Props) {
  const n = useNative(); const { openSheet, showTrends } = useAeri(); const { data, status } = useInsights();
  const sample = (id: string) => n.snapshot.metrics.find((m) => m.id === id);
  const unavailable = (title: string, body: string) => openSheet(<MsgSheet lang={lang} title={title} body={[body]} />);
  return <>
    <NativeRecentChanges />
    <Card variant={variant} className="relative overflow-hidden py-4">
      <AirflowMotif />
      <div className="relative flex items-center gap-1"><h2 className="t-title font-semibold tracking-tight">Today</h2><Button variant="ghost" size="icon" aria-label="About environment" className="size-11 shrink-0 text-aeri-slate" onClick={() => unavailable('Environment', nc[lang].envOff)}><IconInfo className="size-4" /></Button></div>
      <p className="relative t-meta text-aeri-slate">Updated {fmtLocal(n.snapshot.generatedAt, lang)}</p>
      <div className="relative mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div className="min-w-0"><p className="t-cap text-aeri-slate">Air quality</p><p className="t-hero font-semibold tracking-tight tabular-nums text-aeri-slate">— <span className="t-body font-medium">AQI</span></p><p className="t-meta text-aeri-slate">Unavailable · No connected source</p></div><IconDashedCircle className="size-5 shrink-0 text-aeri-slate" /></div>
      <div className="aeri-adapt-grid mt-3.5 grid grid-cols-2 gap-3 border-t border-aeri-line pt-3.5"><div><p className="t-cap text-aeri-slate">Pollen</p><p className="t-body font-semibold">—</p><p className="t-meta text-aeri-slate">Unavailable</p></div><div><p className="t-cap text-aeri-slate">Weather</p><p className="t-body font-semibold">—</p><p className="t-meta text-aeri-slate">Unavailable</p></div></div>
      <div className="mt-3.5"><DashboardBlock title="Medications today">{n.snapshot.medications.length ? n.snapshot.medications.map((m) => <div key={m.id} className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5"><IconMeds className="mt-3 size-5 shrink-0 text-aeri-blue" /><div className="min-w-0"><Button variant="ghost" className="t-body h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left" onClick={() => openSheet(<MedEditSheet lang={lang} med={m} />)}>{m.name}</Button><p className="t-meta text-aeri-slate">Reminder {reminderText(m, lang)}</p><p className="t-meta text-aeri-slate">{leftText(m, lang) ?? 'Inventory not supplied'} · {m.confirmed ? 'You confirmed' : 'Not confirmed'}</p></div></div>) : <ActionRow Icon={IconMeds} title={nc[lang].noMeds} subtitle={nc[lang].addMed} onClick={() => openSheet(<MedEditSheet lang={lang} />)} />}</DashboardBlock></div>
      <section className="mt-3.5 border-t border-aeri-line pt-3.5"><div className="flex items-center gap-2"><h3 className="t-cap text-aeri-slate">Health trends</h3><Button variant="ghost" className="t-meta ml-auto min-h-11 px-0 text-aeri-blue" onClick={() => showTrends('rr')}>See all <IconChevron className="size-4" /></Button></div><ul className="mt-1.5 space-y-3">{['rr','rhr'].map((id) => { const m = sample(id); const ambiguous = sourceIsAmbiguous(data?.sourceOptions.find((o) => o.metricId === id)); return <li key={id}><div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5"><IconHeartLine className="mt-3 size-5 shrink-0 text-aeri-slate" /><div className="min-w-0"><Button variant="ghost" className="t-body h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left" onClick={() => showTrends(id)}>{id === 'rr' ? 'Respiratory rate' : 'Resting heart rate'}</Button><p className="t-meta text-aeri-slate">{ambiguous ? 'Multiple sources · Choose in More' : m?.current != null ? 'Latest sample' : 'No sample supplied'}</p></div><span className="t-body pt-3 text-right font-semibold tabular-nums">{m?.current ?? '—'}<span className="t-meta ml-1 font-normal text-aeri-slate">{m?.unit ?? ''}</span></span></div></li>; })}</ul></section>
    </Card>
    <Button variant="ghost" className="grid h-auto min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5 whitespace-normal rounded-2xl border border-aeri-line px-3.5 py-3 text-left" onClick={() => unavailable('Action plan', 'No clinician-authored action plan is supplied by this native contract. No plan or treatment advice is generated here.')}><IconClipboard className="size-5 text-aeri-blue" /><span><span className="t-body block font-medium">Action plan</span><span className="t-meta block text-aeri-slate">Not supplied · Clinician-authored plan unavailable</span></span><IconChevron className="size-5 text-aeri-slate" /></Button>
    <Card variant={variant} className="py-3.5"><div className="flex items-center gap-2.5"><IconBreath className="size-5 shrink-0 text-aeri-blue" /><p className="t-body min-w-0 break-words font-medium">Anything unusual today?</p></div>{status === 'ready' && data ? <p className="t-meta mt-2 text-aeri-slate">{data.context.summary}</p> : null}<div className="aeri-adapt-grid mt-3 grid grid-cols-2 gap-2"><Button variant="outline" className="t-meta h-auto min-h-11 whitespace-normal rounded-xl border-aeri-line bg-aeri-surface px-3 py-2 text-aeri-ink hover:bg-aeri-mist hover:text-aeri-ink" onClick={() => openSheet(<RecordEditor kind="symptom" />)}>Review symptoms</Button><Button className="t-meta h-auto min-h-11 whitespace-normal rounded-xl bg-aeri-teal px-3 py-2 text-aeri-teal-fg" onClick={() => openSheet(<RecordEditor kind="symptom" />)}>Respiratory check-in</Button></div></Card>
    <p className="t-meta px-1 text-aeri-slate">{safetySentence}</p>
    <Button variant="ghost" className="grid h-auto min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5 rounded-2xl px-3.5 py-3 text-left text-aeri-slate" onClick={() => unavailable('Ask AI', 'Unavailable. No records are sent off this iPhone.')}><IconAir className="size-5" /><span className="t-body">Ask AI · Unavailable</span><IconChevron className="size-5" /></Button>
  </>;
}

/* ---------------- Medications ---------------- */

function parseTime(s: string): [number, number] | null | "bad" {
  if (!s.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return "bad";
  const h = Number(m[1]),
    mi = Number(m[2]);
  return h < 24 && mi < 60 ? [h, mi] : "bad";
}

export function MedEditSheet({ lang, med, enableReminder = false }: { lang: Lang; med?: NativeMedication; enableReminder?: boolean }) {
  const t = nc[lang];
  const { closeSheet } = useAeri();
  const write = useWrite();
  const [name, setName] = useState(med?.name ?? "");
  const [unit, setUnit] = useState<MedUnit>(med?.unit ?? "puff");
  const [left, setLeft] = useState(med?.remainingDoses ?? 0);
  const [time, setTime] = useState(typeof med?.reminderHour === "number" ? `${pad2(med.reminderHour)}:${pad2(med.reminderMinute ?? 0)}` : "");
  const [enabled, setEnabled] = useState(enableReminder || med?.reminderEnabled === true);
  const savedId = useRef(med?.id);
  const [busy, setBusy] = useState(false);
  const parsed = parseTime(time);
  const valid = name.trim().length > 0 && (!enabled || (parsed !== null && parsed !== "bad"));

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    await write("saveMedication", () => saveMedicineThenReminder(
      async () => {
        const result = await callNative("saveMedication", {
        ...(savedId.current ? { id: savedId.current } : {}), name: name.trim(), unit, remainingDoses: left, confirmed: true,
        ...(enabled && parsed && parsed !== "bad" ? { reminderHour: parsed[0], reminderMinute: parsed[1] } : {}),
        });
        savedId.current = result.id;
        return result;
      },
      (id) => callNative("setReminder", { id, time: enabled && parsed && parsed !== "bad" ? `${pad2(parsed[0])}:${pad2(parsed[1])}` : "00:00", enabled, kind: "dose" }),
    ));
    setBusy(false);
  };

  return (
    <Sheet
      title={med ? t.editMed : t.addMed}
      onClose={closeSheet}
      closeLabel={t.cancel}
      footer={<SheetButton onClick={save} disabled={!valid || busy}>{t.save}</SheetButton>}
    >
      <TextField label={t.name} value={name} onChange={setName} placeholder={t.required} />
      <ChoiceGroup label={t.unit} value={unit} onChange={setUnit} options={medUnits.map((u) => ({ value: u, label: unitLabel(u, 2, lang) }))} />
      <Stepper label={t.remaining} value={left} onChange={setLeft} max={500} decreaseLabel={`Decrease ${t.remaining.toLowerCase()}`} increaseLabel={`Increase ${t.remaining.toLowerCase()}`} />
      <ChoiceGroup label={t.reminder} value={enabled ? "on" : "off"} onChange={(v) => setEnabled(v === "on")} options={[{ value: "on", label: t.on }, { value: "off", label: t.off }]} />
      {enabled ? <TextField label={t.reminderTime} value={time} onChange={setTime} inputMode="numeric" placeholder="08:00" /> : null}
    </Sheet>
  );
}

function ConfirmSheet({ lang, body, cta, onConfirm }: { lang: Lang; body: string; cta: string; onConfirm: () => void }) {
  const t = nc[lang];
  const { closeSheet } = useAeri();
  return (
    <Sheet
      title={t.deleteQ}
      onClose={closeSheet}
      closeLabel={t.cancel}
      footer={
        <div className="space-y-2">
          <SheetButton tone="warn" onClick={onConfirm}>{cta}</SheetButton>
          <SheetButton tone="quiet" onClick={closeSheet}>{t.cancel}</SheetButton>
        </div>
      }
    >
      <p className="t-body">{body}</p>
    </Sheet>
  );
}

export function NativeMeds({ variant, lang, actualUse }: Props & { actualUse?: ReactNode }) {
  const t = nc[lang];
  const n = useNative();
  const { openSheet } = useAeri();
  const write = useWrite();
  const meds = n.snapshot.medications;

  return (
    <>
      <Panel variant={variant} title="Today’s schedule"><ul>{meds.map((m,i) => <li key={m.id}>{i > 0 ? <Divider /> : null}<ActionRow Icon={IconMoon} title={m.name} subtitle={`Reminder ${reminderText(m,lang)}`} onClick={() => openSheet(<MedEditSheet lang={lang} med={m} />)} /></li>)}</ul>{!meds.length ? <p className="t-meta text-aeri-slate">No medication reminders supplied.</p> : null}<p className="t-meta mt-2 text-aeri-slate">Reminders do not establish actual use.</p></Panel>
      {actualUse}
      <Panel variant={variant} title="Inventory">
        {meds.length ? (
          <ul className="space-y-4">
            {meds.map((m) => (
              <li key={m.id} className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <p className="t-body min-w-0 font-medium break-words">{m.name}</p>
                  {m.confirmed ? <Tag tone="good">{lang === "zh" ? "已确认" : "Confirmed"}</Tag> : null}
                </div>
                <p className="t-meta text-aeri-slate">
                  {[leftText(m, lang), `${t.reminder} ${reminderText(m, lang)}`].filter(Boolean).join(" · ")}
                </p>
                <div className="aeri-adapt-grid mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openSheet(<MedEditSheet lang={lang} med={m} />)} className="t-meta min-h-11 rounded-xl border border-aeri-line px-2 py-2 font-medium">
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openSheet(
                        <ConfirmSheet lang={lang} body={t.deleteMedBody} cta={t.delete} onConfirm={() => write("deleteMedication", () => callNative("deleteMedication", { id: m.id }))} />,
                      )
                    }
                    className="t-meta min-h-11 rounded-xl border border-aeri-line px-2 py-2 font-medium text-aeri-slate"
                  >
                    {t.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-meta italic text-aeri-slate">{t.noMeds}</p>
        )}
        <div className="mt-3">
          <PrimaryButton outline onClick={() => openSheet(<MedEditSheet lang={lang} />)}>
            + {t.addMed}
          </PrimaryButton>
        </div>
      </Panel>

    </>
  );
}

/* ---------------- History ---------------- */

function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fromLocalInput(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function NoteEditSheet({ lang, note }: { lang: Lang; note?: NativeNote }) {
  const t = nc[lang];
  const { closeSheet, openSheet } = useAeri();
  const write = useWrite();
  const [text, setText] = useState(note?.note ?? "");
  const [when, setWhen] = useState(toLocalInput(note?.date));
  const iso = fromLocalInput(when);
  const valid = text.trim().length > 0 && !!iso;

  const save = () => {
    if (!iso || !valid) return;
    void write("saveNote", () => callNative("saveNote", { ...(note ? { id: note.id } : {}), date: iso, note: text.trim() }));
  };

  return (
    <Sheet
      title={note ? t.editNote : t.addNote}
      onClose={closeSheet}
      closeLabel={t.cancel}
      footer={
        <div className="space-y-2">
          <SheetButton onClick={save} disabled={!valid}>{t.save}</SheetButton>
          {note ? (
            <SheetButton
              tone="quiet"
              onClick={() =>
                openSheet(<ConfirmSheet lang={lang} body={t.deleteNoteBody} cta={t.delete} onConfirm={() => write("deleteNote", () => callNative("deleteNote", { id: note.id }))} />)
              }
            >
              {t.delete}
            </SheetButton>
          ) : null}
        </div>
      }
    >
      <TextField label={t.noteText} value={text} onChange={setText} placeholder={t.required} />
      <TextField label={t.when} value={when} onChange={setWhen} />

    </Sheet>
  );
}

export function NativeHistory({ variant, lang }: Props) {
  const t = nc[lang];
  const n = useNative();
  const { openSheet, scenario } = useAeri();
  const notes = [...n.snapshot.notes].sort((a, b) => b.date.localeCompare(a.date));
  const ms = getMetrics(scenario);
  const label = (x: NativeNote) => {
    const m = x.metricId ? ms.find((v) => v.id === x.metricId) : undefined;
    if (!m || typeof x.value !== "number") return null;
    return `${lang === "zh" ? m.zh : m.en} · ${metricValue({ ...m, current: x.value }, lang)}`;
  };

  return (
    <>
      <HistorySection title={t.notes}>
        {notes.length ? (
          <ul>
            {notes.map((x, i) => (
              <li key={x.id}>
                {i > 0 ? <Divider /> : null}
                <ActionRow
                  Icon={IconLog}
                  title={x.note || label(x) || t.manual}
                  subtitle={[fmtLocal(x.date, lang), x.note ? label(x) : null, t.manual].filter(Boolean).join(" · ")}
                  onClick={() => openSheet(<NoteEditSheet lang={lang} note={x} />)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-meta italic text-aeri-slate">{t.noNotes}</p>
        )}
        <div className="mt-3">
          <PrimaryButton outline onClick={() => openSheet(<NoteEditSheet lang={lang} />)}>
            + {t.addNote}
          </PrimaryButton>
        </div>
      </HistorySection>
      <Card variant={variant} className="py-2">
        <ActionRow
          Icon={IconHeartLine}
          title={t.health}
          subtitle={`${t.synced} ${fmtLocal(n.snapshot.generatedAt, lang)}`}
          onClick={() => openSheet(<HealthSourceSheet lang={lang} />)}
        />
      </Card>
    </>
  );
}

/* ---------------- More ---------------- */

function HealthSourceSheet({ lang }: { lang: Lang }) {
  const t = nc[lang];
  const n = useNative();
  const { closeSheet } = useAeri();
  const write = useWrite();
  const [busy, setBusy] = useState(false);
  const run = (method: string, fn: () => Promise<unknown>) => async () => {
    setBusy(true);
    await write(method, fn, false);
    setBusy(false);
  };
  return (
    <Sheet title={t.health} subtitle={t.healthSub(n.snapshot.healthAuthorized)} onClose={closeSheet} closeLabel={t.close}>
      <p className="t-meta text-aeri-slate">
        {t.lastSync}: {fmtLocal(n.snapshot.generatedAt, lang)}
      </p>
      {!n.snapshot.healthAuthorized ? (
        <SheetButton disabled={busy} onClick={run("requestHealthAuthorization", () => callNative("requestHealthAuthorization", {}, 120000))}>
          {t.connect}
        </SheetButton>
      ) : null}
      <SheetButton tone="quiet" disabled={busy} onClick={run("getSnapshot", async () => {})}>
        {t.refresh}
      </SheetButton>
    </Sheet>
  );
}

function RemindersSheet({ lang }: { lang: Lang }) {
  const t = nc[lang];
  const n = useNative();
  const { closeSheet, openSheet } = useAeri();
  const write = useWrite();
  const meds = n.snapshot.medications;
  return (
    <Sheet title={t.notif} onClose={closeSheet} closeLabel={t.close}>
      {meds.length ? (
        <ul>
          {meds.map((m, i) => (
            <li key={m.id}>
              {i > 0 ? <Divider /> : null}
              <div className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="t-body min-w-0 break-words">
                  {m.name} · {reminderText(m, lang)}
                </span>
                <span className="flex gap-1">
                  {[true, false].map((on) => (
                    <Button
                      key={String(on)} variant="ghost" aria-pressed={m.reminderEnabled === on}
                      aria-label={`${m.name} · ${on ? t.on : t.off}`}
                      onClick={() => {
                        if (on && typeof m.reminderHour !== "number") {
                          closeSheet();
                          openSheet(<MedEditSheet lang={lang} med={m} enableReminder />);
                          return;
                        }
                        void write("setReminder", () => callNative("setReminder", { id: m.id, time: `${pad2(m.reminderHour ?? 0)}:${pad2(m.reminderMinute ?? 0)}`, enabled: on, kind: "dose" }), false);
                      }}
                      className={`t-meta min-h-11 min-w-11 rounded-full border px-3 ${m.reminderEnabled === on ? "border-aeri-teal bg-aeri-teal/10 text-aeri-teal" : "border-aeri-line text-aeri-slate"}`}
                    >{on ? t.on : t.off}</Button>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body">{t.notifEmpty}</p>
      )}
    </Sheet>
  );
}

function LanguageSheet({ lang }: { lang: Lang }) {
  const t = nc[lang];
  const n = useNative();
  const { closeSheet } = useAeri();
  return (
    <Sheet title={t.lang} onClose={closeSheet} closeLabel={t.close}>
      <ChoiceGroup
        label={t.lang}
        value={lang}
        onChange={(v: Lang) => {
          closeSheet();
          n.setLang(v);
        }}
        options={[
          { value: "en", label: "English" },
          { value: "zh", label: "简体中文" },
        ]}
      />
    </Sheet>
  );
}

export function NativeMore({ variant, lang, hideLanguage = false }: Props & { hideLanguage?: boolean }) {
  const t = nc[lang];
  const n = useNative();
  const { openSheet } = useAeri();
  const write = useWrite();
  const msg = (title: string, body: string[]) => () => openSheet(<MsgSheet lang={lang} title={title} body={body} />);
  const reminders = n.snapshot.medications.filter((m) => m.reminderEnabled === true).length;

  const groups = [
    {
      title: lang === "zh" ? "数据" : "Data",
      rows: [
        { Icon: IconHeartLine, t: t.health, s: `${t.healthSub(n.snapshot.healthAuthorized)} · ${fmtLocal(n.snapshot.generatedAt, lang)}`, go: () => openSheet(<HealthSourceSheet lang={lang} />) },
        { Icon: IconAir, t: t.envRow, s: t.unavailable, go: msg(t.envRow, [t.envOff]) },
        { Icon: IconTrends, t: t.askRow, s: t.unavailable, go: msg(t.askRow, [t.unavailable]) },
        { Icon: IconLog, t: t.exportRow, s: t.unavailable, go: msg(t.exportRow, [t.unavailable]) },
      ],
    },
    {
      title: lang === "zh" ? "应用" : "App",
      rows: [
        ...(!hideLanguage ? [{ Icon: IconSun, t: t.lang, s: lang === "zh" ? "简体中文" : "English", go: () => openSheet(<LanguageSheet lang={lang} />) }] : []),
        { Icon: IconDrop, t: t.notif, s: t.notifSub(reminders), go: () => openSheet(<RemindersSheet lang={lang} />) },
        { Icon: IconInfo, t: t.privacy, s: t.privacyBody[0] ?? "", go: msg(t.privacy, t.privacyBody) },
        {
          Icon: IconMore,
          t: t.deleteAll,
          s: t.deleteAllSub,
          go: () =>
            openSheet(<ConfirmSheet lang={lang} body={t.deleteAllBody} cta={t.deleteAllCta} onConfirm={() => write("deleteAll", () => callNative("deleteAll", { confirm: true }))} />),
        },
        { Icon: IconToday, t: t.about, s: t.aboutSub, go: msg(t.about, [t.aboutSub]) },
      ],
    },
  ];

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
