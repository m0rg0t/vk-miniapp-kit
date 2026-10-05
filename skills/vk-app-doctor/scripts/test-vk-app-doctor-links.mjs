#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const doctor = join(fileURLToPath(new URL('.', import.meta.url)), 'vk-app-doctor.mjs');

function internalLinks(files) {
  const root = mkdtempSync(join(tmpdir(), 'vk-doctor-links-'));
  for (const [relativePath, contents] of Object.entries(files)) {
    const file = join(root, relativePath);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, contents);
  }
  const result = spawnSync(process.execPath, [doctor, '--json'], { cwd: root, encoding: 'utf8' });
  const report = JSON.parse(result.stdout);
  return report.findings.find((finding) => finding.check === 'internal-links');
}

const flagged = {
  'root-relative anchor': '<a href="/saved">Saved</a>',
  'relative anchor': "<a className='tab' href='./planets'>Planets</a>",
  'bare relative anchor': '<a href="today">Today</a>',
  'query anchor': '<a href="?tab=planets">Planets</a>',
  'hash-route anchor': '<a href="#/saved">Saved</a>',
  'VKUI href prop': '<TabbarItem onClick={() => track("tab")} href={"/saved"} text="Saved" />',
  'template href': '<Cell href={`/planet/${id}`}>Mars</Cell>',
  'location assignment': "window.location.href = '/today';",
  'location assign': 'location.assign("?tab=saved");',
  'window.open internal': "window.open('/saved', '_self');",
  'image map area': '<map name="m"><area href="/saved" alt="Saved" /></map>',
};
for (const [name, code] of Object.entries(flagged)) {
  const finding = internalLinks({ 'src/App.tsx': `export const App = () => (${code});\n` });
  assert.equal(finding.level, 'warn', `${name} should warn`);
  assert.equal(finding.detail, 'src/App.tsx', name);
}

const html = internalLinks({ 'public/menu.html': '<nav><a href="/saved">Saved</a></nav>' });
assert.equal(html.level, 'warn', 'static HTML internal link should warn');

const benign = {
  'external https': '<a href="https://vk.com/app1" target="_blank" rel="noopener noreferrer">VK</a>',
  'protocol-relative': '<a href="//example.com/privacy">Privacy</a>',
  mailto: '<Link href="mailto:support@example.com">Support</Link>',
  tel: '<a href="tel:+70000000000">Call</a>',
  'bare fragment': '<a href="#">Top</a>',
  'in-page anchor': '<a href="#rules">Rules</a>',
  'router onClick': '<TabbarItem onClick={() => routeNavigator.push("/saved")} text="Saved" />',
  'dynamic href': '<a href={privacyUrl}>Privacy</a>',
  'svg use': '<svg><use href="#icon-star" /></svg>',
  'external location': "window.location.href = 'https://vk.com/';",
};
for (const [name, code] of Object.entries(benign)) {
  const finding = internalLinks({ 'src/App.tsx': `export const App = () => (${code});\n` });
  assert.equal(finding.level, 'ok', `${name} should not warn: ${finding.detail}`);
}

const htmlHead = internalLinks({
  'index.html': '<!doctype html><link rel="icon" href="/favicon.svg"><script type="module" src="/src/main.tsx"></script>',
});
assert.equal(htmlHead.level, 'ok', 'document head resources are not navigation');

const testOnly = internalLinks({ 'src/App.test.tsx': 'render(<a href="/saved">Saved</a>);\n' });
assert.equal(testOnly.level, 'ok', 'test fixtures are not shipped navigation');

const builtOnly = internalLinks({ 'dist/index.html': '<a href="/saved">Saved</a>' });
assert.equal(builtOnly.level, 'ok', 'build output is ignored like other generated directories');

console.log('vk-app-doctor internal-link tests passed');
