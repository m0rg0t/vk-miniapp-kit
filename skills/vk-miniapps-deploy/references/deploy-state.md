# VK deploy state and recovery

## State fields

`vk-deploy-state.json` contains:

| Field | Meaning |
|---|---|
| `schemaVersion` | State schema, currently `1` |
| `appId` | App ID from `vk-hosting-config.json` |
| `deployPackageVersion` | Installed `@vkontakte/vk-miniapps-deploy` version |
| `officialLatestVersion` | Latest version checked in the npm registry before upload |
| `apiVersion` / `apiBase` | API contract inspected from the installed deploy package/config |
| `version` | Version returned by the upload task |
| `productionUrl` | Exact URL checked after confirmation |
| `uploadedAt` | Time the version was recorded |
| `status` | `uploaded`, `api-confirmed`, or `confirmed` |
| `confirmedAt` | Successful confirmation time |
| `productionHttpStatus` | Must be `200` for completion |
| `productionCheckedAt` | Most recent production URL verification time |

Never add a token or one-time code to this file.

## Recovery rules

- New code, same saved version: run `confirm`; do not upload.
- Requested version differs from saved version: stop and obtain the code for the
  saved/current upload. Do not guess which version the code belongs to.
- Code rejected: leave the uploaded state intact and request a current code.
- Confirmation succeeds but URL is not 200: preserve the state, diagnose
  hosting/endpoint propagation, and rerun `confirm`; `api-confirmed` state skips
  the API/code step and only retries URL verification.
- Catalog icon/snippet/copy changed: update the catalog card only.

The current official deploy package source uses `apps.confirmDeploy` with
`app_id`, `version`, and `code`. Reinspect the installed source before adapting
this workflow to a future major version.
