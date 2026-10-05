# Async patterns and deterministic tests

Adapt these shapes to the project's existing state layer (React state, a
store, a game loop, or a service class). They illustrate invariants; do not
add them wholesale when an equivalent mechanism already exists.

## Bind completions to the current owner

A monotonically increasing token rejects stale completions and keeps an old
`finally` from unlocking a newer operation.

```ts
export function createLatestGuard() {
  let current = 0;
  return {
    begin(): number {
      current += 1;
      return current;
    },
    isCurrent(token: number): boolean {
      return token === current;
    },
    invalidate(): void {
      current += 1; // cancel, navigation, reset, or unmount
    },
  };
}

// Usage inside a flow that owns `loading` and `result`.
const guard = createLatestGuard();

async function submitAnswer(answer: string) {
  const token = guard.begin();
  setLoading(true);
  try {
    const result = await api.check(answer);
    if (guard.isCurrent(token)) setResult(result);
  } finally {
    if (guard.isCurrent(token)) setLoading(false);
  }
}
```

Call `guard.invalidate()` on cancel/Back/reset and on unmount. A guard prevents
local application of a stale result; it does not cancel the remote request.
When the remote side has effects, reconcile it as described in
`state-and-storage.md`.

## Serialize independent deltas, not snapshots

Each writer passes a function of the latest committed state. Queuing a
precomputed full snapshot still loses another writer's fields.

```ts
export function createSerializedStore<T>(
  read: () => Promise<T>,
  write: (value: T) => Promise<void>,
) {
  let tail: Promise<unknown> = Promise.resolve();
  return function update(change: (latest: T) => T): Promise<T> {
    const run = tail.then(async () => {
      const next = change(await read());
      await write(next);
      return next;
    });
    tail = run.catch(() => undefined); // a failed write must not block later ones
    return run;
  };
}
```

This only serializes writers in one JavaScript context. Cross-tab, cross-device,
or server conflicts need a revision, a merge policy, or server-side atomic
updates. VK Storage has no compare-and-set.

## Bound optional waits

```ts
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
```

Use it only for optional startup or host work whose contract allows a degraded
state. A timeout ends waiting, not the operation. A late success may still
need reconciliation, and a security gate must stay blocking.

## Deterministic test shape

Control settlement order explicitly. Prefer the project's existing runner (the
example uses Vitest).

```ts
import { expect, it, vi } from 'vitest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

it('ignores an older completion that settles last', async () => {
  const guard = createLatestGuard();
  const applied: string[] = [];
  const run = async (work: Promise<string>) => {
    const token = guard.begin();
    const value = await work;
    if (guard.isCurrent(token)) applied.push(value);
  };
  const a = deferred<string>();
  const b = deferred<string>();
  const runA = run(a.promise);
  const runB = run(b.promise);
  b.resolve('B');
  await runB;
  a.resolve('A');
  await runA;
  expect(applied).toEqual(['B']);
});

it('keeps both independent deltas', async () => {
  let stored = { coins: 0, sound: true, level: 1 };
  const update = createSerializedStore(
    async () => stored,
    async (value) => {
      stored = value;
    },
  );
  await Promise.all([
    update((s) => ({ ...s, coins: s.coins + 5 })),
    update((s) => ({ ...s, level: s.level + 1 })),
  ]);
  expect(stored).toEqual({ coins: 5, sound: true, level: 2 });
});

it('falls back when an optional host call never settles', async () => {
  vi.useFakeTimers();
  try {
    const pending = withTimeout(new Promise<never>(() => {}), 3000);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toBe('timeout');
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
```

For Bridge-backed flows, drive the same orderings through the sibling
`vk-app-test` scenario controller (`setBridgeResponse`, `rejectBridgeMethod`,
`emitBridgeEvent`) or a deferred service mock. Do not use real sleeps.
