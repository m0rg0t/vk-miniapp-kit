# Ads (vk-bridge)

VK has **two separate ad systems** — don't confuse them:

| | Native ads | Banner ads |
|---|---|---|
| Methods | `VKWebAppCheckNativeAds` / `VKWebAppShowNativeAds` | `VKWebAppCheckBannerAd` / `VKWebAppShowBannerAd` / `VKWebAppHideBannerAd` |
| UX | Full-screen interstitial or rewarded video, shown on demand | Persistent host overlay docked top/bottom |
| Use for | "Watch to continue / earn reward", between-screen breaks | Always-on monetization |

## Critical facts (learned the hard way)

- **`VKWebAppCheckBannerAd` is NOT an availability check.** Per dev.vk.com it
  reports whether a banner *already opened by `VKWebAppShowBannerAd`* is
  currently on screen. Before the first show it always returns
  `{ result: false }` — gating the first show on it means the banner **never**
  appears (this shipped as a real bug: logs showed
  `checkBannerAd result = {result: false} → not showing`). Just call
  `showBannerAd` directly; it does its own availability handling and returns
  `result: false` when there's no fill.
- **Don't race `VKWebAppInit`.** If init is kicked off un-awaited (e.g. in
  `main.tsx`), ad calls from a mount-time hook can fire before it completes and
  fail silently on mobile clients. Memoize the init promise and `await` it in
  the hook before any ad call.
- **Banner ads are declared supported on all platforms** (Android, iOS, Mobile
  Web, Web per the compatibility table), but fill on desktop web is unreliable —
  a `result: false` from `showBannerAd` on desktop is normal. Verify on the VK
  mobile client before concluding banners are broken.
- **Dev mocks don't render real ads.** In `isDevMode()` every call is mocked, so
  no actual ad UI appears — that's expected. A real ad only shows inside the VK
  client.
- **Trace with `logger.diag`, not `logger.log`.** Ad behavior is only reproducible
  inside the VK client, where dev logs are stripped. `logger.diag` always emits,
  so you can actually see why an ad did/didn't show in production.

## Banner ad — app-level hook (recommended)

A banner is a host overlay, not a DOM node, so drive it once at the App level.
`layout_type: 'resize'` makes the client shrink the viewport so the banner never
covers bottom CTAs. Fail-open: a missing/declined banner just means no banner.
No pre-check (see critical facts) — show directly, after awaiting init.

```tsx
import { useEffect } from 'react';
import { vkBridgeService, isDevMode, initVkBridge } from '../services/vkBridge';
import { logger } from '../utils/logger';

export function useVkBanner(): void {
  useEffect(() => {
    let cancelled = false;
    logger.diag('[ads] banner: init — isDevMode(mocked)=', isDevMode());
    (async () => {
      try {
        await initVkBridge(); // memoized — awaits the VKWebAppInit from main.tsx
        if (cancelled) return;
        // NO VKWebAppCheckBannerAd here — it only reports an already-shown
        // banner and would always be false before the first show.
        const shown = await vkBridgeService.showBannerAd({
          banner_location: 'bottom',
          layout_type: 'resize',
        });
        logger.diag('[ads] banner: showBannerAd =', shown);
        if (shown?.result) {
          // shown ✓ — track analytics here if needed
        }
      } catch (error) {
        logger.warn('[ads] banner: failed', error);
      }
    })();
    return () => {
      cancelled = true;
      vkBridgeService.hideBannerAd().catch(() => {});
    };
  }, []);
}
```

`initVkBridge` must be idempotent so the hook and `main.tsx` share one init:

```ts
let initPromise: Promise<void> | null = null;
export function initVkBridge(): Promise<void> {
  initPromise ??= (async () => {
    if (isDevMode()) return;
    try { await vkBridge.send('VKWebAppInit'); }
    catch (e) { logger.error('[VK Bridge] Init error:', e); }
  })();
  return initPromise;
}
```

Call `useVkBanner()` once in `App`. (Panels stay mounted inside `<View>`, so a
per-panel call would thrash the banner.)

## Native ad — on demand

```ts
const check = await vkBridgeService.checkAds('interstitial'); // or 'reward'
if (check?.result) {
  await vkBridgeService.showAd('interstitial');
}
```

`showAd` uses a long timeout (the user is watching). For rewarded ads, grant the
reward only after `showAd` resolves successfully.

## Signatures (verified against dev.vk.com)

- `VKWebAppCheckBannerAd` (no params) → `{ result: boolean, banner_width, banner_height, banner_location, layout_type, ... }` —
  `result: true` means a banner opened by ShowBannerAd **is currently displayed**
- `VKWebAppShowBannerAd { banner_location?: 'top'|'bottom' (default bottom; top is games-only), banner_align?: 'left'|'right'|'center', height_type?: 'regular'|'compact', orientation?: 'vertical'|'horizontal' (desktop games only), layout_type?: 'resize'|'overlay' (default resize; overlay only with bottom) }` → `{ result: boolean, banner_width: number, banner_height: number, banner_location, layout_type, ... }` —
  judge success by `result`, not by `banner_height` presence
- `VKWebAppHideBannerAd` → `{ result: boolean, ... }`
- `VKWebAppCheckNativeAds { ad_format: 'interstitial'|'reward' }` → `{ result: boolean }`
- `VKWebAppShowNativeAds { ad_format }`
