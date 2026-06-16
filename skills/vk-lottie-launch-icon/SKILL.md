---
name: vk-lottie-launch-icon
description: Create or validate a Lottie (bodymovin) animated launch/loading icon for a VK Mini App within the platform budget — 96×96 px, ≤24 KB, seamless loop. Use this skill whenever the user wants an animated app icon, a Lottie/bodymovin JSON, a loading/launch animation, or says "анимированная иконка", "лотти", "анимация загрузки" for a VK app. It writes valid Lottie JSON and verifies size, dimensions, and that the loop is seamless. This is the animated icon specifically — for static icon sizing (576/1024) or splashscreens use vk-app-assets. Prefer this over generic animation help whenever the target is a VK launch icon.
---

# VK animated launch icon (Lottie)

Produce a launch-icon animation that VK will accept and that loops cleanly:
96×96, ≤24 KB, seamless. The skill covers both authoring a new one and validating
an existing file.

## Know the format first

Read `references/lottie-format.md` — it explains the bodymovin JSON structure,
the three hard constraints, and the one rule that trips people up: **every
animated property must return to its frame-0 value at the out point** or the loop
visibly jumps.

## Workflow

### A. Validate an existing Lottie

```bash
node "$CLAUDE_PLUGIN_ROOT/skills/vk-lottie-launch-icon/scripts/validate-lottie.mjs" \
  path/to/icon-animation.json
```

It checks size, JSON validity, required fields, 96×96 dimensions, and reports any
animated property whose loop seam drifts (start ≠ end). Override targets with
`--width/--height/--max-kb` if VK's spec changes. Hard failures exit non-zero;
loop-seam issues warn and name the offending properties so they're easy to fix.

### B. Author a new one

1. **Pick a motion that returns home.** Seamless loops come from reversible
   motion: grow→shrink→grow, fade in→out→in, a full 360° rotation, strips
   sliding up then back. Decide the loop length (≈2–3 s at `fr` 30).
2. **Write compact shape-layer JSON.** Favor shapes over embedded images (no
   base64 — that blows the 24 KB budget). Keep layers and keyframes few; integer
   coordinates are fine at 96×96. Mirror the structure in
   `references/lottie-format.md`.
3. **Make the loop seamless by construction.** For each animated transform, set
   the final keyframe's value equal to the first. This is the single most
   important detail.
4. **Save** to the app's asset folder, conventionally
   `public/resources/app/icon-animation.json`.
5. **Validate** with the script above and fix anything it flags.

### C. Visual check (optional but recommended)

The structural check can't see how it *looks*. Preview in a real renderer — the
VK uploader, `lottiefiles.com/preview`, or a small `lottie-web` page in a browser
(via the `agent-browser` CLI). Headless screenshotting of `lottie-web` is
unreliable, so don't block on it; trust the validator for structure and a real
browser/uploader for appearance.

## Done when

- The file passes `validate-lottie.mjs` with no hard failures and no loop-seam
  warnings.
- Size ≤ 24 KB, dimensions 96×96.
- A visual preview confirms the motion reads well and the loop doesn't jump.
