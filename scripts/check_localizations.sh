#!/bin/sh
set -eu

catalog="AeriDay/Resources/Localizable.xcstrings"
info_catalog="AeriDay/Resources/InfoPlist.xcstrings"

jq -e . "$catalog" "$info_catalog" >/dev/null

jq -e '
  .strings
  | to_entries
  | all(
      .value.localizations.en.stringUnit.state == "translated"
      and .value.localizations["zh-Hans"].stringUnit.state == "translated"
      and (.value.localizations.en.stringUnit.value | length > 0)
      and (.value.localizations["zh-Hans"].stringUnit.value | length > 0)
    )
' "$catalog" >/dev/null

echo "Localization coverage (en / zh-Hans): OK"
