#!/bin/bash
# Reproducible strict-concurrency typecheck of the R3 NATIVE report service, from tracked source.
#
# The full app target cannot build inside the Kiro sandbox (macro plugin). This script typechecks
# AeriDay/Infrastructure/Reports/DoctorSummaryService.swift together with AeriDayCore/Sources under
# -strict-concurrency=complete (the project's setting), so the native R3 code is verified without
# the app host's macros. It does NOT replace the full `make build` / `make test` run outside the
# sandbox; it is the sandbox-independent check for this file's Swift concurrency + API usage.
#
# Usage:  scripts/typecheck_report_service.sh
set -euo pipefail
cd "$(dirname "$0")/.."

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Compile the service together with Core sources: drop its `import AeriDayCore` so the Core types
# are in the same module for this standalone typecheck.
sed 's/^import AeriDayCore$/\/\/ import AeriDayCore (compiled together for typecheck)/' \
  AeriDay/Infrastructure/Reports/DoctorSummaryService.swift > "$WORK/DoctorSummaryService.swift"

# Minimal caller so the generic/async API surface is exercised.
cat > "$WORK/shim.swift" <<'EOF'
import Foundation
enum _TypecheckShim {
    @MainActor static func run(_ e: LocalEntries, _ f: [ChangeFinding], _ w: [DailyFeature]) throws {
        let svc = DoctorSummaryService(isDemo: true)
        let s = try svc.makeSummary(entries: e, findings: f, wearable: w, range: .last7, options: .init())
        _ = DoctorSummaryText.lines(for: s)
        if let t = svc.activeToken { _ = try? svc.exportPDF(token: t, currentEntries: e) }
        DoctorSummaryService.cleanupTemporaryFiles()
    }
}
EOF

# shellcheck disable=SC2046
xcrun -sdk iphonesimulator swiftc -typecheck -target arm64-apple-ios17.0-simulator \
  -strict-concurrency=complete \
  $(find AeriDayCore/Sources -name '*.swift') "$WORK/DoctorSummaryService.swift" "$WORK/shim.swift"

echo "TYPECHECK OK (strict-concurrency=complete, no errors)"
