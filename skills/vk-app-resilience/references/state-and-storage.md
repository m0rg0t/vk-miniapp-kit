# State, storage, and runtime boundaries

## Async ownership and bounded waiting

Trace the event sequence rather than testing only response values. Useful
interleavings include start A → start B → resolve B → resolve A; start → cancel
→ late resolve; start → navigate/unmount → reject; and never-settling service.
Choose only interleavings that apply to the changed operation.

An operation/request ID, route or round token, and a session/reset epoch are
possible ownership mechanisms. Use the existing architecture where sound.
Validate ownership before applying a result and before cleanup: A's `finally`
must not unlock B's pending action or remove B's loading state. Aborting local
work may not cancel a remote side effect; reconcile that side separately.

Snapshot the payload and expected state version for a retryable logical action;
caller mutation or reuse of the same object must not alter the pending request.
Preserve identity and payload across a same-operation retry; give genuinely new
intent a new identity. In-memory retry ownership alone is not durable recovery
across refresh or process restart.

Keep a dismissed result stable through unrelated persistence updates. Derive
game results from the relevant attempt/round, not any change to a broad profile
object. Verify the overlay and input lifecycle in the rendered app after close,
not only that a `visible` flag is false.

Exercise success, rejection, and timeout cleanup. Count or observe the relevant
timers/subscriptions when leaks caused the bug. Bound optional startup work so
a host that never responds cannot hold the first usable screen forever. Keep
security gates blocking when they must; distinguish degraded from authorized.

## Local state and concurrent saves

Inspect every writer of the same logical record, including independent hooks,
background sync, achievements, and settings. Serializing only one caller does
not prevent another writer from erasing its changes.

For a local read-modify-write queue, compute each update from the latest
committed state inside the serialized operation; queuing already-stale full
snapshots can still lose fields. Test two independent deltas in either completion
order and assert both survive reload. Preserve unrelated valid settings/flags.
A single-process queue does not solve cross-tab/device/server conflicts: choose
a supported atomic update, revision/compare-and-set, merge policy, or explicit
user choice for that boundary. Do not invent atomicity in VK Storage.

Distinguish storage read failure, malformed data, missing/empty data, and valid
data. Defaults are not proof that no saved progress exists. Do not let a failed
hydrate overwrite a known cloud record with first-run defaults. Use the existing
local fallback and mark unsynced state when appropriate; local success alone is
not cloud persistence. Keep valid keys and Bridge response handling in
`vk-bridge-recipes`' storage reference.

Use synthetic fixtures for:

- a previously valid profile; expected changed and untouched fields;
- a failed/denied read and malformed cache; no crash or destructive default write;
- overlapping writes; both legitimate updates retained;
- write pending during reset/logout; stale completion cannot restore old state;
- reload while sync is pending; behavior follows the durability contract.

For reset/logout, invalidate old owners and pending local work. If an earlier
remote write may still complete, reconcile/serialize it or use a server epoch
supported by the protocol. Incrementing only a local epoch does not erase the
remote result or guarantee a cross-device reset.

## Schema evolution and old clients

Inspect the readers/writers already shipped, not only the new deserializer.
Determine what an old reader does on an unknown version: ignore, preserve,
migrate, reject, or write defaults. A version bump that makes old clients erase
cloud state is not safe merely because the new client has a migration.

Choose additive compatibility, tolerant reading, versioned keys/protocols, or a
coordinated migration based on the actual product. Do not universally freeze a
schema version. Preserve stable IDs, accepted save fields, and unknown fields
where the format's contract requires round-tripping. Validate untrusted values
before use; preserving a field does not make it authoritative or executable.

Rehearse old profile → new read/write → old reader/writer → new reader, including
a supported downgrade or rollback when applicable. Test source data retained,
repeat migration, and interruption recovery. Rewards/balances owned by a server
must remain server-authoritative; a client migration must not promote cached
values into trusted balances.

## Runtime and service compatibility

Static syntax/config checks are useful early evidence. For an actual backend
change, also start the target runtime in isolation and exercise the routes/hooks
the app uses. A health endpoint can pass while custom hooks failed to load.
Verify migration application and reopening, auth failure/success, and persisted
state using disposable synthetic data; retain relevant startup/route logs.

Choose compatible runtime/library versions from current official release notes,
installed types, and the project's constraints. Record justified holds instead
of forcing peers, weakening checks, or treating “newest” as automatically safe.
For UI adapters, test the affected named platforms after a merge/version change;
earlier platform evidence remains historical until re-run on the final artifact.

For a versioned frontend/backend contract, record required fields, stale/conflict
responses, and the rollout compatibility window. Test old-client/new-server and
new-client/old-server combinations that can actually coexist. Reject stale state
before a consequential mutation and preserve the accepted screen on failure.
Do not claim durable idempotency or atomic persistence from mocked route tests;
prove that boundary against disposable real persistence when it is in scope.

## Existing or requested PWA only

If the app has an offline/service-worker contract, test its production build's
offline reload and required asset classes, failed/incomplete caching, and update
during active progress. Verify the defined update consent/recovery behavior and
that cleanup touches only this app's caches. Respect the project's host and
private-data caching exclusions. Do not add a service worker/offline feature to
an ordinary VK app by default; native installation remains separate evidence.

Use the existing test skill's production-mock isolation checks for both ordinary
production and mock-named build modes. A mock scenario is useful controlled
evidence; it cannot prove remote protocol behavior, native host UI, or production
data migration. Unavailable tools/access leave a named gate blocked.
