#!/usr/bin/env bash
# Generate the VK Mini App icon (and optional splashscreen) set from source
# images, then verify every output is exactly the size it claims to be.
#
# Uses rsvg-convert/ImageMagick for SVG masters and sips/ImageMagick for raster
# sources. SVG rendering preserves aspect; square raster sources are required.
#
# Usage:
#   resize-assets.sh --icon <square-source.png> [--out <dir>] [--sizes "1024 576 256"]
#   resize-assets.sh --icon icon.png --splash splash-portrait.png --out public/resources/app
#
# Notes:
#   --icon   square source (≥1024×1024 recommended) → icon-<size>.png per size
#   --splash portrait source (≥1080×1920) → splashscreen-1080x1920.png and a
#            center-cropped 1920×1080 landscape variant
#   --sizes  space-separated square icon sizes (default "1024 576")
set -euo pipefail

ICON="" ; SPLASH="" ; SPLASH_LS="" ; OUT="." ; SIZES="1024 576"
while [ $# -gt 0 ]; do
  case "$1" in
    --icon)  ICON="$2"; shift 2;;
    --splash) SPLASH="$2"; shift 2;;          # portrait source (≥1080×1920)
    --splash-landscape) SPLASH_LS="$2"; shift 2;;  # landscape source (≥1920×1080)
    --out)   OUT="$2"; shift 2;;
    --sizes) SIZES="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

if [ -z "$ICON" ] && [ -z "$SPLASH" ]; then
  echo "nothing to do: pass --icon and/or --splash" >&2; exit 2
fi
mkdir -p "$OUT"

dim() {
  if command -v sips >/dev/null 2>&1; then
    sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null | awk '/pixel/{print $2}' | paste -sd'x' -
  elif command -v identify >/dev/null 2>&1; then
    identify -format '%wx%h' "$1"
  else
    echo "cannot inspect images: install ImageMagick or use macOS sips" >&2
    exit 2
  fi
}

to_exact_raster() { # src w h out
  if command -v sips >/dev/null 2>&1; then
    sips -z "$3" "$2" "$1" --out "$4" >/dev/null
  elif command -v magick >/dev/null 2>&1; then
    magick "$1" -resize "$2x$3!" "$4"
  else
    echo "cannot resize images: install ImageMagick or use macOS sips" >&2
    exit 2
  fi
}

render_icon() { # src size out
  case "$1" in
    *.svg|*.SVG)
      if command -v rsvg-convert >/dev/null 2>&1; then
        rsvg-convert --keep-aspect-ratio -w "$2" -h "$2" "$1" -o "$3"
      elif command -v magick >/dev/null 2>&1; then
        magick -background none "$1" -resize "$2x$2" -gravity center -extent "$2x$2" "$3"
      else
        echo "SVG master requires rsvg-convert or ImageMagick; refusing a lossy/generative redraw" >&2
        exit 2
      fi
      ;;
    *)
      src_dim=$(dim "$1")
      src_w=${src_dim%x*}
      src_h=${src_dim#*x}
      if [ "$src_w" != "$src_h" ]; then
        echo "icon source must be square; got $src_dim. Refusing to stretch it." >&2
        exit 1
      fi
      to_exact_raster "$1" "$2" "$2" "$3"
      ;;
  esac
}

echo "== icons =="
if [ -n "$ICON" ]; then
  src_dim=$(dim "$ICON")
  echo "source icon: $ICON ($src_dim)"
  for s in $SIZES; do
    out="$OUT/icon-$s.png"
    render_icon "$ICON" "$s" "$out"
    echo "  → $out ($(dim "$out"))"
  done
fi

echo "== splashscreens =="
if [ -n "$SPLASH" ]; then
  echo "source portrait splash: $SPLASH ($(dim "$SPLASH"))"
  to_exact_raster "$SPLASH" 1080 1920 "$OUT/splashscreen-1080x1920.png"   # portrait
  echo "  → $OUT/splashscreen-1080x1920.png ($(dim "$OUT/splashscreen-1080x1920.png"))"
fi
if [ -n "$SPLASH_LS" ]; then
  echo "source landscape splash: $SPLASH_LS ($(dim "$SPLASH_LS"))"
  to_exact_raster "$SPLASH_LS" 1920 1080 "$OUT/splashscreen-1920x1080.png"  # landscape
  echo "  → $OUT/splashscreen-1920x1080.png ($(dim "$OUT/splashscreen-1920x1080.png"))"
elif [ -n "$SPLASH" ]; then
  echo "  (no --splash-landscape given; skipping 1920×1080. Provide a landscape"
  echo "   source — don't stretch a portrait one, it distorts.)"
fi

echo "== verify =="
for f in "$OUT"/icon-*.png "$OUT"/splashscreen-*.png; do
  [ -f "$f" ] || continue
  echo "  $f -> $(dim "$f")"
done
echo "done."
