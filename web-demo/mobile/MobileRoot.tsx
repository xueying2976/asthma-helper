import { useCallback, useEffect, useState } from "react";
import { AeriDayApp, type Tab } from "@/components/aeriday/AeriDayApp";
import type { Lang } from "@/lib/aeriday/copy";
import { setNativeMetrics } from "@/lib/aeriday/scenarios";
import { callNative, isNativeShell, type NativeSnapshot } from "@/lib/aeriday/nativeBridge";
import { fmtLocal, pad2 } from "@/lib/aeriday/nativeCopy";
import { nc } from "@/lib/aeriday/nativeCopy";
import { BridgeError } from "@/lib/aeriday/nativeBridge";
import { Button } from "@/components/ui/button";
import { trialLanguage } from "./trialPreferences";

function localDay(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

type Theme = "light" | "dark";
type Size = "std" | "lg";
const KEY = "aeriday.mobile.prefs";

function readPrefs(): { lang: Lang; theme: Theme; size: Size } {
  const sys: Theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const lang: Lang = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  if (isNativeShell()) return { lang: trialLanguage(true, lang), theme: sys, size: "std" };
  try {
    return { lang, theme: sys, size: "std", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { lang, theme: sys, size: "std" };
  }
}

const L = {
  en: { loading: "Loading…", failed: "Couldn't read data on this iPhone.", retry: "Try again", onDevice: "On this iPhone", demo: "Demo data", theme: "Theme", text: "Text" },
  zh: { loading: "正在加载…", failed: "无法读取本机数据。", retry: "重试", onDevice: "本机数据", demo: "示例数据", theme: "外观", text: "字号" },
};

export function MobileRoot() {
  const native = isNativeShell();
  const [prefs, setPrefs] = useState(readPrefs);
  const [tab, setTab] = useState<Tab>("today");
  const [state, setState] = useState<"loading" | "ready" | "error">(native ? "loading" : "ready");
  const [snapshot, setSnapshot] = useState<NativeSnapshot | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const t = L[prefs.lang];

  const apply = (s: NativeSnapshot) => {
    setNativeMetrics(s.metrics, localDay(s.generatedAt));
    setSnapshot(s);
  };
  /** Re-read the snapshot after a write; throws so callers can report failure. */
  const refresh = useCallback(async () => {
    apply(await callNative("getSnapshot", {}));
  }, []);
  const load = useCallback(() => {
    if (!native) return;
    setState("loading");
    callNative("getSnapshot", {})
      .then((s) => {
        apply(s);
        const language = s.language;
        if (language) setPrefs((p) => ({ ...p, lang: trialLanguage(native, language) }));
        setState("ready");
      })
      .catch(() => {
        setNativeMetrics(null);
        setState("error"); // never fall back to demo values in native mode
      });
  }, [native]);

  useEffect(load, [load]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => document.documentElement.style.setProperty("--aeri-mobile-visible-height", `${viewport.height}px`);
    update();
    viewport.addEventListener("resize", update);
    return () => { viewport.removeEventListener("resize", update); document.documentElement.style.removeProperty("--aeri-mobile-visible-height"); };
  }, []);
  useEffect(() => {
    if (!saveError) return;
    const id = setTimeout(() => setSaveError(null), 12000);
    return () => clearTimeout(id);
  }, [saveError]);
  useEffect(() => {
    if (!native) localStorage.setItem(KEY, JSON.stringify(prefs));
    document.documentElement.lang = prefs.lang === "zh" ? "zh-CN" : "en";
  }, [prefs, native]);

  const changeLanguage = async (lang: Lang) => {
    if (native) return; // English trial: do not mutate Swift language preferences.
    if (native) {
      try {
        await callNative("setLanguage", { lang });
      } catch {
        setSaveError("language_failed");
        return;
      }
    }
    setPrefs((p) => ({ ...p, lang }));
  };
  const set = <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) => {
    if (k === "lang") { void changeLanguage(v as Lang); return; }
    setPrefs((p) => ({ ...p, [k]: v }));
  };
  const notices = nc[prefs.lang];
  const errorText = saveError === "medicine_saved_reminder_failed" ? notices.partialSave
    : saveError === "partial_refresh_failed" ? notices.partialRefreshFailed
    : saveError === "saved_refresh_failed" ? notices.savedRefreshFailed
    : saveError === "write_refresh_failed" ? notices.refreshFailed
    : saveError === "language_failed" ? notices.languageFailed : notices.saveFailed;
  const pill = (active: boolean) =>
    "t-meta min-h-11 min-w-11 rounded-full px-3 " + (active ? "bg-aeri-teal text-aeri-teal-fg" : "text-aeri-slate");

  return (
    <div className={`aeri-mobile-shell ${prefs.theme === "dark" ? "aeri-dark" : "aeri-light"} ${prefs.size === "lg" ? "aeri-type-lg" : "aeri-type-std"}`}>
      <div className="flex shrink-0 items-center justify-end gap-1 bg-aeri-paper px-3 pt-1 text-aeri-ink">
        {!native ? <Button variant="ghost" className={pill(false)} onClick={() => set("lang", prefs.lang === "en" ? "zh" : "en")} aria-label="Language / 语言">
          <span lang={prefs.lang === "en" ? "zh-CN" : "en"}>{prefs.lang === "en" ? "中文" : "EN"}</span>
        </Button> : null}
        <Button variant="ghost" className={pill(false)} onClick={() => set("theme", prefs.theme === "light" ? "dark" : "light")} aria-label={t.theme}>
          {prefs.theme === "light" ? "☾" : "☀"}
        </Button>
        <Button variant="ghost" className={pill(prefs.size === "lg")} onClick={() => set("size", prefs.size === "std" ? "lg" : "std")} aria-label={t.text} aria-pressed={prefs.size === "lg"}>
          A<span className="text-[1.2em]">A</span>
        </Button>
      </div>
      {saveError ? (
        <div role="status" aria-live="polite" className="t-meta shrink-0 bg-aeri-mist px-4 py-3 text-left text-aeri-ink">{errorText}</div>
      ) : null}
      <div className="min-h-0 flex-1">
        {state === "ready" ? (
          <AeriDayApp
            key={prefs.lang}
            variant="B"
            nativeEnglishTrial={native}
            lang={prefs.lang}
            tab={tab}
            onTabChange={setTab}
            scenario="within"
             dataLabel={native ? snapshot?.isDemo === true ? "Demo data" : "Personal data" : t.demo}
            todayHeader={native && snapshot ? { title: "Asthma Helper", sub: `${prefs.lang === "zh" ? "同步于" : "Synced"} ${fmtLocal(snapshot.generatedAt, prefs.lang)}` } : undefined}
            native={
              native && snapshot
                 ? { snapshot, refresh, onError: (_method, error) => setSaveError(error instanceof BridgeError ? error.code : "write_failed"), setLang: (l) => set("lang", l) }
                : undefined
            }
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-aeri-paper px-6 text-center text-aeri-ink">
            <p className="t-body">{state === "loading" ? t.loading : t.failed}</p>
            {state === "error" ? (
              <button type="button" onClick={load} className="t-body min-h-11 rounded-full bg-aeri-teal px-5 text-aeri-teal-fg">
                {t.retry}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
