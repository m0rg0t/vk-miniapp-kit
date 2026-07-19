# VK Mini App product brief template

## Product

- Working name:
- One-line promise:
- Primary user:
- Problem/context:
- Core loop:
- Success signal:

## Scope

### MVP

- [ ] User-visible outcome 1
- [ ] User-visible outcome 2

### Later

- Candidate:

### Non-goals

- Explicit exclusion:

## Experience map

| Route/panel | User goal | Primary action | States to handle |
|---|---|---|---|
| | | | loading / empty / error / success |

Document first launch, return visit, back behavior, deep link, offline, and
permission-declined paths.

## Platform contract

| Capability | Bridge method/event | Why needed | Decline/unavailable behavior |
|---|---|---|---|
| Init | `VKWebAppInit` | Start the app | Show recoverable error/diagnostic |

Launch parameters and deep links:

Storage/backend/VK API:

Permissions and personal data:

## VKUI direction

- Navigation structure:
- Primary VKUI primitives:
- Compact/regular layout differences:
- Light/dark and accessibility requirements:

## Analytics

| Event | Trigger | Properties (non-personal) |
|---|---|---|
| `app_open` | Successful start | platform, entry point |

Define the activation and completion funnel before secondary events.

## Monetization and growth

- Model and user value exchange:
- Placement/frequency:
- Share/deep-link loop:
- Fail-open behavior:

Use “none for MVP” when monetization would weaken the core loop.

## Catalog and policy

- Honest short pitch:
- Demonstrable screenshot moments:
- Data collected and purpose:
- Retention/deletion/contact expectations:
- Current admin/policy facts to confirm:

## Acceptance criteria

Use Given/When/Then or equally observable statements. Include:

- happy-path completion;
- return-user persistence;
- Bridge decline/unavailable/timeout;
- compact and regular layouts;
- light and dark appearance;
- core event emission;
- no unhandled error on missing launch data.

## Risks and open decisions

| Item | Impact | Owner/evidence needed |
|---|---|---|
| | | |
