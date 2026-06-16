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
