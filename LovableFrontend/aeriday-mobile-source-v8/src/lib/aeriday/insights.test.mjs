import { test, expect } from 'bun:test';
import { callNative } from './nativeBridge.ts';
import { confirmedPeakPercent, insightsSchema, seriesSchema, sourceOptionSchema, sourceChoiceAllowed, sourceIsAmbiguous, visibleReferenceBand, safetySentence } from './insights.ts';
function bridge(run) { global.window = { webkit: { messageHandlers: { aeriBridge: { postMessage(request) { run(request); } } } } }; }
test('actual medication use posts only saveMedicationUse, never decrements inventory', async () => {
  const calls = []; bridge((r) => { calls.push(r); window.__aeriBridgeReceive({ v: 1, id: r.id, ok: true, result: { id: 'use-1' } }); });
  await callNative('saveMedicationUse', { date: '2026-10-18T18:01:00Z', medicationName: 'Trial inhaler', amount: 2, unit: 'puff', purpose: 'unknown', regimen: 'unknown', preExercise: 'unknown' });
  expect(calls.map((r) => r.method)).toEqual(['saveMedicationUse']); expect(calls[0].params.amount).toBe(2); expect(calls[0].params).not.toHaveProperty('remainingDoses'); delete global.window;
});
test('unknown symptom values are preserved distinctly from none and no', async () => {
  let params; bridge((r) => { params = r.params; window.__aeriBridgeReceive({ v: 1, id: r.id, ok: true, result: { id: 's' } }); });
  await callNative('saveSymptomCheckIn', { date: '2026-10-18T18:01:00Z', cough: 'unknown', wheeze: 'none', chestTightness: 'unknown', breathlessness: 'unknown', respiratoryNightWaking: 'unknown', activityLimitation: 'no', context: '' });
  expect(params.cough).toBe('unknown'); expect(params.wheeze).toBe('none'); expect(params.respiratoryNightWaking).toBe('unknown'); expect(params.activityLimitation).toBe('no'); delete global.window;
});
test('peak-flow percentage requires clinician confirmation and best', () => {
  const p = { date: '2026-10-18T18:01:00Z', value: 300, unit: 'L/min', device: '', personalBest: 500, personalBestConfirmedByClinician: false };
  expect(confirmedPeakPercent(p)).toBeNull(); expect(confirmedPeakPercent({ ...p, personalBestConfirmedByClinician: true })).toBe(60); expect(confirmedPeakPercent({ ...p, personalBest: undefined, personalBestConfirmedByClinician: true })).toBeNull();
});
test('getInsights reserves a 60-second local history timeout', async () => {
  let timeout; const original = global.setTimeout;
  global.setTimeout = (fn, ms) => { timeout = ms; return original(fn, 1); };
  bridge(() => {});
  try { await expect(callNative('getInsights', {})).rejects.toMatchObject({ code: 'timeout' }); expect(timeout).toBe(60000); } finally { global.setTimeout = original; delete global.window; }
});
test('malformed insights fail visibly rather than using synthetic values', async () => {
  bridge((r) => window.__aeriBridgeReceive({ v: 1, id: r.id, ok: true, result: { findings: [] } }));
  await expect(callNative('getInsights', {})).rejects.toMatchObject({ code: 'invalid_response' }); delete global.window;
});
test('experimental contract accepts explicit empty records and no baseline', () => {
  const x = { schemaVersion: 1, generatedAt: '2026-10-18T18:01:00Z', isDemo: true, enabled: true, experimental: true, historyState: 'building', ruleVersion: 'fixture-1', sourceOptions: [], findings: [], series: [], records: { symptomCheckIns: [], medicationUseEvents: [], peakFlowEntries: [] }, context: { reportedRespiratoryChange: false, reportedSymptomsPresent: true, changeAssessment: 'notEstablished', current7: { reportingDays: 2, expectedDays: 7, perItemKnownCounts: { cough: 2 }, loggedMedicationCounts: { relief: 1 } }, prior7: { reportingDays: 0, expectedDays: 7, perItemKnownCounts: {}, loggedMedicationCounts: {} }, summary: '' }, evidence: [], summary: '' };
  expect(insightsSchema.parse(x).findings).toEqual([]); expect(insightsSchema.safeParse({ ...x, experimental: false }).success).toBe(false);
  expect(insightsSchema.parse(x).context.reportedRespiratoryChange).toBe(false); expect(insightsSchema.parse(x).context.reportedSymptomsPresent).toBe(true); expect(insightsSchema.parse(x).context.changeAssessment).toBe('notEstablished');
});

test('source IDs are allowlisted by returned options; null is automatic and multiple sources stay ambiguous', () => {
 const option = sourceOptionSchema.parse({metricId:'rr', selectedSourceId:null,sources:['watch','phone']});
 expect(sourceChoiceAllowed(option,'watch')).toBe(true); expect(sourceChoiceAllowed(option,'invented')).toBe(false);expect(sourceChoiceAllowed(option,null)).toBe(true);
 expect(sourceIsAmbiguous(option)).toBe(true); expect(sourceIsAmbiguous({...option,selectedSourceId:'watch'})).toBe(false);
 expect(sourceOptionSchema.safeParse({...option,selectedSourceId:'invented'}).success).toBe(false);
});
test('Swift reference preserves MAD/freeze/version and never invents a band from the median', () => {
 const reference={median:15,mad:1,referenceStart:'2026-09-01T00:00:00Z',referenceEnd:'2026-09-30T00:00:00Z',validDays:24,frozenAt:null,ruleVersion:'r1'};
 const series={metricId:'rr',unit:'breaths/min',sourceId:'watch',points:[],baseline:15,reference};
 const parsed=seriesSchema.parse(series);expect(parsed.reference).toEqual(reference);expect(parsed.referenceBand).toBeUndefined();
 expect(seriesSchema.parse({...series,referenceBand:{lower:13,upper:17}}).referenceBand).toEqual({lower:13,upper:17});
 expect(seriesSchema.safeParse({...series,referenceBand:{lower:17,upper:13}}).success).toBe(false);expect(seriesSchema.parse({...series,reference:null}).reference).toBeNull();
});
test('preferred source write reconciles returned choice after success and after a partial write', async () => {
 const {writeAndRefresh}=await import('./nativeOperations.ts');let selected=null;const calls=[];
 bridge(r=>{calls.push(r.method);if(r.method==='setPreferredSource')selected=r.params.sourceId;window.__aeriBridgeReceive({v:1,id:r.id,ok:true,result:{ok:true}});});
 await writeAndRefresh(()=>callNative('setPreferredSource',{metricId:'rr',sourceId:'watch'}),async()=>{expect(selected).toBe('watch');calls.push('readback');});expect(calls).toEqual(['setPreferredSource','readback']);
 await expect(writeAndRefresh(async()=>{await callNative('setPreferredSource',{metricId:'rr',sourceId:null});throw new Error('committed');},async()=>{expect(selected).toBeNull();calls.push('readback');})).rejects.toThrow('committed');expect(calls.slice(-2)).toEqual(['setPreferredSource','readback']);delete global.window;
});
test('reviewBaseline requires confirm true and posts the unchanged v1 envelope', async () => {
 const calls=[];bridge(r=>{calls.push(r);window.__aeriBridgeReceive({v:1,id:r.id,ok:true,result:{ok:true}});});
 await expect(callNative('reviewBaseline',{metricId:'rr',confirm:false})).rejects.toMatchObject({code:'invalid_record'});expect(calls).toHaveLength(0);
 await callNative('reviewBaseline',{metricId:'rr',confirm:true});expect(calls[0]).toMatchObject({v:1,method:'reviewBaseline',params:{metricId:'rr',confirm:true}});delete global.window;
});
test('reviewReason hides only the supplied band, including an empty review reason', () => {
 const reference={median:15,mad:1,referenceStart:'2026-09-01T00:00:00Z',referenceEnd:'2026-09-30T00:00:00Z',validDays:24,frozenAt:null,ruleVersion:'r1'};
 const series={metricId:'rr',unit:'breaths/min',sourceId:'watch',points:[],baseline:15,reference,referenceBand:{lower:13,upper:17}};
 for(const reviewReason of ['Deleted reference input',''])expect(visibleReferenceBand(seriesSchema.parse({...series,reference:{...reference,reviewReason}}))).toBeNull();
 expect(visibleReferenceBand(seriesSchema.parse({...series,reference:{...reference,reviewReason:null}}))).toEqual({lower:13,upper:17});expect(visibleReferenceBand(seriesSchema.parse(series))).toEqual({lower:13,upper:17});
});
test('reference review reconciles getInsights after success and a committed error without raw-record writes', async () => {
 const {writeAndRefresh}=await import('./nativeOperations.ts');const calls=[];
 bridge(r=>{calls.push(r.method);window.__aeriBridgeReceive({v:1,id:r.id,ok:true,result:{ok:true}});});
 const refresh=async()=>{calls.push('getInsights');};
 await writeAndRefresh(()=>callNative('reviewBaseline',{metricId:'rr',confirm:true}),refresh);
 await expect(writeAndRefresh(async()=>{await callNative('reviewBaseline',{metricId:'rr',confirm:true});throw new Error('committed');},refresh)).rejects.toThrow('committed');
 expect(calls).toEqual(['reviewBaseline','getInsights','reviewBaseline','getInsights']);delete global.window;
});
