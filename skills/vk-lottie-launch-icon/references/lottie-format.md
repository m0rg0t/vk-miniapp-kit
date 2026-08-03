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
  { "t": 0,  "s": [48, 96] },   // frame 0 → start state
  { "t": 45, "s": [48, 24] },   // mid
  { "t": 90, "s": [48, 96] }    // end keyframe → same value as frame 0
] }
```

## Layer order and occlusion

In `lottie-web`, the `layers` array is ordered from front to back: index `0`
is drawn above index `1`, which is drawn above index `2`, and so on. Put the
principal symbol and other foreground elements first. Put a fully opaque
background shape last. A large opaque rectangle, ellipse, or solid at index `0`
can make every later layer disappear while still passing a JSON/size validator.

Treat a layer-order warning as a real visual defect until a preview proves that
the top layer is intentionally the foreground. The bundled validator detects
common near-canvas opaque `rc`/`el`/solid shapes; the preview remains the source
of truth for unusual paths, groups, masks, and transforms.

## Compatible subset

Prefer a small, portable subset that VK's launch preview is likely to render
consistently:

- shape layers (`ty: 4`) with `gr`, `rc`, `el`, `sh`, `fl`, `st`, and `tr`;
- ordinary position, scale, rotation, anchor, and opacity transforms;
- a few integer keyframes and reused flat colours.

Avoid by default:

- expressions and expression-driven properties;
- masks, mattes, effects, 3D layers, non-normal blend modes, and embedded
  images/base64 assets;
- gradient fills, repeaters, trim paths, booleans, and rare shape operators
  unless the target VK client has been tested with them.

These are compatibility and budget rules, not a claim that every other Lottie
feature is invalid. If a non-default feature is necessary, retain the source,
preview it in the actual target client, and record the decision.

## The seamless-loop rule

For every animated property `{ a:1, k:[…] }`, the last keyframe's `s` must
deep-equal the first keyframe's `s`. The bundled validator
(`scripts/validate-lottie.mjs`) checks exactly this and lists any property that
drifts. The player commonly treats `op` as an exclusive end, so inspect the
frame at `op - 1` in addition to the keyframe at `op`. Design motions that
return home: grow→shrink→grow, fade in→out→in, rotate a full 360°, etc.

## Keeping it under 24 KB

- Prefer shape layers over embedded images (no base64 blobs).
- Few layers, few keyframes; reuse colours.
- Round coordinates; drop unused properties.
- 96×96 needs no precision beyond integers.

## Static/animated identity and background mode

The animated icon is a state of the static icon, not a second identity. Keep
the same container shape, background mode, palette, principal symbol, and
optical scale. If the admin form provides a background behind the animation,
choose either a transparent symbol that relies on it or a self-contained
branded badge. Do not add an opaque background layer to a transparent mode by
habit.

## Authoring & previewing

- **Author:** After Effects + Bodymovin, the LottieFiles editor, or hand-write
  the JSON for simple shape animations (very compact, fully under your control).
- **Preview:** run `scripts/preview-lottie.mjs`, which uses `lottie-web`'s SVG
  renderer and captures `ip`, the midpoint, and `op - 1`. Inspect all frames in
  a browser or image viewer, then use the VK uploader as the final client check
  when available. Structural validation and screenshots answer different
  questions; neither replaces the other.
