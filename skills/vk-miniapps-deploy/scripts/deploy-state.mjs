#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    if (key === 'dry-run') {
      result[key] = true;
    } else {
      result[key] = argv[i + 1];
      i += 1;
    }
  }
  return result;
}

function writeJsonAtomic(file, value) {
  const absolute = resolve(file);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, absolute);
}

function readConfig(file) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const appId = Number(config.app_id);
  if (!Number.isInteger(appId) || appId < 1) throw new Error('vk-hosting-config.json has no valid app_id');
  return { config, appId };
}

function detectPackageVersion(projectRoot) {
  const file = resolve(projectRoot, 'node_modules/@vkontakte/vk-miniapps-deploy/package.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')).version ?? null;
}

function detectApiVersion(projectRoot) {
  const file = resolve(projectRoot, 'node_modules/@vkontakte/vk-miniapps-deploy/index.js');
  if (!existsSync(file)) return null;
  const source = readFileSync(file, 'utf8');
  return source.match(/\bAPI_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1] ?? null;
}

function extractUploadedVersion(log) {
  const matches = [...log.matchAll(/Uploaded version\s+([^\s!]+)/gi)];
  return matches.at(-1)?.[1] ?? null;
}

function extractSingleUrl(log) {
  const urls = [...new Set(log.match(/https?:\/\/[^\s)]+/g) ?? [])];
  return urls.length === 1 ? urls[0] : null;
}

export function recordDeploy(options) {
  if (!options.log || !options.state || !options.config) {
    throw new Error('record requires --log, --state, and --config');
  }
  const log = readFileSync(options.log, 'utf8');
  const { config, appId } = readConfig(options.config);
  const version = options.version ?? extractUploadedVersion(log);
  if (!version) throw new Error('uploaded version not found; pass --version explicitly');
  const productionUrl = options['production-url'] ?? extractSingleUrl(log);
  if (!productionUrl) throw new Error('production URL is ambiguous or missing; pass --production-url');
  const url = new URL(productionUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('production URL must be HTTP(S)');
  const projectRoot = resolve(dirname(resolve(options.config)));
  const deployPackageVersion = options['package-version'] ?? detectPackageVersion(projectRoot);
  if (!deployPackageVersion) {
    throw new Error('installed @vkontakte/vk-miniapps-deploy version not found; pass --package-version after checking it');
  }
  const officialLatestVersion = options['latest-version'];
  if (!officialLatestVersion) {
    throw new Error('pass --latest-version after running npm view @vkontakte/vk-miniapps-deploy version');
  }
  const installedMajor = Number(String(deployPackageVersion).split('.')[0]);
  const latestMajor = Number(String(officialLatestVersion).split('.')[0]);
  if (!Number.isInteger(installedMajor) || installedMajor < 1) {
    throw new Error(`unsupported deploy package version ${deployPackageVersion}; versions below 1.0.0 are deprecated`);
  }
  if (!Number.isInteger(latestMajor) || latestMajor < 1) throw new Error(`invalid latest package version ${officialLatestVersion}`);
  if (installedMajor !== latestMajor) {
    throw new Error(`deploy package major mismatch: installed ${deployPackageVersion}, current ${officialLatestVersion}`);
  }
  const apiVersion = options['api-version'] ?? detectApiVersion(projectRoot);
  if (!apiVersion) {
    throw new Error('VK API version not found in the installed deploy package; pass --api-version after inspecting its source');
  }
  const apiBase = config.api_host ?? 'https://api.vk.ru/method/';
  const confirmEndpoint = new URL('apps.confirmDeploy', apiBase.endsWith('/') ? apiBase : `${apiBase}/`);
  const state = {
    schemaVersion: 1,
    appId,
    deployPackageVersion,
    officialLatestVersion,
    apiVersion,
    apiBase: new URL('.', confirmEndpoint).href,
    version: String(version),
    productionUrl: url.href,
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
  };
  writeJsonAtomic(options.state, state);
  return state;
}

export async function confirmDeploy(options, environment = process.env, fetchImpl = fetch) {
  if (!options.state) throw new Error('confirm requires --state');
  const statePath = resolve(options.state);
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (state.schemaVersion !== 1 || !state.appId || !state.version) throw new Error('invalid deploy state');
  if (options.version != null && String(options.version) !== String(state.version)) {
    throw new Error(`version mismatch: saved ${state.version}, requested ${options.version}; refusing to confirm or upload`);
  }
  if (options['production-url'] && new URL(options['production-url']).href !== state.productionUrl) {
    throw new Error('production URL differs from saved deploy state');
  }
  if (!['uploaded', 'api-confirmed', 'confirmed'].includes(state.status)) {
    throw new Error(`unsupported deploy state status ${state.status}`);
  }
  if (!state.apiBase || !state.apiVersion) throw new Error('deploy state lacks inspected API base/version');
  if (options['api-version'] && options['api-version'] !== state.apiVersion) {
    throw new Error(`API version differs from saved deploy state (${state.apiVersion})`);
  }
  const needsApiConfirmation = state.status === 'uploaded';
  const code = options.code ?? environment.VK_DEPLOY_CONFIRM_CODE;
  const tokenEnv = options['access-token-env'] ?? 'MINI_APPS_ACCESS_TOKEN';
  const accessToken = environment[tokenEnv];
  if (needsApiConfirmation && !code) {
    throw new Error('confirmation code missing; set VK_DEPLOY_CONFIRM_CODE or pass --code');
  }
  if (needsApiConfirmation && !accessToken && !options['dry-run']) throw new Error(`access token missing in ${tokenEnv}`);
  const endpoint = new URL('apps.confirmDeploy', state.apiBase);
  const publicRequest = {
    method: needsApiConfirmation ? 'apps.confirmDeploy' : 'production-url-check-only',
    app_id: state.appId,
    version: String(state.version),
    ...(needsApiConfirmation ? { code: '<redacted>' } : {}),
  };
  if (options['dry-run']) return { dryRun: true, request: publicRequest, state };

  let confirmedState = state;
  if (needsApiConfirmation) {
    const body = new URLSearchParams({
      app_id: String(state.appId),
      version: String(state.version),
      code: String(code),
      access_token: accessToken,
      v: state.apiVersion,
    });
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const payload = await response.json();
    if (!response.ok || payload.error || payload.response === undefined) {
      const message = payload.error?.error_msg ?? `HTTP ${response.status}`;
      throw new Error(`apps.confirmDeploy failed: ${message}`);
    }
    confirmedState = {
      ...state,
      status: 'api-confirmed',
      confirmedAt: new Date().toISOString(),
    };
    writeJsonAtomic(statePath, confirmedState);
  }

  const productionResponse = await fetchImpl(confirmedState.productionUrl, { method: 'GET', redirect: 'follow' });
  if (productionResponse.status !== 200) {
    writeJsonAtomic(statePath, {
      ...confirmedState,
      productionHttpStatus: productionResponse.status,
      productionCheckedAt: new Date().toISOString(),
    });
    throw new Error(`production URL returned HTTP ${productionResponse.status}, expected 200`);
  }

  const nextState = {
    ...confirmedState,
    status: 'confirmed',
    productionHttpStatus: productionResponse.status,
    productionCheckedAt: new Date().toISOString(),
  };
  writeJsonAtomic(statePath, nextState);
  return { request: publicRequest, state: nextState };
}

export async function run(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const options = parseArgs(rest);
  if (command === 'record') {
    const state = recordDeploy(options);
    console.log(`✓ uploaded version ${state.version} recorded in ${resolve(options.state)}`);
    console.log(`  deploy package: ${state.deployPackageVersion}`);
    console.log(`  official latest checked: ${state.officialLatestVersion}`);
    console.log(`  VK API version: ${state.apiVersion}`);
    console.log(`  production URL: ${state.productionUrl}`);
    return;
  }
  if (command === 'confirm') {
    const result = await confirmDeploy(options);
    if (result.dryRun) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`✓ version ${result.state.version} confirmed with apps.confirmDeploy`);
    console.log(`✓ production URL HTTP ${result.state.productionHttpStatus}: ${result.state.productionUrl}`);
    return;
  }
  throw new Error('usage: deploy-state.mjs record ... | confirm ...');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  });
}
