# Ads (vk-bridge)

VK has **two separate ad systems** — don't confuse them:

| | Native ads | Banner ads |
|---|---|---|
| Methods | `VKWebAppCheckNativeAds` / `VKWebAppShowNativeAds` | `VKWebAppCheckBannerAd` / `VKWebAppShowBannerAd` / `VKWebAppHideBannerAd` |
| UX | Full-screen interstitial or rewarded video, shown on demand | Persistent host overlay docked top/bottom |
| Use for | "Watch to continue / earn reward", between-screen breaks | Always-on monetization |

## Critical facts (learned the hard way)

- **Banner ads are mobile-only.** They do **not** render in desktop web vk.com —
  you'll see failed ad-stack requests in the console instead. Test on the VK
  mobile client or m.vk.com.
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

```tsx
import { useEffect } from 'react';
import { vkBridgeService, isDevMode } from '../services/vkBridge';
import { logger } from '../utils/logger';

export function useVkBanner(): void {
  useEffect(() => {
    let cancelled = false;
    logger.diag('[ads] banner: init — isDevMode(mocked)=', isDevMode());
    (async () => {
      try {
        const available = await vkBridgeService.checkBannerAd();
        logger.diag('[ads] banner: checkBannerAd =', available);
        if (cancelled || !available?.result) return;
        const shown = await vkBridgeService.showBannerAd({
          banner_location: 'bottom',
          layout_type: 'resize',
        });
        logger.diag('[ads] banner: showBannerAd =', shown);
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

## Signatures (verified)

- `VKWebAppCheckBannerAd` → banner state including `result`, width/height,
  location, layout, and height type
- `VKWebAppShowBannerAd { banner_location: 'top'|'bottom', banner_align?,
  layout_type?: 'resize'|'overlay', height_type?: 'compact'|'regular',
  orientation?: 'horizontal'|'vertical' }` → the same full banner state
- `VKWebAppHideBannerAd` → the same full banner state
- `VKWebAppCheckNativeAds { ad_format: 'interstitial'|'reward' }` → `{ result: boolean }`
- `VKWebAppShowNativeAds { ad_format }`
