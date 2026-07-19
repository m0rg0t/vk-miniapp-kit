# VK Mini App test matrix

Tailor this matrix to the product brief. Do not keep irrelevant rows.

| Layer | Required scenario | Evidence |
|---|---|---|
| Build | typecheck, lint, production build | command output |
| Unit | pure validation/state/storage serialization | focused tests |
| Bridge service | init and every required method succeeds | response assertions |
| Bridge service | decline/error/unavailable/timeout | fail-open assertions |
| Events | appearance/view/config update | subscribe/unsubscribe assertions |
| Component | loading, empty, error, success | accessible UI queries |
| Journey | first-use core loop | browser trace/screenshot on failure |
| Journey | returning user/persisted state | browser test |
| Launch | mobile + desktop platform, locale, deep link | parameterized test |
| Visual | compact + regular, light + dark | screenshots/manual evidence |
| Real client | permissions, ads, host overlays, safe areas | signed smoke-test note |

## Critical browser journey

1. Start from a clean storage state with explicit launch parameters.
2. Wait for app initialization; assert no fatal error.
3. Complete the primary user action with realistic data.
4. Assert the promised result, route, and analytics event.
5. Reload or revisit and assert the intended persisted state.
6. Repeat the key permission/Bridge step with a decline or unavailable response.
7. Assert a usable fallback and no unhandled error.

## Quality rules

- Query controls by role/name or visible behavior.
- Do not use arbitrary sleeps when a visible state or network/Bridge call can be
  awaited.
- Reset Bridge responses, storage, clock, and launch parameters between tests.
- Save console logs, screenshot, and trace on browser failure.
- A local mock pass never closes a row marked real-client-only.
