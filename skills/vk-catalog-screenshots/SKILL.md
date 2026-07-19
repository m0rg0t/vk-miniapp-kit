---
name: vk-catalog-screenshots
description: Capture VK Mini App catalog/store screenshots at VK's exact required size (600×1200 px portrait, ≥3 images, PNG/JPG). Use this skill whenever the user wants app screenshots for the VK catalog, store/listing preview images, app card images, or says "скриншоты для каталога", "скрины приложения", "картинки для витрины VK" — even if they don't name the exact size. It launches the running app, navigates to the best screens, captures them, and normalizes every file to spec. Prefer this over ad-hoc screenshotting whenever the goal is VK catalog/store images.
---

# VK catalog screenshots

Produce a set of catalog-ready screenshots for a VK Mini App, captured from the
real running app and normalized to VK's exact pixel spec. The hard parts this
skill removes: picking a browser tool that actually works on the machine,
capturing at the right size, and guaranteeing every file is exactly to spec.

## VK's spec (the target)

- **Size:** `600 × 1200 px` portrait ("Книжная") — the default. Landscape
  ("Альбомная") is `1200 × 600 px`. Pick one orientation and keep all shots
  consistent.
- **Format:** PNG or JPG (GIF allowed). PNG is the safe default.
- **Count:** at least 3; 3–5 is the sweet spot. The **first** image is the one
  most users see — make it the strongest screen.

> VK occasionally adjusts catalog requirements. Before a final submission,
> confirm the current size/count in the app admin
> (`vk.com/editapp?act=catalog`) or [dev.vk.com](https://dev.vk.com). If they
> differ, pass the new numbers via `--width/--height` (script) or
> `set viewport` (agent-browser) — the workflow is unchanged.

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

### 5. Document the set

Write/refresh `screenshots/README.md` so the choices are reviewable: a table of
file → screen → note, the spec used, and a recommended top-3 for the catalog
(lead with the strongest). Keep it short.

## Done when

- ≥3 PNGs in `screenshots/`, each verified at exactly the target size.
- File order reflects catalog display order; the first is the strongest screen.
- `screenshots/README.md` documents the set and the recommended top-3.
