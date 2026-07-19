---
name: vk-app-publish
description: Prepare and ship a VK Mini App to the VK catalog — build, package build.zip (index.html at the zip root), deploy via vk-miniapps-deploy, verify vk-hosting-config.json, and run a full pre-submission checklist of required assets and settings. Use this skill whenever the user wants to publish, deploy, release, ship, or submit a VK Mini App, build the upload artifact, or says "выложить/опубликовать приложение", "залить в каталог", "собрать build.zip". This covers releasing/deploying an existing app, not creating one — use vk-app-scaffold for a new app. Prefer this over ad-hoc build steps whenever the goal is a VK release.
---

# Publish a VK Mini App

Get from "code works" to "uploaded to VK" without the usual foot-guns: a zip with
`index.html` nested one folder too deep, a missing asset size, or forgetting the
mobile-only smoke test.

## Workflow

### 1. Run the checklist

Open `references/checklist.md` and work it top to bottom. It cross-references the
asset skills (`vk-app-assets`, `vk-lottie-launch-icon`, `vk-catalog-screenshots`)
and `vk-app-listing` for anything not yet produced. Don't skip the **assets**,
**catalog copy**, **privacy**, and **app settings** sections.

### 2. Verify the build & config

```bash
DOCTOR_DIR="<absolute path to the installed vk-app-doctor skill>"
SECURITY_DIR="<absolute path to the installed vk-app-security skill>"
node "$SECURITY_DIR/scripts/security-scan.mjs" --strict
node "$DOCTOR_DIR/scripts/vk-app-doctor.mjs" --strict
npm run build                 # must succeed with no type errors
node "$DOCTOR_DIR/scripts/vk-app-doctor.mjs" --release --strict
cat vk-hosting-config.json    # check app_id, static_path, endpoints
```

The pre-build development doctor catches structural warnings without requiring
output that does not exist on a clean checkout. The post-build release doctor
records every configured endpoint. Resolve launch-authentication and
client-secret findings; do not waive them as catalog-only concerns.

`static_path` (usually `dist`) must point at the build output, and each endpoint
(`mobile` / `mvk` / `web`) should resolve to `index.html`.

### 3. Choose a deploy path

**VK hosting (simplest):**

```bash
npm run deploy   # = vite build && vk-miniapps-deploy
```

First run prompts for a deploy token (create it in the app admin). It uploads
`static_path` to VK hosting per `vk-hosting-config.json`.

**Manual zip (when uploading by hand):**

```bash
SKILL_DIR="<absolute path to the installed vk-app-publish skill>"
bash "$SKILL_DIR/scripts/package.sh"
# → build.zip, with index.html guaranteed at the zip ROOT
```

The script reads `static_path` from `vk-hosting-config.json`, rebuilds (unless
`--skip-build`), zips the *contents* of that dir (not the dir itself), and fails
loudly if `index.html` isn't at the root — the single most common upload
rejection.

### 4. Smoke test in the real client

Open the app in the **VK mobile client** (or m.vk.com), not just desktop web —
some features (banner ads, native ads) are mobile-only and won't render on
desktop. Confirm launch params resolve, the theme matches, the core flow works,
and the console is clean.

### 5. Submit

Upload the artifact / confirm the deploy in the admin, fill in catalog metadata,
and submit for review.

## Done when

- Build succeeds; `vk-hosting-config.json` is valid.
- The strict security scan and release doctor pass, or remaining external
  admin/legal/device checks are recorded explicitly.
- Either the deploy uploaded cleanly, or `build.zip` exists with `index.html` at
  its root.
- The checklist in `references/checklist.md` is fully ticked, including the
  mobile smoke test.
