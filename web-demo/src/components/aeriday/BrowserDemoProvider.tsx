import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_STORAGE_KEY, demoInsights, demoSeries, demoReport, mutateDemo, parseDemoStore, seedDemo, type DemoStore } from '@/lib/aeriday/browserDemo';
import { callNative, type BridgeMethod, type BridgeParams, type BridgeResults } from '@/lib/aeriday/nativeBridge';
type Demo = { store: DemoStore; data: ReturnType<typeof demoInsights>; storageNotice: string | null; reset: () => void; selectDay: (day: string) => void; selectExample: (example: DemoStore['example']) => void; call: typeof callNative };
const Context = createContext<Demo | null>(null);
export const useBrowserDemo = () => useContext(Context);
/** Never installed in MobileRoot; no fake WKWebView bridge or native-schema modifications. */
export function BrowserDemoProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState(seedDemo), [hydrated, setHydrated] = useState(false), [storageNotice, setNotice] = useState<string | null>(null);
  const current = useRef(store);
  useEffect(() => { try { const raw = localStorage.getItem(DEMO_STORAGE_KEY); if (raw) { const saved = parseDemoStore(raw); current.current = saved; setStore(saved); } } catch { setNotice('Saved example could not be restored. This session starts with fresh synthetic records.'); } setHydrated(true); }, []);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store)); } catch { setNotice('Browser storage is unavailable. Example edits last only for this session.'); } }, [store, hydrated]);
  const update = (next: DemoStore) => { current.current = next; setStore(next); };
  const call = async <M extends BridgeMethod,>(method: M, params: BridgeParams[M]): Promise<BridgeResults[M]> => {
    const s = current.current; let result: unknown;
    if (method === 'getInsights') result = demoInsights(s);
    else if (method === 'getMetricSeries') { const p = params as BridgeParams['getMetricSeries']; result = demoSeries(s, p.metricId, p.days); }
    else if (method === 'getDoctorSummary') result = { summary: demoReport(s, params as BridgeParams['getDoctorSummary']), token: `browser-${s.revision}` };
    else { const mutation = mutateDemo(s, method, params); update(mutation.store); result = mutation.result; }
    return result as BridgeResults[M];
  };
  const data = useMemo(() => demoInsights(store), [store]);
  return <Context.Provider value={{ store, data, call, storageNotice, reset: () => update(seedDemo()), selectDay: (day) => update({ ...current.current, day, revision: current.current.revision + 1 }), selectExample: (example) => update({ ...current.current, example, revision: current.current.revision + 1 }) }}>{children}</Context.Provider>;
}
export function useDataCall(): typeof callNative { const demo = useBrowserDemo(); return demo?.call ?? callNative; }