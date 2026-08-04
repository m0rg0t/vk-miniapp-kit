#!/usr/bin/env node
/**
 * Fallback catalog-screenshot capturer for VK Mini Apps.
 *
 * The skill's DEFAULT capture tool is the `agent-browser` CLI. This script is
 * the fallback for machines without it: it drives whichever browser engine is
 * installed (Playwright preferred, then puppeteer-core) and captures one PNG per
 * "screen" at a fixed CSS viewport. `--width`/`--height` are the physical
 * catalog target; with the default 2× scale a 600×1200 target is rendered in a
 * 300×600 CSS viewport. It deliberately does NOT resize: a wrong viewport makes
 * the UI density wrong even when a later resize produces the right file size.
 *
 * Usage:
 *   node capture.mjs --url http://localhost:5173 --out ./screenshots \
 *     --width 600 --height 1200 --scale 2 --steps ./steps.json
 *
 * steps.json is an array of actions, executed in order:
 *   { "goto": "/" }                 navigate (relative is joined to --url)
 *   { "clickText": "Далее" }        click the first element containing this text
 *   { "click": ".css-selector" }    click by CSS selector
 *   { "waitFor": ".selector" }      wait until selector is visible
 *   { "wait": 600 }                 wait N milliseconds
 *   { "scroll": 500 }               scroll the window to Y=500
 *   { "shot": "01-main" }           screenshot the viewport to <out>/01-main.png
 *
 * With no --steps, it captures a single shot named "01" of --url.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith('--')) continue;
    const body = token.slice(2);
    const separator = body.indexOf('=');
    const key = separator === -1 ? body : body.slice(0, separator);
    const inlineValue = separator === -1 ? undefined : body.slice(separator + 1);
    if (!key) continue;
    if (inlineValue !== undefined) a[key] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      a[key] = argv[i + 1];
      i += 1;
    } else a[key] = true;
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));

const HELP = `Usage: node capture.mjs [options]

Capture a catalog target at a CSS viewport and device scale that preserve the
shipped UI density. --width/--height are physical output pixels.

Options:
  --url <url>                 App URL (default: http://localhost:5173)
  --out <dir>                 Output directory (default: ./screenshots)
  --width <px>                Physical output width (default: 600)
  --height <px>               Physical output height (default: 1200)
  --css-width <px>            Explicit CSS viewport width
  --css-height <px>           Explicit CSS viewport height
  --scale <number>            Device scale factor (default: 2)
  --steps <file>              JSON steps file
  --dry-run                   Print the resolved capture configuration
  --help                      Show this help
`;

if (args.help) {
  console.log(HELP);
  process.exit(0);
}

function numberOption(name, value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) throw new Error(`--${name} must be a finite number`);
  return number;
}

const url = args.url || 'http://localhost:5173';
const outDir = args.out || './screenshots';
const scale = numberOption('scale', args.scale, 2);
let physicalWidth = numberOption('width', args['output-width'] ?? args.width, 600);
let physicalHeight = numberOption('height', args['output-height'] ?? args.height, 1200);
const hasCssWidth = args['css-width'] !== undefined;
const hasCssHeight = args['css-height'] !== undefined;
let cssWidth = numberOption('css-width', args['css-width'], physicalWidth / scale);
let cssHeight = numberOption('css-height', args['css-height'], physicalHeight / scale);

if (hasCssWidth && args['output-width'] === undefined && args.width === undefined) {
  physicalWidth = cssWidth * scale;
}
if (hasCssHeight && args['output-height'] === undefined && args.height === undefined) {
  physicalHeight = cssHeight * scale;
}

for (const [name, value] of [['width', physicalWidth], ['height', physicalHeight], ['css-width', cssWidth], ['css-height', cssHeight]]) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} must resolve to a positive integer`);
}
if (!Number.isFinite(scale) || scale <= 0) throw new Error('--scale must be a positive number');
if (!Number.isInteger(cssWidth * scale) || !Number.isInteger(cssHeight * scale)) {
  throw new Error('CSS viewport × --scale must resolve to integer physical pixels');
}
if (cssWidth * scale !== physicalWidth || cssHeight * scale !== physicalHeight) {
  throw new Error(`capture target mismatch: CSS ${cssWidth}x${cssHeight} @${scale}x produces ${cssWidth * scale}x${cssHeight * scale}, expected ${physicalWidth}x${physicalHeight}`);
}

const steps = args.steps
  ? JSON.parse(readFileSync(args.steps, 'utf8'))
  : [{ goto: '/' }, { wait: 800 }, { shot: '01' }];

if (!Array.isArray(steps)) throw new Error('--steps must contain a JSON array');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const resolveUrl = (to) =>
  /^https?:\/\//.test(to) ? to : url.replace(/\/$/, '') + (to.startsWith('/') ? to : '/' + to);
const shotPath = (name) => (isAbsolute(name) ? name : join(outDir, name.endsWith('.png') ? name : `${name}.png`));

function inspectPngDimensions(file) {
  const buffer = readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(`${file} is not a PNG screenshot`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const resolvedConfig = {
  url,
  outDir,
  cssViewport: { width: cssWidth, height: cssHeight },
  deviceScaleFactor: scale,
  physicalOutput: { width: physicalWidth, height: physicalHeight },
};

// ---- Engine loading: Playwright first, then puppeteer-core ------------------

async function tryImport(spec) {
  try {
    return await import(spec);
  } catch {
    return null;
  }
}

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  // Newest cached puppeteer Chrome, if any.
  const cache = `${process.env.HOME}/.cache/puppeteer/chrome`;
  try {
    const dirs = readdirSync(cache).filter((d) => !d.endsWith('.zip')).sort().reverse();
    for (const d of dirs) {
      candidates.push(`${cache}/${d}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`);
      candidates.push(`${cache}/${d}/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`);
    }
  } catch { /* no cache */ }
  return candidates.find((p) => existsSync(p)) || null;
}

async function launchPlaywright() {
  const pw = (await tryImport('playwright')) || (await tryImport('playwright-core'));
  if (!pw) return null;
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: cssWidth, height: cssHeight },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  return {
    name: 'playwright',
    goto: (u) => page.goto(u, { waitUntil: 'networkidle' }),
    clickText: (t) => page.getByText(t, { exact: false }).first().click({ timeout: 8000 }),
    click: (s) => page.click(s, { timeout: 8000 }),
    waitFor: (s) => page.waitForSelector(s, { state: 'visible', timeout: 8000 }),
    wait: (ms) => page.waitForTimeout(ms),
    scroll: (y) => page.evaluate((top) => window.scrollTo(0, top), y),
    shot: (p) => page.screenshot({ path: p, fullPage: false }),
    close: () => browser.close(),
  };
}

async function launchPuppeteer() {
  const pp = (await tryImport('puppeteer')) || (await tryImport('puppeteer-core'));
  if (!pp) return null;
  const lib = pp.default || pp;
  const executablePath = findChrome();
  if (!executablePath && !pp.executablePath) {
    throw new Error('puppeteer-core found but no Chrome binary located. Install Chrome or use agent-browser/Playwright.');
  }
  const browser = await lib.launch({
    headless: 'new',
    executablePath: executablePath || undefined,
    defaultViewport: { width: cssWidth, height: cssHeight, deviceScaleFactor: scale },
    args: ['--no-sandbox', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  const clickByText = async (t) => {
    const handle = await page.evaluateHandle((text) => {
      const els = [...document.querySelectorAll('button, a, [role="button"], div, span')];
      return els.find((e) => (e.textContent || '').trim().includes(text)) || null;
    }, t);
    const el = handle.asElement();
    if (!el) throw new Error(`clickText: no element containing "${t}"`);
    await el.click();
  };
  return {
    name: 'puppeteer-core',
    goto: (u) => page.goto(u, { waitUntil: 'networkidle2' }),
    clickText: clickByText,
    click: (s) => page.click(s),
    waitFor: (s) => page.waitForSelector(s, { visible: true, timeout: 8000 }),
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    scroll: (y) => page.evaluate((top) => window.scrollTo(0, top), y),
    shot: (p) => page.screenshot({ path: p, fullPage: false }),
    close: () => browser.close(),
  };
}

// ---- Run --------------------------------------------------------------------

async function main() {
  if (args['dry-run']) {
    console.log(JSON.stringify({ ...resolvedConfig, steps }, null, 2));
    return;
  }

  const engine = (await launchPlaywright()) || (await launchPuppeteer());
  if (!engine) {
    console.error(
      '\nNo browser engine available. Install one of:\n' +
        '  npm i -D playwright && npx playwright install chromium\n' +
        'or prefer the agent-browser CLI (the skill default).\n'
    );
    process.exit(2);
  }
  console.log(`[capture] engine=${engine.name} cssViewport=${cssWidth}x${cssHeight} @${scale}x output=${physicalWidth}x${physicalHeight} url=${url}`);

  const written = [];
  try {
    for (const step of steps) {
      if (!step || typeof step !== 'object') throw new Error('each capture step must be an object');
      if (step.goto != null) await engine.goto(resolveUrl(step.goto));
      else if (step.clickText != null) await engine.clickText(step.clickText);
      else if (step.click != null) await engine.click(step.click);
      else if (step.waitFor != null) await engine.waitFor(step.waitFor);
      else if (step.wait != null) await engine.wait(step.wait);
      else if (step.scroll != null) await engine.scroll(typeof step.scroll === 'number' ? step.scroll : step.scroll.y);
      else if (step.shot != null) {
        const p = shotPath(step.shot);
        if (!p.toLowerCase().endsWith('.png')) throw new Error(`shot path must end with .png: ${p}`);
        await engine.shot(p);
        const dimensions = inspectPngDimensions(p);
        if (dimensions.width !== physicalWidth || dimensions.height !== physicalHeight) {
          throw new Error(`shot ${p} is ${dimensions.width}x${dimensions.height}; expected ${physicalWidth}x${physicalHeight}. Fix the CSS viewport/scale and recapture; do not resize a 600x1200 CSS capture.`);
        }
        written.push(p);
        console.log(`[capture] shot → ${p} (${dimensions.width}x${dimensions.height})`);
      } else throw new Error(`unsupported capture step: ${JSON.stringify(step)}`);
    }
  } finally {
    await engine.close();
  }

  // Emit machine-readable result so the manifest can retain capture evidence.
  writeFileSync(
    join(outDir, '.capture-result.json'),
    JSON.stringify({
      capturedAt: new Date().toISOString(),
      engine: engine.name,
      captured_at_scale: scale,
      cssViewport: resolvedConfig.cssViewport,
      deviceScaleFactor: scale,
      physicalOutput: resolvedConfig.physicalOutput,
      target: resolvedConfig.physicalOutput,
      files: written,
    }, null, 2)
  );
  console.log(`[capture] done: ${written.length} file(s) at ${physicalWidth}x${physicalHeight}.`);
}

main().catch((e) => {
  console.error('[capture] failed:', e?.message || e);
  process.exit(1);
});
