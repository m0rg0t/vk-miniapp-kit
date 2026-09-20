#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }
  return current >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}

function solidPng(width, height, shade) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 0;
  const rows = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width + 1);
    rows[offset] = 0;
    rows.fill((shade + y) % 256, offset + 1, offset + width + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rows)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000,
    ...options,
  });
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const verifier = join(scriptDir, "verify_vertical_promo.mjs");
const compositor = join(scriptDir, "compose_vertical_promo.mjs");
const root = mkdtempSync(join(tmpdir(), "vk-app-promo-test-"));

try {
  const screenshots = join(root, "screenshots");
  mkdirSync(screenshots);
  for (const [name, shade] of [["01-value.png", 30], ["02-action.png", 90], ["03-result.png", 150]]) {
    writeFileSync(join(screenshots, name), solidPng(1080, 1920, shade));
  }

  const manifest = {
    title: "Example app promo",
    language: "ru",
    width: 1080,
    height: 1920,
    fps: 2,
    accent: "#447BBA",
    scenes: [
      { id: "hook", image: "screenshots/01-value.png", duration: 5, caption: "Полезный результат\nс первого экрана", motion: "in" },
      { id: "action", image: "screenshots/02-action.png", duration: 5, caption: "Одно понятное действие", motion: "out" },
      { id: "cta", image: "screenshots/03-result.png", duration: 5, caption: "Откройте приложение в VK", motion: "none" },
    ],
    capture: {
      source: "http://127.0.0.1:4173",
      capturedAt: "2026-01-01",
      engine: "test-browser",
      cssViewport: { width: 360, height: 640 },
      deviceScaleFactor: 3,
      physicalOutput: { width: 1080, height: 1920 },
      syntheticData: true,
      realUiReviewed: true,
      privacyReviewed: true,
    },
  };
  const manifestPath = join(root, "promo-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest));

  const valid = run(process.execPath, [verifier, "--manifest", manifestPath]);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  assert.match(valid.stdout, /Promo package passed/);

  const invalidManifestPath = join(root, "promo-manifest-invalid.json");
  const invalidManifest = structuredClone(manifest);
  invalidManifest.capture.privacyReviewed = false;
  writeFileSync(invalidManifestPath, JSON.stringify(invalidManifest));
  const invalid = run(process.execPath, [verifier, "--manifest", invalidManifestPath]);
  assert.equal(invalid.status, 1);
  assert.match(`${invalid.stdout}\n${invalid.stderr}`, /capture\.privacyReviewed/);

  const escapingManifestPath = join(root, "promo-manifest-escaping.json");
  const escapingManifest = structuredClone(manifest);
  escapingManifest.scenes[0].image = "../outside.png";
  writeFileSync(escapingManifestPath, JSON.stringify(escapingManifest));
  const escaping = run(process.execPath, [verifier, "--manifest", escapingManifestPath]);
  assert.equal(escaping.status, 1);
  assert.match(`${escaping.stdout}\n${escaping.stderr}`, /escapes the promo package/);
  const escapingRender = run(process.execPath, [compositor, "--manifest", escapingManifestPath, "--out", join(root, "escaping.mp4")]);
  assert.equal(escapingRender.status, 1);
  assert.match(`${escapingRender.stdout}\n${escapingRender.stderr}`, /must stay inside the promo package/);

  const hasFfmpeg = run("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
  const hasFfprobe = run("ffprobe", ["-version"], { stdio: "ignore" }).status === 0;
  const filters = hasFfmpeg ? run("ffmpeg", ["-hide_banner", "-filters"]) : null;
  const hasDrawtext = filters?.status === 0 && /\bdrawtext\b/.test(`${filters.stdout}\n${filters.stderr}`);
  if (hasFfmpeg && hasFfprobe && hasDrawtext) {
    const videoPath = join(root, "promo.mp4");
    const rendered = run(process.execPath, [compositor, "--manifest", manifestPath, "--out", videoPath]);
    assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);
    assert.ok(existsSync(videoPath), "compositor did not create promo.mp4");

    const verifiedVideo = run(process.execPath, [verifier, "--manifest", manifestPath, "--video", videoPath]);
    assert.equal(verifiedVideo.status, 0, verifiedVideo.stderr || verifiedVideo.stdout);

    const framePath = join(root, "review-frame.png");
    const extracted = run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "2", "-i", videoPath, "-frames:v", "1", framePath]);
    assert.equal(extracted.status, 0, extracted.stderr || extracted.stdout);
    assert.ok(existsSync(framePath), "frame extraction did not create a PNG");
  } else if (hasFfmpeg && hasFfprobe) {
    const unavailable = run(process.execPath, [compositor, "--manifest", manifestPath, "--out", join(root, "promo.mp4")]);
    assert.equal(unavailable.status, 1);
    assert.match(`${unavailable.stdout}\n${unavailable.stderr}`, /drawtext filter required for captions/);
    console.log("ffmpeg lacks drawtext; verified the explicit screenshot-fallback failure");
  } else {
    console.log("ffmpeg/ffprobe unavailable; compositor smoke render skipped");
  }

  console.log("promo-video tests passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
