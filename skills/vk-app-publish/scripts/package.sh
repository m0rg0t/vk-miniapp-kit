#!/usr/bin/env bash
# Build a VK Mini App and package its static output into build.zip — the
# artifact you upload in the VK admin when not deploying via vk-miniapps-deploy.
#
# VK expects the zip to contain index.html at its ROOT (not nested in a dist/
# folder), so this zips the *contents* of the static dir, not the dir itself.
#
# Usage: package.sh [--static <dir>] [--out build.zip] [--skip-build]
#   --static     static output dir (default: read static_path from
#                vk-hosting-config.json, else "dist")
#   --out        output zip path (default: build.zip)
#   --skip-build zip an existing build without rebuilding
set -euo pipefail

STATIC="" ; OUT="build.zip" ; SKIP_BUILD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --static) STATIC="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --skip-build) SKIP_BUILD=1; shift;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

# Resolve static dir from vk-hosting-config.json if not given.
if [ -z "$STATIC" ]; then
  if [ -f vk-hosting-config.json ]; then
    STATIC=$(node -e "process.stdout.write((require('./vk-hosting-config.json').static_path)||'dist')" 2>/dev/null || echo dist)
  else
    STATIC="dist"
  fi
fi
echo "static dir: $STATIC"

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "== build =="
  npm run build
fi

if [ ! -d "$STATIC" ] || [ ! -f "$STATIC/index.html" ]; then
  echo "✗ '$STATIC' missing or has no index.html — build first (drop --skip-build)." >&2
  exit 1
fi

echo "== package =="
OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
rm -f "$OUT_ABS"
( cd "$STATIC" && zip -rq "$OUT_ABS" . -x '*.DS_Store' )

echo "== result =="
echo "zip: $OUT  ($(du -h "$OUT_ABS" | awk '{print $1}'))"
# Capture the entry list once (avoids `grep -q` SIGPIPE-ing unzip under pipefail).
# unzip -Z1 lists bare entry names, one per line; root files have no slash.
names=$(unzip -Z1 "$OUT_ABS")
echo "top-level entries (index.html must be here):"
printf '%s\n' "$names" | grep -v '/' | sed 's/^/  /' | head -20 || true
if grep -qx 'index.html' <<<"$names"; then
  echo "✓ index.html at zip root"
else
  echo "✗ index.html NOT at zip root — VK will reject this" >&2
  exit 1
fi
