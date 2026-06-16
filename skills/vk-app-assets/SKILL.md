---
name: vk-app-assets
description: Generate and resize VK Mini App icons and splashscreens to every required size from a single source image. Use this skill whenever the user needs app icons, иконки приложения, a catalog icon (576×576), a 1024 master icon, splashscreens, заставки/сплэш-экраны, or has an icon at the wrong size for VK. It produces correctly-sized PNGs into public/resources/app/ following VK's naming, and verifies each output dimension. These are static assets — for an animated launch icon use vk-lottie-launch-icon, and for catalog screenshots use vk-catalog-screenshots. Prefer this over hand-resizing whenever the goal is VK icon/splash assets.
---

# VK Mini App icons & splashscreens

Turn one high-res source into the full set of correctly-sized VK assets, with
every output verified — so nothing gets rejected at upload for being a few pixels
off or the wrong aspect ratio.

## First: know the targets

Read `references/vk-asset-sizes.md` for the size table and naming conventions.
The short version: a **square** icon master (1024²) → `icon-1024.png`,
`icon-576.png` (catalog); **portrait** and **landscape** splash sources →
`splashscreen-1080x1920.png`, `splashscreen-1920x1080.png`. The VK admin upload
form is the final word on required sizes — confirm there before submission.

## Workflow

### 1. Locate the sources

- **Icon:** a square image, ideally ≥1024×1024. If only a smaller or non-square
  one exists, say so — upscaling looks soft and non-square distorts. The official
  template keeps an `icon.svg` master under `public/resources/app/`; rendering
  the SVG at 1024 first gives the cleanest raster source.
- **Splash:** separate portrait (≥1080×1920) and landscape (≥1920×1080) sources.

### 2. Generate the set

```bash
bash "$CLAUDE_PLUGIN_ROOT/skills/vk-app-assets/scripts/resize-assets.sh" \
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
- No asset is distorted (sources had the right aspect ratio).
- Filenames follow the conventions in `references/vk-asset-sizes.md`.
