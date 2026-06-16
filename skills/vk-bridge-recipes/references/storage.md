# Cloud storage (vk-bridge)

Per-user key/value storage that persists across devices (unlike localStorage).
Values are **strings** — `JSON.stringify` structured data yourself.

## Write

```ts
await vkBridgeService.storageSet('prefs', JSON.stringify({ theme: 'dark', lang: 'ru' }));
```

## Read

```ts
const res = await vkBridgeService.storageGet(['prefs', 'last_seen']);
// res?.keys = [{ key: 'prefs', value: '{"theme":"dark",...}' }, { key: 'last_seen', value: '' }]
const prefs = res?.keys?.[0]?.value ? JSON.parse(res.keys[0].value) : {};
```

A missing key returns an entry with an empty-string `value` — guard before
`JSON.parse`.

## Enumerate keys

```ts
const { keys } = (await vkBridgeService.storageGetKeys(50, 0)) ?? { keys: [] }; // count, offset
```

## Signatures (verified)

- `VKWebAppStorageSet { key, value }` → `{ result: boolean }`
- `VKWebAppStorageGet { keys: string[] }` → `{ keys: Array<{ key, value }> }`
- `VKWebAppStorageGetKeys { count, offset }` → `{ keys: string[] }`

## Notes

- Keys: letters, digits, `_`, `-`. Keep values reasonably small.
- The bundled mock keeps an in-memory store so set/get **round-trips in dev** —
  you can build and test persistence flows without the VK client.
