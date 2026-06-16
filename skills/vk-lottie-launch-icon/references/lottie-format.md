# Lottie launch-icon format (VK)

## The budget (why it's strict)

VK shows the animated launch icon during app load, so it must be tiny and loop
cleanly:

- **96 × 96 px** composition (`w` / `h`)
- **≤ 24 KB** JSON
- **seamless loop** — no visible jump when it restarts

A jump at the loop point is the most common defect, so author the animation so
every animated value at the out point (`op`) equals its value at frame 0.

## Minimal Lottie anatomy

Lottie (bodymovin) JSON top level:

```jsonc
{
  "v": "5.x.x",      // bodymovin version
  "fr": 30,          // frame rate
  "ip": 0,           // in point (start frame)
  "op": 90,          // out point (end frame) → duration = (op-ip)/fr seconds
  "w": 96, "h": 96,  // composition size
  "layers": [ /* … */ ]
}
```

A **shape layer** holds geometry in `shapes` and animates via `ks` (transform:
position `p`, scale `s`, rotation `r`, opacity `o`). Each transform property is:

```jsonc
// static value
{ "a": 0, "k": [48, 48] }

// animated value (keyframes)
{ "a": 1, "k": [
  { "t": 0,  "s": [48, 96] },   // frame 0  → start state
  { "t": 45, "s": [48, 24] },   // mid
  { "t": 90, "s": [48, 96] }    // frame op → MUST equal the t:0 value to loop
] }
```

## The seamless-loop rule

For every animated property `{ a:1, k:[…] }`, the **last keyframe's `s` must
deep-equal the first keyframe's `s`**. The bundled validator
(`scripts/validate-lottie.mjs`) checks exactly this and lists any property that
drifts. Design motions that return home: grow→shrink→grow, fade in→out→in,
rotate a full 360°, etc.

## Keeping it under 24 KB

- Prefer shape layers over embedded images (no base64 blobs).
- Few layers, few keyframes; reuse colors.
- Round coordinates; drop unused properties.
- 96×96 needs no precision beyond integers.

## Authoring & previewing

- **Author:** After Effects + Bodymovin, the LottieFiles editor, or hand-write
  the JSON for simple shape animations (very compact, fully under your control).
- **Preview:** `lottiefiles.com/preview`, the VK app uploader, or a tiny local
  page using `lottie-web`. Headless screenshotting of `lottie-web` is flaky —
  prefer a real browser/uploader for the visual check, and rely on the validator
  for the structural/loop check.
