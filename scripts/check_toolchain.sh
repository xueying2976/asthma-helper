#!/bin/sh
set -eu

if ! command -v xcodegen >/dev/null 2>&1; then
    echo "XcodeGen is missing. Install it with: brew install xcodegen" >&2
    exit 1
fi

developer_directory=$(xcode-select -p 2>/dev/null || true)
case "$developer_directory" in
    */CommandLineTools)
        echo "Full Xcode is not selected. Install Xcode 26.3, then run:" >&2
        echo "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
        exit 1
        ;;
esac

xcodebuild -version
xcodegen --version

simulator_devices=$(xcrun simctl list devices available)
if ! printf '%s\n' "$simulator_devices" | grep 'iPhone' >/dev/null; then
    echo "No available iPhone Simulator was found." >&2
    echo "Open Xcode > Settings > Components and install an iOS Simulator runtime." >&2
    exit 1
fi

echo "Xcode, XcodeGen, and an iPhone Simulator: OK"
