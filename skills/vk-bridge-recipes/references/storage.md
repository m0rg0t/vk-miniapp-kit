# Cloud storage (vk-bridge)

Per-user key/value storage that persists across devices (unlike localStorage).
Values are **strings** — `JSON.stringify` structured data yourself.

## Name keys before using the API

Use a nonempty ASCII key matching `^[A-Za-z0-9_-]+$` for both
`VKWebAppStorageSet` and `VKWebAppStorageGet`. Latin letters, digits,
underscores, and hyphens are allowed; colons, dots, spaces, slashes, and
Cyrillic letters are not. Give each data shape a stable, versioned name:
`iskra_prefs_v1` is valid; `iskra:prefs:v1` is not. Keep the same constant for
reads and writes, and validate any dynamically assembled key before sending it.
This restriction applies to **VK Storage keys**; a separate `localStorage` key
may retain its existing name.

```ts
const isVkStorageKey = (key: string) =>
  key.length > 0 && !/[^A-Za-z0-9_-]/.test(key);
```

VK documentation: [StorageSet](https://dev.vk.com/ru/bridge/VKWebAppStorageSet),
[StorageGet](https://dev.vk.com/ru/bridge/VKWebAppStorageGet), and the
[VK-maintained Storage API reference](https://github.com/VKCOM/vk-mini-apps-api/blob/master/docs/classes/vkminiappapi.md#storage-methods)
(archived; it explicitly lists the allowed characters).

## Write

Save the local fallback before attempting the cloud write.

```ts
const PREFS_KEY = 'iskra_prefs_v1';
const saved = await vkBridgeService.storageSet(
  PREFS_KEY,
  JSON.stringify({ theme: 'dark', lang: 'ru' }),
);
if (saved?.result !== true) {
  // Keep the local copy and show/retry the unsynced state.
}
```

## Read

```ts
const res = await vkBridgeService.storageGet([PREFS_KEY]);
if (res === null) {
  // The request failed; do not treat this as an empty cloud record.
} else {
  const value = res.keys.find(({ key }) => key === PREFS_KEY)?.value;
  if (value) {
    try {
      const prefs: unknown = JSON.parse(value);
      // Validate the parsed shape before applying it.
    } catch {
      // Keep local progress; do not overwrite an unreadable cloud record.
    }
  }
}
```

A missing key returns an entry with an empty-string `value` — guard before
`JSON.parse`. A failed real Bridge call returns `null` from the bundled service;
the development mock rejects an invalid key. Neither failure should trigger a
first-run overwrite of cloud data.

## Restore existing progress after a key fix

If an invalid VK key was rejected, it has no cloud value to rename. Preserve
the app's existing local data key and read that local progress during migration.
Read the new valid VK key first. If the cloud read succeeds and has data, parse
and validate it; apply the app's conflict policy if local progress also exists.
If the read succeeds but the cloud value is empty, seed it from the local copy
and confirm `storageSet` returned `{ result: true }`. On a read/write failure,
keep the local copy and retry later. Do not replace a nonempty cloud record
with default or stale local state. If devices have diverged, define a merge or
user choice for that product; one device cannot read another device's local
storage.

Test an existing local-only user, a returning user with cloud data, an empty
cloud record, a rejected read/write, and two devices with different local
progress. Confirm a write is readable after restart and in a real VK client;
the bundled mock alone does not prove cross-device persistence.

## Enumerate keys

```ts
const { keys } = (await vkBridgeService.storageGetKeys(50, 0)) ?? { keys: [] }; // count, offset
```

## Signatures (verified)

- `VKWebAppStorageSet { key, value }` → `{ result: boolean }`
- `VKWebAppStorageGet { keys: string[] }` → `{ keys: Array<{ key, value }> }`
- `VKWebAppStorageGetKeys { count, offset }` → `{ keys: string[] }`

## Notes

- Keep values reasonably small.
- The bundled mock keeps an in-memory store so set/get **round-trips in dev** —
  you can build and test persistence flows without the VK client.
