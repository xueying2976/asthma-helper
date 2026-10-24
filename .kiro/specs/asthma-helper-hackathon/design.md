# Design — Asthma Helper (Hackachusetts)

Spec version: 1.0 | Created: 2026-10-24 (Kiro)

## Overview

Reuse the existing architecture; add only the missing pieces. The Swift backend already implements
R1/R2 bridge methods and the change engine. The two real gaps are (A) the v5 frontend is not wired
to the structured-record/insights methods, and (B) the R3 doctor summary does not exist. This
design keeps all new report logic in Foundation-only `AeriDayCore` with injected clock/calendar,
adds two bridge operations, renders a PDF in platform infrastructure, and wires typed frontend
adapters.

## Architecture

```
Lovable frontend (React, WKWebView)
  └─ src/lib/aeriday/nativeBridge.ts   ← add insights + structured + report methods to contract
  └─ NativeScreens.tsx                  ← wire Identify Changes + doctor-summary entry
        │  aeriBridge.postMessage (v1 envelope)
        ▼
AeriDay/Infrastructure/Web/LovableWebView.swift  ← add getDoctorSummary / exportDoctorSummary
        │
        ├─ PersonalInsightsService (exists)        — getInsights / series / baseline / source
        ├─ LocalEntriesStore (exists)              — record CRUD
        └─ DoctorSummaryService (NEW, infra)       — holds in-memory token; calls builder; PDF
                 │
                 ▼
AeriDayCore (Foundation-only, no platform frameworks)
  ├─ Domain/LocalEntries.swift (exists)
  ├─ Insights/* (exists, unchanged)
  └─ Reports/DoctorVisitSummary.swift (NEW)   — immutable DTO + pure builder, injected clock/cal
```

## Components

### 1. `DoctorVisitSummary` DTO (AeriDayCore/Sources/Reports)
Serializable `Codable` value type with the brief's shape:
`schemaVersion, generatedAt, range, timeZone, isDemo, recordRevision, reportingCoverage, symptoms,
medicationLogs, peakFlow, wearableContext, personalChanges, selectedNotes, patientQuestions,
limitations`. All sub-DTOs are `Sendable` value types. No platform imports.

### 2. `DoctorSummaryBuilder` (pure, AeriDayCore/Sources/Reports)
`static func build(from entries: LocalEntries, findings: [ChangeFinding], wearable: [DailyFeature],
range: DoctorSummaryRange, options: DoctorSummaryOptions, recordRevision: String, isDemo: Bool,
now: Date, calendar: Calendar) throws -> DoctorVisitSummary`.

- **Range validation:** 7 / 30 / custom(≤90). Reject reversed, future-start, over-limit. Default
  window = completed local calendar days ending yesterday; DST-safe via `calendar.date(byAdding:)`.
- **Coverage:** known symptom days / expected days per field; field-specific unanswered; missing
  wearable days. Invariant: `positiveDays ≤ knownDays ≤ expectedDays`.
- **Symptoms:** per field, count positive days once/day; a positive answer wins over negative for
  daily presence; unknown never becomes no.
- **Medication logs:** group by exact recorded medication name where identifiable, else regimen +
  purpose; logged days + event counts; quantities only when recorded in compatible units. Never
  reconstruct names/adherence from inventory.
- **Peak flow (L/min):** count of valid readings, observed range, explicit aggregation; no %
  personal best unless clinician-confirmed; no treatment zones.
- **Wearable context:** per metric: unit, usable days, sources, observed summaries, gaps; never
  combine incompatible devices; never fabricate daily values from latest samples.
- **Personal changes:** reuse engine findings as of the report endpoint; display the engine's own
  windows even if they differ from the report period; exclude future data. If a past-endpoint
  historical reconstruction cannot be supported correctly, omit the section with a stated reason.
- **Notes/questions:** notes excluded by default (user previews/selects); free text never parsed
  into asserted facts; questions remain user-editable.
- **Determinism:** permutation-invariant; duplicate record IDs do not inflate counts; a future
  record cannot change a past summary; identical builder input → identical DTO.

### 3. `DoctorSummaryService` (AeriDay/Infrastructure, platform)
Orchestrates a snapshot read, calls the pure builder, mints a **short-lived in-memory token**
`{token, recordRevision, summary}`, and renders PDF via `UIGraphicsPDFRenderer` + `UIActivityView`
share only on user action. Export validates the token's `recordRevision` against the current store
revision; mismatch → `report_stale` error (require regenerate). `deleteAll` invalidates the token.
Temp PDF: `.completeFileProtection`, backup-excluded, removed on dismiss/expiry/next launch.

### 4. Bridge contract additions (`LovableWebView.swift` + `nativeBridge.ts`)
- `getDoctorSummary { range: {kind:"last7"|"last30"|"custom", start?, end?, includeToday?}, selectedNoteIds?: string[], patientQuestions?: string[] }` → `DoctorVisitSummary` + `{ token }`.
- `exportDoctorSummary { token, format?: "pdf" }` → `{ ok, pages }` (triggers native share sheet).
- Errors reuse the v1 convention: `invalid`, `report_stale`, `unavailable`.
- `recordRevision` = deterministic SHA-256 digest of the serialized `LocalEntries` (monotonic store
  revision not exposed by an existing API, so a digest is used per the brief).

### 5. Frontend wiring
Extend `BRIDGE_METHODS`, `BridgeParams`, `BridgeResults` with the insights, structured-record and
report methods already in Swift + the two new ones. Add a typed `insights` adapter and a
"Prepare for a doctor visit" entry in `NativeScreens.tsx` / More, with a preview view and an
"Export PDF" button that calls `exportDoctorSummary`. Rebuild via `npm run build:mobile`; the
output replaces `AeriDay/Resources/Web`.

## Error handling
- Native boundary rejects malformed/unsupported writes with explicit error codes (no silent drop).
- Non-finite numbers rejected at JSON validity + range checks.
- Stale preview export → `report_stale`; frontend prompts regeneration.
- Snapshot/store failures surface as errors; never fall back to demo data after a native failure.

## Testing strategy
- **Pure (verifiable in-sandbox via AeriDayCore target):** builder unit tests + property tests —
  invariants (`positiveDays ≤ knownDays ≤ expectedDays`), permutation invariance, duplicate-ID
  non-inflation, future-record isolation, unknown≠no, preview==export DTO totals; range validation
  (reversed/future/over-limit, DST/midnight boundaries); empty/negatives/all-unknown/mixed-day/
  multi-medicine fixtures.
- **App-hosted (requires non-sandboxed run — see steering `verification-blocker`):** bridge CRUD,
  malformed payloads, partial writes, async races, WKWebView record→change→report→PDF flow, PDF
  page inspection with synthetic long content and DEMO label.

## Decisions & deviations
- **v5, not v6:** no v6 archive exists; v5 is the verified source. Required UI additions follow the
  Lovable ownership workflow (additive prompt recorded) rather than silent frontend rewrites.
- **Build via npm:** `bun` is absent; `npm run build:mobile` produces the identical vite output.
- **recordRevision = digest:** chosen because no monotonic store-revision API exists.
