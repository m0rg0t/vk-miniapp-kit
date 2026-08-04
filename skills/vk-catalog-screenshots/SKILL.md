---
name: vk-catalog-screenshots
description: "Capture and verify real VK Mini App catalog/store screenshots at the current admin form's exact physical size, using a 2× CSS viewport (known default: 300×600 CSS → 600×1200 PNG, at least 3). Use for catalog screenshots, store/listing preview images, app card images, \"скриншоты для каталога\", or \"картинки для витрины VK\". Read the current form first, capture only the shipped UI, remove personal data, and register the result in the shared vk-app-assets manifest."
---

# VK catalog screenshots

Produce a reviewable set of catalog screenshots from the real running VK Mini
App. Keep the browser viewport, device scale, physical PNG dimensions, screen
order, demo data, and manifest evidence aligned. The default contract is:

| Layer | Portrait default |
|---|---:|
| Browser CSS viewport | `300×600` |
| Device scale factor | `2` |
| Physical PNG | `600×1200` |
| Minimum count | `3` |

Do not capture a `600×1200` CSS viewport and downscale it. That produces the
right file dimensions but the wrong UI density and text scale.

## Read the current target first

- Open the current VK catalog upload form and record its date/source in the
  common `vk-app-assets` manifest before capture. The form is authoritative.
- Known default physical target: `600×1200` portrait (`«Книжная»`). Landscape
  is `1200×600` (`«Альбомная»`). Keep every screenshot in one orientation.
- PNG is the safe default. Capture at least 3; 3–5 is a useful range. The first
  image is the lead image users see, so make it the strongest screen.
- Derive the CSS viewport from the physical target and scale. At 2×,
  `600×1200` physical means `300×600` CSS; `1200×600` means `600×300` CSS.

If the form differs, use its physical dimensions and choose a scale that yields
integer CSS dimensions. If the form is inaccessible, request a screenshot of
the form instead of treating the known defaults as current facts.

## Workflow

### 1. Run the shipped app

Use a production preview when possible so the capture contains real assets and
no dev-only banners. A dev server is acceptable for a local-only app review.

```bash
npm run build && npm run preview   # usually http://localhost:4173
# or
npm run dev                        # usually http://localhost:5173
```

Run it in the background, wait for the actual URL to respond, and note the
actual port. Use `curl -sf <url>` or an app-specific ready signal; do not guess
the port.

### 2. Prepare honest, stable screens

Inspect the shipped routes/panels and choose screens that explain the product:
the main value screen, the core interaction in use, and a useful result or
settings state are a reliable trio. Keep the same deterministic demo state
across captures so the set reads as one product.

- Complete onboarding with synthetic demo data only. For date-driven apps, a
  fixed date such as `11 July 2026` is acceptable when documented; never use a
  user's name, avatar, health value, identifier, message, or private date.
- Hide devtools, browser chrome, debug overlays, loading skeletons, and stale
  toasts. Wait for fonts, images, and transitions to settle.
- Name files in display order: `01-today.png`, `02-calendar.png`,
  `03-settings-lock.png`. The first file should show the product's strongest
  value, not an onboarding blank state.
- Treat the viewport as the frame. If a settings screen's export/data block is
  below the fold, either capture a fourth scrolled frame or replace the frame
  after scrolling; do not describe below-fold content as visible in the image.

### 3. Capture at 300×600 CSS @2×

**Default: `agent-browser` CLI.** Before using it, load the installed CLI guide
with `agent-browser skills get core --full` if its commands are unfamiliar.

```bash
agent-browser open http://localhost:4173
agent-browser set viewport 300 600 2
agent-browser wait --load networkidle

# Discover controls, seed synthetic demo state, and navigate to the first screen.
agent-browser snapshot -i
agent-browser screenshot screenshots/01-today.png

# Re-snapshot after each page-changing action; refs become stale after changes.
agent-browser find text "Календарь" click
agent-browser wait --load networkidle
agent-browser screenshot screenshots/02-calendar.png

agent-browser find text "Настройки" click
agent-browser wait --load networkidle
agent-browser screenshot screenshots/03-settings-lock.png

agent-browser close
```

For a below-fold state, use `agent-browser scroll down 500`, wait for the UI to
settle, and capture a clearly named fourth frame. Use an app-specific ready
signal where available; a short wait is only a fallback for animations.

**Fallback: the bundled browser capturer.** It uses Playwright first and
`puppeteer-core` second. Its `--width`/`--height` flags are physical output
dimensions; it derives the CSS viewport and verifies every PNG's IHDR before it
exits.

```bash
cat > /tmp/vk-catalog-steps.json <<'JSON'
[
  { "goto": "/" },
  { "wait": 800 },
  { "shot": "01-today" },
  { "clickText": "Календарь" },
  { "wait": 500 },
  { "shot": "02-calendar" },
  { "clickText": "Настройки" },
  { "wait": 500 },
  { "shot": "03-settings-lock" }
]
JSON

SKILL_DIR="<absolute path to the installed vk-catalog-screenshots skill>"
node "$SKILL_DIR/scripts/capture.mjs" \
  --url http://localhost:4173 --out ./screenshots \
  --width 600 --height 1200 --scale 2 \
  --steps /tmp/vk-catalog-steps.json
```

Each step is one of `goto`, `clickText`, `click`, `waitFor`, `wait`, `scroll`,
or `shot`; see the header of `scripts/capture.mjs`. The script writes
`.capture-result.json` with the CSS viewport, scale, physical target, engine,
and files captured.

**Last resort:** use the connected browser/Chrome control, set the viewport to
`300×600` CSS at `2×`, capture only the viewport, and run the verifier below.

### 4. Verify; do not resize a wrong capture

Run the portable verifier for both `agent-browser` captures and any manually
captured set:

```bash
SKILL_DIR="<absolute path to the installed vk-catalog-screenshots skill>"
node "$SKILL_DIR/scripts/verify.mjs" \
  --dir ./screenshots --width 600 --height 1200 --min-count 3
```

Every file must report `600x1200`. If a file reports `1200x2400`, the browser
was set to `600×1200` CSS; recapture at `300×600` CSS @2×. If a file is
stretched, cropped unexpectedly, or has the wrong orientation, recapture that
screen. Do not hide a bad viewport by running `sips -z`, ImageMagick, or an
editor resize.

For a landscape form, pass `--width 1200 --height 600`; the corresponding 2×
CSS viewport is `600×300`.

### 5. Document and register the set

Write or refresh `screenshots/README.md` with:

- a file → screen → visible-state table in catalog display order;
- physical dimensions, CSS viewport, device scale, capture date, and engine;
- the deterministic demo-data note and explicit no-personal-data review;
- a recommended top-3, with the strongest screen first;
- any below-fold/export frame and what it demonstrates.

Record the same capture evidence in `assets.screenshotCapture` of the common
catalog manifest. The minimum shape is:

```json
{
  "source": "http://localhost:4173",
  "capturedAt": "YYYY-MM-DD",
  "engine": "agent-browser",
  "cssViewport": { "width": 300, "height": 600 },
  "deviceScaleFactor": 2,
  "physicalOutput": { "width": 600, "height": 1200 },
  "syntheticData": true,
  "realUiReviewed": true,
  "privacyReviewed": true
}
```

Run the shared preflight after updating the manifest:

```bash
node "<absolute path to the installed vk-app-assets skill>/scripts/catalog-preflight.mjs" \
  release/catalog/catalog-manifest.json
```

### 6. Clean up

Close the browser and local app sessions after capture. Do not commit browser
state, `.env.local`, credentials, HAR files, or temporary capture metadata
unless the project explicitly treats them as release evidence.

## Done when

- At least 3 real-UI PNGs exist in catalog display order.
- Every PNG is exactly the form's physical target; the default is `600×1200`.
- The default capture metadata says `300×600` CSS, `deviceScaleFactor: 2`, and
  `syntheticData: true`.
- `screenshots/README.md` documents the screens, state, privacy review, and
  recommended top-3.
- `assets.screenshotCapture` records the engine, date/source, scale, and
  physical output, with real-UI and privacy review set to true.
- The common catalog preflight accepts the complete package.
