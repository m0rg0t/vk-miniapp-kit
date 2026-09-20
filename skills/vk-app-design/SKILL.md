---
name: vk-app-design
description: Design, implement, or review VK Mini App screens with VKUI and @vkontakte/icons, including panel navigation, platform adaptivity, compact and regular layouts, light/dark appearance, safe areas, accessibility, loading/empty/error states, forms, and native-feeling interactions. Use when building UI, translating a brief or mockup into React, improving UX, replacing unnecessary custom controls with VKUI, or when the user says “сделай интерфейс VK мини-приложения / используй VKUI”. Apply to new and existing apps; use an available separate vkui skill for deeper library guidance, but continue from official docs and installed package types when it is absent.
---

# Design and build with VKUI

Make the app feel native to VK while preserving the product's own identity.

## Workflow

1. Read the product brief and inspect the installed versions, existing routes,
   theme provider, CSS, and components. Resolve library guidance with
   [`references/vkui-sources.md`](references/vkui-sources.md); the separate
   `vkui` skill is optional, never an implicit dependency.
2. Draw a small route/panel and state map. Identify the primary action on each
   screen and keep navigation compatible with VK back behavior.
3. Choose VKUI primitives before custom components. Read
   `references/vkui-patterns.md` for mappings and implementation gates.
4. Implement one vertical slice at a time:
   - structure and navigation;
   - real states and validation;
   - Bridge/data integration;
   - compact/regular adaptation;
   - light/dark and accessibility polish.
5. Verify visually in the running app at narrow mobile and regular desktop
   widths. Exercise every state, not only the populated happy path.
6. Run the project's typecheck, tests, lint, and build. Use `vk-app-test` for
   mocked Bridge scenarios and browser flows.

## Guardrails

- Prefer VKUI tokens, typography, spacing, controls, icons, and feedback
  patterns. Add custom CSS for product-specific layout and brand expression, not
  to recreate standard controls.
- Preserve a single obvious primary action per screen.
- Keep tappable controls reachable and labels explicit. Icon-only actions need
  accessible names and must remain understandable without color.
- Render loading, empty, error, disabled, and success states deliberately.
- Respect appearance and platform adaptivity; do not hardcode a light
  background or a phone-only fixed width.
- Avoid replacing a coherent existing design system merely to satisfy a library
  preference. Integrate VKUI where it improves host consistency.
- Never guess a component name or prop from memory. Match implementation to the
  version installed in the target app.

## Done when

- The primary journey is complete with real states and navigation.
- VKUI is used for applicable primitives and custom behavior has a clear reason.
- Compact/regular widths, light/dark appearance, keyboard/focus basics, and long
  Russian text have been checked.
- Typecheck/build pass and the critical flow is ready for `vk-app-test`.

## Bundled references

- [`references/vkui-sources.md`](references/vkui-sources.md) — optional `vkui`
  skill routing and the fallback source order for version-specific APIs.
- [`references/vkui-patterns.md`](references/vkui-patterns.md) — component,
  layout, appearance, state, and interaction patterns.
