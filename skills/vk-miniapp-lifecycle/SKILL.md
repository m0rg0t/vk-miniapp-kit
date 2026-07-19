---
name: vk-miniapp-lifecycle
description: Coordinate an entire VK Mini App delivery from a raw idea through product planning, official scaffolding, VKUI-first design, VK Bridge integration, mocked local testing, publication assets and catalog copy, packaging, and release verification. Use for broad requests such as “build/ship a VK Mini App”, “сделай VK мини-приложение под ключ”, or whenever work spans multiple lifecycle phases. Resume from the current repository state and route focused work to the sibling vk-* skills instead of duplicating their detailed procedures.
---

# VK Mini App lifecycle

Drive the app to a verified catalog-ready state. Treat the sibling skills as
phase owners and preserve evidence from each gate.

## Start from evidence

Inspect the repository, app admin details supplied by the user, and existing
artifacts. Classify each phase as complete, partial, missing, or not applicable.
Do not restart a working app or regenerate accepted assets.

Use one concise delivery tracker in the app repository (for example
`docs/vk-miniapp-delivery.md`) with:

- current phase and next gate;
- product decisions and unresolved external choices;
- commands and evidence that passed;
- paths to assets, copy, privacy text, and release artifacts.

## Route the lifecycle

1. **Shape the product — `vk-app-plan`.** Produce a build-ready brief, MVP
   boundary, screen map, platform/data requirements, event plan, and acceptance
   criteria.
2. **Create the base — `vk-app-scaffold`.** Use the current official generator,
   or preserve the existing app if it already has a healthy stack.
3. **Build the experience — `vk-app-design`.** Implement flows with VKUI and
   `@vkontakte/icons`, including adaptivity, theme, loading/empty/error states,
   and accessibility.
4. **Add platform capabilities — `vk-bridge-recipes`.** Centralize Bridge calls,
   initialize once, and add only the methods required by the brief.
5. **Prove behavior — `vk-app-test`.** Exercise standalone local development,
   controlled Bridge success/failure scenarios, unit/integration tests, and the
   critical browser journey.
6. **Prepare publication — `vk-app-assets`, `vk-lottie-launch-icon`,
   `vk-catalog-screenshots`, and `vk-app-listing`.** Keep visual identity,
   screenshots, and claims consistent with the shipped product.
7. **Release — `vk-app-publish`.** Build, package or deploy, smoke-test in a real
   VK client, and complete the current admin checklist.

Load a sibling skill's `SKILL.md` before performing that phase. Load only the
references needed for the current task.

## Gates

Do not claim a later gate proves an earlier one:

| Gate | Required evidence |
|---|---|
| Product | Brief has a testable core loop, exclusions, and acceptance criteria |
| Build | Typecheck/build passes and primary routes render |
| Platform | `VKWebAppInit` and required Bridge methods have fail-open handling |
| Local QA | Mocked success, decline/error, and event scenarios pass |
| UX QA | Main flow works at compact mobile and desktop/web widths, light and dark |
| Catalog | Copy, policy, icon/splash, and ≥3 screenshots match the actual app |
| Release | Production build plus real-client smoke test and admin checklist |

If a gate needs credentials, admin access, legal approval, or a real device,
finish all local evidence first and record the exact remaining manual check.

## Done when

- Every applicable gate has direct current-state evidence.
- The app can be developed outside VK with a controlled mock and tested inside
  VK before release.
- Catalog copy and visual assets describe the behavior that actually shipped.
- The release artifact and remaining admin actions are explicit and reproducible.
