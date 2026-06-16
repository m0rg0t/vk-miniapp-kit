#!/usr/bin/env bash
# Generate the VK Mini App icon (and optional splashscreen) set from source
# images, then verify every output is exactly the size it claims to be.
#
# macOS-native: uses `sips` (built in). On Linux, swap the sips calls for
# ImageMagick `convert src -resize WxH! out` — the workflow is identical.
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

dim() { sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null | awk '/pixel/{print $2}' | paste -sd'x' -; }

# Resize to an exact WxH (forces aspect: width then height differ → may distort,
# so callers must feed correctly-proportioned sources).
to_exact() { # src w h out
  sips -z "$3" "$2" "$1" --out "$4" >/dev/null
}

echo "== icons =="
if [ -n "$ICON" ]; then
  src_dim=$(dim "$ICON")
  echo "source icon: $ICON ($src_dim)"
  for s in $SIZES; do
    out="$OUT/icon-$s.png"
    to_exact "$ICON" "$s" "$s" "$out"
    echo "  → $out ($(dim "$out"))"
  done
fi

echo "== splashscreens =="
if [ -n "$SPLASH" ]; then
  echo "source portrait splash: $SPLASH ($(dim "$SPLASH"))"
  to_exact "$SPLASH" 1080 1920 "$OUT/splashscreen-1080x1920.png"   # portrait
  echo "  → $OUT/splashscreen-1080x1920.png ($(dim "$OUT/splashscreen-1080x1920.png"))"
fi
if [ -n "$SPLASH_LS" ]; then
  echo "source landscape splash: $SPLASH_LS ($(dim "$SPLASH_LS"))"
  to_exact "$SPLASH_LS" 1920 1080 "$OUT/splashscreen-1920x1080.png"  # landscape
  echo "  → $OUT/splashscreen-1920x1080.png ($(dim "$OUT/splashscreen-1920x1080.png"))"
elif [ -n "$SPLASH" ]; then
  echo "  (no --splash-landscape given; skipping 1920×1080. Provide a landscape"
  echo "   source — don't stretch a portrait one, it distorts.)"
fi

echo "== verify =="
fail=0
for f in "$OUT"/icon-*.png "$OUT"/splashscreen-*.png; do
  [ -f "$f" ] || continue
  echo "  $f -> $(dim "$f")"
done
echo "done."
