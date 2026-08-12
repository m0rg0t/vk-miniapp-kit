#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  countCharacters,
  normalizePlainText,
  validateCopyDocument,
  validateEndUserLanguage,
  validatePlainText,
} from './catalog-copy.mjs';

const normalized = normalizePlainText('- Первый пункт\n* Второй пункт 😊');
assert.equal(normalized, 'Первый пункт; Второй пункт');
assert.equal(countCharacters('текст'), 5);

const base = {
  requirements: {
    checkedAt: '2026-07-26',
    source: 'VK admin screenshot',
    descriptionMaxCharacters: 2000,
    shortDescriptionMaxCharacters: 128,
  },
  description: { value: 'Однострочное описание приложения.', characters: 33 },
  shortDescription: { value: 'Краткое описание', characters: 16 },
};
assert.deepEqual(validateCopyDocument(base).errors, []);

for (const invalid of ['line one\nline two', '- list item', 'Текст; 1. пункт', '*emphasis*', 'Текст 😊']) {
  assert.ok(validatePlainText('description', invalid, 2000).errors.length > 0, invalid);
}
assert.ok(validatePlainText('description', 'я'.repeat(2001), 2000).errors.length > 0);
assert.ok(validatePlainText('shortDescription', 'я'.repeat(129), 128).errors.length > 0);
for (const technical of [
  'Избранное хранится в localStorage.',
  'Приложение работает через VK Bridge и WebView.',
  'Данные остаются в памяти браузера на клиентской стороне.',
]) {
  assert.ok(validateEndUserLanguage('description', technical).length > 0, technical);
}
assert.deepEqual(
  validateEndUserLanguage('description', 'Сохраняйте идеи в избранное и быстро находите их при следующем визите.'),
  [],
);

const root = mkdtempSync(join(tmpdir(), 'vk-catalog-description-'));
const draft = join(root, 'draft.json');
const output = join(root, 'catalog-copy.json');
const cli = fileURLToPath(new URL('./catalog-copy.mjs', import.meta.url));
writeFileSync(draft, JSON.stringify({
  description: '- Первый пункт\n* Второй пункт',
  shortDescription: 'Краткое описание',
}));
const prepared = spawnSync(process.execPath, [
  cli,
  'prepare',
  '--input', draft,
  '--out', output,
  '--checked-at', '2026-07-26',
  '--requirements-source', 'admin-form-requirements.png',
  '--description-limit', '2000',
  '--short-limit', '128',
], { encoding: 'utf8' });
assert.equal(prepared.status, 0, prepared.stderr);
assert.match(prepared.stdout, /Описание \(\d+\/2000\)/);
const preparedDocument = JSON.parse(readFileSync(output, 'utf8'));
assert.equal(preparedDocument.description.value, 'Первый пункт; Второй пункт');

preparedDocument.shortDescription.value = 'line one\nline two';
preparedDocument.shortDescription.characters = 17;
writeFileSync(output, JSON.stringify(preparedDocument));
assert.equal(spawnSync(process.execPath, [cli, 'validate', output]).status, 1);

console.log('catalog-description tests passed');
