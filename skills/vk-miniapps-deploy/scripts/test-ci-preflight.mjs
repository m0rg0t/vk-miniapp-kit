#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { preflightCiDeploy } from './ci-preflight.mjs';

const root = mkdtempSync(join(tmpdir(), 'vk-ci-deploy-preflight-'));
const configPath = join(root, 'vk-hosting-config.json');
mkdirSync(join(root, 'build'), { recursive: true });
mkdirSync(join(root, 'node_modules/@vkontakte/vk-miniapps-deploy'), { recursive: true });
writeFileSync(join(root, 'build/index.html'), '<!doctype html>');
writeFileSync(
  join(root, 'node_modules/@vkontakte/vk-miniapps-deploy/package.json'),
  JSON.stringify({ version: '1.0.2' }),
);
writeFileSync(configPath, JSON.stringify({
  static_path: 'build',
  app_id: 123456,
  endpoints: { mobile: 'index.html', web: 'index.html' },
  noprompt: 1,
}));

const validEnvironment = {
  MINI_APPS_ACCESS_TOKEN: 'must-never-appear-in-result',
  MINI_APPS_ENVIRONMENT: 'dev',
};
const valid = preflightCiDeploy({ config: configPath }, validEnvironment);
assert.deepEqual(valid.errors, []);
assert.equal(valid.summary.environment, 'dev');
assert.equal(valid.summary.accessTokenPresent, true);
assert.equal(JSON.stringify(valid).includes(validEnvironment.MINI_APPS_ACCESS_TOKEN), false);

const missingToken = preflightCiDeploy(
  { config: configPath },
  { MINI_APPS_ENVIRONMENT: 'dev' },
);
assert.ok(missingToken.errors.some((error) => error.includes('MINI_APPS_ACCESS_TOKEN')));

const mistypedEnvironment = preflightCiDeploy(
  { config: configPath },
  { ...validEnvironment, MINI_APPS_ENVIRONMENT: 'prod' },
);
assert.ok(mistypedEnvironment.errors.some((error) => error.includes('exactly dev or production')));

const unsafeProduction = preflightCiDeploy(
  { config: configPath },
  { ...validEnvironment, MINI_APPS_ENVIRONMENT: 'production' },
);
assert.ok(unsafeProduction.errors.some((error) => error.includes('--allow-production')));

const acknowledgedProduction = preflightCiDeploy(
  { config: configPath, 'allow-production': true },
  { ...validEnvironment, MINI_APPS_ENVIRONMENT: 'production' },
);
assert.deepEqual(acknowledgedProduction.errors, []);
assert.ok(acknowledgedProduction.warnings.some((warning) => warning.includes('confirmation')));
assert.ok(acknowledgedProduction.warnings.some((warning) => warning.includes('automatic production upload')));

writeFileSync(configPath, JSON.stringify({
  static_path: 'build',
  app_id: 123456,
  endpoints: { mobile: 'missing.html' },
  noprompt: 1,
  access_token: 'committed-secret',
}));
const unsafeConfig = preflightCiDeploy({ config: configPath }, validEnvironment);
assert.ok(unsafeConfig.errors.some((error) => error.includes('remove access_token')));
assert.ok(unsafeConfig.errors.some((error) => error.includes('does not exist')));
assert.equal(JSON.stringify(unsafeConfig).includes('committed-secret'), false);

writeFileSync(configPath, JSON.stringify({
  static_path: 'build',
  app_id: 123456,
  endpoints: { mobile: 'index.html' },
  noprompt: 1,
}));
writeFileSync(
  join(root, 'node_modules/@vkontakte/vk-miniapps-deploy/package.json'),
  JSON.stringify({ version: '0.1.9' }),
);
const deprecatedPackage = preflightCiDeploy({ config: configPath }, validEnvironment);
assert.ok(deprecatedPackage.errors.some((error) => error.includes('below 1.0.0')));

writeFileSync(
  join(root, 'node_modules/@vkontakte/vk-miniapps-deploy/package.json'),
  JSON.stringify({ version: '1.0.2' }),
);
const cliPath = fileURLToPath(new URL('./ci-preflight.mjs', import.meta.url));
const validCli = spawnSync(process.execPath, [cliPath, '--config', configPath, '--json'], {
  encoding: 'utf8',
  env: { ...process.env, ...validEnvironment },
});
assert.equal(validCli.status, 0, validCli.stderr);
assert.equal(validCli.stdout.includes(validEnvironment.MINI_APPS_ACCESS_TOKEN), false);
assert.deepEqual(JSON.parse(validCli.stdout).errors, []);

const blockedProductionCli = spawnSync(process.execPath, [cliPath, '--config', configPath], {
  encoding: 'utf8',
  env: { ...process.env, ...validEnvironment, MINI_APPS_ENVIRONMENT: 'production' },
});
assert.equal(blockedProductionCli.status, 1);
assert.match(blockedProductionCli.stderr, /--allow-production/);

console.log('CI deploy preflight tests passed');
