import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
for (const path of files) {
  if (path.endsWith('.json')) JSON.parse(readFileSync(path, 'utf8'));
  const command = path.endsWith('.mjs') ? [process.execPath, ['--check', path]]
    : path.endsWith('.sh') ? ['bash', ['-n', path]] : null;
  if (!command) continue;
  const result = spawnSync(...command, { encoding: 'utf8' });
  assert.equal(result.status, 0, `${path}: ${result.stderr || result.error || 'syntax check failed'}`);
}
for (const entry of readdirSync(join(root, 'skills'), { withFileTypes: true }).filter(entry => entry.isDirectory())) {
  const text = readFileSync(join(root, 'skills', entry.name, 'SKILL.md'), 'utf8');
  assert.match(text, /^---\nname: [a-z0-9-]+\ndescription: [\s\S]+?\n---\n/);
  assert.equal(/^name: (.+)$/m.exec(text)?.[1], entry.name);
  const agent = readFileSync(join(root, 'skills', entry.name, 'agents/openai.yaml'), 'utf8');
  assert.ok(agent.includes(`$${entry.name}`), `Missing skill reference: ${entry.name}`);
}
console.log('All script syntax, JSON manifests and skill identities checked. No installation or service calls.');
