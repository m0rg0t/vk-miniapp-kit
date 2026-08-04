---
name: vk-catalog-screenshots
description: "Capture and normalize real VK Mini App catalog/store screenshots to the current admin form's exact size and count (known default: 600×1200 portrait, at least 3, PNG/JPG). Use for catalog screenshots, store/listing preview images, app card images, \"скриншоты для каталога\", or \"картинки для витрины VK\". Read the current form first, capture only the shipped UI, verify every file, and register the results in the shared vk-app-assets manifest."
---

# VK catalog screenshots

Produce a set of catalog-ready screenshots for a VK Mini App, captured from the
real running app and normalized to VK's exact pixel spec. The hard parts this
skill removes: picking a browser tool that actually works on the machine,
capturing at the right size, and guaranteeing every file is exactly to spec.

## Read the current target first

- Open the current catalog form and record its date/source in the common
  `vk-app-assets` manifest before capture.
- **Known default:** `600 × 1200 px` portrait ("Книжная"). Landscape
  ("Альбомная") is `1200 × 600 px`. Pick one orientation and keep all shots
  consistent.
- **Known default format:** PNG or JPG. PNG is the safe default.
- **Known default count:** at least 3; 3–5 is the useful range. The **first** image is the one
  most users see — make it the strongest screen.

If the form differs, pass its numbers via `--width/--height` or `set viewport`.
If the form is inaccessible, ask for a screenshot rather than presenting the
known defaults as current facts.

## Workflow

### 1. Get the app running and reachable

Catalog images should reflect the **production** build (real assets, no dev-only
banners). Prefer a preview server; fall back to the dev server.

```bash
# preferred — production output
npm run build && npm run preview   # usually http://localhost:4173
# or, faster, the dev server
npm run dev                        # usually http://localhost:5173
```

Run it in the background and wait until the URL responds before capturing
(`curl -sf <url>` returns 0). Note the actual port from the tool's output —
don't assume it.

### 2. Decide which screens to show (3–5)

Look at the app's routes/panels (e.g. `src/panels/`, the router config) and pick
the screens that best sell the app: the landing/main screen, the core feature
mid-use, and a result/output screen are a reliable trio. If unsure which screens
matter most, ask the user briefly. Name files in display order:
`01-main.png`, `02-…`, `03-….png`.

### 3. Capture — pick the first available tool

**Default: `agent-browser` CLI** (purpose-built for agents; captures at the exact
viewport so no resize is needed). If you're unsure of its commands, load its own
guide first: `agent-browser skills get core --full`.

```bash
agent-browser open http://localhost:4173
agent-browser set viewport 600 1200
# navigate to a screen, then shoot. Use the accessibility tree to find controls:
agent-browser snapshot                       # lists elements + refs
agent-browser find text "Далее" click        # or: agent-browser click <@ref|css>
agent-browser wait 500
agent-browser screenshot screenshots/01-main.png
# repeat: navigate → wait → screenshot for each screen
agent-browser close
```

Tips: `set viewport 600 1200` makes captures land at spec on a 1× display; on a
HiDPI machine the file may come out at 2× (1200×2400) — that's fine, step 4
normalizes it. Use `agent-browser wait <ms>` after navigation so animations and
images settle before the shot.

**Fallback: the bundled capture script** (Playwright → puppeteer-core, whichever
is installed). Use it when `agent-browser` is absent. Define the navigation as a
small steps file:

```bash
cat > /tmp/steps.json <<'JSON'
[
  { "goto": "/", "wait": 800 }, { "shot": "01-main" },
  { "clickText": "Далее", "wait": 600 }, { "shot": "02-params" },
  { "clickText": "Рассчитать", "wait": 600 }, { "shot": "03-result" }
]
JSON
SKILL_DIR="<absolute path to the installed vk-catalog-screenshots skill>"
node "$SKILL_DIR/scripts/capture.mjs" \
  --url http://localhost:4173 --out ./screenshots \
  --width 600 --height 1200 --scale 2 --steps /tmp/steps.json
```

(Each step is one of `goto` / `clickText` / `click` / `waitFor` / `wait` /
`shot`; see the header of `capture.mjs`. The script captures at `--scale` and
leaves resizing to step 4, so all tools share one normalize pass.)

**Last resort:** use the agent's connected browser/Chrome control to navigate,
set a 600×1200 viewport, and save screenshots to disk, then run step 4.

### 4. Normalize to exact spec (always run this)

Whatever captured them, force every file to the target size and confirm. On
macOS, `sips` is built in:

```bash
W=600; H=1200
for f in screenshots/*.png; do
  sips -z "$H" "$W" "$f" >/dev/null   # -z is height then width
done
# verify
for f in screenshots/*.png; do
  printf '%s -> ' "$f"; sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{print $2}' | paste -sd'x' -
done
```

Every line must read `600x1200`. If a shot looks stretched, the source aspect
ratio was off — recapture that screen rather than squashing it.

### 5. Document and register the set

Write/refresh `screenshots/README.md` so the choices are reviewable: a table of
file → screen → note, the spec used, and a recommended top-3 for the catalog
(lead with the strongest). Add every exact file path and current dimensions to
the common `vk-app-assets` catalog manifest.

## Done when

- ≥3 PNGs in `screenshots/`, each verified at exactly the target size.
- File order reflects catalog display order; the first is the strongest screen.
- `screenshots/README.md` documents the set and the recommended top-3.
- The common catalog preflight accepts every screenshot.
