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

- [ ] `vk-app-listing` produced a catalog copy pack based on the shipped app
- [ ] App name + short/full description (both languages if targeting RU+EN)
- [ ] Category / section chosen
- [ ] Support/contact details are current
- [ ] Privacy policy URL is public and matches actual data behavior
- [ ] Open API / domains / trusted redirect set if the app needs them

## Build & hosting

- [ ] `vk-app-security` strict scan has no unresolved high/medium finding
- [ ] Signed launch identity is verified on the backend; secure/deploy keys are
      absent from browser code and the production bundle
- [ ] `vk-app-doctor --strict` passes before the build
- [ ] `npm run build` succeeds with no type errors
- [ ] `vk-app-doctor --release --strict` passes after the build and finds every
      configured endpoint file inside `static_path`
- [ ] Unit/integration/browser gates from `vk-app-test` pass
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
- [ ] Permission decline, expired/invalid authentication, and unauthorized API
      access fail safely without leaking sensitive diagnostics.

## Common rejection causes

- Wrong asset sizes / distorted images (non-square icon, stretched splash).
- Screenshots not portrait or fewer than required.
- `index.html` nested inside a folder in the zip instead of at the root.
- App errors on first launch because `VKWebAppInit` wasn't called.
