# VK Mini App icon style

These are practical defaults for a VK Mini App icon, not a platform guarantee.
Confirm the current admin form for dimensions and review the result in context;
do not copy an official VK or third-party mark.

## Default visual direction

- Start with a full square 1:1 master. Leave the outer canvas square and opaque
  unless transparency is an intentional product decision. Do not bake a
  rounded-square mask or transparent rounded corners into the master: VK may
  apply its own catalog mask.
- Use a bright, saturated background that belongs to the product. VK blue
  (`#0077FF`) is a useful starting point, not a requirement; a simple
  two-colour gradient is also fine when it survives reduction.
- Put one large, immediately readable symbol in the centre. Aim for roughly
  65–78% of the available square, with an optical safe field of about 12–18%.
  Adjust by eye when the silhouette has uneven visual weight.
- Prefer a white, thick, geometric pictogram and at most one contrasting
  semantic accent. Keep the main palette to 2–3 colours.
- Prefer a concrete object or action that explains the app without text. Avoid
  tiny labels, thin outlines, long captions, realistic texture, and detail that
  disappears below 96 px.

## Geometry and masking

The outer container and internal shapes are separate decisions. Rounded corners
inside a printer, card, tool, or other symbol can make it feel native to VKUI;
rounding the outer image itself compounds the catalog mask. If the concept needs
an internal badge or pill, confirm that it remains legible at 64–96 px.

Use an editable SVG master where possible. Derive every raster size from that
same master; do not redraw or recompose the mark separately for 256, 576, and
1024 px.

## Required visual review

Before accepting the master, inspect the icon at 64–96 px on:

1. a light background;
2. a dark background; and
3. a realistic VK catalogue grid next to other app icons.

Check silhouette, contrast, optical size, accidental outer rounding, and whether
the accent still communicates the intended action. A master that looks polished
at 1024 px but becomes an indistinct blob at 64 px is not ready.

## Identity handoff

The static icon, catalog snippet, splashscreen, and optional animated launch
icon should share the same background mode, white symbol, accent palette, and
geometric language. Keep the main symbol and optical scale stable; motion may
change state, but should not introduce a different logo.

For an animated icon, decide explicitly between:

- a transparent symbol on a background supplied by the platform/admin form; or
- a self-contained branded badge that includes its own background.

Do not combine a transparent animation with an opaque background layer and a
second administrative background by accident. See the
`vk-lottie-launch-icon` format reference for layer order and preview checks.
