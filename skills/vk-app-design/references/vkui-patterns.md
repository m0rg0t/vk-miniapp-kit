# VKUI implementation patterns

Confirm exact component names and props against the installed VKUI version.

## Map intent to primitives

| Intent | Prefer |
|---|---|
| App/theme root | `ConfigProvider`, `AdaptivityProvider`, `AppRoot` |
| Screen navigation | `SplitLayout`, `SplitCol`, `View`, `Panel`, `PanelHeader` |
| Grouped content | `Group`, `Header`, `Div`, `Spacing`, `Separator` |
| Lists/settings | `Cell`, `SimpleCell`, `RichCell`, form fields |
| Primary action | VKUI `Button` or fixed layout designed for safe areas |
| Input | VKUI form components with labels, status, and help text |
| Feedback | `Snackbar`, `Alert`, `Placeholder`, `Spinner`, `ScreenSpinner` |
| Modal flow | VKUI modal/popout primitives integrated with router history |
| Icons | `@vkontakte/icons` before custom SVGs |

## Layout

- Use compact/regular adaptivity to change information density and navigation,
  not only CSS width.
- Keep content readable on desktop; avoid stretching forms and prose edge to edge.
- Account for host header, keyboard, bottom controls, and safe-area insets.
- Test long labels, large dynamic type/zoom, and Russian pluralization.

## Appearance

- Feed Bridge/client appearance into the VKUI root.
- Use VKUI color tokens instead of literal foreground/background colors.
- Check custom illustrations and logos on both light and dark surfaces.
- Do not encode status by color alone.

## State contract for every data screen

1. Initial/loading
2. Populated success
3. Empty first-use
4. Recoverable error with retry
5. Offline/timeout when relevant
6. Permission or Bridge method declined
7. Stale/returning data

Keep layout changes between these states small enough that controls do not jump
unexpectedly.

## Interaction and navigation

- Make browser/VK back behavior reverse the user's last navigation step.
- Put destructive actions behind confirmation with specific consequence text.
- Prevent duplicate submissions while a request is pending.
- Restore focus after modal/popout close where practical.
- Give icon-only controls an accessible name and visible pressed/disabled state.

## Review gates

- No raw HTML control recreates a suitable VKUI primitive without a reason.
- The core action is visible without competing primary buttons.
- All interactive elements work by keyboard in desktop web.
- Light/dark and compact/regular combinations are visually checked.
- Loading, empty, error, and decline screenshots or test states are available.
