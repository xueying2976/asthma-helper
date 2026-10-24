# AeriDay iOS static bundle

## Current delivery: v7
See [V7 native integration guide](./V7.en-US.md) for the complete additive doctor-summary contract, source/offline archives, tests and local iOS limitations. All final v6 insights and native flows are retained. Doctor-summary PDF sharing is now available through the two native endpoints; the older generic export placeholder remains unavailable.

Reuses the existing `AeriDayApp` (variant **B**, the web default) and `src/styles.css` unchanged. The web prototype at `/` is unaffected.

## Build
```
bun install
bun run build:mobile     # = vite build --config ./mobile/vite.config.ts
```
Output: `dist-mobile/` (`index.html` + `assets/*.js|css|woff2` + `licenses/NotoSansSC-OFL.txt`, relative paths, no server, no network). Copy the folder into the Xcode target as a folder reference and load `index.html` with `WKWebView.loadFileURL(_:allowingReadAccessTo:)`.

## Modes
- **Browser:** no `aeriBridge` → the original synthetic demo, badge "Demo data", identical to the web workbench.
- **Native v6:** `getSnapshot` must succeed; failure shows Try again, never demo values. The five native tabs reuse v5 cards, rows, sheets, fonts and tokens. Insights and structured records are read separately from `getInsights`; Trends displays `getMetricSeries` daily history. Header: `snapshot.isDemo ? "Demo data" : "Personal data"`. Sync time remains static text.
- **Unconnected services** (air/pollen/weather, Ask AI, export) read "Not connected yet / Not available yet" — no sample values. Action-plan and emergency advice entries are removed from native Today, Medications and More; the browser demo and clinician text are untouched.
- **Writes:** successful and failed writes re-read the snapshot. A medicine saved before a failed reminder reports "Medicine saved. Reminder wasn’t updated. Check its current state." Read-back failures are reported separately, without claiming data was refreshed. Notices dismiss after 12 seconds. Retrying a partially saved new medicine reuses its returned ID, preventing duplicates. Scheduling remains two non-atomic Swift operations.
- **Language (v5):** the native iPhone trial always presents English, even with a Chinese device or snapshot preference. The header language button and More language selector are hidden. Startup and user controls never call `setLanguage` in this trial; Swift ordinary/UI-test preferences and the v1 schema are untouched. The browser workbench remains bilingual. **Theme/text:** session-only in native mode; nonpersistent WebKit storage can reset them after termination. No cross-launch persistence is promised.

## Protocol (v1)
JS → native: `aeriBridge.postMessage(request)`
```ts
{ v: 1, id: string, method: BridgeMethod, params: object }
```
Native → JS: `webView.evaluateJavaScript("window.__aeriBridgeReceive(\(json))")`
```ts
{ v: 1, id: string, ok: true, result: object }
{ v: 1, id: string, ok: false, error: { code: string, message: string } }
```
Timeout 15 s → `BridgeError("timeout")`. Unknown methods are rejected in JS before posting; native should also reject them.

| method | params | result |
|---|---|---|
| getSnapshot | `{}` | `{ isDemo: boolean, generatedAt, healthAuthorized, metrics: NativeMetric[], notes: NativeNote[], medications: NativeMedication[], language?: "en"|"zh" }` |
| requestHealthAuthorization | `{}` | `{ authorized }` (existing types only) |
| saveNote | `{ id?, date, note }` | `{ id }` |
| deleteNote | `{ id }` | `{ ok: true }` |
| saveMedication | `{ id?, name, unit?, remainingDoses?, confirmed?, reminderEnabled?: boolean, reminderHour?, reminderMinute? }` | `{ id }` (no id = create) |
| deleteMedication | `{ id }` | `{ ok: true }` |
| setReminder | `{ id, time "HH:mm", enabled, kind: "dose"\|"checkin"\|"refill" }` | `{ ok: true }` |
| deleteAll | `{ confirm: true }` | `{ ok: true }` |
| setLanguage | `{ lang: "en"\|"zh" }` | `{ ok: true }` |

`NativeMetric = { source?: string, sampledAt?: ISO8601, unit?: string, semantics?: "latestSample", id, current: number|null, band?: [lo, hi], status: "within"|"different"|"insufficient"|"changed", points: (number|null)[30] oldest→newest, freshness: "HH:mm"|"missing"|"stale"|"changed" }`. Metadata is displayed as supplied, not inferred from sync time. Missing source/time are explicitly unavailable. Ranges, if supplied, come from existing Swift code; without a band, no above/below/within-range claim is made. No new baseline maths. With `latestSample`, sleep is the latest asleep segment and steps the latest sample, never whole-night/day totals; supplied units override demo units. `points` remain native-supplied date-indexed values: the frontend does not aggregate samples or fabricate chart points.

Metric ids: rr, rhr, hrv, sleep (hours), interruptions, spo2, temperature, steps, activity, workout, symptoms, waking, reliever, controller, pef, aqi, pm25, pollen, outdoorTemp, humidity. Types: `src/lib/aeriday/nativeBridge.ts`.

`NativeNote = { id, date (ISO), note (free text), metricId?, value? }`
`NativeMedication = { id, name, unit?: "puff"|"tablet"|"capsule"|"item", remainingDoses?, confirmed?, reminderEnabled?: boolean, reminderHour?, reminderMinute? }`

## Where each method is called
| method | trigger |
|---|---|
| requestHealthAuthorization | More → Apple Health → Connect Apple Health (user tap only) |
| getSnapshot | launch, after every write, Apple Health → Refresh |
| saveMedication / deleteMedication | Medications: inventory add/edit/delete (confirmed); legacy Log 1 use removed in v6 |
| setReminder | enabled when a medicine is saved with a time; on/off in More → Medicine reminders |
| saveNote / deleteNote | History: free-text add, edit, delete (confirmed); numeric native writes are blocked |
| deleteAll | More → Delete all data (confirmed) |
| setLanguage | retained in the protocol; not called by the English native trial |

## v3 changes and verification
Changed: `mobile/MobileRoot.tsx`, `mobile/main.tsx`, `mobile/mobile.css`; `src/lib/aeriday/nativeBridge.ts`, `nativeCopy.ts`, `scenarios.ts`, new `nativeOperations.ts` and `nativeOperations.test.mjs`; `src/components/aeriday/NativeScreens.tsx`, `TrendsExperience.tsx`, `state.tsx`; paired mobile READMEs, `AGENTS.md`, `roadmap.md`. Shared visual primitives, web route, original global CSS and clinician-authored demo copy are unchanged.

- Reminder state uses `reminderEnabled` explicitly; absent field is “State unavailable” rather than inferred from time. On/Off controls have `aria-pressed` and selected styling. Off medicines remain listed; On opens medicine edit to enter a new time when Swift cleared it.
- (Superseded in v4) Chinese used the system font stack. HTML declares UTF-8; JS/CSS are UTF-8. No downloaded fonts or Google Fonts in the mobile entry; CSP blocks network connections.
- Native History offers only free-text notes. Optional numeric attachments are removed; native provider and entry sheet block structured numeric writes. Legacy optional read fields remain in the TypeScript protocol for compatibility, not as supported write fields.
- Tested with the offline static bundle and a simulated native bridge: startup Chinese without default-language writes, reminders On/Off/re-entry, partial save + read-back in both languages, free-text note save/read-back, sample source/time/unit and sleep-segment labels. 11 tests pass. The existing browser demo remains synthetic.

## v4 changes and verification
Changed: `mobile/mobile.css`, `mobile/index.html`, `mobile/vite.config.ts`; new `mobile/fonts/noto-sans-sc/` (90 woff2 subsets, `noto-sans-sc.css`, `OFL.txt`); paired READMEs, `AGENTS.md`, `roadmap.md`. Shared components, web route, `src/styles.css`, type sizes and v3 native behavior are unchanged.

- **Chinese font:** Noto Sans SC Variable 5.3.1 (official Fontsource package, SIL OFL 1.1) is bundled as local woff2 files and loaded with `@font-face` as family `AeriDay CJK`. Its `unicode-range` is limited to CJK and full-width characters, so Latin text, symbols and emoji keep the existing system font. It comes first in the stack for the shell, sheets, buttons, inputs and chart labels. No remote fonts, no `local()` lookup, no reliance on system fallback for Chinese. `font-display: block` avoids briefly showing boxes. All 513 CJK characters used in the app are covered; free-text notes are covered for common Simplified Chinese.
- **CSP:** adds `font-src 'self'`; `connect-src 'none'` remains.
- **Inputs:** mobile inputs, text areas and selects are at least 16px (larger when large text is on), so iOS does not zoom on focus and push Save under the keyboard. Labels and other text keep their sizes.
- **License:** `mobile/fonts/noto-sans-sc/OFL.txt` in the source; `dist-mobile/licenses/NotoSansSC-OFL.txt` in the offline bundle.
- **Verified:** built the offline bundle; ran Chromium with every system Chinese font hidden. A control line in the system font showed boxes; the app rendered Today, History, the note sheet and Trends (including chart labels) in correct Chinese, demo and simulated native. Inputs measured 16px. 11 existing tests pass.

## Remaining limitations
- The bundled font still needs a check in your Xcode WKWebView; Chromium tests can't prove WebKit behavior. Your shell must allow read access to the whole bundle folder (including `assets/*.woff2`); if it uses a custom URL scheme, serve `.woff2` as `font/woff2`. WKWebView loading, HealthKit results, store behavior and actual notification scheduling need local Xcode verification; browser tests do not establish these.
- Theme/text may reset on termination; this trial does not read or write Swift language preferences for presentation.
- Legacy note numeric attachments remain blocked. V6 dedicated structured-record methods require the matching Swift implementation; unavailable methods show errors, never silently drop fields.
- Date-indexed charts show only supplied points; latest samples may exist with no history points. No new daily/nightly aggregation.
- Environment, Ask AI and export remain unavailable; no new permissions, backend or analytics. All v6 interpretations and clinical reference logic belong to Swift on device, not the frontend. No low-stock threshold added. Nothing published.

## Deliverables
`aeriday-mobile-source-v6.zip` contains the complete clean web/mobile source, configs, lockfile, regression tests, font assets and license, excluding Git metadata, dependencies, generated output and private metadata. `aeriday-dist-mobile-v6.zip` contains `dist-mobile/`. Unzip source, install dependencies and build; replace the whole static folder in the existing Xcode shell.

## v5 English trial accessibility review
- Evidence refinement: the exported XCTest issue screenshot points to the static “Synced Oct 18 …” subtitle, a plain `p.t-meta`, not a button. Its `WebAccessibilityObjectWrapper` hit-area report may be an iOS audit false positive; this specific finding is not a confirmed undersized interactive target. The subtitle remains static and unchanged. Minimum hit dimensions apply to interactive controls, not every text node. The independently confirmed narrow header pills and real control bounding boxes remain fixed; Chromium checks do not establish that this XCTest report is resolved.
- Changes: `mobile/MobileRoot.tsx`, `mobile/mobile.css`, new `mobile/trialPreferences.ts` and its test; optional native-only flags in `AeriDayApp.tsx` and `NativeScreens.tsx`; contextual native medication stepper names in `kit.tsx`; mobile source scanning in `src/styles.css`; paired guides, `AGENTS.md`, `roadmap.md`. The browser route, dictionaries, clinical copy and bridge schema are unchanged.
- Mobile interactive boxes have a 44×44 CSS-pixel minimum, including theme/text pills, choices, metric controls and sheets. Icons retain their dimensions. Narrow tab spacing accommodates visible labels; long labels wrap rather than disappear. Native medication stepper names are “Decrease left” and “Increase left”. Inputs retain the 16px floor; long editable values scroll inside their fields rather than changing the design.
- Checks: 13 tests passed (11 existing plus native-English and browser-Chinese policy tests); `bun run build:mobile` produced `dist-mobile/`. Chromium exercised the built offline bundle with a simulated native bridge at 320×844 and 390×844, standard/light and large/dark. All five tabs, medicine add/edit/delete confirmation, reminder time entry, free-text note add/edit/delete confirmation, Apple Health, unavailable services, reminders, privacy, delete-all confirmation, About, metric details, 7/30 periods and sample-list/info sheets were checked for target dimensions, names and control overflow. Header/tab targets did not overlap. Startup with Chinese preferences remained English without language writes; a failed snapshot showed retry, never demo values. Medicine/reminder and note writes read back in the UI; partial reminder failure retained the medicine and showed the partial-save notice. No numeric note fields were sent. No runtime errors were observed.
- Accessibility Review shaped this audit. Screenshots were inspected for narrow large-text Today/Trends and sheet layouts; editable text may scroll, and content below the fold remains scrollable. This is not a full WCAG certification or an XCTest pass. Real WKWebView/XCTest hit testing, VoiceOver, focus/navigation behavior, iOS keyboard/zoom and actual HealthKit/store/notification behavior still require local Xcode/device checks. The supplied data in these browser checks was simulated, not real health data. No services, permissions, analytics, medical advice or publication were added.

## v6 Personal Change Insights — integration guide
This section supersedes v3/v5 factual-only scope notes. The user approved conservative asthma-related interpretations, **not** attack probabilities, severity scores, prescribing or dose advice. Swift supplies every observation, interpretation, alternative, limitation, reference and analysis number. The frontend does no clinical scoring or reference calculation. The experimental label is prominent; absence of a change is never presented as safe. The exact symptoms-first safety sentence is displayed on Today and in finding explanations. The browser workbench and clinician-authored demo text remain unchanged.

### Compatible bridge extension
Keep the existing `{v:1,id,method,params}` request and `{v:1,id,ok,result|error}` response envelope. Add these methods to the Swift allowlist. `getInsights` allows **60 seconds**, has separate loading/error/retry, and never falls back to synthetic data. Other new calls use the existing 15-second timeout. Swift must return every required field, including nulls and empty arrays; malformed insights/series are rejected visibly. Contract source: `src/lib/aeriday/insights.ts` and `nativeBridge.ts`.

| Method | Parameters | Result |
|---|---|---|
| getInsights | `{}` | `Insights` below |
| setAnalysisEnabled | `{enabled:boolean}` | `{ok:true}` |
| getMetricSeries | `{metricId,days:7|30|90}` | `MetricSeries` below |
| saveSymptomCheckIn | `SymptomCheckIn` below (id optional) | `{id}` |
| deleteSymptomCheckIn | `{id}` | `{ok:true}` |
| saveMedicationUse | `MedicationUse` below (id optional) | `{id}` |
| deleteMedicationUse | `{id}` | `{ok:true}` |
| savePeakFlow | `PeakFlow` below (id optional) | `{id}` |
| deletePeakFlow | `{id}` | `{ok:true}` |

```ts
// ISO timestamps must include Z or an explicit offset. IDs are native UUID strings.
type MetricId = 'rr'|'rhr'|'sleep'|'spo2'|'steps'|'workout';
type Answer = 'unknown'|'no'|'yes';
type Severity = 'unknown'|'none'|'mild'|'moderate'|'severe';
type SymptomCheckIn = {
  id?: string; date: string;
  cough: Severity; wheeze: Severity; chestTightness: Severity; breathlessness: Severity;
  respiratoryNightWaking: Answer; activityLimitation: Answer; context: string;
};
type MedicationUse = {
  id?: string; date: string; medicationID?: string; medicationName: string;
  purpose: 'unknown'|'maintenance'|'relief'; regimen:'unknown'|'saba'|'air'|'mart'|'other';
  amount: number; unit:'puff'|'tablet'|'capsule'|'item'; preExercise: Answer;
};
type PeakFlow = {
  id?: string; date:string; value:number; unit:'L/min'; device:string;
  personalBest?:number; personalBestConfirmedByClinician:boolean;
};
type MetricSeries = {
  metricId:MetricId; unit:string; sourceId:string|null;
  points:{date:string;value:number|null;quality:string}[]; baseline:number|null;
};
type Finding = {
  id:string; metricId:MetricId;
  state:'insufficientData'|'noSustainedChangeDetected'|'singleDayChange'|
    'sustainedPersonalDeviation'|'reportedRespiratoryChange'|'baselineReviewNeeded'|
    'contextOnly'|'indeterminate';
  title:string; observation:string; interpretation:string; alternatives:string; limitations:string;
  baseline:number|null; current:number|null; delta:number|null; unit:string;
  referenceValidDays:number; recentValidDays:number; durationDays:number;
  evidenceIds:string[]; sourceId:string|null;
};
type Insights = {
  schemaVersion:1; generatedAt:string; isDemo:boolean; enabled:boolean; experimental:true;
  historyState:string; ruleVersion:string; findings:Finding[]; series:MetricSeries[];
  records:{
    symptomCheckIns:(SymptomCheckIn & {id:string;updatedAt:string})[];
    medicationUseEvents:(MedicationUse & {id:string;updatedAt:string})[];
    peakFlowEntries:(PeakFlow & {id:string;updatedAt:string})[];
  };
  context:{reportedRespiratoryChange:boolean;summary:string};
  evidence:{id:string;title:string;url:string;limitations:string}[]; summary:string;
};
```

`respiratoryNightWaking` uses the same unknown/no/yes representation as activity limitation. Keep unknown distinct from none/no. Actual amount and PEF must be positive finite numbers; these are input validity rules, not treatment thresholds. Use records never call inventory writes; the ambiguous inventory-decrement action is removed. Inventory correction and reminders remain in medicine edit. PEF percent is simple display arithmetic only when the user records a clinician-confirmed best; there are no zones. Legacy notes stay free text.

### Screens and read-back
- Today: up to three supplied finding cards, source/reference/recent coverage, dated summary, respiratory entry and static safety sentence.
- Trends: all supplied findings and 7/30/90-day daily series. Nulls remain gaps, quality and dates are available in an expandable daily list. Swift must include null rows for absent days; the UI never resamples or inserts personal points. `baseline` is labelled personal historical reference (median), never healthy normal range. Source/quality changes and unavailable reference are retained.
- Explanation: observed fact, personal comparison, possible meaning plus alternatives, limitations; evidence IDs and rule version preserved. Offline evidence text and full URLs are visible. Copy requires an explicit user tap; clipboard failure leaves the full URL visible. No automatic navigation or evidence fetch.
- History: actionable symptom/use/PEF add/edit/delete (confirmed), existing notes, and change findings. Medications: actual-use records distinct from inventory. More: read-back analysis On/Off, reference coverage/status and evidence.
- Both snapshot and insights are re-read after successful **and failed** v6 writes, through `writeAndRefresh`. Either read-back failure is reported distinctly; a committed record retains its returned ID when available. A timeout/error without an ID may have committed: check the refreshed list before retrying to avoid duplicates. This is not an atomic multi-store transaction.
- Mobile inputs stay ≥16px and controls ≥44×44 CSS px. The shell follows `visualViewport.height` on keyboard resize; sheet body scrolls while Save stays in the footer. Real WKWebView keyboard behavior still needs local testing. Static sync text is not turned into a button; the earlier XCTest caveat remains.

### Verification and honest limits
- `bun test`: **19 passed**, including existing v5 rules and new actual-use/no-inventory-write, unknown/none distinction, confirmed-best percent, 60-second timeout, malformed response and experimental empty-history cases.
- `bun run build:mobile`: built `dist-mobile/` including local font files/license; no server required. The bundler reports a non-blocking large JS-chunk warning (charts are included).
- Chromium on the built bundle: synthetic bridge at 390×844 standard/light and 320×844 large/dark; five tabs, four-layer finding/evidence, 90-day chart/gaps, all three CRUD types with UI read-back, unknown defaults, confirmed-best percent, preserved inventory=120 after actual use, medicine reminder edit, analysis toggle, partial committed record/error read-back, empty findings, insights error/retry, 44px targets and no page overflow. Screenshots visually inspected. No runtime errors in these runs. Original web workbench rendered with its synthetic data.
- Reproducible harness: serve `dist-mobile` on localhost:8090, run the web dev server on :8080, install Python Playwright locally, then `python3 mobile/tests/check_v6.py`. Screenshots go to `/tmp/browser/aeriday-v6` (override `AERIDAY_SCREENSHOTS`). `syntheticBridge.js` is **test-only**, never loaded by mobile/main.tsx or shipped as personal findings in the offline app.
- Swift implementation of the extended methods, actual HealthKit history/algorithms, evidence validity, record persistence, true notification behavior, WKWebView/VoiceOver/XCTest and actual keyboard interactions cannot be established here. Browser fixtures are not real health data. The prior local v5 test results are user-reported, not rerun native evidence for v6. No cloud, accounts, analytics, extra permissions or publication.

### Additive v6 source/reference/context refinement
- `getInsights.sourceOptions` is required: `{metricId,selectedSourceId:string|null,sources:string[]}[]`. More submits only returned IDs via `setPreferredSource({metricId,sourceId:string|null})->{ok:true}`; null is automatic. Multiple unselected sources remain ambiguous, with no chart/comparison or silent merging. The returned choice is selected only after both snapshot/insights read-back, including failed writes that committed. Swift must independently enforce its source allowlist and ambiguity policy.
- Every series, including `getMetricSeries`, now requires `reference: {median:number,mad:number,referenceStart:ISO,referenceEnd:ISO,validDays:number,frozenAt:ISO|null,ruleVersion:string}|null`; optional `referenceBand:{lower:number,upper:number}|null`. Frontend shows only this supplied median/band, not a band invented from baseline. Labels state experimental historical statistical reference, not healthy or clinical range. Legacy baseline field remains compatible but does not substitute for missing reference metadata in charts.
- Context requires `reportedSymptomsPresent:boolean`, `changeAssessment:'notEstablished'`, `current7`/`prior7`, each `{reportingDays:number,expectedDays:7,perItemKnownCounts:Record<string,number>,loggedMedicationCounts:Record<string,number>}`. These explicit camelCase keys define the abbreviated coverage request. Counts are supplied, never inferred. `reportedRespiratoryChange` is still native-provided and must remain false unless change was actually established. UI renders context.summary and reporting coverage, not inferred deterioration from symptoms being present.
- This is an experimental personal-use preview of factual changes and cautious sourced educational context, not endorsement or a claim of clinical validation.
- Refined checks: **22 tests pass**; synthetic source selection/automatic ambiguity/unknown-ID rejection/reference schema/no-invented-band tests, plus source partial-write UI read-back at 390 standard and 320 large/dark. Reference MAD/dates/freeze/version and explicit band render correctly; original v6 CRUD/regression harness still passes. `python3 mobile/tests/check_sources.py` reproduces the added browser checks. Actual Swift source filtering, reference algorithms and WKWebView behavior remain local verification tasks.
- Revised downloadable files: `aeriday-mobile-source-v6-refined.zip` (complete source and paired guides) and `aeriday-dist-mobile-v6-refined.zip` (`dist-mobile/`). These supersede the earlier v6 downloads without overwriting them. No publication or new services.

### FINAL v6 reference review addition
- Add `reviewBaseline({metricId,confirm:true})->{ok:true}` to the v1 native allowlist. More reference details and metric-series details offer **Rebuild personal reference**, followed by **Confirm rebuild personal reference** or Cancel. No call occurs on the first tap or cancellation. Success and failure re-read getInsights and getSnapshot; committed failures are reported through existing partial-write notices.
- `reference.reviewReason?:string|null` is compatible with earlier responses. Any non-null reason (including an empty string) hides the supplied referenceBand in both details and charts. No band is computed in JavaScript.
- Swift must keep frozen/changed/deleted reference inputs in baselineReviewNeeded until the owner confirms rebuilding or explicitly changes source. The frontend never clears or infers that state. Rebuilding resets the experimental reference; it does not confirm health or change raw records. A frozenAt date alone is not treated as a review reason.
- Final complete downloads: `aeriday-mobile-source-v6-final.zip` and `aeriday-dist-mobile-v6-final.zip`. They include all earlier v6 insights, CRUD, source selection and reference/context additions and supersede both earlier and refined v6 downloads. Replace the entire bundle, not individual files.
- Native Swift reference rebuilding, actual WKWebView/VoiceOver/XCTest and keyboard behavior still require local checks. No publication or services added.
- Final verification: 25 unit tests pass; mobile build succeeds. Synthetic Chromium checks at 390 standard/light and 320 large/dark cover confirmation/cancel, exact v1 request, both read-backs, committed-error read-back, no inventory change and band suppression in details/chart; existing v6 CRUD and source regressions pass. Screenshots inspected; no runtime errors in these checks.
