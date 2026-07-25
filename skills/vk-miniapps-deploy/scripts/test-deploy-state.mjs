#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { confirmDeploy, recordDeploy } from './deploy-state.mjs';

const root = mkdtempSync(join(tmpdir(), 'vk-deploy-state-'));
const config = join(root, 'vk-hosting-config.json');
const log = join(root, 'deploy.log');
const stateFile = join(root, 'vk-deploy-state.json');
const base = 'https://mock.vk.invalid';
writeFileSync(config, JSON.stringify({
  app_id: 54693573,
  static_path: 'dist',
  endpoints: { mobile: 'index.html' },
  api_host: `${base}/method/`,
}));
writeFileSync(log, 'Uploaded version 42!\n');

let apiCalls = 0;
let received;
const mockFetch = async (url, options) => {
  const parsed = new URL(url);
  if (parsed.pathname === '/method/apps.confirmDeploy') {
    apiCalls += 1;
    received = new URLSearchParams(options.body);
    return new Response(JSON.stringify({ response: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (parsed.pathname === '/app/') return new Response('ok', { status: 200 });
  return new Response('not found', { status: 404 });
};

const recorded = recordDeploy({
  log,
  state: stateFile,
  config,
  'package-version': '1.0.2',
  'latest-version': '1.0.2',
  'api-version': '5.131',
  'production-url': `${base}/app/`,
});
assert.equal(recorded.version, '42');
assert.equal(recorded.status, 'uploaded');

await assert.rejects(
  confirmDeploy({
    state: stateFile,
    version: '43',
  }, { VK_DEPLOY_CONFIRM_CODE: 'wrong-version', MINI_APPS_ACCESS_TOKEN: 'token' }, mockFetch),
  /version mismatch/,
);
assert.equal(apiCalls, 0, 'version mismatch must stop before API or upload work');

const result = await confirmDeploy({
  state: stateFile,
  version: '42',
}, { VK_DEPLOY_CONFIRM_CODE: '123456', MINI_APPS_ACCESS_TOKEN: 'token' }, mockFetch);
assert.equal(apiCalls, 1);
assert.equal(received.get('app_id'), '54693573');
assert.equal(received.get('version'), '42');
assert.equal(received.get('code'), '123456');
assert.equal(result.state.status, 'confirmed');
assert.equal(result.state.productionHttpStatus, 200);
assert.equal(readFileSync(stateFile, 'utf8').includes('123456'), false, 'state must not store one-time code');

const recheck = await confirmDeploy({ state: stateFile, version: '42' }, {}, mockFetch);
assert.equal(apiCalls, 1, 'confirmed state must not call apps.confirmDeploy or upload again');
assert.equal(recheck.state.productionHttpStatus, 200);

console.log('deploy-state tests passed');
