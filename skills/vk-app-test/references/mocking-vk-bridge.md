# Mocking VK Bridge

## Choose a boundary

| Need | Best boundary |
|---|---|
| Click through a Bridge 3 app outside VK | Bundled source runtime mock |
| Preserve an older compatible harness | Official package alias |
| Test Bridge wrapper signatures/timeouts | Mock `@vkontakte/vk-bridge` |
| Test panels/hooks | Mock the app's centralized Bridge service |
| Reproduce a receive-only client event | Scenario controller/event emitter |
| Prove real ad/permission/host UI | Real VK client; no local substitute |

## Bundled runtime mock

Read `runtime-mock.md` and use the bundled mock by default for current Bridge 3
projects. It has explicit supported methods, structured failures, storage,
receive-only events, and allow-listed scenarios. Extend its switch with a
realistic response when the app needs another method; never replace unknown
methods with generic success.

## Official standalone mock (compatibility option)

Retain or install the VK-maintained browser mock only after comparing its Bridge
dependency major and method coverage with the target application:

```bash
npm install -D @vkontakte/vk-bridge-mock
```

Create an explicit Vite mode instead of changing production imports:

```ts
// vite.config.ts (merge with the existing config)
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => ({
  resolve: {
    alias:
      command === 'serve' && mode === 'vk-mock'
        ? [{ find: /^@vkontakte\/vk-bridge$/, replacement: '@vkontakte/vk-bridge-mock' }]
        : [],
  },
}));
```

Add a script such as `"dev:vk-mock": "vite --mode vk-mock"`. Inspect the
installed mock's exported response controls and supported methods before relying
on them. Compare its `@vkontakte/vk-bridge` dependency major with the app's
installed Bridge major—the packages do not always release in lockstep. The
official mock may not cover a newly added Bridge method; if compatibility or
coverage is weak, use the app's centralized service mock instead of returning a
misleading generic success.

Keep the alias exact (`/^@vkontakte\/vk-bridge$/`), mode-specific, and restricted
to Vite's `serve` command. Run a normal production build during release
verification to prove the mock is absent.

## Deterministic Vitest scenarios

Copy `assets/vkBridgeTestMock.ts`, then import it once in the first Vitest setup
file, before any application module that imports `@vkontakte/vk-bridge`:

```ts
import './vkBridgeTestMock';
```

In a test:

```ts
import {
  setBridgeResponse,
  rejectBridgeMethod,
  emitBridgeEvent,
  bridgeSendMock,
} from './vkBridgeTestMock';

setBridgeResponse('VKWebAppGetUserInfo', { id: 42, first_name: 'Test' });
rejectBridgeMethod('VKWebAppGetEmail', new Error('User denied'));
emitBridgeEvent('VKWebAppUpdateConfig', { scheme: 'space_gray' });
expect(bridgeSendMock()).toHaveBeenCalledWith('VKWebAppGetUserInfo');
```

Use fake timers only for the wrapper's timeout test. Prefer real resolved or
rejected Promises for UI tests.

Pass a Bridge-shaped object to `rejectBridgeMethod` when the installed Bridge
types/client return one; rejection is intentionally typed as `unknown`, not only
`Error`.

## Launch parameters

Exercise meaningful combinations through the URL or parser:

- `vk_platform`: mobile and desktop/web;
- `vk_language`: supported locale plus fallback;
- `vk_scheme`: light and dark;
- app/user/community identifiers used by the product;
- missing or malformed optional values;
- deep-link/hash route.

Never use mock user data or launch query values as proof of identity or
authorization in production code.

## Durable browser scenarios

Use interactive browser control for exploration and screenshot selection. Use
the project's Playwright/Cypress runner for a repeatable release or CI gate.

- Start Vite with the explicit mock mode and a fixed test port.
- Select an allow-listed scenario through a development-only query such as
  `?vk_mock=success` or `?vk_mock=permission-declined`.
- Make the runtime mock adapter—not production components—interpret that value.
- Reset storage and scenario state between tests.
- Wait on visible app state or Bridge calls, not arbitrary sleeps.
- Retain trace, screenshot, and console output on the first retry/failure.
- Run the normal production build as a separate gate to prove the mock alias and
  scenario selector are absent.

Map `VKWebAppUpdateConfig` data to the appearance API expected by the installed
VKUI version, then test both the state change and unsubscribe cleanup. Confirm
the exact scheme/appearance fields from current Bridge types rather than
hardcoding an older VKUI contract.
