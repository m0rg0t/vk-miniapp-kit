# Rendered input recipes

Use the project's existing browser runner. The examples use Playwright because
it can send trusted pointer, keyboard, and touch input. Adapt the selectors to
accessible roles or stable test IDs already used by the project.

## Prefer trusted input over handler calls

| Technique | What it proves | What it does not prove |
|---|---|---|
| `locator.click()` / `page.mouse` | hit testing, visibility, overlay blocking, the real listener | touch-specific listeners |
| `locator.tap()` with `hasTouch: true` | touch events and the tap path in browser emulation | a physical device or VK client |
| `locator.dispatchEvent('click')` | the listener exists | hit testing; it bypasses overlays |
| calling a handler or reducer | game rules | event wiring and rendering |
| `click({ force: true })` | almost nothing about usability | hides the overlay bugs this skill looks for |

Use `dispatchEvent`, handler calls, and `force` only when the report labels
them. They cannot close a rendered-input gate.

## First action, result, and recovery

```ts
import { expect, test } from '@playwright/test';

test('first action, result dismissal, and next action', async ({ page }) => {
  await page.goto('/?vk_platform=mobile_web#/play');
  const cell = page.getByRole('button', { name: 'Cell 1' });
  await cell.click(); // fails if an invisible backdrop intercepts the pointer
  await expect(page.getByTestId('score')).toHaveText('1');

  await page.getByRole('button', { name: 'Finish round' }).click();
  const result = page.getByRole('dialog', { name: 'Round complete' });
  await expect(result).toBeVisible();
  await result.getByRole('button', { name: 'Play again' }).click();
  await expect(result).toBeHidden();

  // Re-entry: the next real click must reach the board.
  await page.getByRole('button', { name: 'Cell 2' }).click();
  await expect(page.getByTestId('score')).toHaveText('1');
});
```

Assert the visible outcome that the game's rules define. A hidden dialog is not
enough. The next trusted click must change the game state.

## Touch and gestures

```ts
test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 640 } });

test('tap reaches the touch path', async ({ page }) => {
  await page.goto('/#/play');
  await page.getByRole('button', { name: 'Cell 1' }).tap();
  await expect(page.getByTestId('score')).toHaveText('1');
});

test('swipe from visible geometry', async ({ page }) => {
  await page.goto('/#/play');
  const board = page.getByTestId('board');
  const box = await board.boundingBox();
  if (!box) throw new Error('board is not rendered');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('last-move')).toHaveText('right');
});
```

The swipe example sends pointer/mouse events. If the game listens only to
`touchstart`/`touchmove`, use the Chrome DevTools Protocol
(`Input.dispatchTouchEvent`) through the runner or a touch-capable device, and
record which path ran. A 360-pixel viewport alone is not touch evidence.

## Avoid hiding races

- Wait for an observable state (`toHaveText`, `toBeVisible`, `toBeEnabled`) and
  never for a fixed sleep.
- Keep animations enabled for the acceptance run unless the product has a
  reduced-motion mode under test. Disable them only in a separately labeled
  diagnostic run.
- Repeat a suspected flaky sequence with `--repeat-each` and keep the first
  failing trace, screenshot, and console log.
- Do not add test retries to a gameplay gate. A retry that passes means the
  gate failed at least once.

## Capture and inspect

Take the acceptance screenshot after the final action, not before the fix. Open
the image to check that the board, controls, and result state match the
assertion. Use synthetic player names and data in the scenario.
