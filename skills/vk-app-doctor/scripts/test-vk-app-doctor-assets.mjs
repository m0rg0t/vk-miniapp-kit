#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const doctor = join(fileURLToPath(new URL('.', import.meta.url)), 'vk-app-doctor.mjs');

function ihdrOnly(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function inspect(files) {
  const root = mkdtempSync(join(tmpdir(), 'vk-doctor-assets-'));
  mkdirSync(join(root, 'release', 'catalog'), { recursive: true });
  for (const [name, dimensions] of Object.entries(files)) {
    writeFileSync(join(root, 'release', 'catalog', name), ihdrOnly(...dimensions));
  }
  const result = spawnSync(process.execPath, [doctor, '--json'], { cwd: root, encoding: 'utf8' });
  const report = JSON.parse(result.stdout);
  return Object.fromEntries(report.findings.map((finding) => [finding.check, finding]));
}

const legacyOnly = inspect({ 'icon-1024.png': [1024, 1024] });
assert.equal(legacyOnly['catalog-icon'].detail, '0 recognized');

const complete = inspect({
  'icon-576.png': [576, 576],
  'catalog-snippet-1120x630.png': [1120, 630],
});
assert.equal(complete['catalog-icon'].level, 'ok');
assert.equal(complete['catalog-snippet'].level, 'ok');

const ready = mkdtempSync(join(tmpdir(), 'vk-doctor-ready-'));
const put = (relativePath, contents) => {
  const file = join(ready, relativePath);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, contents);
};
put('package.json', JSON.stringify({
  name: 'ready-vk-app',
  scripts: { dev: 'vite', build: 'vite build', test: 'vitest' },
  dependencies: {
    react: '1.0.0',
    'react-dom': '1.0.0',
    '@vkontakte/vkui': '1.0.0',
    '@vkontakte/vk-bridge': '1.0.0',
    playwright: '1.0.0',
  },
}));
for (const dependency of ['react', 'react-dom', '@vkontakte/vkui', '@vkontakte/vk-bridge']) {
  put(`node_modules/${dependency}/package.json`, JSON.stringify({ name: dependency, version: '1.0.0' }));
}
put('src/app.js', 'const VKWebAppInit = true;\n');
put('src/vkBridgeRuntimeMock.js', 'throw new Error("Unsupported method in runtime mock");\n');
put('tests/app.test.js', 'test("main flow", () => {});\n');
put('backend/auth.js', 'const vk_user_id = 1; function verifyLaunch() { return vk_user_id; }\n');
put('docs/spec.md', '# Acceptance criteria\nPrivacy policy: https://product.company/privacy\nSupport contact: support@product.company\n');
put('vk-hosting-config.json', JSON.stringify({
  app_id: 54693573,
  static_path: 'dist',
  endpoints: { mobile: 'index.html', mvk: 'index.html', web: 'index.html' },
}));
put('dist/index.html', '<!doctype html>');
for (const [name, dimensions] of Object.entries({
  'release/catalog/icon-576.png': [576, 576],
  'release/catalog/catalog-snippet-1120x630.png': [1120, 630],
  'release/catalog/splashscreen-1080x1920.png': [1080, 1920],
  'release/catalog/screenshots/01.png': [600, 1200],
  'release/catalog/screenshots/02.png': [600, 1200],
  'release/catalog/screenshots/03.png': [600, 1200],
})) put(name, ihdrOnly(...dimensions));
put('release/catalog/catalog-manifest.json', JSON.stringify({
  requirements: {
    checkedAt: '2026-07-26',
    screenshots: { width: 600, height: 1200, minCount: 3 },
  },
  copy: { shortDescription: 'Краткое описание', description: 'Описание' },
}));
const releaseResult = spawnSync(process.execPath, [doctor, '--release', '--strict', '--json'], {
  cwd: ready,
  encoding: 'utf8',
});
assert.equal(releaseResult.status, 0, releaseResult.stdout + releaseResult.stderr);
const releaseReport = JSON.parse(releaseResult.stdout);
assert.equal(releaseReport.counts.fail, 0);
assert.equal(releaseReport.counts.warn, 0);

console.log('vk-app-doctor asset tests passed');
