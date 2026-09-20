---
name: vk-catalog-description
description: Prepare and validate catchy, persuasive, end-user-focused VK Mini App catalog Description and Short description values as paste-ready single-line plain text with exact character counts and current admin-form limits. Use for тексты каталога, описание приложения, продающее описание, краткое описание, store-card text, or converting technical/product drafts for VK publication. Lead with a memorable user promise and demonstrable outcomes instead of narrating features one by one; reject implementation jargon, unsupported hype, line breaks, Markdown, emoji, or over-limit values.
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
for the first time, not for a developer or moderator. Before drafting, capture a
one-sentence message brief: who it is for, the moment they need it, the friction
it removes, the useful result, and one verified reason to choose it.

Draft at least three meaningfully different openings before choosing the final
one:

- **Outcome:** lead with the result the person can get.
- **Situation:** recognize a familiar moment or frustration, then offer relief.
- **Momentum:** invite the first useful action and make the payoff feel near.

Select the opening that is clearest on a quick read, sounds natural aloud, and
is best supported by the shipped app. Do not keep three superficial rewrites of
the same sentence. A question can be engaging, but use it only when it names a
real situation rather than adding empty drama.

Build the remaining description as a short product story:

1. Establish the promise or problem solved.
2. Show the core action and the result it unlocks.
3. Add one or two supporting benefits in the order a person experiences them.
4. Close with a useful reason to start or return, not a generic slogan.

Vary sentence length and use vivid, familiar verbs. Prefer concrete nouns and
specific outcomes over abstract claims. Avoid the feature-by-feature rhythm of
“есть X, есть Y, есть Z”, generic openings such as “Приложение позволяет…”, and
descriptions that merely mirror menu labels. The copy should create interest
while remaining immediately understandable.

Treat “selling” as clear relevance, not superlatives. Do not claim “best”,
“unique”, “revolutionary”, effortless results, or capabilities absent from the
shipped app. Do not expose implementation details such as VK Bridge, WebView,
iframe, localStorage, IndexedDB, backend/frontend, launch parameters, browser
memory, or client-side processing. Translate them into a user benefit when it
matters; otherwise omit them. For example, replace “stored in localStorage” with
“your saved items remain available when you return” only if that behavior is
actually verified.

Make the short description a memorable value proposition, not a shortened
feature list or the app name. A useful pattern is “action/result + verified
differentiator”. It should still make sense when shown alone on a catalog card.
Draft several short variants, remove interchangeable words, then keep the one
with the clearest promise and strongest rhythm within the current limit.

Keep each value on one line, convert lists to connected phrases separated by
semicolons, and omit emoji. Read both values aloud: a non-technical user should
understand what they gain without knowing how the app is built. Use
`vk-app-listing` for policy, localization, category, moderation notes, and the
wider listing pack.

Catchiness is an editorial judgment, not a script check. Before validation,
score the selected pair against this rubric:

- the intended person recognizes the need or payoff in the opening;
- the short description is distinctive enough that it could not describe any
  unrelated app;
- every benefit maps to visible or tested behavior;
- the prose flows as a story rather than an inventory;
- removing a sentence would lose useful meaning, not filler.

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
- The opening was selected from genuinely different angles and states a
  concrete user outcome, situation, or useful first action.
- The description reads as a compact product story, not a feature-by-feature
  inventory.
- Technical implementation terms are absent or rewritten as verified user
  benefits.
- The short description is memorable when read alone and communicates a useful
  result rather than internal mechanics or unsupported hype.
- Counts are at or below the limits copied from the current form.
- The requirements date/source and final `catalog-copy.json` are recorded.
