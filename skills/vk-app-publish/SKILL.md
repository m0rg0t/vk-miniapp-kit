---
name: vk-app-publish
description: Prepare and ship a VK Mini App to the VK catalog — build, package build.zip (index.html at the zip root), deploy via vk-miniapps-deploy, verify vk-hosting-config.json, and run a full pre-submission checklist of required assets and settings. Use this skill whenever the user wants to publish, deploy, release, ship, or submit a VK Mini App, build the upload artifact, or says "выложить/опубликовать приложение", "залить в каталог", "собрать build.zip". Prefer this over ad-hoc build steps whenever the goal is a VK release.
---

# Publish a VK Mini App

Get from "code works" to "uploaded to VK" without the usual foot-guns: a zip with
`index.html` nested one folder too deep, a missing asset size, or forgetting the
mobile-only smoke test.

## Workflow

### 1. Run the checklist

Open `references/checklist.md` and work it top to bottom. It cross-references the
asset skills (`vk-app-assets`, `vk-lottie-launch-icon`, `vk-catalog-screenshots`)
for anything not yet produced. Don't skip the **assets** and **app settings**
sections — those are the usual rejection causes.

### 2. Verify the build & config

```bash
npm run build                 # must succeed with no type errors
cat vk-hosting-config.json    # check app_id, static_path, endpoints
```

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
bash "$CLAUDE_PLUGIN_ROOT/skills/vk-app-publish/scripts/package.sh"
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
- Either the deploy uploaded cleanly, or `build.zip` exists with `index.html` at
  its root.
- The checklist in `references/checklist.md` is fully ticked, including the
  mobile smoke test.
