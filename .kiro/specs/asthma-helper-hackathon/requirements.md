# Requirements — Asthma Helper (Hackachusetts Healthcare & Biotech)

Spec version: 1.0 | Created: 2026-10-24 (Kiro) | Status: active implementation

Derived from `KIRO_IMPLEMENTATION_BRIEF.en-US.md` (Codex-prepared handoff). This spec is
authored in Kiro and governs the Kiro implementation work. Product name: **Asthma Helper**;
technical identifiers remain **AeriDay**. All health data stays on-device; development and demos
use synthetic data only.

## Introduction

Asthma Helper turns scattered self-observations into an inspectable personal history a patient can
bring to a doctor. It is an iOS 17+ Swift shell hosting a bundled Lovable React frontend in a
WKWebView. The on-device "backend" is the existing Swift services, protected local store and
allowlisted JS↔native bridge. The deliverable workflow is: **record a structured observation →
identify a personal change → preview and export a recent doctor summary (local PDF).**

This product is explicitly non-diagnostic. It makes no attack prediction, no diagnosis, no causal
environmental claim, no automated escalation and no treatment change.

## Requirement 1 — Complete frontend-backed structured records (R1)

**User story:** As a patient, I want the app's record controls to actually save to on-device
storage and read back after relaunch, so my observations form a reliable history.

#### Acceptance criteria
1. WHEN a user saves a note, medication inventory item, reminder, structured symptom check-in,
   medication-use event, or manual peak-flow reading THROUGH a supported control, THEN the app
   SHALL persist it via the existing protected Swift store and SHALL read it back after relaunch.
2. WHEN a record is edited or deleted, THEN the relevant screens and derived results SHALL update,
   and a stale/duplicate write SHALL NOT create duplicates (stable record IDs).
3. THE system SHALL keep medication inventory, scheduled reminders and actual usage as distinct
   concepts, and SHALL preserve exact medication names, entered doses, units and clinician text.
4. THE native boundary SHALL validate UUIDs, dates, finite numbers, allowed enums and supported
   units, and SHALL reject unsupported or malformed writes explicitly (no silent drop).
5. WHEN medication and reminder writes commit separately, THEN a partial commit SHALL be reported
   accurately rather than claimed as fully saved.
6. THE system SHALL migrate old stored records without loss, and SHALL NOT use any real record as
   a development or demo fixture.

## Requirement 2 — Identify Changes (R2)

**User story:** As a patient, I want to see whether my recent values differ from my own personal
reference, with honest limitations, so I can discuss real changes with my doctor.

#### Acceptance criteria
1. THE frontend SHALL reach the existing engine ONLY through the native methods `getInsights`,
   `getMetricSeries`, `setAnalysisEnabled`, `setPreferredSource`, `reviewBaseline`, and the
   structured CRUD methods, and SHALL NOT implement a second analysis algorithm in JS.
2. THE system SHALL preserve the approved engine unchanged: completed-day source-aware features;
   28-day reference window (≥21 usable days); 3-day observation window (≥2 usable days);
   median/MAD, effect-size and persistence rules; source transitions; frozen references; explicit
   review; zero-variance indeterminacy. Thresholds are experimental, not validated asthma rules.
3. THE UI SHALL display every supported state clearly: insufficient data, no sustained change,
   single-day change, sustained personal deviation, reference-review-needed, context-only,
   indeterminate, and reported observations where applicable.
4. EACH change card SHALL show metric, unit, source, observation/reference dates, usable/expected
   days, actual observed difference, rule version, relevant limitations, and a detail view.
   No-change language SHALL be limited to the analyzed data and SHALL NOT imply healthy breathing.
5. WHEN wearables show no change, THEN symptoms SHALL remain visible; symptom coverage and logged
   medication counts SHALL be shown with denominators. Mere symptom presence SHALL NOT be stated as
   an increase.
6. WHEN analysis is toggled, a source selected, a reference rebuilt (with confirmation), or records
   added/edited/deleted, THEN visible results SHALL stay consistent; a correction/deletion SHALL
   invalidate stale findings; a late async response SHALL NOT resurrect deleted/disabled data; and
   changing the chart period SHALL NOT change the engine's fixed analysis windows.

## Requirement 3 — Recent doctor summary + local PDF (R3)

**User story:** As a patient, I want to build a recent summary from my own records and export it as
a local PDF, so I can hand it to my doctor without my data leaving the device.

#### Acceptance criteria
1. THE system SHALL add an English "Prepare for a doctor visit" entry in an existing screen,
   offering 7 days, 30 days and an explicit custom range capped at 90 days, defaulting to completed
   local calendar days ending yesterday, and SHALL show inclusive dates and time zone.
2. WHEN today is deliberately included, THEN it SHALL be labeled partial and kept separate from
   completed-day comparisons. THE system SHALL reject reversed, future or over-limit ranges and
   SHALL compute calendar dates correctly across daylight-saving changes.
3. THE system SHALL build one immutable, versioned `DoctorVisitSummary` from a single consistent
   local snapshot, carrying `schemaVersion, generatedAt, range, timeZone, isDemo, recordRevision,
   reportingCoverage, symptoms, medicationLogs, peakFlow, wearableContext, personalChanges,
   selectedNotes, patientQuestions, limitations`.
4. THE report SHALL present sections in the brief's order (title/mode; coverage; symptoms;
   medication-use events; peak flow; wearable context; personal changes; notes & questions;
   limitations), counting positive symptom days once per field per day, treating unknown as neither
   yes nor no, and never reconstructing medication names/adherence from inventory.
5. THE system SHALL provide a structured preview before export and SHALL export the EXACT preview
   snapshot as a local multi-page PDF through native rendering/share UI, only after user action.
   WHEN records changed since preview, THEN regeneration SHALL be required rather than silently
   exporting different numbers.
6. EVERY number in preview and PDF SHALL match the fixture records; range/source/coverage metadata
   SHALL appear in both; an empty dataset SHALL still yield an honest empty report; and every
   synthetic PDF page SHALL carry a visible DEMO label. THE summary token SHALL be short-lived and
   in-memory; delete-all SHALL invalidate it; temporary files SHALL be protected, backup-excluded
   and cleaned promptly.

## Requirement 4 — Privacy, scope and evidence integrity (cross-cutting)

#### Acceptance criteria
1. THE system SHALL NOT add a cloud health database, auth service, generic REST server, analytics,
   remote LLM, or new HealthKit permissions.
2. THE system SHALL keep business logic in Foundation-only `AeriDayCore`; platform code (HealthKit,
   storage, PDF/share) SHALL stay in injected infrastructure.
3. NO health content SHALL enter debug logs, telemetry or remote services; demo data SHALL remain
   isolated and visibly labeled throughout screens and exports.
4. THE build SHALL remain reproducible from tracked source (xcodegen + npm `build:mobile`); the
   root `.kiro/` SHALL be committed and not ignored; evidence SHALL distinguish Kiro work from the
   Codex-prepared brief and prior work, and SHALL NOT substitute mock success for native behavior.
