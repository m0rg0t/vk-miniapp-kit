---
name: vk-app-test
description: "Add and run a complete VK Mini App test workflow: standalone local development with a bundled Bridge 3-compatible runtime mock, deterministic Vitest success/decline/error/timeout/event scenarios, React Testing Library integration tests, launch-parameter variants, browser journeys, responsive/theme checks, and a real VK client smoke-test handoff. Use whenever the user asks to test, QA, mock VK Bridge, run the app outside VK, debug client-only behavior, add Vitest/Playwright coverage, or says “локальное тестирование VK Mini App / мок vk-bridge”. Apply before publishing and after changing Bridge-dependent behavior."
---

# Test a VK Mini App

Prove the app locally without pretending a browser mock can replace the final VK
client smoke test.

## Inspect first

Read `package.json`, the test runner/config, the Bridge import/service boundary,
routes, and product acceptance criteria. Run the non-mutating readiness check:

```bash
SKILL_DIR="<absolute path to the installed vk-app-test skill>"
node "$SKILL_DIR/scripts/check-project.mjs"
```

Preserve a working harness. Add only the missing layers.

## Layer 1: standalone browser development

Read `references/runtime-mock.md` and `references/mocking-vk-bridge.md`. Prefer
one explicit mock mode:

- copy the bundled source runtime mock and connect it through a dev-only Vite
  alias for current Bridge 3 projects;
- keep the official `@vkontakte/vk-bridge-mock` package only in an existing
  project whose installed Bridge major and required method coverage match;
- use the centralized service mock from the sibling `vk-bridge-recipes` skill
  (`../vk-bridge-recipes/SKILL.md` in a full toolkit install) for newer/custom
  methods and scenario-specific application behavior.

Never ship a production build that aliases the real Bridge to the mock.

## Layer 2: deterministic unit and integration tests

For Vitest projects, copy the scenario controller and import it from the test
setup:

```bash
mkdir -p src/test
cp "$SKILL_DIR/assets/vkBridgeTestMock.ts" src/test/vkBridgeTestMock.ts
```

Adapt paths and test-runner syntax rather than replacing an equivalent existing
mock. For each required Bridge capability, cover:

1. success with a realistic typed response;
2. user decline/unavailable/error;
3. timeout or no result where the service supports it;
4. receive-only event/update where applicable;
5. no unhandled rejection and a usable fallback UI.

Mock at the Bridge boundary for service tests and at the service boundary for
screen tests. Do not assert VKUI implementation details when user-visible
behavior is sufficient.

## Layer 3: browser journeys

Read `references/test-matrix.md`. Run the production preview or explicit mock
mode and automate the critical core loop. Vary launch parameters, appearance,
viewport, and returning-user data. Capture failure artifacts on the first
failed step.

Use the browser tool already available in the environment; do not introduce a
second browser framework solely for one test if an equivalent runner exists.
For a one-off local investigation, interactive browser control is enough. For a
repeatable release/CI gate, keep a checked-in Playwright/Cypress test tied to an
explicit mock scenario. If the product brief has no acceptance criteria, define
them with `vk-app-plan` before inventing selectors or a “core” journey.

## Layer 4: real-client handoff

Mocks cannot prove ads, permissions, host overlays, safe-area behavior, or
client-specific events. Produce a short smoke-test list with the exact VK client
URL/build, device/platform, accounts or preconditions, and expected diagnostics.
Record results before release.

## Done when

- The app starts and completes its core loop in a plain browser mock mode.
- The runtime mock proves success, structured rejection, storage round-trip,
  unknown-method rejection, and a receive-only event.
- Automated tests cover Bridge success and fail-open paths plus the critical
  browser journey.
- Compact/regular layouts, light/dark appearance, launch variants, and
  persistence/return behavior are represented in the matrix.
- Build/typecheck/test commands pass, and real-client-only checks are explicit.
