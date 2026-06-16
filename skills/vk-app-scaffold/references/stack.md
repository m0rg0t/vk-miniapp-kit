# VK Mini App stack & conventions

## Official scaffolder

VK ships a project generator. The recommended template includes VKUI, VK Bridge,
and the router:

```bash
# npm (note the `--` before flags)
npm init @vkontakte/vk-mini-app@latest <app-dir> -- --typescript --template=vkui-bridge-router

# npx
npx @vkontakte/create-vk-mini-app <app-dir> --typescript --template=vkui-bridge-router

# yarn
yarn create @vkontakte/vk-mini-app <app-dir> --typescript --template=vkui-bridge-router
```

Templates: `vkui-bridge-router` (recommended), `vkui-bridge` (no router),
`vkui-only` (not a mini app). Node ≥ 18 → current generator; older Node needs
`create-vk-mini-app` v1.

What the template gives you: React 18 + VKUI 7 + `@vkontakte/vk-bridge`
(+ `@vkontakte/vk-bridge-react`) + `@vkontakte/vk-mini-apps-router`, Vite,
`vk-hosting-config.json`, `vk-miniapps-deploy`, `vk-tunnel`, and the
`public/resources/app/` asset folder (icon/splashscreen sources).

## Conventions to layer on top (proven, optional)

The template is a clean start; these conventions make a real app maintainable.
Add them only if the user wants them.

### 1. Centralized bridge service with a dev mock
Never branch on environment inside panels. Route every `VKWebApp*` call through
one service that mocks in dev so the app runs in a plain browser. See the
**`vk-bridge-recipes`** skill — it bundles a drop-in `vkBridge.ts` + `logger.ts`
+ mock.

### 2. Environment-aware logger + always-on diagnostics
`logger.log/info/warn` suppressed in production, `logger.error` always, plus a
`logger.diag` that always emits (`console.info`) — essential for tracing things
you can only debug inside the VK client (e.g. why an ad didn't show). Pair with
ESLint `no-console: error` everywhere **except** the logger file.

### 3. Testing: Vitest + Testing Library
`vitest` + `@testing-library/react` + `@testing-library/jest-dom`, jsdom env,
globals on, a `src/test/setup.ts` that mocks `@vkontakte/vk-bridge`. Use
`fireEvent` (the template usually omits `@testing-library/user-event`).

### 4. ESLint flat config
`eslint src/ --max-warnings 0`, `no-console: error` project-wide with a single
override turning it `off` for `src/utils/logger.ts`.

## VKUI v7 gotchas (save debugging time)

- `Header` has **no** `aside` prop — use `after` (right side) or `afterTitle`
  (16px inline).
- `Popover` with the default click trigger is touch-correct (auto-closes on
  outside click / Escape) — good for tap tooltips/help hints.
- All panels usually stay mounted inside `<View>`, so app-wide effects (banner
  ads, analytics init) belong at the `App` level, driven once.
