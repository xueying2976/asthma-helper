import { doctorSummarySchema } from "./doctorSummary.mjs";
import { insightsSchema } from "./insights.mjs";
let fail = 0;
function check(name, fn){ try{ fn(); console.log("PASS", name);}catch(e){ fail++; console.log("FAIL", name, "-", (e.message||e).toString().slice(0,200)); } }
const summary = {
  schemaVersion:1, generatedAt:"2026-10-24T12:00:00Z",
  range:{start:"2026-10-17T00:00:00Z",endExclusive:"2026-10-24T00:00:00Z",completedDays:7,includesPartialToday:false,timeZoneIdentifier:"UTC",firstInclusiveDay:"2026-10-17T00:00:00Z",lastInclusiveDay:"2026-10-23T00:00:00Z"},
  timeZone:"UTC", isDemo:true, recordRevision:"abc123",
  reportingCoverage:{expectedDays:7,knownSymptomDays:2,missingWearableDays:7},
  symptoms:[{field:"cough",knownDays:2,positiveDays:1,unansweredDays:5}],
  medicationLogs:[{label:"Synthetic A",medicationName:"Synthetic A",regimen:"unknown",purpose:"unknown",eventCount:3,loggedDays:2,totalAmount:5,unit:"puff"}],
  peakFlow:{validReadingCount:1,minValue:400,maxValue:400,unit:"L/min",percentOfConfirmedBestRange:[80,80]},
  wearableContext:[{metricID:"rr",unit:"count/min",usableDays:2,missingDays:5,sources:["WatchA"],observedMin:16,observedMax:18,incompatibleSources:false}],
  personalChanges:[{metricID:"rr",state:"singleDayChange",referenceStart:"2026-09-20T00:00:00Z",referenceEnd:"2026-10-17T00:00:00Z",referenceValidDays:21,recentValidDays:2,observedDifference:4,unit:"count/min",ruleVersion:"personal-change-1.0.0-experimental"}],
  personalChangesOmittedReason:null,
  selectedNotes:[{id:"11111111-1111-1111-1111-111111111111",date:"2026-10-20T12:00:00Z",text:"Synthetic note"}],
  patientQuestions:["Should I adjust anything?"], limitations:["DEMO: all values are synthetic test data, not a real health record."],
};
check("doctorSummary full", ()=>doctorSummarySchema.parse(summary));
check("doctorSummary empty/nulls", ()=>doctorSummarySchema.parse({...summary,symptoms:[],medicationLogs:[],wearableContext:[],personalChanges:[],selectedNotes:[],patientQuestions:[],peakFlow:{validReadingCount:0,minValue:null,maxValue:null,unit:"L/min",percentOfConfirmedBestRange:null},reportingCoverage:{expectedDays:7,knownSymptomDays:0,missingWearableDays:7}}));
check("doctorSummary mixed-unit null", ()=>doctorSummarySchema.parse({...summary,medicationLogs:[{label:"Mix",medicationName:"Mix",regimen:"unknown",purpose:"unknown",eventCount:2,loggedDays:2,totalAmount:null,unit:null}]}));
const insights = {
  schemaVersion:1, generatedAt:"2026-10-24T12:00:00Z", isDemo:true, enabled:true, experimental:true,
  historyState:"sampleAvailable", failedMetricIds:[], ruleVersion:"personal-change-1.0.0-experimental",
  findings:[{id:"rr.singleDayChange",metricId:"rr",state:"singleDayChange",title:"t",observation:"o",interpretation:"i",alternatives:"a",limitations:"l",baseline:15,current:19,delta:4,unit:"count/min",referenceValidDays:21,recentValidDays:2,durationDays:1,evidenceIds:["R1"],sourceId:"WatchA"}],
  sourceOptions:[{metricId:"rr",selectedSourceId:null,sources:["WatchA","WatchB"]}],
  series:[{metricId:"rr",unit:"count/min",sourceId:"WatchA",points:[{date:"2026-10-20T00:00:00Z",value:16,quality:"usable"},{date:"2026-10-21T00:00:00Z",value:null,quality:"missing"}],baseline:15,reference:null,referenceBand:null}],
  records:{symptomCheckIns:[],medicationUseEvents:[],peakFlowEntries:[]},
  context:{reportedRespiratoryChange:false,reportedSymptomsPresent:true,changeAssessment:"notEstablished",current7:{reportingDays:2,expectedDays:7,perItemKnownCounts:{cough:2,wheeze:0},loggedMedicationCounts:{"unknown/unknown":3}},prior7:{reportingDays:0,expectedDays:7,perItemKnownCounts:{},loggedMedicationCounts:{}},summary:"Check-ins cover 2 of 7 days."},
  evidence:[{id:"R1",title:"t",url:"https://example.org",limitations:"l"}],
  summary:"Experimental personal comparisons.",
};
check("insights full + v7 context transform", ()=>insightsSchema.parse(insights));
check("insights reference+band", ()=>insightsSchema.parse({...insights,series:[{...insights.series[0],reference:{median:15,mad:1.2,referenceStart:"2026-09-20T00:00:00Z",referenceEnd:"2026-10-17T00:00:00Z",validDays:21,frozenAt:null,ruleVersion:"v1",reviewReason:null},referenceBand:{lower:10,upper:20}}]}));
if(fail>0){ console.log("\nFAILURES="+fail); process.exit(1);} console.log("\nALL WIRE-CONTRACT CHECKS PASSED");
