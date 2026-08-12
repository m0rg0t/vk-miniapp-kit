---
name: vk-app-scaffold
description: Scaffold a new VK Mini App with the current official create-vk-mini-app generator and its React, VKUI, vk-bridge, vk-mini-apps-router, Vite, hosting, and deploy conventions, then optionally add centralized Bridge mocking, logging, lint, and Vitest/Testing Library setup. Use whenever the user wants to start, create, bootstrap, or set up a new VK Mini App / VK мини-приложение / VK app project. Inspect the generated package versions rather than pinning remembered majors. For adding features to an existing app use vk-bridge-recipes; for releasing one use vk-app-publish.
---

# Scaffold a new VK Mini App

Stand up a new VK Mini App the way VK intends, then (optionally) add the
conventions that keep it maintainable — without reinventing the template.

## Workflow

### 1. Generate with the official tool

Don't hand-assemble the stack; use VK's generator so you get the current,
supported template (VKUI + Bridge + Router + Vite + hosting/deploy config).

```bash
npm init @vkontakte/vk-mini-app@latest <app-dir> -- --typescript --template=vkui-bridge-router
```

See `references/stack.md` for npx/yarn forms, template choices, and exactly
what the template includes. Use `vkui-bridge-router` unless the user explicitly
wants no router (`vkui-bridge`).

Inspect `package.json` after generation and adapt all subsequent code to those
installed majors. Do not force an older React/VKUI/Bridge version from this
skill.

### 2. Install & verify it runs

```bash
cd <app-dir> && npm install
npm run dev    # open the printed localhost URL; confirm the starter renders
```

### 3. Offer the conventions (don't force them)

The template is intentionally minimal. Ask whether to add the proven conventions
from `references/stack.md`:

- **Bridge service + dev mock** → defer to the **`vk-bridge-recipes`** skill,
  which bundles drop-in `vkBridge.ts` / `logger.ts` / mock. This is the
  highest-leverage addition.
- **Env-aware logger + `logger.diag`** for prod-visible diagnostics.
- **ESLint flat config** with `no-console: error` (logger file exempted).
- **Vitest + Testing Library** with the scenario-controlled harness from
  **`vk-app-test`** and an optional standalone `@vkontakte/vk-bridge-mock` mode.

Apply each with TDD where it adds real code, matching the template's existing
style.

### 4. Point to the next skills

A fresh app usually needs assets and, eventually, release:
- icons/splashscreens → **`vk-app-assets`**
- animated launch icon → **`vk-lottie-launch-icon`**
- catalog screenshots → **`vk-catalog-screenshots`**
- bridge features (ads/analytics/share/storage) → **`vk-bridge-recipes`**
- VKUI screen implementation → **`vk-app-design`**
- local and release testing → **`vk-app-test`**
- paste-ready catalog descriptions → **`vk-catalog-description`**
- privacy/moderation/listing pack → **`vk-app-listing`**
- publish → **`vk-app-publish`**

## Done when

- The generated app installs and `npm run dev` renders the starter.
- Any conventions the user opted into are applied and the app still runs/tests
  pass.
- The user knows which sibling skill to reach for next.
