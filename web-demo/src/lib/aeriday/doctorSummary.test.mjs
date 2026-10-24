import { test, expect } from 'bun:test';
import { doctorSummarySchema, customRange, inclusiveDays, rangeError, shiftedDay } from './doctorSummary.ts';
import { BRIDGE_METHODS, callNative } from './nativeBridge.ts';
const summary={schemaVersion:1,generatedAt:'2026-10-24T21:25:00Z',range:{start:'2026-10-17T04:00:00Z',endExclusive:'2026-10-24T04:00:00Z',completedDays:7,includesPartialToday:false,timeZoneIdentifier:'America/New_York',firstInclusiveDay:'2026-10-17T04:00:00Z',lastInclusiveDay:'2026-10-23T04:00:00Z'},timeZone:'America/New_York',isDemo:true,recordRevision:'r1',reportingCoverage:{expectedDays:7,knownSymptomDays:0,missingWearableDays:7},symptoms:[],medicationLogs:[{label:'Use',regimen:'unknown',purpose:'unknown',eventCount:0,loggedDays:0}],peakFlow:{validReadingCount:0,unit:'L/min'},wearableContext:[{metricID:'rr',unit:'breaths/min',usableDays:0,missingDays:7,sources:[],incompatibleSources:false}],personalChanges:[{metricID:'rr',state:'baselineReviewNeeded',referenceValidDays:0,recentValidDays:0,unit:'breaths/min',ruleVersion:'v1'}],selectedNotes:[],patientQuestions:[],limitations:[]};
test('doctor DTO accepts omitted and null Swift optionals without inventing numbers',()=>{
 const x=doctorSummarySchema.parse(summary);expect(x.peakFlow.minValue).toBeUndefined();expect(x.personalChanges[0].referenceStart).toBeUndefined();expect(x.medicationLogs[0].totalAmount).toBeUndefined();
 expect(doctorSummarySchema.parse({...summary,personalChangesOmittedReason:null,peakFlow:{...summary.peakFlow,minValue:null,maxValue:null,percentOfConfirmedBestRange:null}}).peakFlow.minValue).toBeNull();
});
test('uppercase metricID is required and exact native text and amounts survive parsing',()=>{
 expect(doctorSummarySchema.safeParse({...summary,wearableContext:[{...summary.wearableContext[0],metricID:undefined,metricId:'rr'}]}).success).toBe(false);
 const row={...summary.medicationLogs[0],medicationName:'Drug 100 micrograms',totalAmount:2.5,unit:'puff'};expect(doctorSummarySchema.parse({...summary,medicationLogs:[row]}).medicationLogs[0]).toEqual(row);
});
test('custom inclusive calendar range is limited to 90 days and defaults exclude today',()=>{
 expect(inclusiveDays('2026-07-26','2026-10-23')).toBe(90);expect(rangeError('2026-07-26','2026-10-23','2026-10-24',false)).toBeNull();expect(rangeError('2026-07-25','2026-10-23','2026-10-24',false)).not.toBeNull();expect(rangeError('2026-10-24','2026-10-24','2026-10-24',false)).not.toBeNull();expect(rangeError('2026-10-24','2026-10-24','2026-10-24',true)).toBeNull();expect(shiftedDay('2026-10-24',-1)).toBe('2026-10-23');
});
test('calendar count across daylight saving uses dates, not elapsed local hours',()=>{expect(inclusiveDays('2026-10-31','2026-11-02')).toBe(3);});
test('doctor request uses ISO start/end and lowercase selectedNoteIds; keeps v6 methods',async()=>{
 const calls=[];global.window={webkit:{messageHandlers:{aeriBridge:{postMessage(r){calls.push(r);window.__aeriBridgeReceive({v:1,id:r.id,ok:true,result:{summary,token:'t'}});}}}}};
 await callNative('getDoctorSummary',{range:customRange('2026-10-17','2026-10-23',false),selectedNoteIds:[],patientQuestions:[]});expect(calls[0].params.selectedNoteIds).toEqual([]);expect(calls[0].params.range.start).toMatch(/T.*Z$/);expect(calls[0].params.range.end).toMatch(/T.*Z$/);
 for(const method of ['getInsights','getMetricSeries','setAnalysisEnabled','setPreferredSource','reviewBaseline','saveSymptomCheckIn','saveMedicationUse','savePeakFlow'])expect(BRIDGE_METHODS.includes(method)).toBe(true);delete global.window;
});
test('stale/canceled PDF errors are rejected and malformed export cannot claim success',async()=>{
 for(const code of ['report_stale','export_cancelled']){global.window={webkit:{messageHandlers:{aeriBridge:{postMessage(r){window.__aeriBridgeReceive({v:1,id:r.id,ok:false,error:{code,message:'test'}});}}}}};await expect(callNative('exportDoctorSummary',{token:'t',format:'pdf'})).rejects.toMatchObject({code});}
 global.window={webkit:{messageHandlers:{aeriBridge:{postMessage(r){window.__aeriBridgeReceive({v:1,id:r.id,ok:true,result:{ok:false,format:'pdf'}});}}}}};await expect(callNative('exportDoctorSummary',{token:'t',format:'pdf'})).rejects.toMatchObject({code:'invalid_response'});delete global.window;
});