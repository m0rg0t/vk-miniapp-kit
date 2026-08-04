---
name: vk-app-publish
description: Orchestrate a VK Mini App release from current admin-form evidence through catalog preflight, build/package, version-bound VK hosting confirmation, production HTTP verification, real-client smoke testing, and submission. Use for publish, deploy, release, ship, "выложить/опубликовать приложение", "залить в каталог", or build.zip. Do not declare readiness until the common asset/copy preflight passes, and do not redeploy hosting for catalog-only icon, snippet, or description changes.
---

# Publish a VK Mini App

Coordinate the release gates without conflating catalog-card uploads with a
hosting deploy.

## 1. Read the current admin form

Open the exact app's current settings/catalog form. Record the check date and
form URL or screenshot path. Treat those visible requirements as authoritative;
if the form is inaccessible, request screenshots and leave the catalog gate
blocked.

Open `references/checklist.md` and work top to bottom.

## 2. Build and preflight the catalog package

Load the sibling owners:

- `vk-app-assets`: mandatory `icon-576.png`, real-UI/icon
  `catalog-snippet-1120x630.png`, reproducible sources, privacy review, and the
  common manifest/preflight;
- `vk-catalog-copy`: single-line paste-ready Description and Short description
  with exact counts;
- `vk-catalog-screenshots`: current-form dimensions/count;
- `vk-lottie-launch-icon`: strict 96×96, weight, and seamless-loop validation
  when animation is present;
- `vk-app-listing`: policy, category, localization, support, and moderation.

Run:

```bash
ASSETS_DIR="<absolute path to the installed vk-app-assets skill>"
node "$ASSETS_DIR/scripts/catalog-preflight.mjs" \
  release/catalog/catalog-manifest.json
```

Do not say `пакет готов`, upload the listing, or submit while this exits
non-zero.

## 3. Verify code, security, build, and package

```bash
DOCTOR_DIR="<absolute path to the installed vk-app-doctor skill>"
SECURITY_DIR="<absolute path to the installed vk-app-security skill>"
node "$SECURITY_DIR/scripts/security-scan.mjs" --strict
node "$DOCTOR_DIR/scripts/vk-app-doctor.mjs" --strict
npm run build
node "$DOCTOR_DIR/scripts/vk-app-doctor.mjs" --release --strict
cat vk-hosting-config.json
```

Resolve launch-authentication and client-secret findings. For a manual artifact:

```bash
SKILL_DIR="<absolute path to the installed vk-app-publish skill>"
bash "$SKILL_DIR/scripts/package.sh"
```

It guarantees `index.html` is at the zip root.

## 4. Decide whether hosting needs a deploy

- Code/build/runtime asset changed or no production version exists: load
  `vk-miniapps-deploy`, upload once, record its exact version, confirm the code
  against that version, and require production HTTP 200.
- Only catalog icon, snippet, screenshots, copy, policy, or contacts changed:
  update the catalog card; do **not** run a production deploy.
- A new confirmation code arrived for the recorded version: run the deploy
  skill's `confirm` command; do **not** upload again.

## 5. Smoke test both contexts

Test the verified production URL in an ordinary browser and inside a real VK
mobile/web client. Record launch params, theme, core flow, decline/error states,
and console result separately. State honestly when the VK-client check did not
happen.

## 6. Submit and report

The final report must list:

- exact icon, snippet, composition source, screenshot, Lottie, copy, policy, and
  support paths;
- measured image dimensions/bytes and both copy counts/limits;
- current-form check date/source;
- installed deploy package version, uploaded version, confirmation state;
- production URL and observed HTTP 200;
- ordinary-browser and VK-client smoke-test results.

## Done when

- The common catalog preflight is green.
- Strict security/doctor/build/package gates pass.
- Hosting was deployed only when needed, with code bound to saved version.
- Production URL returns HTTP 200.
- Real VK client was tested or recorded as an explicit external blocker.
- The current admin checklist is complete and the exact final report exists.
