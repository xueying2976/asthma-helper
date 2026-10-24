import { RecentChangesLayout, MetricChartLayout, HistorySection } from "./previewLayouts";
import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { useBrowserDemo, useDataCall } from './BrowserDemoProvider';
import { BrowserEnvironment, browserSamples } from './BrowserDemoScreens';
import { demoStamp } from '@/lib/aeriday/browserDemo';
import { metricIds, metricNames, stateNames, safetySentence, sourceIsAmbiguous, sourceChoiceAllowed, visibleReferenceBand, type SourceOption, type Finding, type InsightMetric, type MetricSeries } from '@/lib/aeriday/insights';
import { fmtLocal } from '@/lib/aeriday/nativeCopy';
import { useAeri } from './state';
import { useInsights } from './InsightsProvider';
import { Card, Divider, Panel } from './ui';
import { ActionRow, ChoiceGroup, Sheet } from './kit';
import { RecordEditor, recordNames, recordSummary, type RecordKind } from './InsightRecords';
import { IconHeartLine, IconInfo, IconLog, IconBreath, IconTrends } from './icons';
const actionClass = 't-body h-auto min-h-11 w-full rounded-2xl border border-aeri-line px-4 py-3 text-aeri-ink';
function Experimental() { const demo = useBrowserDemo(); return <p className="t-cap font-semibold text-aeri-slate">{demo ? 'Experimental · Simulated Swift-engine example' : 'Experimental · Personal Change Insights'}</p>; }
export function InsightsStatus() {
  const { status, error, notice, reload } = useInsights();
  return <>
    {notice ? <p role="status" aria-live="polite" className="t-meta text-aeri-ink">{notice}</p> : null}
    {status === 'loading' ? <p role="status" className="t-body">Reading on-device history…</p> : null}
    {status === 'error' ? <div role="alert" className="space-y-2"><p className="t-body">Could not read insights. Personal data has not been replaced with demo data.</p><p className="t-meta text-aeri-slate">{error === 'timeout' ? 'Local history took longer than 60 seconds.' : `Read error: ${error}`}</p><Button variant="ghost" className={actionClass} onClick={() => void reload().catch(() => {})}>Retry insights</Button></div> : null}
  </>;
}
function Coverage({ finding }: { finding: Finding }) {
  const { data } = useInsights();
  if (sourceIsAmbiguous(data?.sourceOptions.find((o) => o.metricId === finding.metricId))) return <p className="t-meta text-aeri-slate">Multiple sources · Choose a source before comparing.</p>;
  return <div className="t-meta space-y-1 text-aeri-slate"><p>{stateNames[finding.state]} · {finding.durationDays} days</p><p>Reference: {finding.referenceValidDays} valid days · Recent: {finding.recentValidDays} valid days</p><p>Source: {finding.sourceId ?? 'Not supplied'}</p><p>Personal historical reference: {finding.baseline === null ? 'Not available' : `${finding.baseline} ${finding.unit}`}</p></div>;
}
export function EvidenceSheet({ ids }: { ids?: string[] }) {
  const { closeSheet } = useAeri(); const { data } = useInsights();
  const evidence = data?.evidence.filter((e) => !ids || ids.includes(e.id)) ?? [];
  const [copyState, setCopyState] = useState<string | null>(null);
  return <Sheet title="Evidence" onClose={closeSheet} closeLabel="Close"><Experimental /><p className="t-meta text-aeri-slate">Rule version: {data?.ruleVersion ?? 'Unavailable'}</p>
    {evidence.length ? evidence.map((e) => <div key={e.id} className="space-y-2 border-b border-aeri-line pb-4"><h3 className="t-body font-semibold">{e.title}</h3><p className="t-body">{e.limitations}</p><p className="t-meta break-all text-aeri-slate">{e.url}</p><Button variant="ghost" className={actionClass} onClick={async () => { try { await navigator.clipboard.writeText(e.url); setCopyState('Citation URL copied.'); } catch { setCopyState('Copy is unavailable. The full citation URL is shown above.'); } }}>Copy citation URL</Button></div>) : <p className="t-body">No evidence supplied for this finding.</p>}
    {copyState ? <p role="status" className="t-meta">{copyState}</p> : null}
  </Sheet>;
}
export function FindingSheet({ finding }: { finding: Finding }) {
  const { closeSheet, openSheet } = useAeri(); const demo = useBrowserDemo(); const { data } = useInsights();
  // Resolve from read-back rather than retaining a stale finding after a write.
  const current = data?.findings.find((f) => f.id === finding.id);
  const ambiguous = sourceIsAmbiguous(data?.sourceOptions.find((o) => o.metricId === finding.metricId));
  return <Sheet title={current?.title ?? 'Finding unavailable'} onClose={closeSheet} closeLabel="Close">
    <Experimental />
    {current && !ambiguous ? <><p className="t-meta text-aeri-slate">{demo ? demoStamp(data?.generatedAt ?? '') : fmtLocal(data?.generatedAt ?? '', 'en')} · Rule {data?.ruleVersion}</p>
      <h3 className="t-body font-semibold">Observed fact</h3><p className="t-body">{current.observation}</p>
      <h3 className="t-body font-semibold">Personal comparison</h3><Coverage finding={current} /><p className="t-body">Current: {current.current ?? 'Unavailable'} {current.unit} · Supplied difference: {current.delta ?? 'Unavailable'} {current.unit}</p>
      <h3 className="t-body font-semibold">Possible meaning and alternatives</h3><p className="t-body">{current.interpretation}</p><p className="t-body">{current.alternatives}</p>
      <h3 className="t-body font-semibold">Limitations</h3><p className="t-body">{current.limitations}</p><p className="t-meta text-aeri-slate">No detected change does not mean it is safe to wait.</p>
      <Button variant="ghost" className={actionClass} onClick={() => openSheet(<EvidenceSheet ids={current.evidenceIds} />)}>View evidence</Button></> : ambiguous ? <p className="t-body">Multiple sources · Choose a source in More. Personal comparison is unavailable.</p> : <InsightsStatus />}
    <p className="t-body">{safetySentence}</p>
  </Sheet>;
}
export function FindingsList({ limit }: { limit?: number }) {
  const demo = useBrowserDemo();
  const { data, status } = useInsights(); const { openSheet } = useAeri();
  if (status !== 'ready' || !data) return null;
  if (!data.enabled) return <p className="t-body">Analysis is off. Manage it in More.</p>;
  return <>
    <p className="t-body">{data.summary || 'No summary supplied.'}</p><p className="t-meta text-aeri-slate">History: {data.historyState} · {demo ? demoStamp(data.generatedAt) : fmtLocal(data.generatedAt, 'en')}</p>
    {data.findings.length ? data.findings.slice(0, limit).map((f) => sourceIsAmbiguous(data.sourceOptions.find((o) => o.metricId === f.metricId)) ? <p key={f.id} className="t-body">{metricNames[f.metricId]}: Multiple sources · Choose a source in More.</p> : <Card key={f.id} variant="B" className="border-l-2 border-aeri-blue py-3"><ActionRow Icon={IconHeartLine} title={f.title} subtitle={f.observation} onClick={() => openSheet(<FindingSheet finding={f} />)} /><p className="t-title font-semibold">{f.current ?? '—'} {f.unit}</p><Coverage finding={f} /></Card>) : <p className="t-body">No findings supplied. This does not mean it is safe to wait.</p>}
    <p className="t-body">{data.context.summary}</p><p className="t-meta text-aeri-slate">Symptoms reported: {data.context.reportedSymptomsPresent ? 'Yes' : 'No'} · Change assessment: Not established</p><ContextCoverage />
    <p className="t-meta text-aeri-slate">No detected change does not mean it is safe to wait.</p>
  </>;
}
export function InsightsToday() {
  const { openSheet } = useAeri();
  return <><Experimental /><InsightsStatus /><h2 className="t-title font-semibold">Identify changes</h2><FindingsList limit={3} /><Button variant="ghost" className={actionClass} onClick={() => openSheet(<RecordEditor kind="symptom" />)}>Respiratory check-in</Button><p className="t-body">{safetySentence}</p></>;
}
function ContextCoverage() {
  const { data } = useInsights();
  if (!data) return null;
  return <details><summary className="t-meta min-h-11 py-3">Reporting coverage</summary>{(['current7', 'prior7'] as const).map((key) => <div key={key} className="t-meta space-y-1 text-aeri-slate"><p>{key === 'current7' ? 'Current 7 days' : 'Prior 7 days'}: {data.context[key].reportingDays}/{data.context[key].expectedDays} reporting days</p>{Object.entries(data.context[key].perItemKnownCounts).map(([item,count]) => <p key={item}>{item}: {count} known</p>)}{Object.entries(data.context[key].loggedMedicationCounts).map(([item,count]) => <p key={item}>{item}: {count} logged medication entries</p>)}</div>)}</details>;
}
function ReferenceDetails({ series }: { series: MetricSeries }) {
  const demo = useBrowserDemo();
  const stamp = (iso: string) => demo ? demoStamp(iso) : fmtLocal(iso, 'en');
  const callNative = useDataCall();
  const r = series.reference;
  const band = visibleReferenceBand(series);
  const { write, status } = useInsights();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const rebuild = async () => {
    if (busy || status !== 'ready') return;
    setBusy(true);
    try { await write(() => callNative('reviewBaseline', { metricId: series.metricId, confirm: true })); }
    finally { setBusy(false); setConfirm(false); }
  };
  return <div className="t-meta space-y-1 text-aeri-slate"><p>Personal historical reference (median): {r ? `${r.median} ${series.unit}` : 'Not available'}</p>{r ? <><p>MAD: {r.mad} {series.unit} · {r.validDays} valid days</p><p>{stamp(r.referenceStart)} – {stamp(r.referenceEnd)}</p><p>Frozen: {r.frozenAt ? stamp(r.frozenAt) : 'Not frozen'} · Rule {r.ruleVersion}</p></> : null}{band ? <p>Experimental historical reference band: {band.lower}–{band.upper} {series.unit}. Statistical comparison only, not a healthy or clinical range.</p> : null}
    {r?.reviewReason !== undefined && r.reviewReason !== null ? <p>Reference needs review: {r.reviewReason || 'Review requested by this iPhone.'}</p> : null}
    <p>Rebuilding resets this experimental personal reference. It does not confirm health or change raw records.</p>
    {demo ? <p>The reference is fixed for this presentation example.</p> : <Button variant="ghost" className={`${actionClass} hover:bg-aeri-surface hover:text-aeri-ink`} disabled={busy || status !== 'ready'} onClick={() => confirm ? void rebuild() : setConfirm(true)}>{busy ? 'Rebuilding…' : confirm ? 'Confirm rebuild personal reference' : 'Rebuild personal reference'}</Button>}
    {confirm && !busy ? <Button variant="ghost" className={`${actionClass} hover:bg-aeri-surface hover:text-aeri-ink`} onClick={() => setConfirm(false)}>Cancel rebuild</Button> : null}
  </div>;
}
function DailySeries({ series, compact = false }: { series: MetricSeries; compact?: boolean }) {
  const demo = useBrowserDemo();
  const band = visibleReferenceBand(series);
  const rows = [...series.points].sort((a, b) => a.date.localeCompare(b.date));
  const valid = rows.filter((p) => p.value !== null);
  return <>
    <p className="t-meta text-aeri-slate">Source: {series.sourceId ?? 'Not supplied'} · {valid.length}/{rows.length} supplied points with values</p>
    {compact ? <p className="t-meta text-aeri-slate">Personal historical reference: {series.reference ? `${series.reference.median} ${series.unit}` : "Not available"}</p> : <ReferenceDetails series={series} />}
    {valid.length ? <div className="h-52 w-full min-w-0" role="img" aria-label={`${metricNames[series.metricId]} daily series in ${series.unit}. Gaps are not connected.`}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}><CartesianGrid stroke="var(--aeri-line)" vertical={false} /><XAxis dataKey="date" tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(demo ? {timeZone:'America/New_York'} : {}) })} tick={{ fill: 'var(--aeri-slate)', fontSize: 11 }} minTickGap={24} /><YAxis width={42} tick={{ fill: 'var(--aeri-slate)', fontSize: 11 }} domain={['auto', 'auto']} /><Tooltip contentStyle={{ background: 'var(--aeri-surface)', borderColor: 'var(--aeri-line)', color: 'var(--aeri-ink)' }} labelFormatter={(v) => demo ? demoStamp(String(v)) : fmtLocal(String(v), 'en')} />{band ? <ReferenceArea y1={band.lower} y2={band.upper} fill="var(--aeri-line)" fillOpacity={0.5} /> : null}{series.reference !== null ? <ReferenceLine y={series.reference.median} stroke="var(--aeri-slate)" strokeDasharray="4 4" /> : null}<Line dataKey="value" stroke="var(--aeri-blue)" strokeWidth={2} connectNulls={false} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <p className="t-body">No daily values available.</p>}
    <details className="min-w-0"><summary className="t-body min-h-11 py-3">Daily values and quality · {series.unit}</summary><div className="space-y-2">{rows.map((p, index) => <p key={`${p.date}-${index}`} className="t-meta break-words">{demo ? demoStamp(p.date) : fmtLocal(p.date, 'en')} · {p.value === null ? 'Missing' : `${p.value} ${series.unit}`} · {p.quality}</p>)}</div></details>
  </>;
}
export function SeriesSheet({ metricId }: { metricId: InsightMetric }) {
  const callNative = useDataCall();
  const { closeSheet } = useAeri(); const { data } = useInsights();
  const ambiguous = sourceIsAmbiguous(data?.sourceOptions.find((o) => o.metricId === metricId));
  const [days, setDays] = useState<7 | 30 | 90>(7); const [series, setSeries] = useState<MetricSeries | null>(null); const [status, setStatus] = useState('loading'); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setSeries(null); setStatus('loading');
    if (ambiguous) return () => { active = false; };
    callNative('getMetricSeries', { metricId, days }).then((result) => { if (!active) return; if (result.metricId !== metricId) throw new Error('Wrong metric'); setSeries(result); setStatus('ready'); }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [metricId, days, retry, ambiguous, data?.generatedAt, data?.sourceOptions.find((o) => o.metricId === metricId)?.selectedSourceId]);
  return <Sheet title={metricNames[metricId]} onClose={closeSheet} closeLabel="Close"><Experimental /><ChoiceGroup label="Period" value={String(days)} options={['7', '30', '90'].map((v) => ({ value: v, label: `${v} days` }))} onChange={(v) => setDays(v === '90' ? 90 : v === '30' ? 30 : 7)} />
    {ambiguous ? <p className="t-body">Multiple sources · Choose a source in More. No sources are merged.</p> : status === 'loading' ? <p role="status" className="t-body">Reading daily series…</p> : status === 'error' ? <><p role="alert" className="t-body">Could not read this series. No demo values are shown.</p><Button variant="ghost" className={actionClass} onClick={() => setRetry((n) => n + 1)}>Retry series</Button></> : series ? <DailySeries series={series} /> : null}
    {!ambiguous && data?.findings.filter((f) => f.metricId === metricId).map((f) => <div key={f.id} className="space-y-2"><p className="t-body">{f.observation}</p><Coverage finding={f} /><p className="t-meta text-aeri-slate">{f.limitations}</p></div>)}
  </Sheet>;
}
export function NativeRecentChanges() {
  const demo = useBrowserDemo();
  const { data, status } = useInsights(); const { native, openSheet, showTrends } = useAeri();
  if (demo && data) return <RecentChangesLayout title="Recent changes" badge="Experimental" date={demoStamp(data.generatedAt)} onView={() => showTrends('rr')} viewLabel="View changes"><p className="t-meta mt-1 text-aeri-slate">Simulated Swift-engine example</p><ul className="mt-1">{data.findings.slice(0,3).map((f) => <li key={f.id}><Button variant="ghost" className="t-meta h-auto min-h-11 w-full flex-wrap justify-between gap-x-2 whitespace-normal px-0 text-left" onClick={() => openSheet(<FindingSheet finding={f} />)}><span>{metricNames[f.metricId]}</span><span><strong>{f.current ?? '—'} {f.unit}</strong><span className="text-aeri-slate"> · reference {f.baseline ?? 'unavailable'}</span></span></Button></li>)}</ul>{data.findings.length === 1 ? <p className="t-meta text-aeri-slate">{stateNames[data.findings[0]?.state ?? 'insufficientData']}. No change does not establish safety.</p> : null}</RecentChangesLayout>;
  return <RecentChangesLayout title="Recent changes" badge="Experimental" date={data ? demo ? demoStamp(data.generatedAt) : fmtLocal(data.generatedAt,'en') : native ? fmtLocal(native.snapshot.generatedAt,'en') : ''} onView={() => showTrends('rr')} viewLabel="View changes">
    <InsightsStatus />
    {status === 'ready' && data ? <><p className="t-meta mt-2 text-aeri-slate">{data.summary || 'No summary supplied.'}</p><p className="t-meta text-aeri-slate">History: {data.historyState}</p>{!data.enabled ? <p className="t-meta">Analysis is off. Manage it in More.</p> : data.findings.length ? <ul className="t-meta mt-2 space-y-1">{data.findings.slice(0,3).map((f) => <li key={f.id}>{sourceIsAmbiguous(data.sourceOptions.find((o) => o.metricId === f.metricId)) ? <p>{metricNames[f.metricId]}: Multiple sources · Choose a source in More.</p> : <><Button variant="ghost" className="t-meta flex h-auto min-h-11 w-full flex-wrap justify-between gap-x-3 whitespace-normal px-0 text-left" onClick={() => openSheet(<FindingSheet finding={f} />)}><span>{f.title}</span><span className="font-semibold tabular-nums">{f.current ?? '—'} {f.unit}<span className="font-normal text-aeri-slate"> · reference {f.baseline ?? 'unavailable'}</span></span></Button><p className="t-meta text-aeri-slate">{stateNames[f.state]}</p></>}</li>)}</ul> : <p className="t-meta mt-2">No findings supplied. This does not mean it is safe to wait.</p>}</> : null}
  </RecentChangesLayout>;
}
function InlineNativeSeries({ metricId, days }: { metricId: InsightMetric; days: 7 | 30 | 90 }) {
  const callNative = useDataCall();
  const { data, status } = useInsights(); const [series,setSeries] = useState<MetricSeries | null>(null); const [state,setState] = useState('loading'); const [retry,setRetry] = useState(0);
  const ambiguous = sourceIsAmbiguous(data?.sourceOptions.find((o) => o.metricId === metricId));
  useEffect(() => { let active = true; setSeries(null); setState('loading'); if (status !== 'ready' || !data?.enabled || ambiguous) return () => { active = false; }; callNative('getMetricSeries',{metricId,days}).then((r) => { if (!active) return; if(r.metricId !== metricId) throw new Error('Wrong metric'); setSeries(r);setState('ready'); }).catch(() => { if(active)setState('error'); }); return () => { active = false; }; },[metricId,days,retry,status,data,ambiguous]);
  if(ambiguous) return <p className="t-body">Multiple sources · Choose a source in More. No sources are merged.</p>;
  if(status !== 'ready') return <p className="t-meta text-aeri-slate">Daily analysis awaits insights.</p>;
  if(!data?.enabled) return <p className="t-meta">Analysis is off.</p>;
  return state === 'loading' ? <p role="status" className="t-meta">Reading daily series…</p> : state === 'error' ? <><p role="alert" className="t-meta">Could not read this series. No demo values are shown.</p><Button variant="ghost" className={actionClass} onClick={() => setRetry((n) => n+1)}>Retry series</Button></> : series ? <DailySeries series={series} compact /> : null;
}
export function InsightsTrends() {
  const demo = useBrowserDemo();
  const { openSheet, selectedMetric, setSelectedMetric, native } = useAeri(); const { data, reload } = useInsights(); const [days,setDays] = useState<7 | 30 | 90>(7);
  const selected = metricIds.find((id) => id === selectedMetric) ?? 'rr'; const sample = (demo ? browserSamples(demo) : native?.snapshot.metrics)?.find((m) => m.id === selected); const f = data?.findings.find((v) => v.metricId === selected); const ambiguous = sourceIsAmbiguous(data?.sourceOptions.find((o) => o.metricId === selected));
  return <><NativeRecentChanges /><MetricChartLayout header={<><Button variant="ghost" className="t-body h-auto min-h-11 whitespace-normal px-0" onClick={() => openSheet(<SeriesSheet metricId={selected} />)}>{metricNames[selected]}</Button><ChoiceGroup label="Period" value={String(days)} options={['7','30','90'].map((v) => ({value:v,label:`${v} days`}))} onChange={(v) => setDays(v === '90' ? 90 : v === '30' ? 30 : 7)} /></>} value={<>{sample?.current ?? '—'} {sample?.unit ?? ''}</>} status={<><p className="t-meta text-aeri-slate">{ambiguous ? 'Multiple sources · Choose a source before comparing.' : f ? stateNames[f.state] : 'No comparison supplied'}</p><p className="t-meta text-aeri-slate">{sample?.source ?? 'Source not supplied'} · {sample?.sampledAt ? demo ? demoStamp(sample.sampledAt) : fmtLocal(sample.sampledAt,'en') : 'Sample time not supplied'}</p><p className="t-meta text-aeri-slate">{!demo && sample && 'semantics' in sample && sample.semantics === 'latestSample' ? selected === 'sleep' ? 'Latest asleep segment, not total nightly sleep.' : 'Latest sample, not a daily total.' : ''}</p></>}><InlineNativeSeries metricId={selected} days={days} /></MetricChartLayout>
    {([{title:'Sleep and overnight · Device data',ids:['rr','rhr','sleep','spo2']},{title:'Activity · Device data',ids:['steps','workout']}] as const).map((group) => <section key={group.title} className="px-1"><h3 className="t-cap border-b border-aeri-line py-3 text-aeri-slate">{group.title}</h3><ul className="divide-y divide-aeri-line">{group.ids.map((id) => {const m = (demo ? browserSamples(demo) : native?.snapshot.metrics)?.find((v) => v.id === id);return <li key={id}><ActionRow Icon={id === 'steps' || id === 'workout' ? IconTrends : IconBreath} title={metricNames[id]} subtitle={`${m?.source ?? 'Source not supplied'}${m?.sampledAt ? ` · ${demo ? demoStamp(m.sampledAt) : fmtLocal(m.sampledAt,'en')}` : ''}`} trailing={<span className="t-meta max-w-28 whitespace-normal text-right tabular-nums">{m?.current ?? '—'} {m?.unit ?? ''}</span>} onClick={() => {setSelectedMetric(id);openSheet(<SeriesSheet metricId={id} />);}} /></li>;})}</ul></section>)}
    <HistorySection title="Your entries"><ActionRow Icon={IconLog} title="Respiratory check-in" onClick={() => openSheet(<RecordEditor kind="symptom" />)} /><ActionRow Icon={IconLog} title="Peak flow" onClick={() => openSheet(<RecordEditor kind="peak" />)} /></HistorySection><HistorySection title="Environment"><BrowserEnvironment />{!demo ? <p className="t-meta py-3 text-aeri-slate">Unavailable · No connected source</p> : null}</HistorySection><Button variant="ghost" className={actionClass} onClick={() => void reload().catch(() => {})}>Refresh insights</Button></>;
}
export function StructuredHistory() {
  const demo = useBrowserDemo();
  const { openSheet } = useAeri(); const { data, status } = useInsights();
  const groups = data ? [{ kind: 'symptom' as const, rows: data.records.symptomCheckIns }, { kind: 'use' as const, rows: data.records.medicationUseEvents }, { kind: 'peak' as const, rows: data.records.peakFlowEntries }] : [];
  return <><Experimental /><InsightsStatus /><HistorySection title="Your records"><div className="space-y-2">{(['symptom', 'use', 'peak'] as RecordKind[]).map((kind) => <Button key={kind} variant="ghost" className={actionClass} onClick={() => openSheet(<RecordEditor kind={kind} />)}>Add {recordNames[kind].toLowerCase()}</Button>)}</div>
    {status === 'ready' ? groups.map(({ kind, rows }) => <div key={kind} className="mt-4"><h3 className="t-body font-semibold">{recordNames[kind]}</h3>{rows.length ? [...rows].sort((a, b) => b.date.localeCompare(a.date)).map((record) => <ActionRow key={record.id} Icon={IconLog} title={recordSummary(kind, record)} subtitle={`${demo ? demoStamp(record.date) : fmtLocal(record.date, 'en')} · User entered`} onClick={() => openSheet(<RecordEditor kind={kind} record={record} />)} />) : <p className="t-meta text-aeri-slate">No records yet.</p>}<Divider /></div>) : null}
  </HistorySection><h2 className="t-title font-semibold">Change findings</h2><FindingsList /></>;
}
export function ActualUseEntry() {
  const demo = useBrowserDemo();
  const { openSheet } = useAeri(); const { data } = useInsights();
  return <Panel variant="B" title="Actual medication use"><InsightsStatus /><p className="t-meta text-aeri-slate">Separate from remaining inventory and reminders.</p><ActionRow Icon={IconLog} title="Record actual use" onClick={() => openSheet(<RecordEditor kind="use" />)} />{data?.records.medicationUseEvents.slice(-3).reverse().map((r) => <ActionRow key={r.id} title={recordSummary('use', r)} subtitle={demo ? demoStamp(r.date) : fmtLocal(r.date, 'en')} onClick={() => openSheet(<RecordEditor kind="use" record={r} />)} />)}</Panel>;
}
function SourceSelector({ option }: { option: SourceOption }) {
  const callNative = useDataCall();
  const { write } = useInsights(); const [busy, setBusy] = useState(false);
  // Index keys cannot collide with native IDs; only the returned IDs are submitted.
  const options = [{ value: 'automatic', label: 'Automatic' }, ...option.sources.map((id,index) => ({ value: String(index), label: id }))];
  return <div className="space-y-2"><ChoiceGroup label={`${metricNames[option.metricId]} source`} value={option.selectedSourceId === null ? 'automatic' : String(option.sources.indexOf(option.selectedSourceId))} options={options} onChange={async (key) => {
    const id = key === 'automatic' ? null : option.sources[Number(key)];
    if (busy || id === undefined || !sourceChoiceAllowed(option,id)) return;
    setBusy(true); try { await write(() => callNative('setPreferredSource', { metricId: option.metricId, sourceId: id })); } finally { setBusy(false); }
  }} /><p className="t-meta text-aeri-slate">{busy ? 'Updating source…' : sourceIsAmbiguous(option) ? 'Multiple sources · Choose a source. No sources are merged.' : option.sources.length === 0 ? 'No sources available.' : `Selected: ${option.selectedSourceId ?? 'Automatic'}`}</p></div>;
}
export function AnalysisSettings() {
  const callNative = useDataCall();
  const { data, status, write } = useInsights(); const { openSheet } = useAeri(); const [busy, setBusy] = useState(false);
  return <Panel variant="B" title="Personal Change Insights"><Experimental /><InsightsStatus />{data && status === 'ready' ? <><ChoiceGroup label="Analysis" value={data.enabled ? 'on' : 'off'} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} onChange={async (v) => { if (busy) return; setBusy(true); await write(() => callNative('setAnalysisEnabled', { enabled: v === 'on' })); setBusy(false); }} /><p className="t-meta text-aeri-slate">{busy ? 'Updating…' : `History: ${data.historyState} · Rule ${data.ruleVersion}`}</p><h3 className="t-body font-semibold">Sources</h3>{data.sourceOptions.map((option) => <SourceSelector key={option.metricId} option={option} />)}<h3 className="t-body font-semibold">Reference status</h3>{data.series.map((series) => <div key={series.metricId}><p className="t-body">{metricNames[series.metricId]}</p>{sourceIsAmbiguous(data.sourceOptions.find((o) => o.metricId === series.metricId)) ? <p className="t-meta text-aeri-slate">Choose a source before comparing.</p> : <ReferenceDetails series={series} />}</div>)}{data.findings.map((f) => <div key={f.id} className="mt-2"><p className="t-body">{metricNames[f.metricId]}</p><Coverage finding={f} /></div>)}</> : null}<ActionRow Icon={IconInfo} title="Evidence and citations" onClick={() => openSheet(<EvidenceSheet />)} /><p className="t-meta text-aeri-slate">Experimental interpretations run on this iPhone. No attack predictions, disease scores or dose recommendations.</p></Panel>;
}
