#!/usr/bin/env node

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

function arg(argv, name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

function resolveRuntime(requested) {
  if (requested) {
    const file = resolve(requested);
    if (!existsSync(file)) throw new Error(`lottie-web bundle not found: ${file}`);
    return file;
  }
  const require = createRequire(import.meta.url);
  const candidates = [
    'lottie-web/build/player/lottie_svg.min.js',
    'lottie-web/build/player/lottie_svg.js',
    'lottie-web/build/player/lottie.min.js',
    'lottie-web/build/player/lottie.js',
  ];
  const skillDir = dirname(fileURLToPath(import.meta.url));
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate, { paths: [process.cwd(), skillDir] });
    } catch {
      // Try the next known browser bundle.
    }
  }
  throw new Error('lottie-web browser bundle not found; install lottie-web in the target project or pass --lottie-web /absolute/path/to/lottie_svg.min.js');
}

function safeScript(value) {
  return value
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function writePreviewHtml(animation, runtimeSource, frames, outputFile, size) {
  const animationData = safeScript(JSON.stringify(animation));
  const runtime = runtimeSource.replaceAll('</script', '<\\/script');
  const frameData = JSON.stringify(frames);
  const html = `<!doctype html>
<meta charset="utf-8">
<title>VK Lottie preview</title>
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; min-height: 100%; background: #dfe6ee; }
  body { display: grid; place-items: center; }
  #stage { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
  #animation { width: ${size}px; height: ${size}px; background: transparent; }
</style>
<div id="stage"><div id="animation" aria-label="Lottie preview"></div></div>
<script>${runtime}</script>
<script>
  const animationData = ${animationData};
  const frames = ${frameData};
  const animation = window.lottie.loadAnimation({
    container: document.getElementById('animation'),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData,
  });
  window.__lottieReady = false;
  animation.addEventListener('DOMLoaded', () => { window.__lottieReady = true; });
  window.__setFrame = (frame) => new Promise((resolve) => {
    animation.goToAndStop(frame, true);
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__previewFrames = frames;
</script>`;
  writeFileSync(outputFile, html);
}

function runBrowser(browser, session, args) {
  const result = spawnSync(browser, ['--session', session, ...args], { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`agent-browser ${args[0]} failed with exit code ${result.status}`);
}

function main(argv) {
  const input = argv[0];
  if (!input || input.startsWith('--')) {
    console.error('usage: preview-lottie.mjs <path.json> --out <dir> [--lottie-web <bundle.js>] [--size 384] [--no-browser]');
    return 2;
  }
  const outputDir = resolve(arg(argv, 'out', '.lottie-preview'));
  const size = Number(arg(argv, 'size', 384));
  if (!Number.isInteger(size) || size < 96) throw new Error('--size must be an integer of at least 96');
  const animation = JSON.parse(readFileSync(resolve(input), 'utf8'));
  if (!Number.isFinite(animation.ip) || !Number.isFinite(animation.op) || animation.op <= animation.ip) {
    throw new Error('Lottie must have numeric ip/op with op greater than ip');
  }
  const frames = [
    { name: 'ip', frame: animation.ip },
    { name: 'mid', frame: Math.floor((animation.ip + animation.op - 1) / 2) },
    { name: 'op-1', frame: Math.max(animation.ip, animation.op - 1) },
  ];
  mkdirSync(outputDir, { recursive: true });
  const runtimeFile = resolveRuntime(arg(argv, 'lottie-web'));
  writePreviewHtml(animation, readFileSync(runtimeFile, 'utf8'), frames, resolve(outputDir, 'preview.html'), size);
  console.log(`✓ wrote ${resolve(outputDir, 'preview.html')}`);
  console.log(`✓ frames: ${frames.map(({ name, frame }) => `${name}=${frame}`).join(', ')}`);

  if (argv.includes('--no-browser')) {
    console.log('⚠ browser capture skipped (--no-browser); inspect preview.html with lottie-web');
    return 0;
  }

  const browser = process.env.AGENT_BROWSER_BIN || 'agent-browser';
  const session = process.env.AGENT_BROWSER_SESSION || `vk-lottie-preview-${process.pid}`;
  const pageUrl = pathToFileURL(resolve(outputDir, 'preview.html')).href;
  try {
    runBrowser(browser, session, ['set', 'viewport', String(size), String(size)]);
    runBrowser(browser, session, ['open', pageUrl]);
    runBrowser(browser, session, ['wait', '--fn', 'window.__lottieReady === true']);
    for (const { name, frame } of frames) {
      runBrowser(browser, session, ['eval', `window.__setFrame(${frame})`]);
      runBrowser(browser, session, ['screenshot', '#stage', resolve(outputDir, `frame-${name}.png`)]);
      console.log(`✓ captured ${resolve(outputDir, `frame-${name}.png`)}`);
    }
    return 0;
  } finally {
    spawnSync(browser, ['--session', session, 'close'], { stdio: 'ignore' });
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
}
