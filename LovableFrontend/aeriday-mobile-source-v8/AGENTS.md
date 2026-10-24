<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep presentation scenarios in a pure browser-safe data module shared by Today, Trends and History, so their synthetic values stay consistent.
- Keep entries in the in-memory provider for the web prototype; only the iOS shell persists, via the allowlisted aeriBridge in src/lib/aeriday/nativeBridge.ts, so health data never leaves the device.
- Build the iOS bundle from mobile/ with its own Vite config (build:mobile → dist-mobile/), reusing src components unchanged, so the SSR web app stays untouched.
- Mobile Chinese text uses the vendored, CJK-range-limited font in mobile/fonts/ imported only by mobile/mobile.css (license copied to dist-mobile/licenses/), because WKWebView system fallback rendered missing glyphs; never use remote fonts or local() for CJK.
- Both data modes enter the preview's TodayBody/MedsBody/TrendsExperience/HistoryExperience/MoreBody; share layout-only shells from previewLayouts and keep native editors/services as data adapters, so native UI retains preview composition without copying prototype facts. Swift remains the personal-analysis authority through getSnapshot/getInsights with separate loading/error states and no demo fallback.
- Use dedicated Trends/History views and a shared metric detail sheet, so every metric uses the same dates, period controls and source/gap handling.
- Reconcile native writes through nativeOperations before reporting outcomes; multi-step writes may partially commit.
- Keep native theme/text preferences session-only; the current English trial applies a mobile-only presentation language policy without writing Swift preferences, and hides native language selectors while preserving web bilingual controls.
- Scope minimum hit dimensions and wrapping to mobile/mobile.css, including mobile source scanning, so native accessibility fixes do not restyle the browser workbench.
- Preserve native sample metadata in the shared metric module; latestSample is not an aggregate and unsupported numeric native writes are blocked at the provider boundary.
- Keep structured record editors separate from legacy free-text notes and inventory, reconciling both insight and snapshot stores after writes, so actual use cannot mutate inventory or silently lose record fields.
- Render dated daily series exactly as supplied through getMetricSeries, with null gaps and Swift reference metadata/optional band only, so the frontend never invents aggregates, references or clinical thresholds.
- Source selection uses only getInsights sourceOptions IDs and reconciles via the existing write/read-back flow; suppress ambiguous comparisons until an owner chooses, so personal sources are never silently merged.
- Route reference rebuilding through the same reconciled write/read-back flow with literal confirmation; share band visibility across details and charts, leaving reference-review state transitions to Swift.
- Keep mobile keyboard-height tracking in MobileRoot and mobile CSS only, so sheet actions follow the visible viewport without restyling the web workbench.
- Keep doctor-report DTO validation separate from v6 insights; render exact Swift fields and invalidate report tokens on input/read-back changes or report_stale, so local PDF sharing never uses a knowingly stale preview or invents clinical analysis.
