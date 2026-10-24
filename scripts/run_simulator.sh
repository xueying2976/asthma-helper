#!/bin/sh
set -eu

# Uses an installed simulator, without resetting its data or changing signing.
device_id="${AERIDAY_SIMULATOR_ID:-$(./scripts/default_destination.sh | sed 's/^platform=iOS Simulator,id=//')}"
# Launch exactly the bundle that was just built. Resolution order:
#   1. AERIDAY_APP_PATH  — an explicit path to AeriDay.app
#   2. AERIDAY_DERIVED_DATA — a derivedDataPath; the app is under Build/Products/Debug-iphonesimulator
#   3. default: /tmp/AeriDayDerivedData (matches the Makefile's DERIVED_DATA)
derived_data="${AERIDAY_DERIVED_DATA:-/tmp/AeriDayDerivedData}"
app_path="${AERIDAY_APP_PATH:-$derived_data/Build/Products/Debug-iphonesimulator/AeriDay.app}"
if [ ! -d "$app_path" ]; then
    echo "AeriDay.app not found at: $app_path" >&2
    echo "Build first (e.g. make build), or set AERIDAY_DERIVED_DATA / AERIDAY_APP_PATH to the build you want to launch." >&2
    exit 1
fi
bundle_id=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$app_path/Info.plist")
xcrun simctl bootstatus "$device_id" -b
xcrun simctl install "$device_id" "$app_path"
open -a Simulator
if [ "${AERIDAY_DEMO:-0}" = "1" ]; then
    xcrun simctl launch --terminate-running-process "$device_id" "$bundle_id" -demo
else
    xcrun simctl launch --terminate-running-process "$device_id" "$bundle_id"
fi
