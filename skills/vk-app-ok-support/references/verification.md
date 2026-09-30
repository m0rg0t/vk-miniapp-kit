# Verification and release evidence

## Local contract tests

Use the target's existing test runner. The bundled policy fixture is a portable
baseline, not a substitute for integration tests of the target service/UI.

Cover these meaningful behaviors:

- Mixed launch parameters select OK correctly; no markers select standalone.
  Configured public links never include signed launch query values.
- Concurrent init-dependent requests initialize once; repeated probes share
  the capability result. Init/probe rejections and stuck promises resolve to a
  bounded optional state while core content remains usable.
- Every known OK web variant rejects story availability even when the mock
  says true. Supported native OK and VK stories remain available; a false
  capability hides them in both platforms.
- OK stories omit attachment and renderable clickable zones without losing
  supported media/stickers; the VK payload is unchanged. Original payload
  objects are not mutated.
- Share accepts the installed SDK array and intended legacy objects. Empty
  array/type-null/known structured decline is quiet; malformed responses,
  unknown errors, and timeouts remain failures rather than success.
- Banner attempts are not gated on `CheckBannerAd`; no fill reserves no space.
  Successful overlay/resize geometry is handled once.
- Profile failure does not block the screen; late profile enrichment does not
  overwrite manual input.
- Automatic and custom analytics exclude launch URL query/hash and referrer
  secrets. Check actual request payloads, not only config flags.

Use fabricated token sentinels, never a user's real query, in privacy fixtures.
For a backend, add OK-specific valid/tampered/wrong-app/malformed/expired/future
and cross-platform identity tests using its actual verification contract.

## Browser matrix

Use existing browser tooling or the local framework's runner. Keep mocks
allow-listed and development/test-only; production must resolve the real SDK.

| Context | Required behavior |
|---|---|
| Standalone, no launch params | Main flow works, no hanging native calls, browser/manual sharing |
| Standalone OK UI preview | VK community/promos absent from first paint; clean OK links; useful content |
| Mock OK desktop/mobile web, story support falsely true | No story CTA; link share still available |
| Mock native OK with supported stories | Story CTA, sanitized payload, cancel/failure paths |
| Mock VK | Existing links, community policy, stories, recommendations preserved |
| Rejected/stuck Bridge, no ads/profile | Content usable, manual input/share accessible, no blank ad gap |

Exercise a compact mobile viewport and desktop, light/dark theme events,
archive/navigation/back behavior, footer accessibility, repeat clicks, and
manual copy-dialog keyboard behavior where these exist in the product. Test
sharing the app before content selection separately from sharing selected
content. Load a normal production build without mocks at least once.

A forced `vk_client=ok` on localhost proves UI routing only. Do not report it
as authenticated OK launch, native story, ad fill, or moderation evidence.

## Real-client matrix

Use the authorized user's existing session where available. Verify the actual
app iframe's production origin and sanitized launch fields; the outer OK page
URL alone does not prove which build was embedded. Browser accessibility trees
and traces can expose signed iframe URLs: read scoped content or redact them
before persistence. Store only an allow-list such as platform, client variant,
public app IDs, production origin, outcome categories, and build identifier.

| Client | Main checks |
|---|---|
| OK desktop web | Main content/routes, first-render links, share composer and cancel, hidden stories, banner result/theme |
| OK mobile web | Same web policy plus mobile navigation/layout, actual link share and cancel |
| OK Android | Launch, supported story editor and cancel, sanitized story payload, share, theme/insets, ads if supported |
| OK iOS | Same native flows; verify separately rather than extrapolating from Android |
| VK clients relevant to the product | Existing main flow, platform links and native features have no regression |

Select known content; avoid changing unrelated account/preferences while
smoke-testing. Open native share/story UI and cancel when verifying capability.
Do not post, invite contacts, grant broad permissions, or publish to feed/story
unless that external action is part of the user's authorized request.

Distinguish attempted, editor opened, cancelled, failed, and actually published.
A screenshot of a composer is evidence of an opened composer. A successful
Bridge response or mock is not evidence of a published post/story.

## Hosting and platform configuration

Use the existing app resource/runbook. A shared frontend is usually sufficient
for this adaptation; create a separate build/backend only for a demonstrated
platform need. Confirm whether Git push triggers Auto Deploy. Follow an
already-running automatic deployment rather than queueing a duplicate.

If deployment is authorized, record source commit/build, host release outcome,
HTTPS health, and hashes or version fingerprints of the actual changed JS/CSS/
HTML and media. Recheck in the embedded app, including caching. For a module
split, ensure every new JS/analytics module was deployed. Health HTTP 200 alone
does not prove the user is running the changed bundle. Record rollback to the
previous known working source/build according to the host's workflow.

Hosting release, enabling the OK platform, submitting moderation, and catalog
readiness are separate states. Inspect current admin forms for required
policy/support/copy/assets; old docs or VK catalog checks are not sufficient
for OK. An OK public card redirecting to a clean alias is fine if verified;
do not turn that redirect into a universal URL assumption.

## App-specific report

Write a concise report in the target repository, for example
`docs/ok-support.md`, with:

- Date, configured public VK/OK links, and implemented platform behavior.
- Sources for facts; explicitly label observed client quirks and product choices.
- Commands/results for unit, browser, and build checks, noting mock vs real SDK.
- A row per actual client, build tested, real outcomes, and untested flows.
- Remaining native devices, support/contact, admin/moderation, or deployment
  steps; do not collapse these into “OK works”.
- If released: commit/build, host evidence, public bundle verification, rollback.

Keep personal launch fields, session/signature/access tokens, profile data,
private browser snapshots, and operational credentials out of the report.
