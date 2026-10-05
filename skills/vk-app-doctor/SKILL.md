---
name: vk-app-doctor
description: "Audit a VK Mini App with one read-only command across project structure, official dependencies, VK Bridge initialization and mock isolation, tests, launch security, hosting config, build output, catalog metadata, icons, splashscreens, screenshots, and release evidence. Use when the user asks whether an app is ready, requests a health check/preflight/doctor, wants CI readiness, or before publishing. Run in normal mode during development and --release --strict as the final local gate."
---

# Diagnose VK Mini App readiness

Produce evidence, not a generic checklist. Never mutate the target application.

## Run the doctor

From the application root:

```bash
SKILL_DIR="<absolute path to the installed vk-app-doctor skill>"
node "$SKILL_DIR/scripts/vk-app-doctor.mjs"
```

Use `--release` when catalog and hosting artifacts are expected. Add `--strict`
in CI to make warnings fail, and `--json` for machine-readable evidence:

```bash
node "$SKILL_DIR/scripts/vk-app-doctor.mjs" --release --strict
node "$SKILL_DIR/scripts/vk-app-doctor.mjs" --release --json > doctor.json
```

Read `references/checks.md` before interpreting a release result.

## Triage findings

1. Fix failures before warnings.
2. Group remediations by owning sibling skill:
   - product evidence → `vk-app-plan`;
   - stack/project structure → `vk-app-scaffold`;
   - Bridge boundary and methods → `vk-bridge-recipes`;
   - `internal-links`, header/control layout → `vk-app-design`;
   - mocks and automated coverage → `vk-app-test`;
   - game loop, level content, and progression evidence → `vk-gameplay-acceptance`;
   - races, lost saves, stalled startup, and schema compatibility → `vk-app-resilience`;
   - authentication, secrets, permissions → `vk-app-security`;
   - visual/catalog artifacts → `vk-app-assets`, `vk-catalog-description`, screenshot,
     Lottie, and listing skills;
   - hosting and packaging → `vk-app-publish` and `vk-miniapps-deploy`.
3. Inspect direct file evidence before changing code. The doctor uses deliberate
   static heuristics and can identify a pattern without proving intent.
4. Re-run the same mode after remediation and preserve the final output in the
   delivery tracker or CI artifact.

Do not weaken a check to accommodate an incomplete app. Mark a genuinely
inapplicable release artifact in project documentation and explain it alongside
the evidence.

## Done when

- Development mode has no unexplained failures.
- `--release --strict` passes for a catalog release, or every remaining item is
  an explicit real-client/admin/legal handoff.
- The normal production build and real VK client smoke test still run; the
  doctor does not replace either.
