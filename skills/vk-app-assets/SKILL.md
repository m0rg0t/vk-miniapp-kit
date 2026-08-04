---
name: vk-app-assets
description: "Create and preflight the complete VK Mini App catalog asset package: editable icon master, mandatory 576×576 PNG, reproducible 1120×630 catalog snippet made from the real app UI and icon, splashscreens, screenshot manifest, optional 96×96 Lottie, catalog copy, privacy links, and support contacts. Use for app identity, иконка приложения, catalog snippet/artwork, splashscreens, publication assets, or final catalog asset readiness. Read the current VK admin form first and reject missing, corrupt, wrong-size, private-data, or incomplete package entries."
---

# Create and preflight VK catalog assets

Create the complete catalog package, preserve editable sources, and let the
deterministic preflight decide whether it is ready.

## Read the current admin form first

Read `references/vk-asset-sizes.md`, then open every relevant field in the
current app admin before production. Save a screenshot when possible and record
its path plus the check date in the manifest. If the admin is inaccessible, ask
for screenshots and keep readiness blocked. Do not copy limits from memory.

## 1. Establish the visual source

Read the product brief and inspect the real app UI before drawing. Keep a simple,
recognizable identity that remains legible at small size.

Read `references/vk-icon-style.md` before drawing anything. Write a one-paragraph
direction covering concept, silhouette, palette, light/dark behavior, and what
must remain legible at small size. Treat the style reference as a starting point,
not as permission to imitate a known app's mark.

- Prefer a square SVG icon master under `public/resources/app/icon.svg`.
- For raster input, require a square source at least 1024×1024; reject non-square
  input rather than stretching it.
- Keep the icon artwork square to the canvas without a baked outer corner radius,
  rounded-square mask, or transparent rounded-corner cutout. VK applies the
  catalog mask; pre-rounding compounds it. Rounded elements inside the artwork
  are fine.
- Keep separate correctly proportioned portrait and landscape splash sources.
- If no usable icon exists, create an original editable SVG or use an available
  image generation tool to make a 1024×1024 master. Prefer a simple silhouette,
  broad shapes, and no tiny text. Do not imitate third-party marks or
  generatively redraw an accepted master for each size. Keep the original prompt
  or SVG alongside the outputs so the identity can be revised.

Present materially different directions only when the user needs to choose a
brand direction. Once chosen, use one consistent identity across icon, splash,
screenshots, and catalog copy.

## 2. Render the icon and splash set

```bash
SKILL_DIR="<absolute path to the installed vk-app-assets skill>"
bash "$SKILL_DIR/scripts/resize-assets.sh" \
  --icon public/resources/app/icon.svg \
  --splash path/to/splash-portrait.png \
  --splash-landscape path/to/splash-landscape.png \
  --out public/resources/app
```

The default icon set always includes `icon-576.png`. Pass the SVG master
directly; the script renders every target without aspect distortion. Override
the list with `--sizes "1024 576 256"` only when the current form asks for
additional sizes. The script rejects non-square raster icons and never stretches
a portrait splash into landscape.

## 3. Build the catalog snippet

Create `catalog-snippet-1120x630.source.svg` (or another reproducible composition
source) and render `catalog-snippet-1120x630.png`.

- Use a real current interface capture and the app's actual icon.
- Keep the exact icon and interface source paths in the manifest.
- Keep the outer 1120×630 canvas rectangular and unmasked. Do not bake rounded
  outer corners into the snippet; the catalog applies its own card treatment.
  Normal rounded controls and cards inside the captured UI are fine.
- Do not invent UI or use image generation to fabricate product text.
- Review visible names, avatars, health values, messages, identifiers, and
  notifications for personal data.
- Preserve the composition source beside the PNG.

Render with `rsvg-convert`, ImageMagick, or a browser from the retained source.
Do not stretch an arbitrary screenshot to 1120×630.

### Review the identity at catalogue scale

Render or open a 64–96 px preview of the icon and inspect it on a light
background, a dark background, and in a catalogue-like grid. Confirm the
silhouette, contrast, safe field, optical size, and absence of a baked outer
corner mask. Reuse the same background, main symbol, accent, and geometry in
the splashscreen, snippet, and optional Lottie; use `vk-lottie-launch-icon` for
the animated asset and its visual frame gate.

## 4. Create the catalog manifest

Copy `assets/catalog-manifest.json` into `release/catalog/`, update every path,
and replace all placeholders with requirements copied from the current form.
Point `icon.source` at the retained master SVG and `snippet.iconSource` at the
verified `icon-576.png`. Set both `unroundedReviewed` fields only after checking
that neither asset has a baked outer-corner mask. Set `realUiReviewed` and
`privacyReviewed` only after visual inspection. Use:

- `vk-catalog-copy` for `catalog-copy.json`;
- `vk-catalog-screenshots` for the vertical images;
- `vk-lottie-launch-icon` when a launch animation is present.

## 5. Run the single preflight

```bash
node "$SKILL_DIR/scripts/catalog-preflight.mjs" \
  release/catalog/catalog-manifest.json
```

It validates PNG signature, IHDR, CRCs, compressed image data, exact dimensions,
snippet byte budget, source evidence/privacy review, all screenshot dimensions,
strict Lottie size/loop rules, plain-text copy limits, and required
links/contacts. A package with 512/256/96 icons but no 576 icon fails. So do
1120×629 and 1119×630 snippets.

## 6. Wire runtime identity assets only when needed

Keep runtime icon/splash paths aligned with the app manifest/config. Catalog
snippet and listing copy belong to the admin card and do not require a hosting
deploy.

## Done when

- `catalog-preflight.mjs` prints `пакет готов` with no failures.
- `icon-576.png` and `catalog-snippet-1120x630.png` exist at exact sizes.
- Icon and snippet retain square/rectangular outer corners for the catalog to
  mask; both `unroundedReviewed` fields are true.
- Editable icon and snippet composition sources are retained.
- The manifest records current-form evidence, real UI/icon sources, privacy
  review, copy counts, screenshots, links, contacts, and optional Lottie.
