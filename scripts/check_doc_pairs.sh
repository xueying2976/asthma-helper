#!/bin/sh
set -eu

status=0

for chinese in $(find . -type f -name '*.zh-CN.md' -not -path './.git/*' -print); do
    english="${chinese%.zh-CN.md}.en-US.md"
    if [ ! -f "$english" ]; then
        echo "Missing English document pair: $english" >&2
        status=1
        continue
    fi

    chinese_version=$(grep -E -m 1 -o 'v[0-9]+(\.[0-9]+)*' "$chinese" || true)
    english_version=$(grep -E -m 1 -o 'v[0-9]+(\.[0-9]+)*' "$english" || true)
    if [ "$chinese_version" != "$english_version" ]; then
        echo "Document version mismatch: $chinese / $english" >&2
        status=1
    fi

    chinese_date=$(grep -E -m 1 -o '[0-9]{4}-[0-9]{2}-[0-9]{2}' "$chinese" || true)
    english_date=$(grep -E -m 1 -o '[0-9]{4}-[0-9]{2}-[0-9]{2}' "$english" || true)
    if [ "$chinese_date" != "$english_date" ]; then
        echo "Document update-date mismatch: $chinese / $english" >&2
        status=1
    fi

    chinese_heading_levels=$(grep -E '^#{1,6} ' "$chinese" | sed 's/ .*//' | tr '\n' ' ')
    english_heading_levels=$(grep -E '^#{1,6} ' "$english" | sed 's/ .*//' | tr '\n' ' ')
    if [ "$chinese_heading_levels" != "$english_heading_levels" ]; then
        echo "Document heading-structure mismatch: $chinese / $english" >&2
        status=1
    fi
done

for english in $(find . -type f -name '*.en-US.md' -not -path './.git/*' -print); do
    chinese="${english%.en-US.md}.zh-CN.md"
    if [ ! -f "$chinese" ]; then
        echo "Missing Chinese document pair: $chinese" >&2
        status=1
    fi
done

if [ "$status" -ne 0 ]; then
    exit "$status"
fi

echo "Bilingual document pairs: OK"
