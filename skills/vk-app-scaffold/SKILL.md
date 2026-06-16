---
name: vk-app-scaffold
description: Scaffold a new VK Mini App on the official stack — React 18 + VKUI 7 + vk-bridge + vk-mini-apps-router + Vite (+ Vitest), via the official create-vk-mini-app generator — then optionally layer on proven conventions (centralized bridge service with dev mock, env-aware logger, ESLint no-console, Testing Library setup). Use this skill whenever the user wants to start, create, bootstrap, or set up a new VK Mini App / VK мини-приложение / VK app project. For adding features to an existing app use vk-bridge-recipes, and for releasing one use vk-app-publish — this skill is for creating a new app. Prefer this over a generic React setup whenever the target runs inside VK.
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
- **Vitest + Testing Library** with a `vk-bridge`-mocking `src/test/setup.ts`.

Apply each with TDD where it adds real code, matching the template's existing
style.

### 4. Point to the next skills

A fresh app usually needs assets and, eventually, release:
- icons/splashscreens → **`vk-app-assets`**
- animated launch icon → **`vk-lottie-launch-icon`**
- catalog screenshots → **`vk-catalog-screenshots`**
- bridge features (ads/analytics/share/storage) → **`vk-bridge-recipes`**
- publish → **`vk-app-publish`**

## Done when

- The generated app installs and `npm run dev` renders the starter.
- Any conventions the user opted into are applied and the app still runs/tests
  pass.
- The user knows which sibling skill to reach for next.
