> Upstream Lovable delivery notes. The test results below are reported by Lovable, not a fresh independent validation of this publication snapshot.

# Asthma Helper — interactive judges’ browser demo

## Run

Install Bun, run `bun install`, then `bun run dev`. Open the local address printed by Vite. The existing TanStack web application remains the web entry. This delivery is source, not a published site. Do not use the mobile bundle as the judges’ web entry.

## Try the complete flow

1. The app starts in English on Today. Cambridge, Massachusetts is fictional context; the timeline contains Sep 20–Oct 24, 2026 in America/New_York.
2. Open History → Add respiratory check-in. Set the latest record’s cough to None and save; Today and Trends select the no-change example. Edit it to Mild and save to select the recent-change example. Other unanswered fields remain Unknown, not None.
3. Explore Trends’ daily chart and 7/30/90-day controls. The fixture contains only 35 days: earlier dates are gaps, not invented readings. Early timeline dates have insufficient reference history.
4. Log actual medication use in Medications. Inventory remains unchanged. In History, add/edit/delete a fictional note, check-in, actual-use event or peak-flow entry. Refresh the browser to check saved synthetic records.
5. More → Prepare for a doctor visit. Choose 7/30 days or inclusive custom dates; choose whether to include partial today, optional selected notes and questions. Prepare preview, then Print / Save PDF. Choose the browser’s PDF destination. Notes outside the range are excluded; edits invalidate the preview.
6. Use Timeline day for a different synthetic environment and records. Reset synthetic demo asks for confirmation and restores the starting fixtures.

## What the example means

The global synthetic label applies to the app. Change results are explicitly simulated Swift-engine **presentation examples**. JavaScript selects coherent fixtures; it does not run Swift, HealthKit, clinical AI or a validated baseline algorithm. Symptom edits are an interactive demonstration, not evidence that a symptom caused a wearable change. No attack probability, severity score, dose recommendation or assurance of safety is generated.

AQI, pollen and weather vary by selected day with a shared 7 PM New York timestamp. Records have their own displayed New York entry times. No real location lookup, account, permissions, health backend or analytics integration was added. Browser localStorage holds fictional records only, under a versioned synthetic key. Do not enter real health information. Clearing browser storage or reset removes the example edits; private mode/storage restrictions may prevent persistence and show a notice.

## Architecture and integration boundaries

`browserDemo.ts` owns timeline fixtures and report aggregation; `BrowserDemoProvider` is installed only by `PrototypeWorkbench`. Shared screens use a data-call adapter, which remains the native bridge when the browser provider is absent. MobileRoot does not install this provider. Swift bridge envelopes, allowlist, native DTOs, doctor-report request casing and on-device analysis/storage are unchanged. No Kiro backend files are delivered or overwritten. The source includes the existing mobile project for completeness, not a new iPhone build.

## Checks and limits

Final acceptance: user-facing branding is Asthma Helper; internal IDs and native wire contracts are unchanged. Exact editor preview route: https://id-preview--8cd9062f-ebc6-42d3-a784-33d4909d6098.lovable.app/ (not the unchanged published site).

Both desktop and narrow large-text browser checks verified symptom and medication amount edits after reload. The Oct 22–24 report showed Cough 3 positive / 3 known days, the edited amount 3, only the selected fictional note and the entered doctor question, plus New York timestamps. No raw internal enums or long decimals appeared in the checked five-tab flow. Reference rebuild is intentionally unavailable for fixed browser fixtures; native controls and PDF sharing are unchanged.

- 37 unit tests passed, 360 assertions, including exact timeline length, preset/custom ranges, inventory non-decrement, record CRUD, gaps and date bounds.
- Browser flow passed at 1280px standard/light and 390px large/dark with a deliberately different device timezone: add/edit → example changes → use → notes → reload persistence → custom report/selected note/question → print request → PDF rendering → invalidation/reset/day switch. No page errors observed.
- Chromium generated actual three-page PDFs from print media; every page was visually inspected. The automated click test intercepted `window.print` to verify invocation; native operating-system print/save dialogs and Safari were not automated. Final saving is controlled by the user’s browser.
- Existing synthetic native v8 tests passed at 390px standard and 320px large text using the available mobile test preview: five tabs, 44px targets, unavailable plan and honest personal-empty states. This does not certify a newly built WKWebView or fix Kiro’s independently investigated `invalid_response`.
- The preview’s latest automatic compilation was successful. No publishing occurred. Use the editor preview to review before authorizing publication.

Run unit tests with `bun test src/lib/aeriday/*.test.mjs mobile/trialPreferences.test.mjs`. The retained browser flow is `tests/browser/check_judges.py`, using Playwright against localhost:8080 and writing temporary screenshots/PDFs under `/tmp/browser/judges`.