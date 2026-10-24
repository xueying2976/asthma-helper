# Project documentation rules

## Paired Chinese and English documents

- Create and maintain every human-facing project document as two separate files: Simplified Chinese and US English.
- Name Markdown pairs `<BASE>.zh-CN.md` and `<BASE>.en-US.md`.
- Keep both files semantically equivalent: use the same document version, update date, heading order, decisions, requirements, risks, and references.
- Update both files in the same change. Do not leave one language stale or mark one as a future translation.
- Write each language naturally. Do not combine both languages into one document unless the user explicitly requests a bilingual single-file deliverable.
- Apply this rule to product requirements, outlines, decision records, research notes, design specifications, test plans, release notes, and other human-facing records.
- Source code, localization catalogs, machine-readable configuration, generated build output, third-party licenses, and vendor files do not require duplicate language files unless the user explicitly requests them.

## Medical content

- Preserve clinician-authored medication names, doses, numbers, and action-plan text exactly; do not translate them into altered instructions.
- Review Chinese and English medical wording independently for equivalent meaning, urgency, uncertainty, and safety boundaries.

