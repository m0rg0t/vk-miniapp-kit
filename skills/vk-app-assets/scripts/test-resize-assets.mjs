#!/usr/bin/env node

import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}
function png(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) raw[y * (width * 4 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function pngDimensions(file) {
  const data = readFileSync(file);
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

const root = mkdtempSync(join(tmpdir(), 'vk-resize-assets-'));
const script = join(fileURLToPath(new URL('.', import.meta.url)), 'resize-assets.sh');
const source = join(root, 'icon.svg');
const out = join(root, 'out');
writeFileSync(source, `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0077FF"/>
  <rect x="224" y="224" width="576" height="576" rx="96" fill="#fff"/>
</svg>
`.trim());

const valid = spawnSync('bash', [script, '--icon', source, '--out', out], { encoding: 'utf8' });
assert.equal(valid.status, 0, valid.stderr);
assert.deepEqual(pngDimensions(join(out, 'icon-576.png')), { width: 576, height: 576 });
assert.deepEqual(pngDimensions(join(out, 'icon-1024.png')), { width: 1024, height: 1024 });

const nonSquare = join(root, 'non-square.png');
writeFileSync(nonSquare, png(800, 600));
const rejected = spawnSync('bash', [script, '--icon', nonSquare, '--out', join(root, 'rejected')], { encoding: 'utf8' });
assert.equal(rejected.status, 1);
assert.match(`${rejected.stdout}\n${rejected.stderr}`, /must be square|Refusing to stretch/i);

console.log('resize-assets tests passed');
