---
name: vk-app-resilience
description: Diagnose and harden VK Mini App state across overlapping or cancelled async actions, startup stalls, concurrent saves, reload/reset, and old-client or backend compatibility. Use for lost progress, stuck controls, stale results, retry races, migration regressions, or resilience acceptance. Reuse vk-app-test for the harness and vk-bridge-recipes for platform APIs; do not activate a broad audit for an unrelated small UI change.
---

# Preserve state across interruption and change

Make the changed flow recover without losing valid data, reviving dismissed UI,
or applying one operation twice. Scope the work to demonstrated risks and the
user's requested behavior, preserving supported platforms and existing contracts.

## Map the failing boundary

Inspect the current state owner, initialization, service/Bridge boundary, saved
schema and keys, retries/timeouts, and relevant runtime/client versions. Start
with a reproducible sequence and record which observable invariant fails.
Reconcile old documentation with current source, runnable tests, and the user's
contract. A roadmap item is not proof that a capability has shipped.

For an isolated model, library, or helper task, run only applicable existing
checks. Full-app diagnostics, rendered journeys, and native-client gates are
`not-applicable` to that scoped acceptance unless the task supplies or changes
those surfaces. Do not install React, VK packages, or an app harness merely to
satisfy a full-app checker. Accepting the isolated repair leaves app-level
readiness unproved; record this distinction explicitly.

Use [assets/resilience-case.md](assets/resilience-case.md) for a focused case:
preconditions → event order → allowed outcome → forbidden effect → evidence.
Prefer one reproduced regression and neighboring risks to a blanket rewrite.

Distinguish these contracts before changing them:

- UI ownership: which route, round, dialog, or session may apply a completion;
- operation identity: what is the same attempt versus a genuinely new action;
- durability: local commit, pending cloud sync, confirmed server state;
- compatibility: already-shipped readers/writers, platform adapters, backend
  endpoints, and migration/runtime assumptions.

Read [references/state-and-storage.md](references/state-and-storage.md) only for
the relevant async, persistence, or cross-layer boundary. Keep API details
single-sourced in sibling `vk-bridge-recipes`; use current installed package
types and official documentation for changed version-specific behavior.

## Implement and prove the smallest repair

1. Use the existing test framework and controlled deferred operations/fake clock
   to reproduce the event order. A regression assertion should fail before the
   fix where a safe baseline run is possible; record when that was not run.
2. Define explicit settled states and the recovery path. Treat user cancel,
   unavailable service, rejection, timeout, and confirmed success distinctly
   when they require different product behavior. Clear owned timers, listeners,
   and locks on every settlement/disposal path.
3. Bind completions to the current owner and operation identity. Exercise a
   late result after cancellation, navigation, reset, or a newer request. A
   stale completion must not reopen UI, overwrite current data, or credit twice.
4. Bound optional initialization and recovery according to the app's contract.
   Keep a usable local/degraded state when allowed. Do not turn authentication,
   permission denial, or unconfirmed authoritative rewards into fake success.
5. Verify intended changes and preserved fields through the whole save/reload
   path. Include old-profile and overlapping-save cases when persistence is
   affected; test reset while a save is in flight when reset exists.
6. When the task includes an app UI surface, run its rendered journey as well as
   deterministic tests. Close/Cancel/Back, retry, and re-entry must leave real
   controls usable, without an invisible overlay. For a game loop, use sibling
   `vk-gameplay-acceptance`. For an isolated non-UI repair, state that rendered
   and native behavior was not assessed rather than making it a failing gate.

## Retry without duplicating effects

Cancellation ends the user's action; it is not a reason to reopen a host dialog
through a fallback. A timeout ends waiting, not necessarily the remote action.
Check/reconcile an uncertain result before retrying a write or claim. Keep the
same idempotency identity for the same logical operation where the service
supports it; a client boolean alone cannot guarantee remote exactly-once effects.

Bound retry attempts/backoff by the product's recovery contract. Stop on an
explicit decline/cancel, superseded ownership, invalid input, or an unresolved
effect that cannot safely be reconciled. Do not add automatic retries to
payments, rewards, publishing, or other consequential operations by inference.

## Verify the actual compatibility boundary

Preserve existing VK/OK/native-adapter behavior included in the task. Load
`vk-app-ok-support` for OK policy and `vk-app-security` for identity, authorization,
or server-authoritative data. A dependency bump, successful merge, config parse,
or healthy base process does not establish application compatibility.

When a backend/runtime changes, use an isolated instance with synthetic data to
exercise startup, migrations and reopen, the actual custom route, and relevant
authorization/replay behavior. Report an unavailable runtime as blocked rather
than substituting source inspection for execution. Do not touch live data or
deploy merely to complete a check; release actions belong to `vk-app-publish`
and `vk-miniapps-deploy` under the user's authorization.

## Completion evidence

Report each affected gate as `pass`, `fail`, `blocked`, `not-run`, or justified
`not-applicable`, with the exact tested commit/patch, command or manual steps,
environment, mock/real boundary, and artifact. Re-run affected gates on the final
state after later edits or merges; keep prior results explicitly historical.
Use synthetic inputs and omit secrets, raw launch queries, and private user data
from retained evidence.

The repair is accepted only for the behaviors actually proved: safe final state,
no stale side effect, preserved valid data, usable recovery, and the applicable
runtime/client matrix. Leave missing native or external-service evidence open.
If a sibling skill is unavailable, use the project's equivalent guidance and
state the verification gap instead of silently declaring its gates passed.
