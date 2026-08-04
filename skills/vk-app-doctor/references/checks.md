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
| Assets | validate recognized files when present | 576 icon, 1120×630 snippet, splash, and ≥3 consistent screenshots required; common preflight also requires capture evidence |
| Catalog | recognize copy/privacy/support/manifest evidence | all required; run the stronger `vk-app-assets` common preflight separately |

## Exit codes

- `0`: no failures; warnings are allowed unless `--strict` is set.
- `1`: at least one failure, or at least one warning in strict mode.
- `2`: invalid doctor command-line option.

## Recognized artifact conventions

The doctor searches common locations and names:

- icons containing `icon` at exactly 576×576;
- snippets containing `catalog-snippet` at exactly 1120×630;
- splash images containing `splash` at 1080×1920 or 1920×1080;
- directories containing `screenshot` at the dimensions/count stored in the
  catalog manifest (known fallback: 600×1200 or 1200×600, at least three);
- `assets.screenshotCapture` in the common manifest, including the CSS viewport,
  2× device scale, physical output, synthetic demo-data policy, and visual
  review flags;
- `catalog-manifest.json` plus Markdown/JSON files containing listing/catalog
  metadata, privacy policy, and support/contact details;
- product specs containing “acceptance criteria” or “критерии приёмки”.

If a project intentionally uses different paths, document a small manifest or
rename a copied release artifact rather than teaching the doctor about one
repository's arbitrary layout.

The doctor checks broad evidence only. Use
`vk-app-assets/scripts/catalog-preflight.mjs` for PNG integrity, exact manifest
paths, snippet sources/privacy review, Lottie loop, copy content/limits, and
links/contact completeness.
