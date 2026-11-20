import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const readiness = fileURLToPath(new URL('../skills/vk-app-test/scripts/check-project.mjs', import.meta.url));
const doctor = fileURLToPath(new URL('../skills/vk-app-doctor/scripts/vk-app-doctor.mjs', import.meta.url));

for (const extension of ['mjs', 'cjs', 'mts', 'cts', 'js', 'ts']) {
  test(`both read-only checkers recognize root tests/*.test.${extension}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'vk-kit-readiness-'));
    try {
      const packageText = JSON.stringify({ name: 'synthetic-fixture', scripts: { test: `node --test tests/*.test.${extension}` } });
      writeFileSync(join(root, 'package.json'), packageText);
      mkdirSync(join(root, 'tests'));
      const testPath = join(root, 'tests', `example.test.${extension}`);
      const source = "test('synthetic case', () => {});\n";
      writeFileSync(testPath, source);
      const run = script => JSON.parse(spawnSync(process.execPath, [script, '--json'], { cwd: root, encoding: 'utf8' }).stdout);
      const ready = Object.fromEntries(run(readiness).results.map(item => [item.check, item]));
      assert.equal(ready['test-runner'].level, 'ok');
      assert.equal(ready['test-cases'].level, 'ok');
      const report = Object.fromEntries(run(doctor).findings.map(item => [item.check, item]));
      assert.equal(report['automated-tests'].level, 'ok');
      // A valid test runner must not hide missing application dependencies.
      assert.equal(ready['dependency:react'].level, 'fail');
      assert.equal(report['dependency:react'].level, 'fail');
      assert.equal(readFileSync(testPath, 'utf8'), source);
      assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), packageText);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

test('a test filename without executable declarations still warns', () => {
  const root = mkdtempSync(join(tmpdir(), 'vk-kit-no-tests-'));
  try {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test tests/*.test.mjs' } }));
    mkdirSync(join(root, 'tests'));
    writeFileSync(join(root, 'tests', 'empty.test.mjs'), 'export const placeholder = true;\n');
    for (const [script, field, check] of [[readiness, 'results', 'test-cases'], [doctor, 'findings', 'automated-tests']]) {
      const report = JSON.parse(spawnSync(process.execPath, [script, '--json'], { cwd: root, encoding: 'utf8' }).stdout);
      assert.equal(report[field].find(item => item.check === check).level, 'warn');
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
