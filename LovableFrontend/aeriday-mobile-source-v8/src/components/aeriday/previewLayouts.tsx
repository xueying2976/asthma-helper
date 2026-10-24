import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** The preview's open dashboard sections, reused by both data modes. */
export function DashboardBlock({ title, meta, info, children }: { title: string; meta?: string; info?: ReactNode; children: ReactNode }) {
  return <section className="border-t border-aeri-line pt-3.5"><div className="flex items-center gap-1"><h3 className="t-cap text-aeri-slate">{title}</h3>{info}{meta ? <span className="t-meta ml-auto shrink-0 text-aeri-slate">{meta}</span> : null}</div><div className="mt-2">{children}</div></section>;
}
export function AirflowMotif() {
  return <svg viewBox="0 0 200 80" aria-hidden="true" className="pointer-events-none absolute -top-3 right-0 h-16 w-44 text-aeri-blue opacity-[0.12]" fill="none"><path d="M4 22c34-14 62 10 96 0 18-5 30-14 46-10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 42c38-12 66 12 100 2 16-5 28-12 44-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M28 62c32-10 58 8 88 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
export function RecentChangesLayout({ title, badge, date, children, onView, viewLabel }: { title: string; badge: string; date: string; children: ReactNode; onView: () => void; viewLabel: string }) {
  return <section aria-label={title} className="rounded-2xl border-l-2 border-aeri-blue/50 bg-aeri-surface px-3.5 py-3"><div className="flex flex-wrap items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-aeri-blue/60" /><h2 className="t-body font-semibold">{title}</h2><span className="t-cap rounded-full border border-aeri-line px-2 py-0.5 text-aeri-slate">{badge}</span></div><p className="t-meta text-aeri-slate">{date}</p>{children}<Button variant="ghost" onClick={onView} className="t-meta mt-1 h-auto min-h-11 px-0 font-medium text-aeri-ink underline underline-offset-4">{viewLabel} →</Button></section>;
}
export function MetricChartLayout({ header, value, status, children }: { header: ReactNode; value: ReactNode; status: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl bg-aeri-surface px-3.5 py-3"><div className="flex flex-wrap items-center justify-between gap-2">{header}</div><p className="t-title font-semibold">{value}</p><div className="mb-3">{status}</div>{children}</section>;
}
export function HistorySection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="t-cap border-b border-aeri-line py-2 text-aeri-slate">{title}</h2>{children}</section>;
}