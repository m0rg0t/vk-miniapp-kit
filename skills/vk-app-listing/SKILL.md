---
name: vk-app-listing
description: "Prepare the wider VK Mini App listing pack from the shipped product: names, category suggestions, localization, privacy-policy draft, data disclosure, moderation notes, screenshot story, support details, and catalog field inventory. Use for publication metadata, privacy text, localization, moderation submission, or organizing a catalog release. Delegate the paste-ready Description and Short description fields to vk-catalog-copy and the deterministic visual manifest/preflight to vk-app-assets; never invent features the app does not ship."
---

# Prepare a VK catalog listing

Turn verified product behavior into honest, consistent publication materials.

## Gather evidence

Read the product brief, running app, routes, analytics/storage/permission code,
existing policy, and current asset folders. Confirm current field limits and
required uploads in the VK app admin before final submission; do not rely on
memorized limits.

Create a working directory such as `release/catalog/` and use
`references/catalog-pack-template.md` for the copy pack.

## Write the listing

1. Define one positioning sentence: audience + job + concrete outcome.
2. Produce several concise name/short-description variants only if a product
   naming choice is still open; recommend one and explain the tradeoff briefly.
3. Load `vk-catalog-copy` and use it for the final `Описание` and `Краткое
   описание`. It owns one-line plain text, Markdown/emoji rejection, current
   limits, character counts, and `catalog-copy.json`.
4. Localize by meaning, not word-for-word. Russian is the default unless the
   target audience says otherwise; add English when distribution requires it.
5. Map screenshot order and captions to demonstrable in-app moments. The first
   image carries the clearest promise.
6. Inventory every required visual file and measured dimension. Delegate missing
   identity art and the 1120×630 snippet to `vk-app-assets`, animation to
   `vk-lottie-launch-icon`, and in-app captures to `vk-catalog-screenshots`.

## Privacy and moderation

Read `references/privacy-and-moderation.md`. Derive disclosures from actual
code/data flow:

- launch parameters and user/profile fields used;
- Bridge permissions requested;
- local, VK cloud, or backend storage;
- analytics and advertising;
- retention/deletion path and contact.

Cross-check these claims with the `vk-app-security` trust-boundary review and
scanner output. Privacy copy must describe the secured implementation, not a
planned control that is absent from the build.

Draft policy text but label jurisdiction-specific legal review as external. Do
not claim “no data collected” while analytics, identifiers, storage, or a
backend are active.

## Quality checks

- Require `vk-catalog-copy` validation rather than estimating or hand-counting.
- Remove claims not visible in the build or supported by evidence.
- Use consistent terminology across app UI, descriptions, captions, and policy.
- Check capitalization, Russian typography, links, support contact, and version.
- Record the final copy path and exact asset paths in the common
  `vk-app-assets` catalog manifest.

## Done when

- The pack references validated paste-ready copy for each target locale plus
  category/keyword and support suggestions.
- Privacy/moderation notes match the implementation.
- Every required logo, icon, splash, animation, and screenshot is present or has
  an explicit owner and generation step.
- The common catalog preflight passes before handoff to `vk-app-publish`.
