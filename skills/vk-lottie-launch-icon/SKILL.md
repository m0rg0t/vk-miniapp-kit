---
name: vk-lottie-launch-icon
description: Create or validate a Lottie (bodymovin) animated launch/loading icon for a VK Mini App within the platform budget — 96×96 px, ≤24 KB, seamless loop. Use this skill whenever the user wants an animated app icon, a Lottie/bodymovin JSON, a loading/launch animation, or says "анимированная иконка", "лотти", "анимация загрузки" for a VK app. It writes valid Lottie JSON and verifies size, dimensions, loop seam, layer order, and a visual preview. This is the animated icon specifically — for static icon sizing (576/1024) or splashscreens use vk-app-assets. Prefer this over generic animation help whenever the target is a VK launch icon.
---

# VK animated launch icon (Lottie)

Produce a launch-icon animation that VK will accept and that loops cleanly:
96×96, ≤24 KB, seamless, and visibly readable. The skill covers both authoring
a new one and validating an existing file.

## Know the format first

Read `references/lottie-format.md` — it explains the bodymovin JSON structure,
the three hard constraints, the front-to-back layer order, the compatible
shape-layer subset, and the one rule that trips people up: **every animated
property must return to its frame-0 value at the out point** or the loop
visibly jumps.

## Workflow

### A. Validate an existing Lottie

```bash
SKILL_DIR="<absolute path to the installed vk-lottie-launch-icon skill>"
node "$SKILL_DIR/scripts/validate-lottie.mjs" \
  path/to/icon-animation.json --strict-loop --strict-layer-order
```

It checks size, JSON validity, required fields, 96×96 dimensions, and rejects
any animated property whose loop seam drifts (start ≠ end). It also reports
"upload form" findings — non-ASCII names and omitted default layer/shape fields
— which `--strict-upload-form` turns into failures; fix them with
`normalize-lottie.mjs` (see step 6 below). It warns when a
topmost opaque shape is large enough to cover later layers, and can make that
warning a failure with `--strict-layer-order`. Override targets with
`--width/--height/--max-kb` only after reading the current admin form.

### B. Author a new one

1. **Pick a motion that returns home.** Seamless loops come from reversible
   motion: grow→shrink→grow, fade in→out→in, a full 360° rotation, strips
   sliding up then back. Decide the loop length (≈2–3 s at `fr` 30).
2. **Write compact shape-layer JSON.** Favor `rc`, `el`, `sh`, `fl`, `st`, `gr`,
   and ordinary transforms over embedded images (no base64), expressions,
   masks/mattes, effects, 3D layers, blend modes, gradients, and rare shape
   operators. Keep layers and keyframes few; integer coordinates are fine at
   96×96. Mirror the structure in `references/lottie-format.md`.
3. **Make the loop seamless by construction.** For each animated transform, set
   the final keyframe's value equal to the first. Check the frame immediately
   before `op` as well: `op` itself is commonly the exclusive end and may not
   be rendered by the player.
4. **Save** to the app's asset folder, conventionally
   `public/resources/app/icon-animation.json`.
5. **Validate** with the script above and fix every hard failure and layer-order
   warning. Keep an opaque background at the end of `layers`; the array is
   front-to-back, so the first layer is visually above the next one.
6. **Normalize for the uploader.** Hand-written or generator-written JSON often
   omits fields a real exporter writes and may carry non-ASCII names. The VK
   admin refused such a file that rendered correctly in `lottie-web`, and
   accepted the same picture after this rewrite, so always run it before upload:

   ```bash
   node "$SKILL_DIR/scripts/normalize-lottie.mjs" path/to/icon-animation.json \
     --name launch-icon
   node "$SKILL_DIR/scripts/validate-lottie.mjs" path/to/icon-animation.json \
     --strict-loop --strict-layer-order --strict-upload-form
   ```

   The normalizer keeps geometry, colours and keyframes; it only writes ASCII
   names, explicit default fields and 2-decimal floats. If a generator script
   produces the file, call the normalizer at the end of that script so a
   regeneration cannot bring the sparse form back.
7. **Record** the path and current form limits in the project's release/catalog
   manifest. The common `vk-app-assets` preflight rechecks Lottie strictly.

### C. Mandatory visual check

The structural check cannot prove that the symbol is visible. Run the bundled
preview helper with `lottie-web`'s SVG renderer:

```bash
node "$SKILL_DIR/scripts/preview-lottie.mjs" \
  path/to/icon-animation.json \
  --out .tmp/lottie-preview \
  --lottie-web /absolute/path/to/lottie_svg.min.js
```

The helper captures `frame-ip.png`, `frame-mid.png`, and `frame-op-1.png`.
Open and inspect all three images in a browser or image viewer. Confirm that
the principal symbol is visible, the background does not occlude it, the motion
reads at the middle, and the frame before `op` returns to the starting visual
state. The helper also writes `preview.html` so the same check can be repeated
with the VK uploader or another browser. Install `lottie-web` in the target
project or pass its browser bundle explicitly; do not make a remote CDN a
release dependency.

Compare the frames with the static icon using the `vk-app-assets` icon-style
reference. Keep the container shape, palette, main symbol, and optical size
consistent. If the admin form supplies a separate background, choose one mode
deliberately: transparent symbol on the system background, or a self-contained
branded badge. Do not stack both unintentionally.

## Done when

- The file passes `validate-lottie.mjs` with no hard failures or loop-seam
  warnings; use `--strict-loop --strict-layer-order --strict-upload-form` for
  the release check.
- Size ≤ 24 KB, dimensions 96×96.
- `preview-lottie.mjs` has produced and a human/agent has inspected the `ip`,
  middle, and `op - 1` SVG-rendered frames.
- The animation visibly matches the static icon and does not hide its symbol
  behind an opaque background layer.
