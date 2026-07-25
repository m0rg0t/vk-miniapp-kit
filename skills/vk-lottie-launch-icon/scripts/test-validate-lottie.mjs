#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = mkdtempSync(join(tmpdir(), 'vk-lottie-validator-'));
const validator = join(fileURLToPath(new URL('.', import.meta.url)), 'validate-lottie.mjs');
const base = {
  v: '5.7.0',
  fr: 30,
  ip: 0,
  op: 60,
  w: 96,
  h: 96,
  layers: [{ ks: { r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [0] }] } } }],
};

const valid = join(root, 'valid.json');
writeFileSync(valid, JSON.stringify(base));
assert.equal(spawnSync(process.execPath, [validator, valid, '--strict-loop']).status, 0);

const drifting = join(root, 'drifting.json');
const invalid = structuredClone(base);
invalid.layers[0].ks.r.k[1].s = [90];
writeFileSync(drifting, JSON.stringify(invalid));
assert.equal(spawnSync(process.execPath, [validator, drifting, '--strict-loop']).status, 1);

const staticFile = join(root, 'static.json');
writeFileSync(staticFile, JSON.stringify({ ...base, layers: [] }));
assert.equal(spawnSync(process.execPath, [validator, staticFile, '--strict-loop']).status, 1);

console.log('validate-lottie tests passed');
