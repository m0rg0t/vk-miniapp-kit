# VK Mini App — catalog submission checklist

Run top to bottom before submitting. The VK admin (`vk.com/editapp?act=...`) is
the source of truth for required fields and sizes.

## Assets (use the asset skills to produce these)

- [ ] **Catalog icon** 576×576 and master 1024×1024 — `vk-app-assets`
- [ ] **Splashscreens** 1080×1920 (portrait) and, if used, 1920×1080 — `vk-app-assets`
- [ ] **Animated launch icon** (optional) 96×96, ≤24 KB, seamless — `vk-lottie-launch-icon`
- [ ] **Catalog screenshots** ≥3 at 600×1200 (or 1200×600), strongest first — `vk-catalog-screenshots`
- [ ] All asset dimensions verified (each skill's verify step passed)

## App settings (in the admin)

- [ ] App name + short description (both languages if targeting RU+EN)
- [ ] Category / section chosen
- [ ] Privacy policy URL if the app collects data
- [ ] Open API / domains / trusted redirect set if the app needs them

## Build & hosting

- [ ] `npm run build` succeeds with no type errors
- [ ] `vk-hosting-config.json` valid: correct `app_id`, `static_path` (e.g. `dist`),
      and `endpoints` (`mobile` / `mvk` / `web` → `index.html`)
- [ ] Choose a deploy path:
  - **VK hosting:** `npm run deploy` (build + `vk-miniapps-deploy`). First run
    prompts for a deploy token from the admin.
  - **Manual zip:** `package.sh` → upload `build.zip` (index.html at zip root).

## Smoke test before submitting

- [ ] Open the app inside the **VK mobile client** (not just desktop web) — some
      features (e.g. banner ads) are mobile-only.
- [ ] Launch params resolve, theme matches the client, no console errors.
- [ ] Core flow works end to end on a real device or m.vk.com.

## Common rejection causes

- Wrong asset sizes / distorted images (non-square icon, stretched splash).
- Screenshots not portrait or fewer than required.
- `index.html` nested inside a folder in the zip instead of at the root.
- App errors on first launch because `VKWebAppInit` wasn't called.
