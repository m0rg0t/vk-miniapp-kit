# VK Mini App catalog submission checklist

Use the current VK admin form as the source of truth. Record its check date and
URL or screenshot path in the common catalog manifest.

## Catalog package

- [ ] `icon-576.png` is a real readable PNG at exactly 576×576, rendered from
      the retained master without distortion or generative redraw.
- [ ] `catalog-snippet-1120x630.png` is a real readable PNG at exactly 1120×630
      and within the current form's byte limit.
- [ ] Snippet source is reproducible and uses the real app UI plus actual icon.
- [ ] Snippet personal-data review is complete.
- [ ] Every vertical screenshot matches the current form and demonstrates the
      shipped UI; count/orientation is consistent.
- [ ] Optional launch Lottie is 96×96, within budget, animated, and seamless.
- [ ] Description and Short description are separate single-line plain-text
      values with no Markdown, lists, line breaks, or emoji.
- [ ] Copy shows exact counts and respects the current limits (known defaults:
      2000 and 128).
- [ ] Privacy URL and support contact are public, current, and non-placeholder.
- [ ] `vk-app-assets` common catalog preflight prints `пакет готов`.

## Product/privacy/moderation

- [ ] `vk-app-listing` claims only behavior visible in the shipped app.
- [ ] Category/section and localization are current.
- [ ] Privacy text matches actual identifiers, permissions, storage, analytics,
      ads, retention, and deletion controls.
- [ ] Reviewer steps/test data and known platform limitations are explicit.

## Build and hosting

- [ ] `vk-app-security --strict` has no unresolved high/medium finding.
- [ ] Signed launch identity is verified on the backend; secure/deploy keys are
      absent from browser code and production bundle.
- [ ] Development doctor, tests, production build, and release doctor pass.
- [ ] `vk-hosting-config.json` has correct app ID, static path, and endpoint
      files.
- [ ] Manual `build.zip`, when used, has `index.html` at its root.
- [ ] Installed and current official `@vkontakte/vk-miniapps-deploy` versions
      were inspected before version-specific behavior.
- [ ] If hosting changed, the exact uploaded version is saved in
      `vk-deploy-state.json`.
- [ ] Confirmation code was applied to that same version with
      `apps.confirmDeploy`; a new code did not trigger another upload.
- [ ] Production URL returned HTTP 200.
- [ ] Catalog-only material changes did not trigger a hosting deploy.

## Smoke tests

- [ ] Production URL works in an ordinary browser.
- [ ] App opens inside a real VK client; launch params/theme/core flow work.
- [ ] Permission decline, unavailable methods, timeout, invalid authentication,
      and unauthorized API access fail safely.
- [ ] If the VK-client check could not be run, the final report says so instead
      of treating a browser check as equivalent proof.

## Final report

- [ ] Exact paths, dimensions, bytes, copy counts/limits, form evidence, deploy
      package/version, production URL/HTTP status, and both smoke-test contexts
      are listed.
