# Sharing (vk-bridge)

Use only supported share surfaces:

| Method | Use for |
|--------|---------|
| `VKWebAppShare` | Share a link via the system share sheet |
| `VKWebAppShowStoryBox` | Open the story editor with media |

Do not propose or implement `VKWebAppShowWallPostBox`. VK no longer supports
the wall-post event, even if it remains in stale examples, generated knowledge,
or installed package types. Replace an existing wall-post flow with one of the
two supported choices above.

## Share a link

```ts
const result = await vkBridgeService.share('https://vk.com/app<APP_ID>');
// Bridge 3 returns an array: result?.map(item => item.type).
// An empty array is a dismissed share; null is an unconfirmed/failed attempt.
```

Omit the argument to share the app's own URL (VK fills it in).

Normalize the installed SDK's response and any verified legacy host responses
inside the existing service. A truthy empty array or arbitrary object is not
proof of sharing. The OK adapter's host-specific normalization belongs to
`vk-app-ok-support`; do not apply its observed error-code mappings to every API.

## Cancellation ends the chosen action

Determine method availability before opening the native dialog. Preserve
separate application outcomes for `unavailable`, confirmed dismissal, response,
and failure/timeout. If the service collapses rejection/timeout to `null`, do not
reinterpret that ambiguous result as unavailable or confirmed cancellation.

After an offered share/story dialog closes, do not automatically call another
share method, open messages, write the clipboard, or expose a manual URL panel.
An error or timeout may leave the original dialog open. Offer an explicit retry
or alternative action if appropriate; require a fresh user action to invoke it.
Keep controls usable, clear obsolete fallback panels, and return focus. Do not
claim an invitation or story was sent from an editor-open response.

Use a human-interaction timeout rather than the generic network budget. The
bundled service defaults share/story calls to 120 seconds; this is a configurable
starting point, not a VK requirement. A Promise timeout does not close native UI;
clear its timer when the request settles and prevent duplicate pending actions.

When no native method is available, an explicit browser share/copy/manual path
may fit the product. Honor its feedback policy: a request for quiet copying means
no copied-link toast; do not make that preference mandatory for other products.
For Web Share, handle `AbortError` as cancellation rather than falling through
to copying. Clipboard permission failure can expose user-selected manual copy.

## Share through a story

```ts
import { vkBridgeSend } from '../services/vkBridge';

const result = await vkBridgeSend<{ result: true }>('VKWebAppShowStoryBox', {
  background_type: 'image',
  url: 'https://example.com/story-background.png',
  attachment: {
    text: 'open',
    type: 'url',
    url: 'https://vk.com/app<APP_ID>',
  },
});

// After this attempt, keep the app usable; do not chain a link share or copy
// from result === null or result?.result === false.
```

Use a publicly reachable PNG or JPEG for an image background, or pass a
supported `blob`. Label the action as opening/sharing through the story editor:
the user can edit or cancel there, and a successful Bridge response confirms
that the editor opened, not that the story was published.

## Notes

- Sharing opens VK-native UI; there's nothing to render in dev (the mock returns
  a canned result so your success path still runs).
- Treat unavailable methods, user cancellation, and Bridge errors as normal
  fail-open states. Cancellation does not request another sharing surface.
- Build share URLs as `https://vk.com/app<APP_ID>` (optionally `#<hash>` for deep
  links your router reads on launch).

## Sharing app content through a deep link

Treat every shared URL as public and attacker-controlled on import.

1. Define a versioned, allow-listed payload such as
   `{ v: 1, kind: 'plan', data: { ... } }`.
2. Remove personal identifiers, private state, access tokens, and fields the
   recipient does not need.
3. Encode the canonical JSON as URL-safe base64 (or use a backend-generated
   opaque short code when the payload is not small).
4. URI-encode the resulting hash/query value and measure the final URL. If it is
   too long for the current share surface, do not truncate it—switch to an
   opaque server-side code.
5. On import, enforce a length limit before decoding, validate the version,
   `kind`, schema, field lengths, and enum values, then show a preview before
   persisting an independent copy.
6. Handle malformed, unknown-version, expired, and duplicate payloads as normal
   recoverable states.

Never use a shared payload as proof of identity, authorization, entitlement, or
payment. Sign or look up security-sensitive state on a trusted backend.
