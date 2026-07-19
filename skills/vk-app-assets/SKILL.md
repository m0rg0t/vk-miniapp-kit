---
name: vk-app-assets
description: Create or derive a visual direction, then generate and resize VK Mini App logos, icons, and splashscreens to every required size. Use whenever the user needs a logo, app identity, иконка приложения, catalog icon, 1024 master icon, splashscreen, заставка, publication artwork, or has a source at the wrong size for VK. Produce editable masters plus verified PNG outputs under public/resources/app/. These are static identity assets; use vk-lottie-launch-icon for animation, vk-catalog-screenshots for in-app screenshots, and vk-app-listing for catalog copy and the final publication manifest.
---

# VK Mini App icons & splashscreens

Create a small, recognizable app identity when none exists, or turn an existing
high-resolution source into the full set of correctly sized VK assets. Preserve
an editable master and verify every raster output.

## First: know the targets

Read `references/vk-asset-sizes.md` for the size table and naming conventions.
The short version: a **square** icon master (1024²) → `icon-1024.png`,
`icon-576.png` (catalog); **portrait** and **landscape** splash sources →
`splashscreen-1080x1920.png`, `splashscreen-1920x1080.png`. The VK admin upload
form is the final word on required sizes — confirm there before submission.

## Workflow

### 1. Establish or locate the visual source

Read the product brief and inspect the app UI before drawing anything. Write a
one-paragraph direction covering concept, silhouette, palette, light/dark
behavior, and what must remain legible at small size.

- **Icon:** a square image, ideally ≥1024×1024. If only a smaller or non-square
  one exists, say so — upscaling looks soft and non-square distorts. The official
  template keeps an `icon.svg` master under `public/resources/app/`; rendering
  the SVG at 1024 first gives the cleanest raster source.
- **Splash:** separate portrait (≥1080×1920) and landscape (≥1920×1080) sources.
- **No usable source:** create an original SVG or use an available image
  generation tool to make a 1024×1024 master. Prefer a simple silhouette, broad
  shapes, and no tiny text. Do not imitate third-party marks. Keep the original
  prompt or SVG alongside the outputs so the identity can be revised.

Present materially different directions only when the user needs to choose a
brand direction. Once chosen, use one consistent identity across icon, splash,
screenshots, and catalog copy.

### 2. Generate the set

```bash
SKILL_DIR="<absolute path to the installed vk-app-assets skill>"
bash "$SKILL_DIR/scripts/resize-assets.sh" \
  --icon path/to/icon-source.png \
  --splash path/to/splash-portrait.png \
  --splash-landscape path/to/splash-landscape.png \
  --out public/resources/app
```

Override the icon size list with `--sizes "1024 576 256"` if the admin asks for
more. Pass only `--icon` (or only `--splash`) to do one kind at a time.

The script forces exact dimensions and prints each output's measured size. It
deliberately skips landscape if no landscape source is given rather than
stretching a portrait one.

### 3. Verify

The script ends with a `verify` block listing every file's real dimensions.
Confirm they match the table exactly. If any source was non-square or the wrong
aspect, the output will look squashed — fix the **source**, don't ship a
distorted asset.

### 4. Wire them up (only if not already referenced)

Most VK templates reference these by path in the manifest/config or load the SVG
masters directly. If you created new filenames, point the relevant config at
them; otherwise the conventional names above are picked up as-is.

## Rendering an SVG master to PNG (if needed)

If the only clean source is an SVG, rasterize it first:

```bash
# preferred if available
rsvg-convert -w 1024 -h 1024 icon.svg -o icon-source.png
# or via headless Chrome / the agent-browser CLI, or an online converter
```

Then feed `icon-source.png` to the resize script.

## Done when

- Every required icon/splash PNG exists under `public/resources/app/` (or the
  chosen `--out`), each verified at exactly its target size.
- The editable source (`.svg`, layered source, or generation prompt) is retained.
- No asset is distorted (sources had the right aspect ratio).
- Filenames follow the conventions in `references/vk-asset-sizes.md`.
