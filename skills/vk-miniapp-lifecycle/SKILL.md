---
name: vk-miniapp-lifecycle
description: Coordinate an entire VK Mini App delivery from a raw idea through project diagnosis, product planning, official scaffolding, VKUI-first design, VK Bridge integration, backend security, mocked local testing, publication assets and catalog descriptions, packaging, release verification, and optional launch promotion. Use for broad requests such as “build/ship a VK Mini App”, “сделай VK мини-приложение под ключ”, or whenever work spans multiple lifecycle phases. Resume from the current repository state and route focused work to the sibling vk-* skills instead of duplicating their detailed procedures.
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

1. **Establish the baseline — `vk-app-doctor`.** Run the read-only development
   audit and record findings instead of assuming a greenfield or healthy app.
2. **Shape the product — `vk-app-plan`.** Produce a build-ready brief, MVP
   boundary, screen map, platform/data requirements, event plan, and acceptance
   criteria.
3. **Create the base — `vk-app-scaffold`.** Use the current official generator,
   or preserve the existing app if it already has a healthy stack.
4. **Build the experience — `vk-app-design`.** Implement flows with VKUI and
   `@vkontakte/icons`, including adaptivity, theme, loading/empty/error states,
   and accessibility.
5. **Add platform capabilities — `vk-bridge-recipes`.** Centralize Bridge calls,
   initialize once, and add only the methods required by the brief.
6. **Protect trust boundaries — `vk-app-security`.** Verify signed launch
   identity on the backend, keep secure keys out of the browser, minimize
   permissions, and review data/API abuse paths.
7. **Prove behavior — `vk-app-test`.** Exercise the bundled runtime Bridge mock,
   controlled success/failure/event scenarios, unit/integration tests, and the
   critical browser journey. For a game's playable milestone, use
   `vk-gameplay-acceptance` to prove the first action, complete loop, content,
   progression, and rendered input. For interrupted/overlapping operations,
   lost progress, or version-boundary changes, use `vk-app-resilience` for the
   focused state/recovery contract. Keep evidence tied to the final revision.
8. **Prepare publication — `vk-app-assets`, `vk-catalog-description`,
   `vk-lottie-launch-icon`, `vk-catalog-screenshots`, and `vk-app-listing`.**
   Read the current admin form, keep real UI/identity/copy consistent, and pass
   the common catalog preflight.
9. **Release — `vk-app-publish` and `vk-miniapps-deploy`.** Run the strict
   gates, deploy only when code/runtime assets changed, bind confirmation to the
   saved upload version, verify HTTP 200, smoke-test in a real VK client, and
   complete the current admin checklist.
10. **Promote when requested — `vk-app-promo-video`.** After the shipped UI and
    claims are stable, capture privacy-reviewed real screens and create a short
    vertical video plus a still-image fallback. Promotion is optional and never
    blocks catalog readiness.

Load a sibling skill's `SKILL.md` before performing that phase. Load only the
references needed for the current task.

## Gates

Do not claim a later gate proves an earlier one:

| Gate | Required evidence |
|---|---|
| Product | Brief has a testable core loop, exclusions, and acceptance criteria |
| Build | Typecheck/build passes and primary routes render |
| Platform | `VKWebAppInit` and required Bridge methods have fail-open handling |
| Security | Signed launch identity, server-only secrets, authorization, and data handling are evidenced |
| Local QA | Mocked success, decline/error, and event scenarios pass |
| UX QA | Main flow works at compact mobile and desktop/web widths, light and dark |
| Gameplay, when applicable | Player-visible loop, content/progression invariants, recovery/reload, and inspected rendered input evidence |
| Resilience, when affected | Interrupted/overlapping actions, preserved saves, and applicable client/runtime compatibility proved at the final revision |
| Catalog | Current-form evidence and common preflight prove 576 icon, 1120×630 real-UI snippet, single-line copy, policy/contact, Lottie when used, and screenshots |
| Release | Strict release doctor, production build, saved/confirmed deploy version, HTTP 200, real-client smoke test, and admin checklist |

If a gate needs credentials, admin access, legal approval, or a real device,
finish all local evidence first and record the exact remaining manual check.

## Done when

- Every applicable gate has direct current-state evidence.
- The app can be developed outside VK with a controlled mock and tested inside
  VK before release.
- Catalog descriptions and visual assets describe the behavior that actually shipped.
- The release artifact and remaining admin actions are explicit and reproducible.
- Any requested promo package uses reviewed real UI, synthetic data, and only
  claims supported by the shipped app.
