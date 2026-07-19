---
name: vk-app-listing
description: "Prepare a complete VK Mini App publication/listing pack from the shipped product: app names, short and full descriptions, keywords/category suggestions, Russian and optional English localization, screenshot captions/order, icon and splash manifest, support details, privacy-policy draft, data disclosure, moderation notes, and a final catalog field checklist. Use when the user asks for catalog/store copy, описание/короткое описание, publication materials, privacy text, localization, moderation submission, or wants all screenshots/logos/descriptions organized for release. Coordinate image production with vk-app-assets and vk-catalog-screenshots; do not invent features the app does not ship."
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
3. Write the full description in benefit-first order:
   - what the user can do now;
   - the core flow and differentiators;
   - relevant limitations or requirements;
   - a restrained call to action.
4. Localize by meaning, not word-for-word. Russian is the default unless the
   target audience says otherwise; add English when distribution requires it.
5. Map screenshot order and captions to demonstrable in-app moments. The first
   image carries the clearest promise.
6. Inventory every required visual file and measured dimension. Delegate missing
   identity art to `vk-app-assets`, animation to `vk-lottie-launch-icon`, and
   in-app captures to `vk-catalog-screenshots`.

## Privacy and moderation

Read `references/privacy-and-moderation.md`. Derive disclosures from actual
code/data flow:

- launch parameters and user/profile fields used;
- Bridge permissions requested;
- local, VK cloud, or backend storage;
- analytics and advertising;
- retention/deletion path and contact.

Draft policy text but label jurisdiction-specific legal review as external. Do
not claim “no data collected” while analytics, identifiers, storage, or a
backend are active.

## Quality checks

- Count characters against the current admin fields.
- Remove claims not visible in the build or supported by evidence.
- Use consistent terminology across app UI, descriptions, captions, and policy.
- Check capitalization, Russian typography, links, support contact, and version.
- Record the final chosen copy and exact asset paths in one manifest.

## Done when

- The copy pack contains paste-ready short/full descriptions for each target
  locale plus category/keyword and support suggestions.
- Privacy/moderation notes match the implementation.
- Every required logo, icon, splash, animation, and screenshot is present or has
  an explicit owner and generation step.
- The final manifest is ready to work through with `vk-app-publish`.
