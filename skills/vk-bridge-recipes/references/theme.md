# Theme / appearance (vk-bridge)

The VK client tells the app which color scheme to use and emits an event when the
user switches it. Match it so the app feels native.

## React: `useAppearance` (simplest)

`@vkontakte/vk-bridge-react` exposes a hook that returns the current appearance
and updates on change. It returns `null` in standalone mode (outside VK).

```tsx
import { useAppearance } from '@vkontakte/vk-bridge-react';

const appearance = useAppearance(); // 'light' | 'dark' | null
```

With **VKUI**, feed this into `ConfigProvider`/`AdaptivityProvider` (or
`appearance` on the root config) so all VKUI components restyle automatically —
you rarely style by hand.

## Manual (no React hook)

Subscribe to bridge events and read the scheme from the `VKWebAppUpdateConfig`
payload:

```ts
import { vkBridgeSubscribe } from '../services/vkBridge';

const unsubscribe = vkBridgeSubscribe((event) => {
  if (event.detail?.type === 'VKWebAppUpdateConfig') {
    const scheme = event.detail.data.scheme; // e.g. 'space_gray' | 'bright_light'
    document.body.setAttribute('data-scheme', scheme);
  }
});
// call unsubscribe() on cleanup
```

`VKWebAppUpdateConfig` also fires on launch with the initial config, so you don't
need a separate "get" call — subscribe early.
