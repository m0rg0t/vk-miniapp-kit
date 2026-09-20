---
name: vk-app-promo-video
description: >-
  Create a short, selling vertical 9:16 promo for a VK Mini App or other web app:
  inspect the product, capture real UI states, write a concise hook/storyboard/call
  to action, render a 15–30 second MP4 with subtle motion and captions, and always
  produce a verified screenshot fallback. Use for requests such as “сделай ролик
  приложения”, “презентация приложения для соцсетей”, “реклама VK Mini App”,
  “вертикальное промо-видео”, “reel/short app demo”, or “собери скриншоты и
  продающий текст”. Do not use for frame-by-frame analysis of an existing video
  or a long step-by-step tutorial.
---

# VK app promo video

Build a compact product story from the shipped interface. Prefer a real-UI MP4,
but keep a useful package of 3–5 stills, copy, and storyboard even when video
rendering or audio is unavailable.

## Output contract

Work in a scratch directory first, then copy only reviewed deliverables into the
target app (normally `release/promo/`):

```text
promo/
├── promo.mp4                 # 1080×1920, H.264, 15–30 s when ffmpeg works
├── screenshots/01-*.png      # 3–5 real-UI 1080×1920 stills
├── promo-manifest.json        # scenes, timings, copy, capture evidence
├── storyboard.md              # scene table and review notes
├── promo-copy.json            # hook, captions, CTA, optional voiceover
└── README.md                  # how it was captured and what is safe to claim
```

Do not claim that an MP4 exists until `ffprobe` and a frame extraction pass have
verified it. If ffmpeg is missing or rendering fails, keep the screenshot
package and state the exact reason.

## Workflow

### 1. Inspect and choose the product promise

Read the app README, product brief, routes, and the current UI before writing
copy. Start the shipped build or preview when possible. Identify one audience,
one problem, and one action the viewer should take. Do not turn the video into a
feature list.

Use the strongest value state as the first app screen; do not lead with an empty
onboarding screen unless onboarding is itself the product hook. Use deterministic
synthetic data and remove names, avatars, identifiers, private dates, and debug
overlays.

Translate verified behavior into a useful result, but preserve relevant
limitations. For example, a planning app may promise a clear next step if that
result is visible in the product; it must not promise guaranteed productivity.

### 2. Write the short selling story

Use 5 beats by default; adapt to 4–6 beats only when the app has fewer meaningful
states:

| Beat | Typical time | Purpose |
|---|---:|---|
| Hook | 0–2 s | Stop the scroll with one concrete benefit or question. |
| Promise | 2–6 s | Show the product and who it helps. |
| Core action | 6–15 s | Show the one interaction that makes the promise real. |
| Result | 15–23 s | Show the useful output, not a loading state. |
| CTA | 23–28 s | Name the app and give one next action. |

Keep on-screen captions to one or two short lines (preferably ≤32 characters per
line), one idea per scene, and a readable contrast ratio. Write a voiceover only
when requested or when a local/approved TTS path is available; a 20–30 second
Russian voiceover is usually 35–65 words. The narration must describe what is
visible and must not introduce an unshown claim.

Illustrative Russian copy pattern for a fictional task helper (replace every
line with claims from the shipped app):

```text
hook:    “С чего начать прямо сейчас?”
promise: “Соберите важные дела в ясный план”
action:  “Добавьте задачу и выберите приоритет”
result:  “Следующий шаг всегда перед глазами”
cta:     “Откройте приложение в VK”
```

Offer an English variant only when requested. Keep the app name, CTA, and product
claims consistent across captions, voiceover, and the exported manifest.

### 3. Capture real UI

Use available browser automation against the running app. When the sibling
`vk-catalog-screenshots` skill is installed and its step format fits the app,
reuse its capture helper and PNG checks. For social output, capture at 3×:
`360×640 CSS → 1080×1920 physical`. A `390×844 CSS → 1170×2532` source may be
used only when the target platform needs that exact frame; compose the final MP4
at 1080×1920.

Re-snapshot after every route change or modal. Wait for fonts and transitions to
settle. Capture at least these states when they exist:

1. strongest value screen;
2. setup/calibration or input;
3. the core interaction in progress;
4. result/history/export state;
5. optional CTA-friendly final state.

Capture screenshots before composing. Keep a capture record in the manifest:
URL, date, CSS viewport, device scale, engine, synthetic-data flag, and privacy
review. Never use a user's logged-in browser state or real personal data.

### 4. Build the manifest and review copy

Create `promo-manifest.json` using the schema in
[`references/manifest.md`](references/manifest.md). Each scene needs an image,
duration, caption, and optional motion direction. Keep scene durations summing to
15–30 seconds; use 0.2–0.4 second fades only if they do not hide a control.

Before rendering, review the storyboard at the actual 1080×1920 frame size. Check
that captions do not cover the primary control, the bottom safe area, or the
result. Keep the CTA visible for at least 2 seconds.

### 5. Render the vertical MP4

Resolve the installed skill directory and run the deterministic compositor:

```bash
SKILL_DIR="/absolute/path/to/vk-app-promo-video"
node "$SKILL_DIR/scripts/compose_vertical_promo.mjs" \
  --manifest ./promo/promo-manifest.json \
  --out ./promo/promo.mp4
```

The compositor uses ffmpeg, center-crops each still to 1080×1920, adds a restrained
Ken-Burns motion, fades, and burns the scene caption. It can mux an already
approved audio file:

```bash
node "$SKILL_DIR/scripts/compose_vertical_promo.mjs" \
  --manifest ./promo/promo-manifest.json \
  --audio ./promo/voiceover.mp3 \
  --out ./promo/promo.mp4
```

Use an available, user-authorized voiceover or TTS workflow only when narration
is requested and the required backend or credentials are available. Do not make
a paid API call or upload app data without explicit authorization. Music is
optional; keep it silent by default so the UI and captions remain understandable.

### 6. Verify and package

Run the verifier before handing back the package:

```bash
node "$SKILL_DIR/scripts/verify_vertical_promo.mjs" \
  --manifest ./promo/promo-manifest.json \
  --video ./promo/promo.mp4
```

It checks scene files, PNG dimensions, caption lengths, duration range, and (when
present) the MP4 stream dimensions/duration. Extract a few frames with ffmpeg and
inspect them visually; fix captions or crop if the app's key control is obscured.

Also provide `storyboard.md` with a scene/timing table, capture evidence, claims
review, and a short note that the package uses synthetic data. Keep all source
stills alongside the MP4 so a social editor can publish a carousel if video is
not accepted.

## Failure and safety rules

- Never fake an app screen with a marketing mockup when a real route can be
  captured; label any title card or illustration as such.
- Never show VK launch parameters, user IDs, access tokens, private messages, or
  real account data.
- Treat ads, storage, permissions, and network failures as normal states; do not
  imply that a banner or cloud sync is guaranteed.
- If a claim cannot be verified from the app or product brief, remove it or mark
  it as a proposed line for user approval.
- Prefer a clean, silent MP4 plus captions over a rushed or hallucinated
  voiceover. Return the screenshot fallback whenever any render gate fails.

## Bundled resources

- [`scripts/compose_vertical_promo.mjs`](scripts/compose_vertical_promo.mjs) —
  ffmpeg compositor for stills, captions, motion, and optional audio.
- [`scripts/verify_vertical_promo.mjs`](scripts/verify_vertical_promo.mjs) —
  portable manifest, PNG, and MP4 verifier.
- [`scripts/test-promo-video.mjs`](scripts/test-promo-video.mjs) — deterministic
  valid/invalid manifest checks plus an ffmpeg smoke render when available.
- [`references/manifest.md`](references/manifest.md) — manifest schema and review
  checklist.
