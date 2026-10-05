# Host navigation and client controls

VK moderation has rejected apps for both issues below. Treat them as release
blockers and check them before moderation.

## Navigate inside the app without `<a href>`

Mobile VK clients handle a followed link (an `<a>` element with `href`) like
the launch of an external site. On iOS, a link between app sections opens in
the client's internal browser instead of switching the screen. Moderators ask
for the app to become a single-page app with a router.

- Switch sections, tabs, and detail screens with the router: for example
  `routeNavigator.push('/saved')` from `@vkontakte/vk-mini-apps-router`, or the
  project's existing router API. Trigger it from a button handler (`onClick`),
  not from `href`.
- Also avoid `href` on VKUI components (`Cell`, `SimpleCell`, `Button`,
  `TabbarItem`, `Link`, and other `Tappable`-based items). With `href` they
  render an `<a>`. Use `onClick` and an accessible `aria-current`/`selected`
  state for the active section.
- This applies to every internal form of address: `/saved`, `./saved`,
  `saved`, `?tab=saved`, and hash routes such as `#/saved`. Hash routing in the
  router is fine; rendering it as a followed link is not.
- Do not change sections with `location.href = …`, `location.assign()`,
  `location.replace()`, `window.open()`, or a full-page form submit.
- Scroll to an in-page section with `element.scrollIntoView()` instead of an
  `#anchor` link.
- Keep a real external destination (privacy policy, partner site) as an
  explicit external action and check how the real client opens it. Never route
  an internal section through it.

Keep VK back behavior aligned with router history. Opening a modal, sheet, or
tab must be reversible with Back, as described in `vkui-patterns.md`.

## Keep app controls clear of the client's buttons

Mobile VK clients draw their own control buttons (the menu/close capsule) over
the top-right corner of the mini app. App buttons placed there are covered, so
the user cannot tap them and moderation rejects the app.

- On mobile, keep the top-right corner of the header free of app controls. Do
  not put actions in a custom header's right edge or in VKUI `PanelHeader`'s
  `after` slot for mobile platforms.
- Put header actions in `PanelHeader`'s `before` slot, in the content (a
  `Group` toolbar, `Cell` actions), in a `Tabbar`, or in a settings screen.
- Keep custom headers inside the VKUI layout and respect top safe-area insets.
  Do not use a full-width fixed bar that slides under the host buttons.
- An immediate workaround exists in the app's admin settings: Settings
  (Настройки) → Display (Отображение), then choose the alternative "Above the
  window" (Над окном) layout for the control buttons. As the name says, it moves
  the host buttons above the app window. It does not replace a layout that works
  with the default setting. Record the admin choice in the release notes,
  because the code alone does not show it.

## Verification

- Browser: click through every section and confirm the document is not reloaded
  (see `vk-app-test`'s test matrix for a marker-based check).
- Static: `vk-app-doctor` reports `internal-links` when source contains
  internal `href` values or location-based section changes.
- Real clients: on iOS and Android VK, switch between all sections and confirm
  no internal browser opens. With the default control-button layout, confirm
  every app control is visible and tappable beside the host buttons. A browser
  viewport cannot prove either.
