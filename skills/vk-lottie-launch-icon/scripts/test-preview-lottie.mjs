#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = mkdtempSync(join(tmpdir(), 'vk-lottie-preview-'));
const input = join(root, 'animation.json');
const runtime = join(root, 'lottie_svg.min.js');
const output = join(root, 'preview');
const helper = join(fileURLToPath(new URL('.', import.meta.url)), 'preview-lottie.mjs');
writeFileSync(input, JSON.stringify({ ip: 0, op: 60, layers: [] }));
writeFileSync(runtime, 'window.lottie = { loadAnimation() {} };');

const result = spawnSync(process.execPath, [helper, input, '--out', output, '--lottie-web', runtime, '--no-browser'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
const html = readFileSync(join(output, 'preview.html'), 'utf8');
assert.match(html, /renderer: 'svg'/);
assert.match(html, /"name":"op-1","frame":59/);
assert.match(`${result.stdout}\n${result.stderr}`, /browser capture skipped/);

console.log('preview-lottie tests passed');
