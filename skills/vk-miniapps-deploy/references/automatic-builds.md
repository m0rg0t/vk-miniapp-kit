# Automatic VK hosting uploads

Use the current
[VK Developer Portal CI guide](https://dev.vk.com/ru/mini-apps/development/hosting/ci),
the installed package source, and the current
[official deploy repository](https://github.com/VKCOM/vk-miniapps-deploy) as
authoritative sources. Reinspect them after a package major change.

## One-time preparation

1. Install a supported `@vkontakte/vk-miniapps-deploy`; versions below `1.0.0`
   are deprecated.
2. Complete one manual deploy from a trusted developer machine. Obtain the
   deploy access token printed by the tool, or use the service token exposed by
   the current app admin when the portal still documents that option.
3. Save the token as the masked CI secret `MINI_APPS_ACCESS_TOKEN`. Never put it
   in `vk-hosting-config.json`, repository variables visible to untrusted jobs,
   logs, caches, or build artifacts.
4. Restrict who can run production jobs and rotate the token after exposure or
   administrator changes.

`MINI_APPS_ACCESS_TOKEN` is the credential that gives the build job access to
automatic VK hosting publication. It can authorize file uploads for both
development and production environments; it is not limited to dev deploys. It
does not bypass the separate administrator confirmation required when
production URLs change.

The local configstore path documented by VK is a recovery source for a trusted
developer machine, not a file to copy into CI.

## Non-interactive configuration

Keep the checked-in config free of credentials:

```json
{
  "static_path": "build",
  "app_id": 123456,
  "endpoints": {
    "mobile": "index.html",
    "web": "index.html",
    "mvk": "index.html"
  },
  "noprompt": 1
}
```

- `noprompt: 1` skips the CLI's initial confirmation and environment questions.
- `static_path` must be the directory produced by the build.
- Every configured endpoint must exist below `static_path`.
- `MINI_APPS_APP_ID` may override `app_id`; require a positive integer.
- `HTTP_PROXY` / `HTTPS_PROXY` route API requests through a proxy when required.
- `CI_URLS=1` makes URL output easier for a CI job to parse.

## Environment policy

Require an exact allow-listed value:

| Value | Intended use | Confirmation |
|---|---|---|
| `MINI_APPS_ENVIRONMENT=dev` | Automatic development-URL upload | No code |
| `MINI_APPS_ENVIRONMENT=production` | Automatic upload plus protected production publication | Administrator code or push approval |

Do not omit the variable and do not tolerate typos. In package `1.0.2`, an
unknown value falls back to the default environment selection rather than
failing closed. Run `ci-preflight.mjs` to block that behavior before upload.

The portal states that a production update also changes development URLs.
Account for that side effect in the release report.

## Provider-neutral job

Install from the lockfile, build once, preflight the exact output, then deploy:

```bash
npm ci
npm run build

export MINI_APPS_ENVIRONMENT=dev
export CI_URLS=1
# MINI_APPS_ACCESS_TOKEN is injected by the CI secret store.

SKILL_DIR="<absolute path to the installed vk-miniapps-deploy skill>"
node "$SKILL_DIR/scripts/ci-preflight.mjs" \
  --config vk-hosting-config.json
npm run deploy 2>&1 | tee release/vk-deploy.log
```

If `package.json` already uses `predeploy` to build, avoid a second build or
ensure both commands produce identical output. Do not install `@latest` inside
the release job; commit the supported dependency and lockfile, then review
updates separately.

Retain the redacted deploy log and emitted URLs as CI evidence. Configure the
CI system's masking rules before the first run and fail the job if the deploy
command exits nonzero.

## Production upload is automatic but confirmation remains

The token lets CI build and upload a production version automatically. The
current official flow then sends a confirmation request to the main app
administrator and waits for a code or push approval before changing production
URLs. `noprompt` does not remove this security gate.

Use a protected manual job or release environment. Run the preflight with
`--allow-production`, upload once, save the exact version, and follow the
version-bound confirmation workflow in `SKILL.md`. A later confirmation code
must confirm the recorded version through `deploy-state.mjs`; it must not start
another deploy.
