# VK Mini App test matrix

Tailor this matrix to the product brief. Do not keep irrelevant rows.

| Layer | Required scenario | Evidence |
|---|---|---|
| Build | typecheck, lint, production build | command output |
| Unit | pure validation/state/storage serialization | focused tests |
| Bridge service | init and every required method succeeds | response assertions |
| Bridge service | decline/error/unavailable/timeout | fail-open assertions |
| Sharing (if used) | confirmed cancellation, empty response, error, long pending dialog | request counts and usable controls; no automatic second share/copy/manual panel |
| Sharing (if used) | unsupported native method, explicit copy, clipboard rejection | correct link/text and product-specific feedback/manual-copy policy |
| Events | appearance/view/config update | subscribe/unsubscribe assertions |
| Component | loading, empty, error, success | accessible UI queries |
| Journey | first-use core loop | browser trace/screenshot on failure |
| Journey | returning user/persisted state | browser test |
| Navigation | every section switch keeps the same document | browser marker check |
| Launch | mobile + desktop platform, locale, deep link | parameterized test |
| Visual | compact + regular, light + dark | screenshots/manual evidence |
| Real client | permissions, ads, host overlays, safe areas | signed smoke-test note |
| Real client | iOS/Android: sections never open the internal browser; no app control under the client's buttons | signed smoke-test note |

## Critical browser journey

1. Start from a clean storage state with explicit launch parameters.
2. Wait for app initialization; assert no fatal error.
3. Complete the primary user action with realistic data.
4. Assert the promised result, route, and analytics event.
5. Reload or revisit and assert the intended persisted state.
6. Repeat the key permission/Bridge step with a decline or unavailable response.
7. Assert the intended recovery and no unhandled error. Cancellation may require
   returning quietly to the same screen, not invoking a fallback.

## Share/story cancellation

Use realistic installed-SDK responses (Bridge 3 share arrays, story results),
and separately control unavailable support, confirmed dismissal, rejection and
timeout. Observe Bridge and clipboard requests as well as rendered UI: a mock
does not show the native message composer, so a screenshot alone can miss an
unwanted second request. After dismissal, verify unchanged progress, reenabled
controls, focus/navigation, and no competing dialog or manual URL panel.

Hold the interactive response longer than the former short API timeout using
fake timers, then resolve it; verify no early fallback and timer cleanup. For
quiet copying, wait for and validate clipboard contents, then assert absence of
the toast rather than retaining an old toast assertion. Reset clipboard state
between cases. Keep actual native open/cancel verification separate; do not send
real messages or publish stories merely to test cancellation.

## Section navigation stays in the document

Mobile VK clients open a followed link as an external site, so moderation
rejects in-app sections reached through `<a href>`. Assert that switching every
section keeps the same JavaScript document:

```ts
test('sections switch without reloading the document', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { __spaMarker?: number }).__spaMarker = 1;
  });
  for (const name of ['Planets', 'Saved', 'Today']) {
    await page.getByRole('button', { name }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __spaMarker?: number }).__spaMarker),
    ).toBe(1);
  }
  await expect(page.locator('a[href^="/"], a[href^="?"], a[href^="#/"]')).toHaveCount(0);
});
```

Query the navigation controls as buttons/tabs; a `link` role there usually
means a followed link. This check cannot see the VK client's own buttons, so
keep the real-client row for overlap.

## Quality rules

- Query controls by role/name or visible behavior.
- Do not use arbitrary sleeps when a visible state or network/Bridge call can be
  awaited.
- Reset Bridge responses, storage, clock, and launch parameters between tests.
- Save console logs, screenshot, and trace on browser failure.
- A local mock pass never closes a row marked real-client-only.
