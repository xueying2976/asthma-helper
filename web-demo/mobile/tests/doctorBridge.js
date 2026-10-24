// Test-only synthetic doctor report. Never imported by the app.
window.__reportCase='normal';window.__exportCase='normal';window.__reportCount=0;
window.__snapshot.notes=[{id:'selected-1',date:'2026-10-18T12:00:00Z',note:'Synthetic selected note'},{id:'unselected-2',date:'2026-10-18T12:00:00Z',note:'Synthetic private unselected note'}];
const originalPost=window.webkit.messageHandlers.aeriBridge.postMessage;
window.webkit.messageHandlers.aeriBridge.postMessage=function(r){
 if(!['getDoctorSummary','exportDoctorSummary'].includes(r.method))return originalPost(r);
 window.__calls.push(r);
 setTimeout(()=>{
  const reply=(result)=>window.__aeriBridgeReceive({v:1,id:r.id,ok:true,result});
  const fail=(code)=>window.__aeriBridgeReceive({v:1,id:r.id,ok:false,error:{code,message:'Synthetic report test error'}});
  if(r.method==='exportDoctorSummary') {if(window.__exportCase==='stale'){window.__exportCase='normal';return fail('report_stale');}if(window.__exportCase==='cancel')return fail('export_cancelled');if(window.__exportCase==='error')return fail('export_failed');return reply({ok:true,format:'pdf'});}
  if(window.__reportCase==='error')return fail('report_read_failed');
  const empty=window.__reportCase==='empty';
  const summary={schemaVersion:1,generatedAt:'2026-10-24T21:25:00Z',range:{start:'2026-10-17T04:00:00Z',endExclusive:'2026-10-24T04:00:00Z',completedDays:7,includesPartialToday:r.params.range.includeToday||false,timeZoneIdentifier:'America/New_York',firstInclusiveDay:'2026-10-17T04:00:00Z',lastInclusiveDay:'2026-10-23T04:00:00Z'},timeZone:'America/New_York',isDemo:true,recordRevision:'synthetic-revision-'+(++window.__reportCount),reportingCoverage:{expectedDays:7,knownSymptomDays:empty?0:2,missingWearableDays:empty?7:3},symptoms:empty?[]:[{field:'cough',knownDays:2,positiveDays:1,unansweredDays:5}],medicationLogs:empty?[]:[{label:'Synthetic actual use',medicationName:'Trial inhaler 100 micrograms',regimen:'unknown',purpose:'relief',eventCount:2,loggedDays:1,totalAmount:3,unit:'puff'}],peakFlow:{validReadingCount:0,unit:'L/min'},wearableContext:empty?[]:[{metricID:'rr',unit:'breaths/min',usableDays:4,missingDays:3,sources:['Synthetic watch','Synthetic phone'],observedMin:14,observedMax:18,incompatibleSources:true}],personalChanges:empty?[]:[{metricID:'rr',state:'baselineReviewNeeded',referenceValidDays:24,recentValidDays:3,observedDifference:3,unit:'breaths/min',ruleVersion:'synthetic-rule-1'}],personalChangesOmittedReason:empty?'Synthetic insufficient data':null,selectedNotes:window.__snapshot.notes.filter(n=>(r.params.selectedNoteIds||[]).includes(n.id)).map(n=>({id:n.id,date:n.date,text:n.note})),patientQuestions:r.params.patientQuestions||[],limitations:['Synthetic interface fixture only. Unknown is not no. No diagnosis or dose advice.']};
  reply({summary,token:'synthetic-token-'+window.__reportCount});
 },window.__reportCase==='loading'?500:20);
};