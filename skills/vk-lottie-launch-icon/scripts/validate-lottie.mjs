#!/usr/bin/env node
/**
 * Validate a Lottie (bodymovin) launch-icon animation against VK's budget and
 * loop quality. VK's animated launch icon must be small and seamless — a visible
 * jump at the loop point looks broken, so this checks both the hard limits and
 * the loop seam.
 *
 * Usage: node validate-lottie.mjs <path.json> [--width 96] [--height 96] [--max-kb 24]
 *
 * Hard checks (exit 1 on failure):
 *   - file is valid JSON
 *   - file size ≤ max-kb
 *   - composition width/height match the target (default 96×96)
 *   - required Lottie fields present (v, fr, ip, op, w, h, layers)
 * Soft checks (warn, exit 0):
 *   - every animated property returns to its starting value at the out point
 *     (seamless loop) — reports any property whose first/last keyframe differ
 */

import { readFileSync, statSync } from 'node:fs';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const file = process.argv[2];
if (!file || file.startsWith('--')) {
  console.error('usage: validate-lottie.mjs <path.json> [--width 96] [--height 96] [--max-kb 24]');
  process.exit(2);
}
const targetW = Number(arg('width', 96));
const targetH = Number(arg('height', 96));
const maxBytes = Number(arg('max-kb', 24)) * 1024;

let hardFail = false;
const fail = (m) => { console.error(`✗ ${m}`); hardFail = true; };
const ok = (m) => console.log(`✓ ${m}`);
const warn = (m) => console.warn(`⚠ ${m}`);

// --- size ---
const bytes = statSync(file).size;
if (bytes <= maxBytes) ok(`size ${(bytes / 1024).toFixed(1)} KB ≤ ${maxBytes / 1024} KB`);
else fail(`size ${(bytes / 1024).toFixed(1)} KB exceeds ${maxBytes / 1024} KB budget`);

// --- JSON + required fields ---
let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
  ok('valid JSON');
} catch (e) {
  fail(`invalid JSON: ${e.message}`);
  process.exit(1);
}

for (const k of ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers']) {
  if (data[k] === undefined) fail(`missing required field "${k}"`);
}
if (!hardFail) ok('required fields present (v, fr, ip, op, w, h, layers)');

// --- dimensions ---
if (data.w === targetW && data.h === targetH) ok(`dimensions ${data.w}×${data.h}`);
else fail(`dimensions ${data.w}×${data.h} ≠ target ${targetW}×${targetH}`);

const durationS = data.fr ? ((data.op - data.ip) / data.fr).toFixed(2) : '?';
console.log(`  info: fr=${data.fr} ip=${data.ip} op=${data.op} (~${durationS}s), layers=${data.layers?.length ?? 0}`);

// --- loop seam: every animated property must end where it started ---
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const offenders = [];
let animatedCount = 0;

function walk(node, path) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    // Animated property: { a: 1, k: [ {t, s}, ... ] }
    if (node.a === 1 && Array.isArray(node.k) && node.k.length >= 2 && node.k[0]?.t !== undefined) {
      animatedCount++;
      const first = node.k[0].s;
      const last = node.k[node.k.length - 1].s ?? node.k[node.k.length - 2]?.e;
      if (first !== undefined && last !== undefined && !eq(first, last)) {
        offenders.push(`${path} (start ${JSON.stringify(first)} ≠ end ${JSON.stringify(last)})`);
      }
    }
    for (const key of Object.keys(node)) walk(node[key], path ? `${path}.${key}` : key);
  }
}
walk(data.layers, 'layers');

if (animatedCount === 0) {
  warn('no animated properties found — is this actually animated?');
} else if (offenders.length === 0) {
  ok(`seamless loop: all ${animatedCount} animated properties return to start`);
} else {
  warn(`loop seam: ${offenders.length} of ${animatedCount} animated properties do NOT return to start:`);
  offenders.slice(0, 10).forEach((o) => warn(`    ${o}`));
  warn('  → set the last keyframe value equal to the first so the loop is seamless.');
}

process.exit(hardFail ? 1 : 0);
