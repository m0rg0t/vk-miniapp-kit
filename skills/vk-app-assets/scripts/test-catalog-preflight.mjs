#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { preflight } from './catalog-preflight.mjs';
import { bundleCatalog } from './catalog-bundle.mjs';

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
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return out;
}
function png(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      raw[y * (width + 1) + x + 1] = ((x * 31 + y * 17) ^ (x * y)) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = mkdtempSync(join(tmpdir(), 'vk-catalog-preflight-'));
mkdirSync(join(root, 'screenshots'));
writeFileSync(join(root, 'icon-576.png'), png(576, 576));
writeFileSync(join(root, 'catalog-snippet-1120x630.png'), png(1120, 630));
writeFileSync(join(root, 'admin-form-requirements.png'), png(320, 200));
for (const name of ['01-main.png', '02-flow.png', '03-result.png']) {
  writeFileSync(join(root, 'screenshots', name), png(600, 1200));
}
for (const name of ['catalog-snippet-1120x630.source.svg', 'icon.svg']) {
  writeFileSync(join(root, name), '<svg xmlns="http://www.w3.org/2000/svg"/>');
}
const description = 'Приложение помогает выполнить основной сценарий.';
const shortDescription = 'Краткое описание';
writeFileSync(join(root, 'catalog-copy.json'), JSON.stringify({
  requirements: {
    checkedAt: '2026-07-26',
    source: 'admin-form-requirements.png',
    descriptionMaxCharacters: 2000,
    shortDescriptionMaxCharacters: 128,
  },
  description: { value: description, characters: Array.from(description).length },
  shortDescription: { value: shortDescription, characters: Array.from(shortDescription).length },
}));
writeFileSync(join(root, 'icon-animation.json'), JSON.stringify({
  v: '5.7.0',
  fr: 30,
  ip: 0,
  op: 60,
  w: 96,
  h: 96,
  layers: [{ ks: { r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [0] }] } } }],
}));

const manifest = {
  schemaVersion: 1,
  appId: 54717058,
  requirements: {
    checkedAt: '2026-07-26',
    source: 'admin-form-requirements.png',
    icon: { width: 576, height: 576 },
    snippet: { width: 1120, height: 630, minBytes: 1024, maxBytes: 5 * 1024 * 1024 },
    screenshots: { width: 600, height: 1200, minCount: 3 },
    lottie: { width: 96, height: 96, maxBytes: 24 * 1024 },
  },
  assets: {
    icon: { path: 'icon-576.png', source: 'icon.svg', unroundedReviewed: true },
    snippet: {
      path: 'catalog-snippet-1120x630.png',
      compositionSource: 'catalog-snippet-1120x630.source.svg',
      iconSource: 'icon-576.png',
      interfaceSource: 'screenshots/01-main.png',
      contentSources: ['screenshots/02-flow.png'],
      unroundedReviewed: true,
      realUiReviewed: true,
      privacyReviewed: true,
    },
    screenshots: ['screenshots/01-main.png', 'screenshots/02-flow.png', 'screenshots/03-result.png'],
    screenshotCapture: {
      source: 'http://localhost:5173',
      capturedAt: '2026-07-26',
      engine: 'agent-browser',
      cssViewport: { width: 300, height: 600 },
      deviceScaleFactor: 2,
      physicalOutput: { width: 600, height: 1200 },
      syntheticData: true,
      realUiReviewed: true,
      privacyReviewed: true,
    },
    lottie: { required: true, path: 'icon-animation.json' },
  },
  copy: { path: 'catalog-copy.json' },
  links: { privacyPolicy: 'https://product.company/privacy' },
  contacts: { support: 'support@product.company' },
};
const manifestPath = join(root, 'catalog-manifest.json');
const run = (value) => {
  writeFileSync(manifestPath, JSON.stringify(value));
  return preflight(manifestPath).errors;
};

assert.deepEqual(run(manifest), []);

const missingAppId = structuredClone(manifest);
delete missingAppId.appId;
assert.ok(run(missingAppId).some((error) => error.includes('appId')));

const escapingIcon = structuredClone(manifest);
escapingIcon.assets.icon.path = '../icon-576.png';
assert.ok(run(escapingIcon).some((error) => error.includes('escapes the catalog package')));

const missingOptionalLottie = structuredClone(manifest);
missingOptionalLottie.assets.lottie = { required: false, path: 'missing-animation.json' };
assert.ok(run(missingOptionalLottie).some((error) => error.includes('missing-animation.json')));

const roundedIconUnreviewed = structuredClone(manifest);
roundedIconUnreviewed.assets.icon.unroundedReviewed = false;
assert.ok(run(roundedIconUnreviewed).some((error) => error.includes('icon.unroundedReviewed')));

const roundedSnippetUnreviewed = structuredClone(manifest);
delete roundedSnippetUnreviewed.assets.snippet.unroundedReviewed;
assert.ok(run(roundedSnippetUnreviewed).some((error) => error.includes('snippet.unroundedReviewed')));

const missing576 = structuredClone(manifest);
missing576.assets.icon.path = 'icon-512.png';
assert.ok(run(missing576).some((error) => error.includes('icon-576')));

writeFileSync(join(root, 'snippet-1120x629.png'), png(1120, 629));
const wrongHeight = structuredClone(manifest);
wrongHeight.assets.snippet.path = 'snippet-1120x629.png';
assert.ok(run(wrongHeight).some((error) => error.includes('1120x629')));

writeFileSync(join(root, 'snippet-1119x630.png'), png(1119, 630));
const wrongWidth = structuredClone(manifest);
wrongWidth.assets.snippet.path = 'snippet-1119x630.png';
assert.ok(run(wrongWidth).some((error) => error.includes('1119x630')));

const wrongCaptureViewport = structuredClone(manifest);
wrongCaptureViewport.assets.screenshotCapture.cssViewport.width = 600;
assert.ok(run(wrongCaptureViewport).some((error) => error.includes('cssViewport')));

const missingCaptureEvidence = structuredClone(manifest);
delete missingCaptureEvidence.assets.screenshotCapture;
assert.ok(run(missingCaptureEvidence).some((error) => error.includes('screenshotCapture')));

const overlong = JSON.parse(readFileSync(join(root, 'catalog-copy.json'), 'utf8'));
overlong.description.value = 'я'.repeat(2001);
overlong.description.characters = 2001;
writeFileSync(join(root, 'catalog-copy-overlong.json'), JSON.stringify(overlong));
const overlongManifest = structuredClone(manifest);
overlongManifest.copy.path = 'catalog-copy-overlong.json';
assert.ok(run(overlongManifest).some((error) => error.includes('2001')));

const preflightCli = fileURLToPath(new URL('./catalog-preflight.mjs', import.meta.url));
writeFileSync(manifestPath, JSON.stringify(overlongManifest));
assert.equal(spawnSync(process.execPath, [preflightCli, manifestPath]).status, 1);
writeFileSync(manifestPath, JSON.stringify(manifest));
const validCli = spawnSync(process.execPath, [preflightCli, manifestPath], { encoding: 'utf8' });
assert.equal(validCli.status, 0, validCli.stderr);
assert.match(validCli.stdout, /пакет готов/);

const bundleRoot = mkdtempSync(join(tmpdir(), 'vk-catalog-bundle-'));
const bundled = bundleCatalog(manifestPath, bundleRoot);
assert.deepEqual(bundled.errors, []);
const portableManifest = JSON.parse(readFileSync(join(bundleRoot, 'catalog-manifest.json'), 'utf8'));
assert.equal(portableManifest.appId, 54717058);
const portableJson = JSON.stringify(portableManifest);
assert.doesNotMatch(portableJson, /(?:^|["/])\.\.(?:["/]|$)/);
assert.ok(readFileSync(join(bundleRoot, 'icon-576.png')).length > 0);
assert.ok(readFileSync(join(bundleRoot, 'sources', 'icon.svg')).length > 0);
assert.ok(readFileSync(join(bundleRoot, 'sources', 'content', '01-02-flow.png')).length > 0);

console.log('catalog-preflight tests passed');
