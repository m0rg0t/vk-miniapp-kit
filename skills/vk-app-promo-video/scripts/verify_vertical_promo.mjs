#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  console.log("Usage: verify_vertical_promo.mjs --manifest <json> [--video <mp4>]");
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (!arg.startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Invalid argument near ${arg}`);
    result[arg.slice(2)] = argv[i + 1];
    i += 1;
  }
  return result;
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("not a PNG");
  if (buffer.toString("ascii", 12, 16) !== "IHDR") throw new Error("PNG has no IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function fail(errors, message) {
  errors.push(message);
  console.error(`✗ ${message}`);
}

function warn(message) {
  console.warn(`⚠ ${message}`);
}

function resolveInside(baseDir, value) {
  const resolved = path.resolve(baseDir, value);
  const relative = path.relative(baseDir, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("path escapes the promo package");
  }
  return resolved;
}

function validateManifest(manifest, manifestPath, errors) {
  const width = Number(manifest.width ?? 1080);
  const height = Number(manifest.height ?? 1920);
  const total = Array.isArray(manifest.scenes) ? manifest.scenes.reduce((sum, scene) => sum + Number(scene.duration), 0) : 0;
  if (width !== 1080 || height !== 1920) fail(errors, `target must be 1080x1920 for social output (got ${width}x${height})`);
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length < 2) fail(errors, "manifest.scenes must contain at least two scenes");
  if (total < 15 || total > 30) fail(errors, `scene total must be 15–30 seconds (got ${total.toFixed(2)})`);
  const baseDir = path.dirname(manifestPath);
  for (const [index, scene] of (manifest.scenes ?? []).entries()) {
    if (typeof scene.image !== "string") {
      fail(errors, `scene ${index + 1} has no image path`);
      continue;
    }
    let imagePath;
    try {
      imagePath = resolveInside(baseDir, scene.image);
    } catch (error) {
      fail(errors, `scene ${index + 1} image ${error.message}`);
      continue;
    }
    if (!fs.existsSync(imagePath)) {
      fail(errors, `scene ${index + 1} image is missing: ${imagePath}`);
      continue;
    }
    try {
      const dimensions = readPngDimensions(imagePath);
      if (dimensions.width !== width || dimensions.height !== height) {
        fail(errors, `scene ${index + 1} image is ${dimensions.width}x${dimensions.height}, expected ${width}x${height}`);
      } else {
        console.log(`✓ scene ${index + 1} PNG ${dimensions.width}x${dimensions.height}`);
      }
    } catch (error) {
      fail(errors, `scene ${index + 1} image is not a readable PNG: ${error.message}`);
    }
    const caption = typeof scene.caption === "string" ? scene.caption : "";
    if (!caption.trim()) fail(errors, `scene ${index + 1} caption is empty`);
    const lines = caption.split(/\\n|\n/);
    if (lines.length > 2) fail(errors, `scene ${index + 1} caption has more than two lines`);
    if (lines.some((line) => [...line].length > 40)) warn(`scene ${index + 1} caption line is long; check it at 1080x1920`);
    if (!Number.isFinite(Number(scene.duration)) || Number(scene.duration) < 0.6) fail(errors, `scene ${index + 1} duration is invalid`);
    if (scene.motion !== undefined && !["in", "out", "none"].includes(scene.motion)) fail(errors, `scene ${index + 1} motion must be in, out, or none`);
  }
  const last = manifest.scenes?.at(-1);
  if (last && Number(last.duration) < 2) fail(errors, "final CTA scene must last at least 2 seconds");
  const capture = manifest.capture;
  for (const field of ["source", "capturedAt", "engine"]) {
    if (typeof capture?.[field] !== "string" || capture[field].trim() === "") fail(errors, `capture.${field} must be recorded`);
  }
  if (typeof capture?.capturedAt === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(capture.capturedAt)) {
    fail(errors, "capture.capturedAt must use YYYY-MM-DD");
  }
  if (!Number.isFinite(Number(capture?.cssViewport?.width)) || Number(capture.cssViewport.width) < 1
    || !Number.isFinite(Number(capture?.cssViewport?.height)) || Number(capture.cssViewport.height) < 1) {
    fail(errors, "capture.cssViewport must record positive width and height");
  }
  if (!Number.isFinite(Number(capture?.deviceScaleFactor)) || Number(capture.deviceScaleFactor) <= 0) {
    fail(errors, "capture.deviceScaleFactor must be positive");
  }
  if (Number(capture?.physicalOutput?.width) !== width || Number(capture?.physicalOutput?.height) !== height) {
    fail(errors, `capture.physicalOutput must match ${width}x${height}`);
  }
  for (const field of ["syntheticData", "realUiReviewed", "privacyReviewed"]) {
    if (capture?.[field] !== true) fail(errors, `capture.${field} must be true before publication`);
  }
  return { width, height, total };
}

function validateVideo(videoPath, expected, errors) {
  if (!fs.existsSync(videoPath)) {
    fail(errors, `video is missing: ${videoPath}`);
    return;
  }
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", videoPath], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    fail(errors, "ffprobe could not inspect the MP4");
    return;
  }
  let data;
  try {
    data = JSON.parse(probe.stdout);
  } catch {
    fail(errors, "ffprobe returned invalid JSON");
    return;
  }
  const video = data.streams?.find((stream) => stream.codec_type === "video");
  if (!video) {
    fail(errors, "MP4 has no video stream");
    return;
  }
  if (video.codec_name !== "h264") fail(errors, `MP4 codec is ${video.codec_name ?? "unknown"}, expected h264`);
  if (Number(video.width) !== expected.width || Number(video.height) !== expected.height) fail(errors, `MP4 is ${video.width}x${video.height}, expected ${expected.width}x${expected.height}`);
  const duration = Number(data.format?.duration ?? video.duration);
  if (!Number.isFinite(duration) || duration < 15 || duration > 30) fail(errors, `MP4 duration is outside 15–30 seconds (${duration})`);
  else if (Math.abs(duration - expected.total) > 0.75) warn(`MP4 duration ${duration.toFixed(2)}s differs from scene total ${expected.total.toFixed(2)}s`);
  if (!errors.length) console.log(`✓ MP4 ${video.width}x${video.height}, ${duration.toFixed(2)}s`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest) throw new Error("--manifest is required");
  const manifestPath = path.resolve(args.manifest);
  if (!fs.existsSync(manifestPath)) throw new Error(`manifest is missing: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const errors = [];
  const expected = validateManifest(manifest, manifestPath, errors);
  if (args.video) validateVideo(path.resolve(args.video), expected, errors);
  if (errors.length) {
    console.error(`Promo package failed with ${errors.length} error(s)`);
    process.exitCode = 1;
  } else {
    console.log("Promo package passed");
  }
} catch (error) {
  console.error(`Promo verification failed: ${error.message}`);
  process.exitCode = 1;
}
