#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

function usage() {
  console.log(`Usage: compose_vertical_promo.mjs --manifest <json> --out <mp4> [--audio <file>]

The manifest contains a list of real-UI stills and scene captions. The compositor
creates a 1080x1920 H.264 video with gentle motion and optional audio.`);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    result[key] = value;
    i += 1;
  }
  return result;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: options.stdio ?? "inherit" });
    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(`${command} exited with ${code ?? "null"}${signal ? ` (${signal})` : ""}\n${stderr.slice(-3000)}`));
    });
  });
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} must be a non-empty string`);
  return value;
}

function resolveInside(baseDir, value, name) {
  const resolved = path.resolve(baseDir, value);
  const relative = path.relative(baseDir, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${name} must stay inside the promo package`);
  }
  return resolved;
}

function escapeFilterPath(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll(":", "\\:");
}

function colorForFilter(value, fallback) {
  const color = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : fallback;
  return `0x${color}@0.94`;
}

function findFont() {
  for (const family of ["Arial Unicode MS", "Arial:style=Bold", "Helvetica:style=Bold", "sans:style=Bold"]) {
    const match = spawnSync("fc-match", ["-f", "%{file}", family], { encoding: "utf8" });
    if (match.status === 0 && match.stdout.trim()) return match.stdout.trim();
  }
  const candidates = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function hasFfmpegFilter(name) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
  if (result.error || result.status !== 0) return false;
  return new RegExp(`\\b${name}\\b`).test(`${result.stdout}\n${result.stderr}`);
}

function validateManifest(manifest, manifestPath) {
  const width = Number(manifest.width ?? 1080);
  const height = Number(manifest.height ?? 1920);
  const fps = Number(manifest.fps ?? 30);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 240 || height < 240) {
    throw new Error("manifest width and height must be integers of at least 240px");
  }
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error("manifest fps must be an integer from 1 to 60");
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length < 2) throw new Error("manifest.scenes must contain at least two scenes");
  const baseDir = path.dirname(manifestPath);
  let total = 0;
  for (const [index, scene] of manifest.scenes.entries()) {
    requiredString(scene.image, `scenes[${index}].image`);
    const caption = requiredString(scene.caption, `scenes[${index}].caption`);
    if (caption.replaceAll("\\n", "\n").split("\n").length > 2) {
      throw new Error(`scenes[${index}].caption must contain at most two lines`);
    }
    if (scene.motion !== undefined && !["in", "out", "none"].includes(scene.motion)) {
      throw new Error(`scenes[${index}].motion must be in, out, or none`);
    }
    const duration = Number(scene.duration);
    if (!Number.isFinite(duration) || duration < 0.6) throw new Error(`scenes[${index}].duration must be at least 0.6 seconds`);
    const imagePath = resolveInside(baseDir, scene.image, `scenes[${index}].image`);
    if (!fs.existsSync(imagePath)) throw new Error(`Scene image does not exist: ${imagePath}`);
    total += duration;
  }
  if (total < 15 || total > 30) throw new Error(`scene duration total must be 15–30 seconds (got ${total.toFixed(2)})`);
  const last = manifest.scenes.at(-1);
  if (Number(last.duration) < 2) throw new Error("the final CTA scene must last at least 2 seconds");
  return { width, height, fps, total, baseDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(requiredString(args.manifest, "--manifest"));
  const outPath = path.resolve(requiredString(args.out, "--out"));
  const audioPath = args.audio ? path.resolve(args.audio) : null;
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest does not exist: ${manifestPath}`);
  if (audioPath && !fs.existsSync(audioPath)) throw new Error(`Audio file does not exist: ${audioPath}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const { width, height, fps, total, baseDir } = validateManifest(manifest, manifestPath);
  const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ffmpegCheck.error || ffmpegCheck.status !== 0) throw new Error("ffmpeg is required to render promo.mp4; keep the screenshot fallback if it is unavailable");
  if (!hasFfmpegFilter("drawtext")) {
    throw new Error("ffmpeg was built without the drawtext filter required for captions; keep the screenshot fallback or install an ffmpeg build with libfreetype");
  }
  const font = findFont();
  if (!font) throw new Error("No fontconfig font was found for captions; keep the screenshot fallback or install a system sans-serif font");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vk-app-promo-"));
  const clipPaths = [];
  try {
    for (const [index, scene] of manifest.scenes.entries()) {
      const imagePath = resolveInside(baseDir, scene.image, `scenes[${index}].image`);
      const duration = Number(scene.duration);
      const motion = scene.motion === "out" ? "if(eq(on,1),1.08,max(zoom-0.0008,1.0))" : scene.motion === "none" ? "1.0" : "min(zoom+0.0008,1.08)";
      const fontFile = escapeFilterPath(font);
      const captionBox = colorForFilter(manifest.accent, "447BBA");
      const captionLines = scene.caption.replaceAll("\\n", "\n").split("\n");
      const lineHeight = 72;
      const bannerHeight = captionLines.length * lineHeight + 48;
      const filters = [
        `scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
        `zoompan=z='${motion}':d=1:s=${width}x${height}:fps=${fps}`,
        `drawbox=x=0:y=ih-${bannerHeight}:w=iw:h=${bannerHeight}:color=${captionBox}:t=fill`,
        ...captionLines.map((line, lineIndex) => {
          const captionPath = path.join(tempDir, `caption-${String(index + 1).padStart(2, "0")}-${lineIndex + 1}.txt`);
          fs.writeFileSync(captionPath, line, "utf8");
          const captionFile = escapeFilterPath(captionPath);
          const y = `h-${bannerHeight}+${24 + lineIndex * lineHeight}`;
          return `drawtext=fontfile='${fontFile}':textfile='${captionFile}':expansion=none:fontcolor=white:fontsize=56:borderw=2:bordercolor=black@0.30:x=(w-text_w)/2:y=${y}`;
        }),
        `fade=t=in:st=0:d=0.18`,
        `fade=t=out:st=${Math.max(duration - 0.18, 0.18).toFixed(3)}:d=0.18`,
      ].join(",");
      const clipPath = path.join(tempDir, `scene-${String(index + 1).padStart(2, "0")}.mp4`);
      await run("ffmpeg", [
        "-y", "-hide_banner", "-loglevel", "error",
        "-loop", "1", "-i", imagePath,
        "-vf", filters,
        "-t", duration.toFixed(3),
        "-r", String(fps),
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", clipPath,
      ]);
      clipPaths.push(clipPath);
    }

    const concatPath = path.join(tempDir, "concat.txt");
    fs.writeFileSync(concatPath, clipPaths.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n") + "\n", "utf8");
    const silentPath = path.join(tempDir, "silent.mp4");
    await run("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", concatPath,
      "-t", total.toFixed(3), "-r", String(fps),
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", silentPath,
    ]);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (audioPath) {
      await run("ffmpeg", [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", silentPath, "-i", audioPath,
        "-filter_complex", "[1:a]apad[a]",
        "-map", "0:v:0", "-map", "[a]", "-t", total.toFixed(3),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", outPath,
      ]);
    } else {
      fs.copyFileSync(silentPath, outPath);
    }
    console.log(`Rendered ${outPath}`);
    console.log(`Scenes: ${manifest.scenes.length}; duration: ${total.toFixed(2)}s; size: ${width}x${height}; fps: ${fps}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Promo render failed: ${error.message}`);
  process.exitCode = 1;
});
