# User-facing VK branding audit for OK

A supplied moderation rejection for the “Число дня” app identified the theme
picker caption “как в VK”. A link/promotion-only check misses this case. Use it
as a regression scenario; do not infer that hiding outbound VK links makes an
OK interface clean.

## Search and classify

Inventory source, initial HTML, public assets, localization/content files,
backend-delivered UI text, templates for sharing/downloads, and the production
build. Include ignored build output and hidden app files. Run a broad,
case-insensitive search from the target repository, for example:

```bash
rg --hidden --no-ignore -n -i \
  -g '!.git/**' -g '!node_modules/**' \
  -e 'vk|вк|в[[:space:]_.-]*контакте' \
  -e 'вконтакт|vkontakte' .
```

This intentionally catches Latin VK, Cyrillic ВК, ВКонтакте, case variants,
spaced names, `vkontakte`, and VK URLs such as `vk.com`, `vk.ru`, and `vk.cc`,
as well as technical identifiers. Add discovered brand aliases, project
community/promotional URLs, and languages actually shipped by the app. Do not
use word boundaries or search only known CTA files: those can miss compound
names and small captions. Exit 1 means no matches; exit 2 means a search error
that must be resolved, not a clean audit.

Classify every match by its role and reachability:

- **App-owned OK output:** remove, hide, or use accurate neutral/OK copy through
  the existing platform context. Cover links and their destinations, even when
  the label is neutral. Do not rename a VK community URL to “ОК”.
- **VK-only output:** retain it, prove it cannot reach any OK state, and verify
  VK still renders the intended copy. A shared production bundle can contain
  VK strings without exposing them to OK users.
- **Internal technical reference:** keep SDK/package names, `VKWebApp*`,
  `vk_client`, signature parameters, configuration, tests, and internal docs.
  If raw SDK errors are shown to users, map them to suitable UI copy instead.

Do not perform a global VK → OK replacement. “как в ОК” is suitable only if the
control actually follows the OK host setting; otherwise use accurate neutral
wording. Keep platform selection synchronous enough to avoid a first-paint
flash, including saved preferences and slow/failed initialization.

Searches skip binary media and can miss Unicode/HTML escapes, split strings,
remote responses, and icon geometry. Inspect those sources in decoded or
rendered form. Keep search output local and redact secrets/launch parameters
before saving evidence; a source hit may contain sensitive fixture data.

## Inspect what users receive

Make a route/state inventory from the actual app, not only the main screen.
In OK context, inspect app-owned rendered text and accessible names/descriptions
(`aria-label`, `aria-description`, `aria-describedby` targets, `title`, `alt`,
placeholders), plus navigation/share destinations. Scope checks to the app's
UI, rather than the outer platform chrome or script text/SDK internals.

Cover onboarding, headers, menus, theme picker and every theme caption,
settings, help/support/privacy, footer, dialogs/toasts, empty/loading/error
states, and optional feature fallbacks wherever present. Open collapsed,
hover/focus, and otherwise conditional controls. Exercise navigation, persisted
preferences, light/dark appearance, delayed or rejected Bridge/profile/ads,
and sharing/download flows; cancellation must not expose VK-specific fallback
copy in OK. Inspect remote content loaded by those states too.

Review images, SVG logos, CSS pseudo-element content, canvas exports, share/story
media, downloadable files, and OK catalog screenshots/descriptions visually.
A nameless VK logo or text baked into a PNG will not be found by source grep or
DOM text assertions. Regenerate affected media and screenshots after fixing
copy. Inspect share/story previews without publishing to the feed.

## Verification gate

Add a focused UI regression to the target's existing harness: launch in OK,
open the theme picker, and assert that the reported “как в VK” caption and
other VK branding are absent from rendered/accessible output. Exercise initial
and delayed/failed initialization plus restored preferences. Verify the same
control keeps its intended VK behavior. Extend this check to other affected
surfaces; do not assert that SDK identifiers disappear from app source.

Repeat the route/state and media checks on the normal production build. For an
authorized release, recheck the actual embedded deployed build and its caching
using the release verification procedure. Keep mock/browser UI evidence and
real-client evidence distinct.

Record search scope, classification of remaining hits, inspected routes/states,
visual assets, and regression outcomes in the app-specific report. Resolve
all app-owned VK mentions reachable in OK before calling the interface clean.
Explicitly list unavailable remote content, untested states/media, or clients;
do not claim a regex or a main-screen screenshot finds every possible mention.
