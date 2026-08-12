---
name: vk-catalog-description
description: Prepare and validate persuasive, end-user-focused VK Mini App catalog Description and Short description values as paste-ready single-line plain text with exact character counts and current admin-form limits. Use for тексты каталога, описание приложения, продающее описание, краткое описание, store-card text, or converting technical/product drafts for VK publication. Lead with concrete user value, describe demonstrable outcomes in plain language, and reject implementation jargon, unsupported hype, line breaks, Markdown, emoji, or over-limit values.
---

# Write VK catalog descriptions

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

Inspect the running app and implemented flow. Write for a person encountering it
for the first time, not for a developer or moderator. Make the description
specific and inviting without hype:

1. Lead with the result the person can get or the problem they can solve.
2. Follow the real usage order with two to four strongest actions or benefits.
3. Add a trust or convenience point only when it affects the decision to use the
   app and is demonstrably true.
4. Prefer familiar verbs and concrete outcomes over feature inventories.

Treat “selling” as clear relevance, not superlatives. Do not claim “best”,
“unique”, “revolutionary”, effortless results, or capabilities absent from the
shipped app. Do not expose implementation details such as VK Bridge, WebView,
iframe, localStorage, IndexedDB, backend/frontend, launch parameters, browser
memory, or client-side processing. Translate them into a user benefit when it
matters; otherwise omit them. For example, replace “stored in localStorage” with
“your saved items remain available when you return” only if that behavior is
actually verified.

Make the short description a compact value proposition, not a shortened feature
list or the app name. A useful pattern is “action/result + differentiating
benefit”, within the current limit.

Keep each value on one line, convert lists to connected phrases separated by
semicolons, and omit emoji. Read both values aloud: a non-technical user should
understand what they gain without knowing how the app is built. Use
`vk-app-listing` for policy, localization, category, moderation notes, and the
wider listing pack.

Create a draft JSON:

```json
{
  "description": "Full description draft",
  "shortDescription": "Short description draft"
}
```

Normalize and validate it:

```bash
SKILL_DIR="<absolute path to the installed vk-catalog-description skill>"
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
- The opening sentence states a concrete user outcome or problem solved.
- Technical implementation terms are absent or rewritten as verified user
  benefits.
- The short description communicates a useful result rather than internal
  mechanics or unsupported hype.
- Counts are at or below the limits copied from the current form.
- The requirements date/source and final `catalog-copy.json` are recorded.
