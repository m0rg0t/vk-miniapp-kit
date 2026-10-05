---
name: vk-gameplay-acceptance
description: Verify a VK Mini App game's playable milestone through the first meaningful action, complete play/retry loop, level or content validity, progression and reload, with rendered input and revision-bound evidence. Use for gameplay acceptance, game regressions, unsolvable or broken levels, controls that stop responding after a result screen, or “проверь, что в игру реально можно играть”. Use vk-app-test for the general test harness and Bridge mocks; this skill defines the game-specific acceptance contract.
---

# Accept a playable game milestone

Prove what the player can do in the running game. A passing build, changed
counter, or screenshot of a start screen does not establish playability.

## Establish the contract

Inspect the requested change, rules, current scenes/routes, level/content source,
save format, and existing tests. Preserve authored content, accepted mechanics,
supported platforms, and working coverage outside the task's scope. Do not
replace the game engine or prescribe mechanics the game does not have.
Reconcile documented test/status claims with the runnable configuration and
current source; an old checklist or aspirational plan is not execution evidence.

If the task supplies only an isolated game model, content validator, or helper,
accept only that scope with its applicable existing checks. Full-app diagnostics,
rendered play, and native gates are `not-applicable` to that isolated acceptance
unless the task supplies or changes those surfaces. Do not install an app
framework to satisfy a checker. Model/content acceptance alone leaves the
playable milestone and app-level readiness unproved.

Choose a small acceptance slice with observable outcomes:

- entry point and synthetic player state, including a relevant deep link;
- first meaningful action and its visible feedback;
- success or failure, result dismissal, retry/next action, and return to play;
- earned progression and what should survive reload or a later session;
- applicable content, input, and host-dependent risks changed by this task.

Derive these from the product contract. If unclear, resolve the consequential
choice before coding; do not manufacture a new balance or reward rule. Use
[assets/acceptance-report.md](assets/acceptance-report.md) to record the slice
and evidence in the target project's existing QA documentation.

## Exercise the real loop

1. Run the existing checks and a supported local build with explicit synthetic
   data. Keep production behavior and any mock boundary identifiable. Load
   sibling `vk-app-test` (`../vk-app-test/SKILL.md` in a full toolkit install)
   for harness/mocks rather than creating another runner.
2. Enter from the actual start flow. Confirm onboarding, daily bonuses, loading,
   and optional host services do not trap the player before the first action.
   For a deep link, preserve its intended destination through initialization.
3. Perform the action through the rendered surface. Inspect its visible effect,
   not only a reducer or internal counter: movement, answer feedback, board
   change, target hit, or another outcome defined by this game's rules. A sound
   toggle needs playback evidence; generated content needs its actual source
   mode identified, distinguishing authored/fallback/fixture from real service.
4. Reach the relevant success/failure result; dismiss it and act again. Check
   that no transparent backdrop, paused input handler, animation lock, or stale
   result blocks the next action. Include rapid or repeated input when relevant.
5. Verify the earned state and reload/resume. Exercise the previous saved profile
   as well as a fresh one. Check unrelated settings/progress survive. For races,
   reset/migration, or uncertain cloud writes, load sibling `vk-app-resilience`.
6. Capture and inspect the resulting screen, including narrow layout, reachable
   controls, visible board/content, and a meaningful result/recovery state. Add
   light/dark or desktop checks according to the changed surface. Images taken
   before the fix do not prove the final behavior. Verify that scene/media
   meaning matches the game state, not just that an image downloaded.

Use [references/rendered-input.md](references/rendered-input.md) for browser
input recipes that exercise real hit testing, touch, gestures, and overlay
recovery. Use [references/content-and-progression.md](references/content-and-progression.md)
when changing levels, generators, authored content, completion, rewards, or
save semantics. Keep logical validity and player-visible usability as separate
proofs; neither substitutes for the other.

## Test input honestly

Identify the input path actually exercised: keyboard, mouse/pointer, synthetic touch
events, browser touch emulation, or a physical device in a named host client.
A phone-sized viewport is not touch or native-client evidence. A direct handler
call does not prove event wiring, hit testing, or compatibility-click handling.

For gestures, use stable visible geometry and actual production listeners. Test
release/cancel and re-entry when the change touches them. Wait on observable
state/geometry rather than hiding races with forced clicks, sleeps, disabled
animations, or test retries. Repeat the suspect sequence when needed and retain
the first failure. Fix helpers only when evidence shows the helper is wrong.

## Close with bounded evidence

Bind each result to the tested commit (plus patch/artifact identity if dirty),
build mode, command or manual steps, environment, input model, and artifact.
Label every applicable gate `pass`, `fail`, `blocked`, or `not-run`; explain an
excluded gate as `not-applicable`. A different commit needs fresh affected
checks after edits or conflict resolution. Keep old evidence labeled historical.

Report the playable slice, reproduced regressions, remaining failures, and exact
client/device checks still needed. A fixture, local mock, static source review,
or successful CI discovery cannot close a real-service or real-client gate.
Keep credentials, raw launch queries, private player text, and real saved profiles
out of captures, logs, and shared evidence; use synthetic fixtures.
If an applicable required gate is unproved, call the milestone incomplete at
that gate. Distinguish local acceptance from release readiness.

Catalog captures belong to `vk-catalog-screenshots`; Bridge details belong to
`vk-bridge-recipes`; release/deploy belongs to `vk-app-publish` and
`vk-miniapps-deploy`. If a sibling is unavailable, report that limitation and
use the project's documented equivalent. Acceptance does not authorize a
deployment, live-data reset, real payment/reward operation, or catalog submission.
