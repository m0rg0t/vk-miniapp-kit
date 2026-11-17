---
name: vk-app-ok-support
description: Adapt an existing VK Mini App to run in Odnoklassniki (OK, Одноклассники) while preserving VK behavior. Use for adding OK support, auditing vk_client=ok behavior, or fixing VK branding leaks, OK moderation rejections, platform-specific sharing, stories, links, ads, launch data, and real-client compatibility. Extend the existing app and Bridge service; platform publication and deployment are separate actions.
---

# VK Mini App support in Odnoklassniki

Keep one product and content source where practical. Add an explicit platform
policy to the existing Bridge service and UI. Preserve the project's current
framework: an OK adaptation does not require converting a static app to React,
replacing VKUI, or creating another hosting resource.

## Establish the target

Inspect repository instructions, Git status, installed Bridge version/types,
current service, launch parsing, public links, backend identity, analytics,
tests, and hosting. Obtain the target app's own VK and OK IDs; do not copy IDs,
URLs, branding, credentials, or deployment identifiers from an example.

Refresh the [official OK compatibility page](https://apiok.ru/apps/vk) and
method-specific VK documentation before relying on platform details. Read
[references/compatibility.md](references/compatibility.md) for the relevant
methods, contradictory/obsolete documentation, and source precedence.

Distinguish three kinds of evidence: current official documentation, an
observation in a named real client, and a product choice. A method missing from
a table is not necessarily unavailable. A successful mock or a
`?vk_client=ok` browser preview is not a real OK client test.

## Implement the adaptation

Read [references/implementation.md](references/implementation.md) before
changing runtime behavior. Keep these invariants:

- `vk_client=ok` selects OK UI and public links. Preserve `vk_platform` as the
  client variant. These browser values do not authenticate anyone.
- Use a configured clean OK app URL for sharing. Never share `location.href`
  or copy signed launch query parameters into navigation, logs, or analytics.
- Remove VK/ВКонтакте branding from every app-owned user-facing OK surface,
  including the initial render, settings/theme captions, errors, accessibility
  labels, and generated media. Read and complete
  [references/branding-audit.md](references/branding-audit.md); hiding community
  links and promotions alone is insufficient. Preserve technical SDK names and
  VK behavior; use a provided OK contact without inventing one.
- Initialize Bridge once; bound initialization and support checks. Load core
  content independently of optional profile, capability, and ad requests.
- Require a real host and method support for native calls. A standalone
  preview must remain usable without Bridge, including preview with OK UI.
- Keep stories available in supported native OK clients. Suppress them in
  known OK web/mobile-web variants even if `supportsAsync` returns true: the
  desktop client has been observed declaring support and rejecting the editor.
  Recheck this restriction against current docs and real-client evidence.
- Remove story `attachment` and renderable sticker `clickable_zones` only
  for OK. Retain the media, supported stickers, and the existing VK payload.
- Keep user cancellation quiet; provide link/text fallback for genuine
  failures. Do not assume opening a native dialog proves publication.
- Probe banner method support, then attempt showing it. Do not gate the first
  banner on `VKWebAppCheckBannerAd` or reserve space for an absent banner.
- Treat profile data as optional. A late profile response must not replace a
  choice the user already made.

The optional [assets/ok-platform-policy.mjs](assets/ok-platform-policy.mjs)
contains dependency-free launch/link selection, story policy/payload adaptation,
and share response normalization. Copy or translate only the parts needed by
the existing service. It is not a complete SDK, authentication verifier, or
proof of native capability. Its fixtures are in
[scripts/test-platform-policy.mjs](scripts/test-platform-policy.mjs):

```bash
SKILL_DIR="<absolute path to the installed vk-app-ok-support skill>"
node --test "$SKILL_DIR/scripts/test-platform-policy.mjs"
```

## Verify behavior and report evidence

Read [references/verification.md](references/verification.md) for unit,
browser, real-client, privacy, and release checks. Cover VK regressions as well
as OK. Make a fake-positive web story capability an explicit test, alongside
native OK support and unchanged VK stories. Treat the branding audit as a
required gate: source search, rendered OK UI, and visual assets need separate
evidence; an empty search result alone cannot prove absence of VK mentions.

Record separate results for OK desktop web, mobile web, Android, and iOS.
Unknown/untested clients remain unverified. Test the real share editor and
cancel it; actual feed/story publication is a separate user action. Retain
sanitized evidence without raw iframe launch URLs, session tokens, or profiles.

Real-client failure cases from an earlier adaptation are summarized in
[references/compatibility.md](references/compatibility.md); treat them as
historical observations, not current guarantees for another app.

## Scope and sibling skills

- **vk-bridge-recipes** owns general Bridge integration. Extend its existing
  service; apply this skill's OK-specific policy instead of copying VK-only
  assumptions, links, payloads, or raw diagnostic logging.
- **vk-app-test** owns the full runtime mock/browser harness. Add OK scenarios
  locally; do not turn production launch parameters into a mock switch.
- **vk-app-security** owns backend trust review. Confirm the OK-specific
  signature, identifier, and session contract before enabling private APIs;
  its VK verifier must not be assumed to verify OK launches unchanged.
- **vk-app-design** owns substantial UI changes. Preserve the chosen framework
  and expose platform context through the service rather than scattering raw
  URL parsing throughout components.
- **vk-app-listing / vk-app-publish / vk-miniapps-deploy** own catalog and VK
  hosting operations when requested. Their VK catalog checks do not prove OK
  moderation or OK form readiness. For other hosts, follow the app's runbook.

Code adaptation does not authorize new platform settings, catalog submission,
feed publication, or a new deployment. Honor existing task authorization;
check whether a requested push triggers an automatic hosting release.

## Done when

The implementation preserves VK, completes the user-facing VK branding audit,
renders a clean OK interface before native capabilities resolve, handles
unsupported/declined/timed-out calls, passes
relevant local tests and build, and has an app-specific report recording real
client results and exact remaining checks. Claim OK release readiness only
for clients and publication requirements supported by direct evidence.
