# Case study: Books Horoscope

Historical evidence from the 2026-09-30 adaptation, reviewed 2026-10-01. This
illustrates what the workflow found; use the target app's own configuration and
refresh compatibility documentation. The source app is a static JavaScript
site; the same boundaries also apply to a React/VKUI service.

## Change and structure

One frontend and content source serve VK, OK, and the standalone site. The app
introduced a central Bridge adapter, launch context, safe analytics wrapper,
manual share dialog, platform-gated footer, contract tests, and an optional
localhost browser harness. It did not add a private backend or another hosting
resource.

Public reference identifiers (examples only):

- VK app: `53334597`, `https://vk.com/app53334597`.
- OK app: `512003272289`, `https://ok.ru/app/512003272289`.
- OK public card redirected to `https://ok.ru/app/vk_books_horoscope`.
- Frontend: `https://books-horoscope.pixel-and-byte.ru/`.

The implementation commits were `0e28019` (adaptation), `09b3d19`
(deployment report), and `ae552b8` (OK web story correction), in
[the reference repository](https://github.com/m0rg0t/books_horoscope).
Do not treat this history as permission to push/deploy another project.

## Problems that affected decisions

1. **A renamed VK link still failed the OK requirement.** Initially the
   footer still showed “Сообщество в VK”. The user caught it in an OK preview.
   The fix removed it from OK and hid it in initial HTML, revealing it only in
   allowed contexts. VK-only app promotions were gated too.
2. **Advertised story support was not enough.** In authenticated desktop OK,
   `vk_platform=desktop_web_ok`, the client declared editor support, but
   `VKWebAppShowStoryBox` failed. A manual fallback worked. The fix excluded
   known web variants while retaining supported Android/iOS and VK stories.
   This is not evidence that stories are unavailable throughout OK.
3. **A missing compatibility row was not enough either.** The real desktop
   client displayed a banner. The app probed/attempted showing it rather than
   treating an absent row as a permanent ban or gating on `CheckBannerAd`.
4. **Responses differed by SDK/host.** Bridge 3 arrays and older share objects
   needed normalization; empty-array/type-null and the tested structured
   code-4 decline needed quiet cancellation.
5. **The launch URL was sensitive.** The embedded frame included session/sign
   values. Diagnostics kept method/outcome only; analytics stripped URL and
   referrer query/hash, and reports retained only public/sanitized fields.
6. **Optional host calls could block useful content.** Init/probe timeouts,
   independent content loading, and manual-input precedence prevented missing
   capabilities or a late birth-date response from controlling the main flow.

## Evidence and limits

Authenticated OK desktop web loaded the production iframe, book/prediction,
and archive navigation. Share opened OK's feed composer with the app card;
cancellation returned quietly. VK community and app promotions were absent.
The banner displayed. After the correction, stories were hidden in web while
sharing still opened correctly. No post or story was actually published.

The corrected release passed **22 unit tests** and build. An earlier version
passed **8 browser scenario groups**; the browser harness was updated for the
web story guard, but that updated harness was not rerun in the recorded
session. Do not describe those 8 groups as proof of the final guard. New unit
cases and the authenticated desktop check did verify the correction.

Android, iOS, and real mobile web remained untested. Native stories were
preserved by policy and documented compatibility, not confirmed on a device.
An OK support contact, current catalog materials/form, and moderation status
also remained outside this implementation's proof.

The user's requested push to main triggered the existing ru1/Coolify Auto
Deploy. The final deployment completed and changed public bundle hashes
matched the commit. This hosting verification did not change platform settings
or submit the app to moderation.

## Mapping into another app

Translate boundaries rather than copying files verbatim: launch context into
the existing service, policy into capability resolution, sanitized story into
the existing media flow, normalized outcomes into UI handlers, first-render
platform gates into components/HTML, and privacy rules into all telemetry.
Use the new skill's bundled pure policy only where it fits. Keep shared content,
backend contracts, framework, styling, and deployment configuration owned by
the target project.
