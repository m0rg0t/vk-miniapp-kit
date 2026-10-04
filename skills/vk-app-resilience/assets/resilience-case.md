# Resilience case: [changed flow]

Fill this from the task and observed failure. Remove irrelevant scenarios and
explain exclusions; do not invent results or introduce new product behavior.

## Contract and reproduction

- User-visible failure and minimal reproduction: [steps]
- Expected visible result and preserved behavior: [invariant]
- State owner and operation identity: [route/round/request/session]
- Local, remote, and authoritative state boundaries: [owners]
- Supported clients, saved schema/keys, runtime versions: [current contract]
- Scope exclusions and consequential actions not authorized: [boundaries]

## Deterministic scenarios

Use controlled deferred operations/fake time in the existing runner. Add a
rendered journey for the affected UI. Keep every status unrun until executed.

| Initial state | Event order | Allowed final state | Forbidden side effect | Status and evidence |
|---|---|---|---|---|
| [ready] | A starts, B starts, B settles, A settles | [newest owner wins] | [stale overwrite/unlock] | not-run |
| [pending] | cancel/back, late completion | [dismissed and usable] | [dialog reopens or action duplicated] | not-run |
| [waiting] | no response, bounded timeout | [defined recovery/degraded UI] | [permanent lock or fake success] | not-run |
| [saved profile] | two independent saves, reload | [both deltas + untouched fields] | [lost data] | not-run |
| [pending save] | reset/logout, late completion, reload | [defined reset contract] | [old state resurrected] | not-run |
| [old profile] | new write, supported old client, new read | [compatible state] | [defaults erase progress] | not-run |

## Evidence identity

- Final tested commit and any dirty patch/artifact hash: [identity]
- Command/manual steps, exact inputs/seed, and artifact: [reproduction]
- Runtime/platform and input model: [what ran]
- Bridge/backend: [controlled mock / real isolated service / native client]
- Regression failed before the fix: [evidence or explicitly not-run]
- Current deterministic and rendered results: [pass/fail/blocked/not-run]
- Migrations/routes/native checks: [current evidence or remaining gap]
- Historical evidence: [revision and why it does not close current gates]

## Outcome

- Repair and invariants proved: [bounded claim]
- Retry/reconciliation policy and stopping condition: [behavior]
- Remaining failures, blockers, and next action: [owner/required evidence]
- Acceptance: [proved scope or incomplete gates; no implied deployment]
