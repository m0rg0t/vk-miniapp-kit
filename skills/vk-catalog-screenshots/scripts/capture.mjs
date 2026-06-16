#!/usr/bin/env node
/**
 * Fallback catalog-screenshot capturer for VK Mini Apps.
 *
 * The skill's DEFAULT capture tool is the `agent-browser` CLI. This script is
 * the fallback for machines without it: it drives whichever browser engine is
 * installed (Playwright preferred, then puppeteer-core) and captures one PNG per
 * "screen" at a fixed CSS viewport. It deliberately does NOT resize — the skill
 * runs a single `sips` normalize pass afterward so every capture tool shares the
 * same final step and the output is guaranteed to hit VK's exact spec.
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
 *   { "shot": "01-main" }           screenshot the viewport to <out>/01-main.png
 *
 * With no --steps, it captures a single shot named "01" of --url.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i]?.replace(/^--/, '');
    if (k) a[k] = argv[i + 1];
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const url = args.url || 'http://localhost:5173';
const outDir = args.out || './screenshots';
const width = Number(args.width || 600);
const height = Number(args.height || 1200);
const scale = Number(args.scale || 2); // capture at 2× for crisp text; sips downscales later
const steps = args.steps
  ? JSON.parse(readFileSync(args.steps, 'utf8'))
  : [{ goto: '/' }, { wait: 800 }, { shot: '01' }];

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const resolveUrl = (to) =>
  /^https?:\/\//.test(to) ? to : url.replace(/\/$/, '') + (to.startsWith('/') ? to : '/' + to);
const shotPath = (name) => (isAbsolute(name) ? name : join(outDir, name.endsWith('.png') ? name : `${name}.png`));

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
    viewport: { width, height },
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
    shot: (p) => page.screenshot({ path: p }),
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
    defaultViewport: { width, height, deviceScaleFactor: scale },
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
    shot: (p) => page.screenshot({ path: p }),
    close: () => browser.close(),
  };
}

// ---- Run --------------------------------------------------------------------

async function main() {
  const engine = (await launchPlaywright()) || (await launchPuppeteer());
  if (!engine) {
    console.error(
      '\nNo browser engine available. Install one of:\n' +
        '  npm i -D playwright && npx playwright install chromium\n' +
        'or prefer the agent-browser CLI (the skill default).\n'
    );
    process.exit(2);
  }
  console.log(`[capture] engine=${engine.name} viewport=${width}x${height}@${scale}x url=${url}`);

  const written = [];
  try {
    for (const step of steps) {
      if (step.goto != null) await engine.goto(resolveUrl(step.goto));
      else if (step.clickText != null) await engine.clickText(step.clickText);
      else if (step.click != null) await engine.click(step.click);
      else if (step.waitFor != null) await engine.waitFor(step.waitFor);
      else if (step.wait != null) await engine.wait(step.wait);
      else if (step.shot != null) {
        const p = shotPath(step.shot);
        await engine.shot(p);
        written.push(p);
        console.log(`[capture] shot → ${p}`);
      }
    }
  } finally {
    await engine.close();
  }

  // Emit machine-readable result so the skill can verify/normalize.
  writeFileSync(
    join(outDir, '.capture-result.json'),
    JSON.stringify({ engine: engine.name, captured_at_scale: scale, target: { width, height }, files: written }, null, 2)
  );
  console.log(`[capture] done: ${written.length} file(s). Run the sips normalize step to enforce ${width}x${height}.`);
}

main().catch((e) => {
  console.error('[capture] failed:', e?.message || e);
  process.exit(1);
});
