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
// result?.type indicates how the user shared (or null if cancelled/failed)
```

Omit the argument to share the app's own URL (VK fills it in).

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

if (!result) {
  // Decline, unavailable editor, or Bridge failure: keep the app usable.
}
```

Use a publicly reachable PNG or JPEG for an image background, or pass a
supported `blob`. Label the action as opening/sharing through the story editor:
the user can edit or cancel there, and a successful Bridge response confirms
that the editor opened, not that the story was published.

## Notes

- Sharing opens VK-native UI; there's nothing to render in dev (the mock returns
  a canned result so your success path still runs).
- Treat unavailable methods, user cancellation, and Bridge errors as normal
  fail-open states. Do not silently fall back to a wall post.
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
