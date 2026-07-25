---
name: vk-catalog-copy
description: Prepare and validate paste-ready VK Mini App catalog Description and Short description values as single-line plain text with exact character counts and current admin-form limits. Use for каталог copy, описание, краткое описание, store-card text, or when multiline/Markdown drafts must be converted for VK publication. Reject line breaks, Markdown list markers, emoji, and over-limit values; verify the current VK admin form before finalizing.
---

# Prepare VK catalog copy

Produce two separate values that can be pasted into the current VK admin form
without reformatting.

## Read the current form first

Open the app's current catalog form before editing copy. Record:

- the date checked;
- the form URL or a saved screenshot path;
- the displayed limit for `Описание`;
- the displayed limit for `Краткое описание`.

Treat the form as authoritative. If it is inaccessible, ask for screenshots of
the two fields and keep the package blocked until requirements are evidenced.
The known 2026-07-26 defaults are 2000 and 128 characters; pass different
values to the script if the current form differs.

## Derive copy from the shipped app

Inspect the running app and implemented flow. Write benefits and demonstrable
behavior only. Keep each value on one line, convert lists to connected phrases
separated by semicolons, and omit emoji. Use `vk-app-listing` for policy,
localization, category, moderation notes, and the wider listing pack.

Create a draft JSON:

```json
{
  "description": "Full description draft",
  "shortDescription": "Short description draft"
}
```

Normalize and validate it:

```bash
SKILL_DIR="<absolute path to the installed vk-catalog-copy skill>"
node "$SKILL_DIR/scripts/catalog-copy.mjs" prepare \
  --input release/catalog/catalog-copy.draft.json \
  --out release/catalog/catalog-copy.json \
  --checked-at YYYY-MM-DD \
  --requirements-source "current VK admin form or screenshot path" \
  --description-limit 2000 \
  --short-limit 128
```

The command writes the final values plus exact character counts and prints two
plain-text blocks. Validate an existing result with:

```bash
node "$SKILL_DIR/scripts/catalog-copy.mjs" validate \
  release/catalog/catalog-copy.json
```

Never hand-edit the stored character counts; rerun `prepare`.

## Done when

- Both final values are non-empty single-line plain text.
- Neither value contains Markdown list markers, formatting, or emoji.
- Counts are at or below the limits copied from the current form.
- The requirements date/source and final `catalog-copy.json` are recorded.
