# Compatibility and sources

Baseline checked on 2026-10-01. Refresh this evidence when applying the skill;
platform capabilities and publication forms can change.

## Sources and interpretation

- [OK: VK Mini Apps and Bridge compatibility](https://apiok.ru/apps/vk) is the
  starting point for OK differences.
- [VK Bridge source and releases](https://github.com/VKCOM/vk-bridge) and the
  target project's installed types define the SDK shapes you actually compile
  against. The reference adaptation used Bridge **3.0.2**; do not force that
  version on another app.
- [Story method](https://dev.vk.com/ru/bridge/VKWebAppShowStoryBox),
  [share method](https://dev.vk.com/ru/bridge/VKWebAppShare), and
  [banner method](https://dev.vk.com/ru/bridge/VKWebAppShowBannerAd) define
  method-specific payloads. Read the current docs rather than copying stale
  examples. If a documentation page cannot be read, say so and use available
  official source/types without claiming it was verified.

The OK page contains a publication section explicitly marked obsolete. Use
current app-admin evidence for activation, ownership binding, moderation,
assets, development URL behavior, and timing. Do not promise a historical
30-minute synchronization window or follow that section as a current checklist.
Its API prose and API compatibility rows also conflict; confirm the exact
current event and parameters before integrating an OK API call.

## Relevant documented differences

According to the OK compatibility page at the baseline date:

| Surface | Documented OK behavior |
|---|---|
| Launch | `vk_client=ok`; OK data entities; distinct OK app identifier |
| Init, profile, link sharing, storage, configuration | Listed for Android, iOS, web, and mobile web |
| Stories | Android/iOS; no `attachment` or renderable `clickable_zones` |
| Open another app | Method expects the VK app ID |
| Native ads | Android listed; runtime availability still matters |
| VK ID / VK Pay | Listed as unavailable at this baseline |

Do not extend these rows into guarantees about every API or account. In
particular, a public OK URL uses an OK ID while a method may still expect a VK
ID. Verify identifiers independently for each call. Namespace persisted server
identity by platform; an OK profile ID is not a VK user ID.

## Observations and policies from the reference adaptation

These are separate from documented guarantees:

| Finding / choice | Correct consequence |
|---|---|
| Real OK `desktop_web_ok` declared story support but invocation failed | Exclude known OK web variants before trusting the capability result |
| A banner actually displayed in the same desktop client | Do not disable banners solely because a compatibility row is missing |
| Share opened OK's feed composer with an app card | Use a clean OK app link; opening/cancelling is the tested behavior |
| Recommendation was replaced with app-link sharing | A deliberate UI choice, not proof that every OK client rejects `VKWebAppRecommend` |
| VK community and VK-only promotions were hidden | This product's cross-platform requirement; use an actual OK contact when supplied |

Keep the known web variant set together:
`desktop_web`, `desktop_web_ok`, `mobile_web`, `mobile_web_ok`.
A new/empty `vk_platform` is not evidence of a native client. Runtime support
still needs failure handling, and unknown variants need real-client verification
before claiming story availability. Do not hide native OK stories globally.

## Platform operations outside basic link/story support

Private API calls, group bots, notifications, payments, downloads, and
upload services need their own verified OK contracts. A generic VK service or
backend signature verifier cannot be assumed compatible because the frontend
uses the same Bridge library. Reuse the project's existing secure services
where applicable, but establish their OK authentication and data scoping first.

The VK-oriented sibling share recipe's wall-post prohibition describes VK.
Do not infer OK-specific API availability from it. This skill defaults to link
sharing and stories; introduce another publishing surface only when the product
actually needs it and current OK documentation supports it.
