import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/aeriday/copy";
import type { Scenario } from "@/lib/aeriday/scenarios";
import { BridgeError, type NativeSnapshot } from "@/lib/aeriday/nativeBridge";

export type NativeLink = {
  snapshot: NativeSnapshot;
  refresh: () => Promise<void>;
  onError: (method: string, error: unknown) => void;
  setLang: (lang: Lang) => void;
};

export type Severity = "none" | "mild" | "moderate" | "marked";
export type Zone = "green" | "yellow" | "red" | null;

export type CheckIn = {
  savedAt: string;
  symptoms: Partial<Record<string, Severity>>;
  reliever: number;
  preExercise: boolean | null;
  pef: string;
  pefUnit: string;
  pefTime: string;
  exposures: string[];
  note: string;
};

type Ctx = {
  scenario: Scenario;
  selectedMetric: string;
  setSelectedMetric: (id: string) => void;
  showTrends: (id?: string) => void;
  entries: { id: string; value: number; date: string }[];
  addEntry: (entry: { id: string; value: number; date: string }) => void;
  lang: Lang;
  checkin: CheckIn | null;
  saveCheckin: (c: CheckIn) => void;
  /** Explicit user action: "nothing to note" today. Never inferred. */
  nothingToNote: string | null;
  markNothingToNote: (time: string) => void;
  zone: Zone;
  setZone: (z: Zone) => void;
  /** Locally logged reliever entries (synthetic, on-device only). */
  logs: { label: string; time: string }[];
  addLog: (label: string, time: string) => void;
  /** Reliever doses remaining, user-correctable. */
  relieverDoses: number;
  relieverConfirmed: boolean;
  correctReliever: (n: number) => void;
  openSheet: (node: ReactNode) => void;
  closeSheet: () => void;
  /** Set inside the iOS shell: snapshot + refresh; writes go to native on-device storage. */
  native: NativeLink | null;
};

const AeriCtx = createContext<Ctx | null>(null);

export function useAeri() {
  const v = useContext(AeriCtx);
  if (!v) throw new Error("useAeri must be used inside AeriProvider");
  return v;
}

export function AeriProvider({
  lang,
  scenario,
  onShowTrends,
  children,
  onSheetChange,
  native,
}: {
  lang: Lang;
  scenario: Scenario;
  onShowTrends: () => void;
  children: ReactNode;
  onSheetChange: (node: ReactNode) => void;
  /** Native mode: persist via aeriBridge; failures are reported, never hidden. */
  native?: NativeLink | undefined;
}) {
  const [checkin, setCheckin] = useState<CheckIn | null>(null);
  const [selectedMetric, setSelectedMetric] = useState("rr");
  const [entries, setEntries] = useState<{ id: string; value: number; date: string }[]>([]);
  const [nothingToNote, setNothing] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone>(null);
  const [logs, setLogs] = useState<{ label: string; time: string }[]>([]);
  const [relieverDoses, setRelieverDoses] = useState(12);
  const [relieverConfirmed, setRelieverConfirmed] = useState(false);

  const value: Ctx = {
    scenario,
    entries: native
      ? native.snapshot.notes.flatMap((n) =>
          n.metricId && typeof n.value === "number" ? [{ id: n.metricId, value: n.value, date: n.date }] : [],
        )
      : entries,
    addEntry: (entry) => {
      if (!native) return setEntries((previous) => [...previous, entry]);
      native.onError("saveNote", new BridgeError("numeric_not_supported", "Structured numeric storage is unavailable"));
    },
    native: native ?? null,
    selectedMetric,
    setSelectedMetric,
    showTrends: (id = "rr") => {
      setSelectedMetric(id);
      onSheetChange(null);
      onShowTrends();
    },
    lang,
    checkin,
    saveCheckin: (c) => {
      setCheckin(c);
      setNothing(null);
    },
    nothingToNote,
    markNothingToNote: setNothing,
    zone,
    setZone,
    logs,
    addLog: (label, time) => setLogs((l) => [{ label, time }, ...l]),

    relieverDoses,
    relieverConfirmed,
    correctReliever: (n) => {
      const apply = () => {
        setRelieverDoses(n);
        setRelieverConfirmed(true);
      };
      // Native medicines are edited on the native Medications screen with real IDs.
      if (!native) return apply();
      native.onError("saveMedication", new Error("unsupported_in_native"));
    },
    openSheet: (node) => onSheetChange(node),
    closeSheet: () => onSheetChange(null),
  };

  return <AeriCtx.Provider value={value}>{children}</AeriCtx.Provider>;
}
