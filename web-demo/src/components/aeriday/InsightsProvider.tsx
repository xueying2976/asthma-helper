import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BridgeError, callNative } from '@/lib/aeriday/nativeBridge';
import type { Insights } from '@/lib/aeriday/insights';
import { writeAndRefresh } from '@/lib/aeriday/nativeOperations';
import { useBrowserDemo } from './BrowserDemoProvider';
import { useAeri } from './state';
type InsightsContext = { data: Insights | null; status: 'loading' | 'ready' | 'error'; error: string | null; notice: string | null; reload: () => Promise<void>; write: (run: () => Promise<unknown>) => Promise<boolean> };
const Context = createContext<InsightsContext | null>(null);
export function useInsights() {
  const context = useContext(Context);
  if (!context) throw new Error('Insights need their provider');
  return context;
}
export function InsightsProvider({ children }: { children: ReactNode }) {
  const { native } = useAeri();
  const demo = useBrowserDemo();
  const [data, setData] = useState<Insights | null>(null);
  const [status, setStatus] = useState<InsightsContext['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setStatus('loading'); setError(null); setNotice(null);
    try {
      const result = await callNative('getInsights', {}, 60000);
      if (mounted.current && request === sequence.current) { setData(result); setStatus('ready'); }
    } catch (cause) {
      if (mounted.current && request === sequence.current) { setData(null); setError(cause instanceof BridgeError ? cause.code : 'read_failed'); setStatus('error'); }
      throw cause;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (native) void reload().catch(() => {});
    return () => { mounted.current = false; ++sequence.current; };
  }, [!!native, reload]);
  const write = async (run: () => Promise<unknown>) => {
    if (demo) { try { await run(); return true; } catch { return false; } }
    if (!native) return false;
    setNotice(null);
    try {
      await writeAndRefresh(run, async () => {
        // Read both stores even if one fails, so a partially committed operation is visible.
        const results = await Promise.allSettled([native.refresh(), reload()]);
        if (results.some((r) => r.status === 'rejected')) throw new Error('Read-back incomplete');
      });
      setNotice('Saved. Current records refreshed.');
      return true;
    } catch (cause) {
      const code = cause instanceof BridgeError ? cause.code : 'write_failed';
      setNotice(code === 'saved_refresh_failed' ? 'The change completed, but current data could not be read back. Retry before making another change.' : code === 'write_refresh_failed' ? 'The change may have saved. Read-back failed. Retry before making another change.' : 'Could not complete the change. Current records refreshed; check for a partial save before retrying.');
      return false;
    }
  };
  return <Context.Provider value={demo ? { data: demo.data, status: 'ready', error: null, notice: null, reload: async () => {}, write } : { data, status, error, notice, reload, write }}>{children}</Context.Provider>;
}
