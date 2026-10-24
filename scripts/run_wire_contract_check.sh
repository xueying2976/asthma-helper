#!/bin/bash
# Reproducible native↔frontend WIRE CONTRACT checks against v7's REAL zod schemas.
# Two layers, labelled distinctly for honest reporting:
#   (A) SCHEMA-FIXTURE check — handwritten representative JS payloads vs the schemas
#       (validate_native_wire.mjs). Fast coverage of many shapes; NOT real Swift output.
#   (B) REAL SWIFT SERIALIZATION check — compiles AeriDayCore + a tracked fixture program that
#       builds a DoctorVisitSummary via the pure builder and emits it through the real JSONEncoder
#       (.iso8601), then feeds that actual JSON into v7's doctorSummarySchema.
# Neither replaces the full app/XCTest/WKWebView run, which needs an out-of-sandbox compile.
#
# Usage:  scripts/run_wire_contract_check.sh [v7-source-dir]
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-LovableFrontend/aeriday-mobile-source-v8}"
if [ ! -f "$SRC/src/lib/aeriday/doctorSummary.ts" ]; then
  echo "v7 source not found at $SRC (extract the archive first)"; exit 2
fi

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
( cd "$SRC"
  npx esbuild src/lib/aeriday/doctorSummary.ts --bundle --format=esm --platform=node --outfile="$WORK/doctorSummary.mjs" >/dev/null
  npx esbuild src/lib/aeriday/insights.ts      --bundle --format=esm --platform=node --outfile="$WORK/insights.mjs"      >/dev/null )

echo "== (A) schema-fixture check (handwritten payloads) =="
cp scripts/wire-contract/validate_native_wire.mjs "$WORK/validate.mjs"
node "$WORK/validate.mjs"

echo
echo "== (B) real Swift JSONEncoder serialization check =="
mkdir -p "$WORK/enc"
cp scripts/wire-contract/DoctorSummaryEncoderFixture.swift "$WORK/enc/main.swift"
# shellcheck disable=SC2046
xcrun swiftc -sdk "$(xcrun --sdk macosx --show-sdk-path)" -o "$WORK/encgen" \
  $(find AeriDayCore/Sources -name '*.swift') "$WORK/enc/main.swift"
"$WORK/encgen" > "$WORK/swift_doctor_summary.json"
cp scripts/wire-contract/validate_real_swift.mjs "$WORK/validate_real.mjs"
node "$WORK/validate_real.mjs" "$WORK/swift_doctor_summary.json"
