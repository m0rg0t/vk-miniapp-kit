#!/usr/bin/env node

import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyScreenshots } from './verify.mjs';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let crc = n;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return output;
}

function png(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const raw = Buffer.alloc((width + 1) * height);
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const root = mkdtempSync(join(tmpdir(), 'vk-catalog-screenshots-'));
mkdirSync(join(root, 'screenshots'));
for (const name of ['01-main.png', '02-flow.png', '03-result.png']) {
  writeFileSync(join(root, 'screenshots', name), png(600, 1200));
}

const valid = verifyScreenshots({ dir: join(root, 'screenshots') });
assert.equal(valid.files.length, 3);

writeFileSync(join(root, 'screenshots', '04-wrong.png'), png(600, 1199));
assert.throws(
  () => verifyScreenshots({ dir: join(root, 'screenshots'), files: ['04-wrong.png'] }),
  /600x1199.*600x1200/
);
assert.throws(
  () => verifyScreenshots({ dir: join(root, 'screenshots'), minCount: 4 }),
  /600x1199.*600x1200/
);

console.log('screenshot verifier tests passed');
