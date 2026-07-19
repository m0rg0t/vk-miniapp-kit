# Doctor checks

The doctor is read-only and dependency-free. It searches source and documented
artifact conventions; keep project-specific exceptions explicit.

| Category | Development mode | Release mode |
|---|---|---|
| Project | package, current VK dependencies, scripts, source entry | same |
| Platform | init, centralized Bridge calls, serve-only mock isolation | same |
| Tests | real test declarations, browser runner, acceptance criteria | warnings become release blockers under `--strict` |
| Security | no client secret patterns, signed launch authentication evidence | verifier and privacy evidence expected when a backend/user identity exists |
| Hosting | parse config when present | config, endpoints, output entry required |
| Assets | validate recognized files when present | icon, splash, and ≥3 consistent screenshots required |
| Catalog | recognize copy/privacy/support evidence | all required |

## Exit codes

- `0`: no failures; warnings are allowed unless `--strict` is set.
- `1`: at least one failure, or at least one warning in strict mode.
- `2`: invalid doctor command-line option.

## Recognized artifact conventions

The doctor searches common locations and names:

- icons containing `icon` at 576×576 or 1024×1024;
- splash images containing `splash` at 1080×1920 or 1920×1080;
- directories containing `screenshot` with 600×1200 or 1200×600 PNGs;
- Markdown/JSON files containing listing/catalog metadata, privacy policy, and
  support/contact details;
- product specs containing “acceptance criteria” or “критерии приёмки”.

If a project intentionally uses different paths, document a small manifest or
rename a copied release artifact rather than teaching the doctor about one
repository's arbitrary layout.
