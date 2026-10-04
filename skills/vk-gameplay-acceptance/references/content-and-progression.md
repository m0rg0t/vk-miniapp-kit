# Content and progression contracts

Select the sections touched by the task. An arcade round need not have a puzzle
solver; a learning app need not have lives, coins, or a level-unlock system.

## Authored content

Establish the source of truth and the generated/runtime copies before editing.
Identify stable IDs, order, rules, required fields, and referenced media. A
dependency or UI change should not silently regenerate accepted boards, rename
saved level IDs, substitute placeholder artwork, or discard audio.

Check content structurally against the actual rules: valid dimensions and cell
values, legal references, unique IDs, required answers, and any claimed solution
or progression relationship. Compare intended unchanged content by canonical
data/hash or exact files, not count alone. If multiple runtime copies exist,
check their semantic equivalence and inspect the final build's referenced assets.
File presence alone does not prove decoding or rendering; open representative
shipped media and exercise its in-game use.

## Generated levels and solvability

Record the seed, generator/options, rules version, and generated instance for a
failure. Use the game's legal transitions and win condition in the verifier.
Replaying a claimed solution through those transitions must finish in a valid
winning state; a generator's own success flag is not independent proof.

Choose checks proportional to the domain:

- A constructive generator can retain and replay a legal solution witness.
- A bounded search can establish a solution, a contradiction, or an inconclusive
  search-budget result. Exhausting a budget is not proof of unsolvability.
- Uniqueness is a separate property: test it only if the product promises it.
- Randomized/seed-sweep tests should include recorded failures and boundary
  sizes/difficulties. Report the sampled set; do not claim all seeds are valid.

Validate solvability, difficulty, and enjoyable presentation separately. Do not
weaken rules, lower promised difficulty, or replace authored levels merely to
get a validator or browser journey to pass. If changing content is necessary,
make the changed contract explicit and preserve stable references/migration.

## Completion and rewards

Test the transition that creates completion and every supported transition that
can invalidate it. For an editable puzzle, erase/undo may require completion to
clear and its timer/input to resume. For a finalized round, retain the completed
score instead of accidentally recording a new session's reset value. Follow
this game's rules rather than imposing either behavior universally.

Derive progress and achievements from the authoritative, active state model.
Check numeric progress where shown, not just an unlocked boolean. Cover a
threshold boundary and ensure duplicate clicks/events cannot credit the same
completion twice. If rewards are server-authoritative, a client fixture cannot
prove server balance integrity; use isolated service tests and the security
workflow. Never call a live payment/reward endpoint solely to obtain QA evidence.

## Persistence and return

Use a known previous-profile fixture with relevant settings, records,
achievements, and partially/completely played state. Complete the changed loop,
save, reload, and verify both the intended delta and unaffected fields. Add
malformed/denied storage and hydration interruption when that boundary changed.

Preserve the distinction between local persistence and confirmed cloud sync.
Verify saved content against the current catalog; handle an invalid board or
missing level with an explicit recovery policy instead of crashing or wiping
unrelated progress. Use `vk-app-resilience` for concurrent writes, reset epochs,
older-client schema behavior, and pending write reconciliation.

## Minimal focused examples

- Puzzle completion: solve → result → supported erase/undo → correct live board
  state → solve again → one intended completion record → reload.
- Gesture round: perform gesture → visible outcome → release/cancel → next
  gesture works → finish → saved result survives restart.
- Level catalog: validate IDs/rules/media → replay a solution witness for
  changed levels → play a representative changed level → reload its progress.

Adapt these sequences to the product; retain only scenarios that can expose a
real changed behavior.
