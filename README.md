# Asthma Helper

**Helping people live more comfortably with asthma, one ordinary day at a time.**

Before a walk, someone may overlook changes in pollen or air quality. After an uncomfortable night, they may find it hard to describe what felt different. An inhaler can need replacing sooner than expected. Asthma Helper brings daily environmental context, medication and supply information, personal observations, and trends together to support ordinary life with asthma. A doctor-visit summary is one supporting feature.

This Hackachusetts snapshot contains **two related implementations**. Lovable developed the frontend; Kiro developed the native backend; Codex coordinated tasks, integration, and verification. It builds on an existing concept and codebase. Backend report work, contracts, integration fixes, specs/steering, and synthetic-scenario improvements were the event contributions. We do not claim the entire product was written from scratch during the event.

## Judge quick start: browser demonstration

Requires Bun and a recent browser:

```sh
cd web-demo
bun install
bun run dev
```

Open the local URL printed by Vite. Explore Today, Medications, Trends, History, and More. Add or edit a synthetic record, review simulated change examples, then use More → Prepare for a doctor visit. Choose dates, a note and a question; prepare the preview and open Print / Save PDF.

See [browser instructions](web-demo/JUDGES.en-US.md). That file includes the frontend tool's own test report; those claims are not a fresh independent certification of this public snapshot.

**Browser data is synthetic. Its JavaScript selects simulated change examples; it does not execute the native Swift analysis engine or access HealthKit. Do not enter real health information.** Fictional browser edits use localStorage. AQI, pollen, weather, location and timeline context are simulated.

## Native iOS application

Requirements: macOS, Xcode with iOS simulator support, and XcodeGen. The project targets iOS 17 or later; its project generator records Xcode 26.3. Internal AeriDay target/path identifiers are retained to preserve build configuration.

```sh
make doctor
make demo DERIVED_DATA=/tmp/AsthmaHelperDerivedData
```

`make demo` generates the Xcode project, builds the simulator app and launches synthetic mode. It does not provision or sign a physical-device release. Native sources are in `AeriDay/`, `AeriDayCore/`, and `AeriDayDesignSystem/`. The matching native frontend source is `LovableFrontend/aeriday-mobile-source-v8/`; its already bundled resources are in `AeriDay/Resources/Web/`.

To rebuild that frontend separately:

```sh
cd LovableFrontend/aeriday-mobile-source-v8
bun install
bun run build:mobile
```

This produces `dist-mobile/`; replacing app resources requires an explicit integration step and subsequent iOS rebuild. The newer browser demo under `web-demo/` is deliberately separate and has not replaced the native frontend.

## Checks

```sh
./scripts/run_pure_report_tests.sh
./scripts/typecheck_report_service.sh
cd LovableFrontend/aeriday-mobile-source-v8 && bun install && cd ../..
./scripts/run_wire_contract_check.sh
```

Browser unit checks:

```sh
cd web-demo
bun test src/lib/aeriday/*.test.mjs mobile/trialPreferences.test.mjs
```

These are reproducible entry points, not a claim that every command was rerun on this snapshot. Earlier normal simulator build/launch succeeded. Kiro's full app builds encountered Apple macro-plugin sandbox restrictions; later native source changes still require a fresh full build and runtime acceptance. Browser summary content and the system print dialog were exercised; native PDF sharing remains unverified. Pure-core checks do not certify UI or export behavior.

## Kiro evidence and provenance

Actual specifications and steering are retained at `.kiro/specs/asthma-helper-hackathon/` and `.kiro/steering/`. Report construction lives in `AeriDayCore/Sources/Reports/`, with native services/bridge in `AeriDay/Infrastructure/`. Test sources and scripts are included.

This is a clean publication snapshot of native source through local commit `d9cb5a3`, plus the separately downloaded final Lovable judges frontend. Earlier traceable event milestones include `f25245a` (response contract), `0f65020` (native frontend integration), `0fca4b5` (presentation/scenario), and `a26bf1c` (Cambridge scenario/timezone). Original private Git history is intentionally absent. Short IDs document provenance and are not links to commits in this new repository.

## Differences and boundaries

**The browser demo and native app are not yet fully aligned because implementation time was limited.** UI details and some feature behavior differ. The native app contains the Swift personal-change/report backend; the browser is the accessible synthetic demonstration. No clinically validated result, physical-device HealthKit verification, live environmental feed, native PDF-share success, or full end-to-end certification is claimed.

Asthma Helper is an experimental prototype, not a medical device. It does not diagnose conditions, distinguish asthma from anxiety, predict attacks, recommend medication changes, or establish environmental causes.

## Publication contents and licenses

The frontend retains upstream Lovable error-reporting hooks and its Vite/TanStack configuration. The hooks call editor-provided globals when present; they are not a new health-data integration. Hosted preview/platform behavior and dependency code are outside this source-only scan. No credentials or account-specific configuration were added.

This snapshot excludes private Git history, personal documents/resume/PDFs, recordings, raw logs, account settings, credentials, old frontend versions, and archived exports. Included fonts and third-party license notices retain their upstream terms. Package dependencies retain their own licenses. No new blanket license has been assigned to original project code; confirm licensing with the owner before redistribution beyond the authorized repository publication.

[中文说明](README.zh-CN.md)
