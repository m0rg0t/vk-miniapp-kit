# Analytics

VK Mini Apps don't impose one analytics API, so own a thin `trackEvent`
abstraction and fan out behind it (your backend, a 3rd-party SDK, VK stats).
Centralizing means call sites never change when you switch providers.

## The abstraction

```ts
// utils/analytics.ts
export const ANALYTICS_EVENTS = {
  APP_OPEN: 'app_open',
  AD_BANNER_SHOWN: 'ad_banner_shown',
  // …add events as named constants so call sites can't typo strings
} as const;

type EventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export function trackEvent(name: EventName, props?: Record<string, unknown>): void {
  // fan out here: fetch('/track', …), window.<sdk>?.track(name, props), etc.
  // keep it fire-and-forget and never throw — analytics must not break the app.
}
```

## Use it

```ts
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics';

trackEvent(ANALYTICS_EVENTS.APP_OPEN);
// after a successful ad:
trackEvent(ANALYTICS_EVENTS.AD_BANNER_SHOWN, { height: shown.banner_height });
```

## Principles

- **Named constants, not string literals** at call sites — typos become compile
  errors and the event list stays discoverable.
- **Fire-and-forget, never throws** — wrap provider calls so a failing tracker
  can't take down a user flow.
- **Identify with launch params** — `vkBridgeService.getLaunchParams()` gives
  `vk_user_id` / `vk_app_id` / `vk_platform` for attribution. Don't put personal
  data in event props.
- Feature and ad events (see `ads.md`) flow through this same `trackEvent`.
