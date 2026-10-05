# Gameplay acceptance: [milestone]

Replace bracketed fields; remove inapplicable rows with a reason. This is an
evidence record, not a declaration that tests ran.

## Contract

- Requested change and unchanged behavior/content: [scope]
- Entry/deep link and synthetic player state: [preconditions]
- First meaningful action → expected visible effect: [action → result]
- Success/failure → dismiss/retry/next: [observable sequence]
- Progress/reward and reload expectation: [delta and fields preserved]
- Required local/service/native gates: [risk-based scope]

## Tested artifact

- Commit SHA: [exact revision]
- Uncommitted patch or artifact identity, if any: [hash/path or clean]
- Build command, mode, and app URL/artifact: [exact values]
- Environment and platform/client version: [what actually ran]
- Input model: [mouse / synthetic touch / browser emulation / physical device]
- Data/level IDs, generator seed and clock, if applicable: [reproducible inputs]
- Bridge/backend boundary: [real local service / controlled mock / not used]

## Evidence

Use `pass`, `fail`, `blocked`, `not-run`, or `not-applicable`. Each passing row
needs a command or reproducible steps and a current artifact/result.

| Gate/scenario | Expected observable result | Status | Command/steps and artifact | Revision/environment |
|---|---|---|---|---|
| First meaningful action | [visible effect] | not-run | [evidence] | [identity] |
| Result and recovery | [next action works] | not-run | [evidence] | [identity] |
| Progress and reload | [delta and unaffected data] | not-run | [evidence] | [identity] |
| Content/level validity | [applicable invariant or exclusion] | not-run | [evidence] | [identity] |
| Rendered input/layout | [input path and visible result] | not-run | [evidence] | [identity] |
| Native/service gate | [what local tests cannot prove] | not-run | [evidence] | [identity] |

## Visual review

- Inspected captures and depicted state: [paths; synthetic data only]
- Viewports/themes actually checked: [values]
- Input/overlay/overflow findings: [observations]
- Media loaded from final build: [what was checked, if relevant]

## Conclusion

- Local playable slice: [verified behavior, or why incomplete]
- Failing/blocked/unrun required gates: [impact, owner/next action]
- Native release evidence still required: [client/device/flow]
- Historical evidence kept separate: [old revision and limits]
- Readiness: [local acceptance only / incomplete / release evidence complete]
