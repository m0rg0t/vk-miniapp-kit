# Runtime implementation

## Platform context and public links

Resolve context once in the service and expose it to the UI. Give `vk_client=ok`
precedence over ordinary VK parameters. In the reference app, `vk_platform` or
`vk_app_id` without the OK marker selected VK; no launch markers selected a
standalone website. Preserve a different established standalone policy if the
product needs it.

Keep configuration separate from launch data:

- `vkAppId`: the target's VK identifier, stored as a string.
- `okAppId`: the target's distinct OK identifier, stored as a string.
- Public URLs: `https://vk.com/app{vkAppId}` and
  `https://ok.ru/app/{okAppId}`, or a verified clean public OK alias.
- `clientPlatform`: the original `vk_platform`, for capability policy.

The optional policy asset constructs clean public links from configured IDs.
Never derive the share URL from the host iframe URL or its signed query. Only
add an allow-listed product deep link if the receiving app handles it in both
platforms. Do not strip parameters from the current page to clean a share URL:
that can lose the running host context. Use scroll/router actions for a brand
link instead of reloading the app's bare root URL.

An OK UI preview (`?vk_client=ok`) is useful without authentication. Keep actual
embedding/native host detection separate; prefer the installed SDK's host
check. Neither launch markers nor simply being in an arbitrary iframe proves
native Bridge availability or server identity.

## Initialize once, render independently

Extend the existing service rather than wiring another Bridge instance.
Memoize the initialization promise so concurrent profile/ads/capability calls
wait for the same `VKWebAppInit`. Memoize method probes within the current
client session, with a way to refresh if the host context actually changes.

Use bounded waiting. The reference app used 8 seconds for initialization,
2 seconds for support checks, and 120 seconds for interactive dialogs. These
are tuning choices, not OK requirements. Adapt them to the product and avoid
using a short network timeout for a user editing a story or choosing a share.

Load core content independently. A missing birth date, a stuck capability
probe, or no ad fill must not leave the main screen indefinitely loading.
Return structured states such as `unavailable`, `declined`, `failed`, and
`timeout`; render the appropriate state instead of throwing into the UI.

A Promise timeout does not cancel a native dialog. Do not automatically retry
interactive actions on timeout. Prevent duplicate clicks while pending and
avoid opening a competing share flow when the original editor may still be
active. A timeout fallback can offer passive manual copy with clear status.

## Sharing and cancellation

Use `VKWebAppShare` with an explicit clean platform app link, even before
content/profile selection when sharing the app itself. A content share may
include a public text summary in browser/manual fallbacks. Do not assume the
Bridge link method accepts arbitrary text just because Web Share does.

Normalize responses against installed SDK types and observed legacy hosts:

| Result | Handling in the reference adapter |
|---|---|
| Nonempty Bridge 3 array with a recognized share `type` | Success |
| Legacy object with recognized `type`, or `{ result: true }` | Success |
| Empty array or legacy `{ type: null }` | User declined |
| Structured `client_error` with `error_data.error_code === 4` | Declined in the tested share/story contracts |
| Malformed response or other rejection | Failure; keep a useful fallback |

Do not infer success from any truthy object/array. The bundled normalizer
allow-lists Bridge 3.0.2 share types (`message`, `post`, `story`, `qr`, `link`,
`other`); update that list if the installed SDK introduces another documented
type. The code-4 mapping is method/host specific, not a universal rule for
payments, permissions, or every OK API error. Retain separate application
handling for browser `AbortError` cancellation.

Confirmed cancellation is quiet: reenable the control without an error toast
or a second dialog. For unavailable/failed methods, try an appropriate browser
share/copy flow or offer a manual dialog containing the exact public text and
link. Web Share/Clipboard may be unavailable in an iframe, denied, or require
fresh user activation; offer a user-clicked copy button/manual selection.
Support close button, Escape, focus return, and the app's back behavior.

Replace a VK recommendation CTA with “Поделиться приложением” in OK when that
fits the product. Keep VK recommendation behavior behind its own capability
probe. This replacement was a product policy, not a general SDK restriction.

## Stories: client policy and payload

Apply the known OK web exclusion before `supportsAsync`:

```js
const knownOkWeb = context.platform === 'ok' &&
  ['desktop_web', 'desktop_web_ok', 'mobile_web', 'mobile_web_ok']
    .includes(context.clientPlatform);
const storyEnabled = realHost && !knownOkWeb &&
  await boundedSupports('VKWebAppShowStoryBox');
```

Preserve native Android/iOS stories when supported. Keep the action initially
hidden until its policy/probe resolves to avoid a flash of an unusable CTA.
Unknown variants need conservative failure handling and cannot be reported as
native support merely because they are not in the web set.

Start from the app's existing image/video/background and valid SDK payload.
For OK only:

1. Remove top-level `attachment` completely, rather than making it null or
   replacing its URL with an OK link.
2. For each `stickers[]` entry with `sticker_type: 'renderable'`, remove
   `entry.sticker.clickable_zones`.
3. Preserve other supported media, transforms, and native stickers. Validate
   payload positions against the installed types; do not perpetuate an
   old example's incorrectly positioned fields.
4. Keep the original VK payload intact. Avoid mutating shared payload objects
   when building the OK request.

The bundled asset covers these deletions. It does not validate all story
schema fields or build media; that remains the service's responsibility.

Use media delivery accepted by the current method/client (verified public
HTTPS image/video or a supported encoded background). Do not assume browser
Blob URLs, base64 sticker content, or a media mode work on every native client
without evidence. A successful editor response does not prove that a user
published the story. Label analytics accordingly (for example editor opened,
not published). Cancellation and failures follow the sharing rules above.

## Ads, optional profile, and configuration

After initialization, probe `VKWebAppShowBannerAd` support and attempt the show.
`VKWebAppCheckBannerAd` describes an already displayed banner; using its false
result to block the initial show is a bug. Interpret `result: true` as shown;
no fill/rejection means no reserved blank ad area. Inspect actual host resize
vs overlay behavior before adding padding so a resized viewport is not padded
twice. Clean up/hide the banner only where supported and appropriate.

Native/rewarded ads are a separate flow. Verify their actual client/method
availability and grant a reward only on the documented completion result.
A shown desktop banner does not prove native ads or rewarded ads work there.

`VKWebAppGetUserInfo` is optional enrichment. Validate fields before use,
retain manual input, and ignore a late initial-profile suggestion after the
user chooses. Keep profile/birthdate out of unnecessary persistence and
analytics. Do not use the response as authorization for private server data.

Subscribe to `VKWebAppUpdateConfig`, handle actual theme/insets emitted by the
client, and unsubscribe on cleanup. It is a receive-only event, not a method
to `send`. Theme/profile/ad failures do not block content.

## UI, privacy, and server boundary

Hide VK community and VK-only outbound promotion controls before the first OK
render. A static app can start with HTML `hidden` then reveal in allowed
contexts; a component app can gate the first render from synchronously parsed
context. Renaming a VK community link still exposes VK and fails this policy.
Complete [the branding audit](branding-audit.md) for all app-owned text,
links, accessibility labels, and visual assets. Theme captions such as
“как в VK” are user-facing branding even without a VK link. Select neutral
copy or accurate platform-specific copy from the same platform context as
the rest of the UI, including initial HTML and failure states. If the support
contact is absent, report the gap and preserve available app flows.

Sanitize every analytics page view and custom event, not only the initial one.
Explicitly remove query/hash from both the document URL and referrer. Do not
spread raw launch context, errors, profiles, or iframe attributes into payloads.
The reference Umami integration disabled automatic tracking and sent an
explicit pathname plus a referrer restricted to HTTP(S) origin/path (dropping
credentials/query/hash). Use the equivalent supported controls for the target
analytics product and inspect the outgoing payloads.

Emit diagnostics such as method + outcome category, not raw SDK errors, token
values, full URLs, or profile bodies. Keep useful diagnostics in production
without depending on dev-only logging. Redact browser traces/screenshots and
reports as well as application logs.

For private backends, verify signed identity with the current OK contract on
the server, validate relevant app IDs and timestamps, reject tampering/replay,
and create platform-scoped sessions. Keep secure keys server-only. Do not
extend an unsigned `vk_client` UI branch into trusted authorization, and do not
merge OK/VK accounts by numeric ID coincidence. Inspect shared upload services'
authentication compatibility before connecting OK clients.
