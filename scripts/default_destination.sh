#!/bin/sh
set -eu

device_id=$(
    xcrun simctl list devices available \
        | sed -nE '/iPhone/ s/.*\(([0-9A-F-]{36})\) \((Booted|Shutdown)\).*/\1/p' \
        | head -n 1
)

if [ -z "$device_id" ]; then
    echo "No available iPhone Simulator destination was found." >&2
    echo "Open Xcode > Settings > Components and install an iOS Simulator runtime." >&2
    exit 1
fi

printf 'platform=iOS Simulator,id=%s\n' "$device_id"
