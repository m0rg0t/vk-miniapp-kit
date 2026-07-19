# Runtime VK Bridge mock

Use this mock to run a Bridge 3 application in an ordinary browser with
repeatable success and failure states. It is source-owned by the app and does
not depend on a different Bridge major.

## Install

Copy the complete directory:

```bash
mkdir -p src/test/vk-bridge-runtime
cp "$SKILL_DIR"/assets/runtime-mock/* src/test/vk-bridge-runtime/
```

Merge this exact, mode-bound alias into `vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => ({
  resolve: {
    alias:
      command === 'serve' && mode === 'vk-mock'
        ? [{
            find: /^@vkontakte\/vk-bridge$/,
            replacement: fileURLToPath(
              new URL('./src/test/vk-bridge-runtime/vkBridgeRuntimeMock.ts', import.meta.url),
            ),
          }]
        : [],
  },
}));
```

Add `"dev:vk-mock": "vite --mode vk-mock"` and run:

```bash
npm run dev:vk-mock
```

Do not import the runtime mock from application code. The exact alias is the
only connection, and the `command === 'serve'` guard prevents
`vite build --mode vk-mock` from producing a deployable mock bundle. A normal
production build continues to resolve the real Bridge.

## Scenarios

Select an allow-listed state with `?vk_mock=<scenario>`:

| Scenario | Behavior |
|---|---|
| `success` | User, storage, sharing, ads, and permissions succeed |
| `dark` | Init emits a dark `VKWebAppUpdateConfig` event |
| `permission-declined` | Email, phone, and notification requests reject |
| `ads-unavailable` | Native and banner ad methods reject |
| `storage-error` | Storage reads and writes reject |

Unknown values fall back to `success`; they are never interpreted as method
names or executable input.

For browser automation, use `window.__VK_BRIDGE_MOCK__`:

```ts
await page.evaluate(() => {
  window.__VK_BRIDGE_MOCK__?.setScenario('permission-declined');
});

await page.evaluate(() => {
  window.__VK_BRIDGE_MOCK__?.emit('VKWebAppUpdateConfig', {
    scheme: 'space_gray',
    appearance: 'dark',
  });
});
```

The controller also exposes recorded `calls` and `reset()`. Reset it alongside
application storage between browser tests.

## Required proof

Automate success, a structured rejection, storage round-trip, an unsupported
method, and a receive-only event. Run the normal production build separately
and inspect its resolved modules or output to prove the mock is absent.
