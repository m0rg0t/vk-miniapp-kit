import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
function find(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return find(path);
    return /(?:^test-.*|.*\.test)\.mjs$/.test(entry.name) ? [path] : [];
  });
}
const files = [...find(join(root, 'skills')), ...find(join(root, 'tests'))].sort();
if (!files.length) throw new Error('No fixture tests found');
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=2', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
