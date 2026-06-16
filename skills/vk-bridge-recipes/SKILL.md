---
name: vk-bridge-recipes
description: Integrate vk-bridge features into a VK Mini App — app init, banner ads, native/rewarded ads, analytics, theme/appearance sync, sharing, and cloud storage — through a centralized service with a dev-mock fallback and prod-visible diagnostic logging. Use this skill whenever the user wants to add ads, баннер/реклама, a share button, dark/light theme syncing, cloud storage/настройки пользователя, app init, or call any VKWebApp* bridge method. Prefer this over raw bridge.send calls whenever wiring VK features.
---

# vk-bridge recipes

Wire VK features in cleanly: one centralized service that mocks in dev (so the
app runs in a plain browser), consistent timeout/error handling, and always-on
diagnostics for the things you can only debug inside the VK client.

## The pattern (set this up once)

Panels and hooks must never branch on environment. They call
`vkBridgeService.*`; the service decides mock-vs-real. Three drop-in files in
`assets/` implement it:

- `assets/logger.ts` — env-aware logger + `logger.diag` (always emits)
- `assets/vkBridgeMock.ts` — canned dev responses (storage round-trips in memory)
- `assets/vkBridge.ts` — the service: `isDevMode()`, `vkBridgeSend`,
  `vkBridgeService`, `vkBridgeSubscribe`, `initVkBridge`

### Install the service

```bash
cp "$CLAUDE_PLUGIN_ROOT/skills/vk-bridge-recipes/assets/logger.ts"        src/utils/logger.ts
cp "$CLAUDE_PLUGIN_ROOT/skills/vk-bridge-recipes/assets/vkBridgeMock.ts"   src/utils/vkBridgeMock.ts
cp "$CLAUDE_PLUGIN_ROOT/skills/vk-bridge-recipes/assets/vkBridge.ts"       src/services/vkBridge.ts
```

Adjust the two relative imports at the top of `vkBridge.ts` if your paths differ.
Then call `initVkBridge()` once at startup (in `App`), and add the ESLint
`no-console` override exempting `logger.ts` (see the `vk-app-scaffold` stack
notes). If the project already has a bridge service, **extend it** with the
methods you need rather than replacing it.

## Add a feature — read the matching reference

Each reference has verified signatures, a working snippet, and the gotchas:

| Want to… | Read | Service method(s) |
|----------|------|-------------------|
| Show ads (banner / interstitial / reward) | `references/ads.md` | `checkBannerAd` / `showBannerAd` / `hideBannerAd`, `checkAds` / `showAd` |
| Track events | `references/analytics.md` | (your `trackEvent`) + `getLaunchParams` |
| Match VK light/dark theme | `references/theme.md` | `useAppearance` / `vkBridgeSubscribe` |
| Share a link / wall post / story | `references/share.md` | `share`, `vkBridgeSend('VKWebAppShowWallPostBox', …)` |
| Persist per-user data | `references/storage.md` | `storageSet` / `storageGet` / `storageGetKeys` |

## Build it with TDD

This is real production code — follow red-green-refactor. The dev mock makes
hooks testable without the VK client: mock `../services/vkBridge` in the test,
assert your hook calls the right method with the right params, and that it
**fails open** (a declined/missing feature never throws). See the banner-hook
example in `references/ads.md` for the shape.

## Two facts that save hours

- **Several features are mobile-only or VK-client-only** (banner ads especially —
  they don't render in desktop web). Smoke-test in the VK mobile client.
- **Dev mocks don't render real VK UI.** Use `logger.diag` (not `logger.log`) to
  trace behavior in production, since dev logs are stripped from the build.

## Done when

- The service is installed (or extended) and `initVkBridge()` runs at startup.
- The requested feature works through `vkBridgeService.*`, with tests covering
  the success and fail-open paths.
- Nothing branches on environment outside `vkBridge.ts`.
