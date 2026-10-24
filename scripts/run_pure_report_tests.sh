#!/bin/bash
# Reproducible pure-logic verification for the R3 doctor-summary builder.
#
# Compiles AeriDayCore/Sources together with the tracked harness (no macros, no app host) so it runs
# INSIDE or OUTSIDE the Kiro shell sandbox — unlike `make test`, which needs the macro plugin.
# This is the sandbox-independent evidence path; it does NOT replace the full XCTest/Swift Testing
# suite (AeriDayTests/DoctorSummaryBuilderTests.swift), which should be run via `make test` outside
# the sandbox.
#
# Usage:  scripts/run_pure_report_tests.sh
# Output: real swiftc errors (if any) + "CHECKS=<n> FAILURES=<n>"; exit non-zero on any failure.
set -euo pipefail
cd "$(dirname "$0")/.."

HARNESS="scripts/pure-tests/DoctorSummaryPureHarness.swift"
# main.swift lets top-level code compile when building multiple files together.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp "$HARNESS" "$WORK/main.swift"

SDK="$(xcrun --sdk macosx --show-sdk-path)"
# shellcheck disable=SC2046
xcrun swiftc -sdk "$SDK" -o "$WORK/harness" \
  $(find AeriDayCore/Sources -name '*.swift') "$WORK/main.swift"

"$WORK/harness"
