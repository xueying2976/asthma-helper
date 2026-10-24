# Tasks — Asthma Helper (Hackachusetts)

Spec version: 1.0 | Created: 2026-10-24 (Kiro)

> **Deadline: 2026-10-24 20:00 Eastern (00:00 UTC Oct 25) — final lock.**
> The objective is NOT complete while the R1/R2/R3 UI screens are unwired (task 4.3). Backend +
> bridge contract + adapter are done and verified; the live in-app workflow needs the Lovable UI.
> Sandbox-independent evidence is reproducible from tracked source: `make pure-report-tests`
> (= `scripts/run_pure_report_tests.sh` + `scripts/typecheck_report_service.sh`); real logs under
> `output/verification/kiro/`.

Status legend: [ ] todo · [~] in progress · [x] done · [blocked] environment blocker

- [x] 0. T0 audit: record baseline branch/status; choose verified frontend source; locate versions.
  - Correction (2026-10-24): the earlier "no v6 anywhere" note was WRONG — a v6 existed remotely.
    The verified source chain is v5 → v6 → v7 → v8; **v8 is the current integrated source**, and its
    wire schemas (nativeBridge/insights/doctorSummary) are byte-identical to v7.
  - Baseline: git had 0 commits (preserved in a baseline commit); Swift R1/R2 methods already existed;
    R3 was missing; frontend not wired; `bun` absent (use npm).
  - _Requirements: 4.4_

- [x] 1. T1: author root `.kiro/specs/asthma-helper-hackathon/{requirements,design,tasks}.md` and
  `.kiro/steering/*`; write paired EN/ZH audit-matrix doc under `docs/`.
  - _Requirements: 4.4_

- [blocked] 1b. Full-app build + app-hosted test baseline.
  - Blocker: macro plugin server cannot start under the Kiro shell sandbox
    (`sandbox_apply: Operation not permitted`). Full app build/UI tests must run outside the
    sandbox (normal Terminal / Xcode). `AeriDayCore` target builds (`BUILD SUCCEEDED`).
  - _Requirements: 4.4_

- [x] 2. R3 pure report layer in `AeriDayCore/Sources/Reports/`.
  - [x] 2.1 `DoctorVisitSummary` DTO + sub-DTOs (Codable/Sendable, no platform imports).
  - [x] 2.2 `DoctorSummaryRange`/`Options` + validation (7/30/custom≤90, reversed/future/over-limit,
        completed-days-ending-yesterday default, DST-safe).
  - [x] 2.3 `DoctorSummaryBuilder.build(...)` pure, injected clock/calendar.
  - [x] 2.4 Unit + property tests (`AeriDayTests/DoctorSummaryBuilderTests.swift`); 34/34 checks
        pass via standalone AeriDayCore harness in-sandbox.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 4.2_

- [x] 3. R3 bridge + PDF (infrastructure).
  - [x] 3.1 `DoctorSummaryService` (snapshot → builder → in-memory token; revision check; cleanup).
  - [x] 3.2 `getDoctorSummary` / `exportDoctorSummary` in `LovableWebView.swift` (validation, errors).
  - [x] 3.3 `UIGraphicsPDFRenderer` multi-page PDF with DEMO banner; share only on user action.
        Typecheck clean under -strict-concurrency=complete.
  - [x] 3.4 Share-sheet presenter hardened (2026-10-24): earlier `presentShareSheet` guarded on a
        foreground-active + key-window query and RETURNED SILENTLY on failure, so a tap could produce
        no sheet and the bridge still returned ok. Now resolves the topmost controller across scenes/
        windows (SwiftUI apps may not mark a window key), skips a dismissing controller, and THROWS
        `presentationFailed` → bridge error `share_unavailable` instead of a false success.
        RUNTIME ACCEPTANCE (NOT verified from source): tapping Share PDF in the simulator must now
        present the native share sheet; on failure the UI shows the share_unavailable error.
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 4.1, 4.3_

- [~] 4. R1/R2/R3 frontend wiring (Lovable ownership workflow).
  - [x] 4.1 Extend `nativeBridge.ts` contract (insights + structured + report methods + DTO types).
  - [x] 4.2 Typed `insights.ts` adapter (logic only; no fetch/JS analysis).
  - [blocked] 4.3 UI components (cards, record forms, doctor-summary preview + Export button) —
        Lovable-owned layout; recorded as additive prompt in
        `docs/design/LOVABLE_UI_WIRING_DEPENDENCY.en-US.md`.
  - [x] 4.4 `npm run build:mobile`; refreshed `AeriDay/Resources/Web`; new methods present in bundle.
  - _Requirements: 1.1-1.6, 2.1-2.6, 3.1, 3.5_

- [ ] 5. Synthetic demo with enough history for eligible comparisons; DEMO labels end-to-end.
  - _Requirements: 1.6, 3.6, 4.3_

- [ ] 6. Verification + evidence (pure now; app-hosted when run outside sandbox).
  - Record exact commands, real exit statuses, artifact paths; distinguish sim/mock/device.
  - _Requirements: 4.4_

- [ ] 7. Submission prep (EN description + Kiro usage write-up; paired ZH); ≤3-min video script;
  reproducible judge instructions. NOTE: do not publish/submit/sign/add cloud (per authorization).
  - _Requirements: 4.4_
