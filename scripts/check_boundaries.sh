#!/bin/sh
set -eu

if find AeriDayCore/Sources -type f -name '*.swift' -exec grep -En '^import (SwiftUI|SwiftData|HealthKit|CoreLocation|CloudKit|UIKit)$' {} +; then
    echo "AeriDayCore imported a forbidden platform framework." >&2
    exit 1
fi

if find AeriDay/Features -type f -name '*.swift' -exec grep -En '^import (SwiftData|HealthKit|CoreLocation|CloudKit)$|URLSession|HKHealthStore|ModelContext' {} +; then
    echo "A feature bypassed an injected service boundary." >&2
    exit 1
fi

if find . -type f -name '*.swift' -not -path './.git/*' -exec grep -En '^import (CloudKit|Firebase|AppCenter|Amplitude|Mixpanel|GoogleSignIn|FacebookCore)$' {} +; then
    echo "An unapproved cloud, account, advertising, or analytics SDK was found." >&2
    exit 1
fi

if grep -q 'com.apple.developer.healthkit.background-delivery' AeriDay/AeriDay.entitlements; then
    echo "HealthKit background delivery is outside the approved Phase 1.1 scope." >&2
    exit 1
fi

if grep -q 'NSHealthUpdateUsageDescription' AeriDay/Resources/Info.plist; then
    echo "HealthKit write access is outside the approved Phase 1.1 scope." >&2
    exit 1
fi

approved_healthkit_import='AeriDay/Infrastructure/HealthKit/'
if find AeriDay -type f -name '*.swift' -exec grep -l '^import HealthKit$' {} + \
    | grep -v "$approved_healthkit_import"; then
    echo "HealthKit was imported outside its approved infrastructure boundary." >&2
    exit 1
fi

echo "Dependency boundaries: OK"
