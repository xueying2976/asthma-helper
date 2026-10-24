#!/bin/sh
set -eu

if git ls-files | grep -Eq '(^|/)AeriDay\.xcodeproj/|(^|/)DerivedData/'; then
    echo "Generated Xcode or Derived Data files must not be tracked." >&2
    exit 1
fi

if find . -type f \( -name '*.xcuserstate' -o -name '*.xccheckout' \) \
    -not -path './.git/*' \
    -not -path './AeriDay.xcodeproj/*' | grep -q .; then
    echo "User-specific Xcode state was found in the repository." >&2
    exit 1
fi

echo "Generated-file policy: OK"
