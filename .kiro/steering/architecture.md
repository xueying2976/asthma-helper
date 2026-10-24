# Steering — Architecture & bridge conventions

## Layering
- Business logic lives in Foundation-only `AeriDayCore` (no HealthKit, UIKit, SwiftData, PDFKit).
  Platform code (HealthKit, persistence, PDF/share) lives in injected `AeriDay/Infrastructure`.
- Report/analysis math is pure and takes an injected `Date`/`Calendar`, so it is deterministic and
  unit-testable via the `AeriDayCore` target.

## Bridge (v1)
- Keep the v1 envelope `{ v:1, id, method, params }` → `{ v:1, id, ok, result | error:{code,message} }`.
- Add a new method to BOTH the native allowlist (`LovableWebView.perform` switch) AND the TypeScript
  contract (`BRIDGE_METHODS`, `BridgeParams`, `BridgeResults`). Unknown methods are rejected on both
  sides.
- Validate at the native boundary: UUIDs, dates, finite numbers, allowed enums, supported units.
  Reject malformed/unsupported writes explicitly; never silently drop a supplied value.
- Multi-step writes may partially commit; reconcile and report partial outcomes truthfully.

## Frontend ownership (Lovable)
- The frontend is Lovable-generated. Do not rewrite published git history (no force-push / rebase /
  amend of pushed commits) — it corrupts the Lovable-connected history.
- Preserve Lovable layout and shared components. For required UI additions follow the Lovable
  ownership workflow; if frontend editing is restricted, record a precise additive Lovable prompt as
  a dependency rather than silently bypassing it.
- Build the iOS bundle from the chosen source with `npm run build:mobile` (bun is unavailable);
  output replaces `AeriDay/Resources/Web`. Never hand-edit minified assets.

## Build / verification
- Reproducible build: `xcodegen generate` + `npm run build:mobile`. Generated project and
  `dist-mobile/` are intentionally git-ignored; `AeriDay/Resources/Web` is tracked.
- The macro plugin server cannot start inside the Kiro shell sandbox, so the full-app build and
  app-hosted tests must be run by a human outside the sandbox (normal Terminal / Xcode GUI).
  `AeriDayCore` and its pure tests build inside the sandbox. Do not disable the compiler sandbox,
  skip macro validation, or change macro trust to work around this; record it as a blocker.
