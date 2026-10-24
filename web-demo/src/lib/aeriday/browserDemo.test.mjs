import { test, expect } from 'bun:test';
import { seedDemo, demoDays, DEMO_START, DEMO_TODAY, DEMO_ZONE, demoISO, environment, mutateDemo, demoInsights, demoReport, demoSeries, parseDemoStore } from './browserDemo.ts';
test('judges timeline has exactly 35 Cambridge New York days and varying coherent environment', () => {
  expect(demoDays).toHaveLength(35); expect(demoDays[0]).toBe('2026-09-20'); expect(demoDays.at(-1)).toBe('2026-10-24'); expect(DEMO_ZONE).toBe('America/New_York');
  expect(environment(DEMO_START).aqi).not.toBe(environment(DEMO_TODAY).aqi); expect(environment(DEMO_TODAY).generatedAt).toBe(demoInsights(seedDemo()).generatedAt);
});
test('record add/edit/delete selects explicitly simulated example and never mutates inventory', () => {
  let s = seedDemo(); const inventory = structuredClone(s.medications);
  const r = {date:demoISO(s.day,'10:00'),cough:'none',wheeze:'none',chestTightness:'unknown',breathlessness:'none',respiratoryNightWaking:'unknown',activityLimitation:'no',context:'Fictional test'};
  const added = mutateDemo(s,'saveSymptomCheckIn',r); s=added.store; expect(demoInsights(s).findings[0].state).toBe('noSustainedChangeDetected');
  s=mutateDemo(s,'saveSymptomCheckIn',{...r,id:added.result.id,cough:'mild'}).store; expect(demoInsights(s).findings[0].state).toBe('sustainedPersonalDeviation');
  s=mutateDemo(s,'saveMedicationUse',{date:demoISO(s.day),medicationName:'Albuterol inhaler',purpose:'relief',regimen:'saba',amount:2,unit:'puff',preExercise:'unknown'}).store; expect(s.medications).toEqual(inventory);
  s=mutateDemo(s,'deleteSymptomCheckIn',{id:added.result.id}).store; expect(s.symptoms.some(x=>x.id===added.result.id)).toBe(false);
});
test('report ranges notes questions and counts read from edited synthetic records with omitted percent without confirmed best', () => {
  let s=seedDemo(); s=mutateDemo(s,'saveMedicationUse',{date:demoISO('2026-10-23'),medicationName:'Albuterol inhaler',purpose:'relief',regimen:'saba',amount:2,unit:'puff',preExercise:'unknown'}).store;
  const report=demoReport(s,{range:{kind:'custom',start:demoISO('2026-10-22','00:00'),end:demoISO('2026-10-24','00:00'),includeToday:true},selectedNoteIds:['note-walk','note-question'],patientQuestions:['Could we review technique?']});
  expect(report.reportingCoverage.expectedDays).toBe(3); expect(report.range.completedDays).toBe(2); expect(report.range.includesPartialToday).toBe(true); expect(report.selectedNotes.map(x=>x.id)).toEqual(['note-walk']); expect(report.patientQuestions).toEqual(['Could we review technique?']); expect(report.medicationLogs[0].totalAmount).toBe(4); expect(report.peakFlow.percentOfConfirmedBestRange).toBeNull();
  const defaultReport=demoReport(s,{range:{kind:'last7'}}); expect(defaultReport.range.lastInclusiveDay).toBe(demoISO('2026-10-23','00:00')); expect(defaultReport.selectedNotes).toEqual([]);
});
test('35-day fixture never invents earlier values and missing-data comparisons remain unavailable',()=>{
  const s={...seedDemo(),example:'gaps'}; expect(demoInsights(s).findings[0].state).toBe('insufficientData'); expect(demoSeries(s,'rr',90).points).toHaveLength(90); expect(demoSeries(s,'rr',90).points.slice(0,55).every(p=>p.value===null)).toBe(true); expect(demoSeries(s,'rr',7).reference).toBeNull();
});
test('versioned browser storage roundtrip and 35-day write bounds',()=>{
  const s=seedDemo(); expect(parseDemoStore(JSON.stringify(s))).toEqual(s);
  expect(()=>mutateDemo(s,'saveNote',{date:demoISO('2026-09-19'),note:'outside'})).toThrow(); expect(()=>demoReport(s,{range:{kind:'custom',start:demoISO('2026-09-19','00:00'),end:demoISO('2026-10-24','00:00')}})).toThrow();
});
test('preset ranges contain 7 or 30 days including partial today and clip to the timeline start',()=>{
  const s=seedDemo();
  expect(demoReport(s,{range:{kind:'last7',includeToday:true}}).reportingCoverage.expectedDays).toBe(7);
  expect(demoReport(s,{range:{kind:'last30',includeToday:true}}).reportingCoverage.expectedDays).toBe(30);
  expect(demoReport({...s,day:'2026-09-20'},{range:{kind:'last7',includeToday:true}}).reportingCoverage.expectedDays).toBe(1);
  expect(()=>mutateDemo(s,'saveNote',{date:demoISO(s.day,'20:00'),note:'future'})).toThrow();
});