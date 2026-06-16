# vk-miniapp-kit

A Claude Code plugin that captures the repeatable, fiddly parts of shipping a
[VK Mini App](https://dev.vk.com/mini-apps) so they take seconds instead of an
afternoon.

## Skills

| Skill | Use it when you want to… |
|-------|--------------------------|
| **vk-catalog-screenshots** | Capture catalog/store screenshots at VK's exact spec (600×1200 portrait, ≥3). |
| **vk-app-assets** | Generate/resize app icons & splashscreens to every required size from one source image. |
| **vk-lottie-launch-icon** | Author or validate a Lottie animated launch icon (96×96, ≤24 KB, seamless loop). |
| **vk-app-scaffold** | Bootstrap a new VK Mini App on the official stack (React 18 + VKUI 7 + vk-bridge + router + Vite + Vitest). |
| **vk-bridge-recipes** | Add vk-bridge features (init, ads, analytics, theme, share, storage) with a dev-mock fallback and prod-visible diagnostics. |
| **vk-app-publish** | Build, package `build.zip`, deploy via `vk-miniapps-deploy`, and run a catalog submission checklist. |

> Status: **v0.1.0** — `vk-catalog-screenshots` is built first; the rest follow.

## Install

Clone or symlink into your Claude Code plugins, or add the marketplace it lives
in. Skills are auto-discovered from `skills/<name>/SKILL.md`.

```bash
# local development: point Claude Code at this folder as a plugin source
git clone <this-repo> ~/vk-miniapp-kit
```

## Design notes

- **Tool-selection is built into the skills, not assumed.** For example,
  `vk-catalog-screenshots` prefers the `agent-browser` CLI, then falls back to
  Playwright, then puppeteer-core — so it works on whatever browser tooling the
  machine has.
- **Platform facts are verified, not memorized.** Where a skill states VK's
  required sizes or a `vk-bridge` method signature, it points at the
  authoritative source so the recipe stays correct as VK evolves.

## License

MIT
