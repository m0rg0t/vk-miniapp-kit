#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

// Upload form: a sparse hand-written file with a non-ASCII name is reported, and fails only in strict mode.
const sparse = join(root, 'sparse.json');
const sparseData = {
  ...base,
  nm: 'Иконка — запуск',
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'волна', ip: 0, op: 60, st: 0,
    ks: { r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [0] }] } },
    shapes: [{ ty: 'gr', it: [
      { ty: 'el', s: { a: 0, k: [20, 20] } },
      { ty: 'fl', c: { a: 0, k: [1, 0.5, 0, 1] } },
      { ty: 'tr', p: { a: 0, k: [0, 0] } },
    ] }],
  }],
};
writeFileSync(sparse, JSON.stringify(sparseData));
const sparseResult = run(sparse, '--strict-loop');
assert.equal(sparseResult.status, 0, sparseResult.text);
assert.match(sparseResult.text, /upload form: file contains non-ASCII characters/);
assert.match(sparseResult.text, /upload form: layers\[0\] lacks explicit .*"ao"/);
assert.match(sparseResult.text, /\(fl\) lacks explicit .*"r"/);
assert.match(sparseResult.text, /\(el\) lacks explicit .*"d"/);
assert.match(sparseResult.text, /\(gr\) lacks explicit .*"np"/);
assert.match(sparseResult.text, /top-level "assets" array is missing/);
assert.equal(run(sparse, '--strict-loop', '--strict-upload-form').status, 1);

// normalize-lottie.mjs turns it into the accepted form without touching geometry or motion.
const normalizer = join(scriptDir, 'normalize-lottie.mjs');
const normalized = join(root, 'normalized.json');
const normalizeRun = spawnSync(process.execPath, [normalizer, sparse, '--out', normalized, '--name', 'launch-icon'], { encoding: 'utf8' });
assert.equal(normalizeRun.status, 0, normalizeRun.stderr);
const normalizedText = readFileSync(normalized, 'utf8');
assert.doesNotMatch(normalizedText, /[^\x00-\x7F]/);
const strictResult = run(normalized, '--strict-loop', '--strict-upload-form');
assert.equal(strictResult.status, 0, strictResult.text);
assert.match(strictResult.text, /upload form: ASCII-only/);
const normalizedData = JSON.parse(normalizedText);
assert.equal(normalizedData.nm, 'launch-icon');
assert.deepEqual(normalizedData.layers[0].ks, sparseData.layers[0].ks);
assert.deepEqual(normalizedData.layers[0].shapes[0].it[0].s, sparseData.layers[0].shapes[0].it[0].s);
assert.deepEqual(normalizedData.layers[0].shapes[0].it[1].c, sparseData.layers[0].shapes[0].it[1].c);
assert.equal(normalizedData.layers[0].shapes[0].np, 2);
assert.equal(readFileSync(sparse, 'utf8'), JSON.stringify(sparseData), 'input is untouched when --out is given');
// Idempotent.
const again = join(root, 'normalized-again.json');
assert.equal(spawnSync(process.execPath, [normalizer, normalized, '--out', again], { encoding: 'utf8' }).status, 0);
assert.equal(readFileSync(again, 'utf8'), normalizedText);
assert.equal(spawnSync(process.execPath, [normalizer, sparse, '--name', 'имя'], { encoding: 'utf8' }).status, 2);

console.log('validate-lottie tests passed');
