---
name: vk-miniapps-deploy
description: Deploy and confirm a VK Mini App hosting version without accidentally uploading a replacement. Use for vk-miniapps-deploy, hosting upload, одноразовый код подтверждения, apps.confirmDeploy, deployment version tracking, production URL verification, or when a new confirmation code arrives for an existing upload. Inspect the installed and current official deploy package versions, persist upload version state, bind every code to that version, and require HTTP 200 after confirmation.
---

# Deploy a VK Mini App version safely

Keep hosting upload, confirmation, and catalog-card materials as separate
operations. A change to icon, catalog snippet, or listing copy does not justify
a new production deploy.

## Verify the deploy tool

Inspect the project before using version-specific behavior:

```bash
node -p "require('./node_modules/@vkontakte/vk-miniapps-deploy/package.json').version"
npm view @vkontakte/vk-miniapps-deploy version
```

Read the installed package source/types and the current official repository when
the versions or behavior differ. Versions below 1.0.0 are deprecated by the
official package; upgrade deliberately instead of relying on remembered CLI
behavior. Use the
[VKCOM/vk-miniapps-deploy repository](https://github.com/VKCOM/vk-miniapps-deploy)
as the public source, not a third-party tutorial.

## Upload exactly once

Build and run the existing deploy command while retaining its output:

```bash
mkdir -p release
npm run deploy 2>&1 | tee release/vk-deploy.log
```

As soon as the CLI prints `Uploaded version ...`, record that version:

```bash
SKILL_DIR="<absolute path to the installed vk-miniapps-deploy skill>"
node "$SKILL_DIR/scripts/deploy-state.mjs" record \
  --log release/vk-deploy.log \
  --state release/vk-deploy-state.json \
  --config vk-hosting-config.json \
  --latest-version "the npm view result" \
  --production-url "https://the-actual-production-url/"
```

The state records app ID, deploy package version, uploaded version, URL, and
timestamp. It never stores access tokens or confirmation codes. Show the
uploaded version explicitly in the work report.

## Confirm the recorded version

If the CLI is still waiting, enter the code there. If a new code arrives later,
do **not** run deploy again. Confirm the recorded upload directly:

```bash
export VK_DEPLOY_CONFIRM_CODE="<one-time code>"
export MINI_APPS_ACCESS_TOKEN="<deploy access token>"
node "$SKILL_DIR/scripts/deploy-state.mjs" confirm \
  --state release/vk-deploy-state.json \
  --version "<the version shown to the user>"
```

The command stops before any network call when `--version` differs from saved
state. Otherwise it calls only `apps.confirmDeploy` for the saved app/version,
then requests the saved production URL and requires HTTP 200. It does not
upload, build, or invoke `vk-miniapps-deploy`.

Read `references/deploy-state.md` when diagnosing state or API failures.

## Test both contexts

After confirmation, test the production URL in an ordinary browser and inside a
real VK client. Record each result separately. Never let a browser-only pass
stand in for the VK client smoke test.

## Done when

- Installed/current deploy package versions were checked and recorded.
- The uploaded version is saved in `vk-deploy-state.json`.
- The code was confirmed for exactly that version without another upload.
- The production URL returned HTTP 200.
- Ordinary-browser and real-VK-client results are explicit.
