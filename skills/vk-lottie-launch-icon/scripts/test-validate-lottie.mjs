#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = mkdtempSync(join(tmpdir(), 'vk-lottie-validator-'));
const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const validator = join(scriptDir, 'validate-lottie.mjs');
const fixtureDir = join(scriptDir, '..', 'fixtures');
const base = {
  v: '5.7.0',
  fr: 30,
  ip: 0,
  op: 60,
  w: 96,
  h: 96,
  layers: [{ ks: { r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [0] }] } } }],
};

function run(file, ...args) {
  const result = spawnSync(process.execPath, [validator, file, ...args], { encoding: 'utf8' });
  return { ...result, text: `${result.stdout}\n${result.stderr}` };
}

const valid = join(root, 'valid.json');
writeFileSync(valid, JSON.stringify(base));
assert.equal(run(valid, '--strict-loop').status, 0);

const drifting = join(root, 'drifting.json');
const invalid = structuredClone(base);
invalid.layers[0].ks.r.k[1].s = [90];
writeFileSync(drifting, JSON.stringify(invalid));
assert.equal(run(drifting, '--strict-loop').status, 1);
assert.match(run(drifting).text, /loop seam/);

const staticFile = join(root, 'static.json');
writeFileSync(staticFile, JSON.stringify({ ...base, layers: [] }));
assert.equal(run(staticFile, '--strict-loop').status, 1);
assert.match(run(staticFile).text, /no animated properties/);

const unsupported = join(root, 'unsupported.json');
const compatibility = structuredClone(base);
compatibility.layers[0].ty = 4;
compatibility.layers[0].shapes = [{ ty: 'rp' }];
writeFileSync(unsupported, JSON.stringify(compatibility));
assert.equal(run(unsupported).status, 0);
assert.match(run(unsupported).text, /outside the compact default subset/);
assert.equal(run(unsupported, '--strict-compatible-subset').status, 1);

const occluded = join(fixtureDir, 'occluded-background.json');
const occludedResult = run(occluded, '--strict-loop');
assert.equal(occludedResult.status, 0, occludedResult.text);
assert.match(occludedResult.text, /topmost .*opaque .*may cover later layers|keep the background last/);
assert.equal(run(occluded, '--strict-loop', '--strict-layer-order').status, 1);

const correct = join(fixtureDir, 'correct-layer-order.json');
const correctResult = run(correct, '--strict-loop', '--strict-layer-order');
assert.equal(correctResult.status, 0, correctResult.text);
assert.doesNotMatch(correctResult.text, /may cover later layers/);

console.log('validate-lottie tests passed');
