import { doctorSummarySchema } from "./doctorSummary.mjs";
import { readFileSync } from "node:fs";
const json = JSON.parse(readFileSync(process.argv[2], "utf8"));
const r = doctorSummarySchema.safeParse(json);
if (!r.success) { console.log("FAIL real Swift JSON:"); console.log(JSON.stringify(r.error.issues, null, 2).slice(0, 1500)); process.exit(1); }
console.log("PASS: real Swift JSONEncoder output validates against v7 doctorSummarySchema");
console.log("fields:", Object.keys(r.data).join(", "));
console.log("peakFlow.percentOfConfirmedBestRange =", JSON.stringify(r.data.peakFlow.percentOfConfirmedBestRange));
console.log("medicationLogs[0].unit =", JSON.stringify(r.data.medicationLogs[0]?.unit), " totalAmount =", JSON.stringify(r.data.medicationLogs[0]?.totalAmount));
