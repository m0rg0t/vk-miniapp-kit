# Sharing (vk-bridge)

Let users share the app or content back into VK. Common methods:

| Method | Use for |
|--------|---------|
| `VKWebAppShare` | Share a link via the system share sheet |
| `VKWebAppShowWallPostBox` | Open a pre-filled wall-post composer |
| `VKWebAppShowStoryBox` | Open the story editor with media |

## Share a link

```ts
const result = await vkBridgeService.share('https://vk.com/app<APP_ID>');
// result?.type indicates how the user shared (or null if cancelled/failed)
```

Omit the argument to share the app's own URL (VK fills it in).

## Wall post (pre-filled composer)

```ts
import { vkBridgeSend } from '../services/vkBridge';

await vkBridgeSend('VKWebAppShowWallPostBox', {
  message: 'Check out this VK Mini App!',
  attachments: 'https://vk.com/app<APP_ID>',
});
```

The user always sees and confirms the composer — nothing posts silently.

## Notes

- Sharing opens VK-native UI; there's nothing to render in dev (the mock returns
  a canned result so your success path still runs).
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
