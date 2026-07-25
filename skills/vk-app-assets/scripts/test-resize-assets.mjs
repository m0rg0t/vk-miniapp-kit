#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectPng } from './catalog-preflight.mjs';

const root = mkdtempSync(join(tmpdir(), 'vk-resize-assets-'));
const source = join(root, 'icon.svg');
const out = join(root, 'out');
const script = join(fileURLToPath(new URL('.', import.meta.url)), 'resize-assets.sh');
writeFileSync(source, `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#2688eb"/>
  <circle cx="512" cy="512" r="256" fill="#fff"/>
</svg>
`.trim());

const result = spawnSync('bash', [script, '--icon', source, '--out', out], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
assert.deepEqual(
  { width: inspectPng(join(out, 'icon-576.png')).width, height: inspectPng(join(out, 'icon-576.png')).height },
  { width: 576, height: 576 },
);
assert.deepEqual(
  { width: inspectPng(join(out, 'icon-1024.png')).width, height: inspectPng(join(out, 'icon-1024.png')).height },
  { width: 1024, height: 1024 },
);

console.log('resize-assets tests passed');
