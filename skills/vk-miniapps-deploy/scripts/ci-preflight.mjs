#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    if (['allow-production', 'json'].includes(key)) {
      result[key] = true;
    } else {
      result[key] = argv[index + 1];
      index += 1;
    }
  }
  return result;
}

function readJson(file, label, errors) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
    return null;
  }
}

function installedDeployVersion(projectRoot) {
  const file = resolve(projectRoot, 'node_modules/@vkontakte/vk-miniapps-deploy/package.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')).version ?? null;
}

export function preflightCiDeploy(options = {}, environment = process.env) {
  const errors = [];
  const warnings = [];
  const configPath = resolve(options.config ?? 'vk-hosting-config.json');
  const projectRoot = dirname(configPath);
  const config = readJson(configPath, 'vk-hosting-config.json', errors);
  const deployEnvironment = environment.MINI_APPS_ENVIRONMENT;
  const accessTokenPresent = typeof environment.MINI_APPS_ACCESS_TOKEN === 'string'
    && environment.MINI_APPS_ACCESS_TOKEN.length > 0;

  if (!config) return { errors, warnings, summary: { configPath, accessTokenPresent } };

  if (config.noprompt !== 1 && config.noprompt !== true) {
    errors.push('vk-hosting-config.json must set noprompt to 1 for automatic builds');
  }
  if ('access_token' in config) {
    errors.push('remove access_token from vk-hosting-config.json; inject MINI_APPS_ACCESS_TOKEN from CI secrets');
  }
  if (!accessTokenPresent) {
    errors.push('MINI_APPS_ACCESS_TOKEN is missing from the CI environment');
  }
  if (!['dev', 'production'].includes(deployEnvironment)) {
    errors.push('MINI_APPS_ENVIRONMENT must be exactly dev or production');
  }
  if (deployEnvironment === 'production') {
    if (!options['allow-production']) {
      errors.push('production deploy requires --allow-production after a protected manual gate');
    }
    warnings.push('the token authorizes automatic production upload, but URL publication still requires administrator confirmation');
  }

  const environmentAppId = environment.MINI_APPS_APP_ID;
  const appId = environmentAppId == null || environmentAppId === ''
    ? Number(config.app_id)
    : Number(environmentAppId);
  if (!Number.isInteger(appId) || appId < 1) {
    errors.push('app ID must be a positive integer in config.app_id or MINI_APPS_APP_ID');
  }

  const staticPathValue = config.static_path ?? config.staticpath;
  const staticPath = typeof staticPathValue === 'string' && staticPathValue
    ? resolve(projectRoot, staticPathValue)
    : null;
  if (!staticPath) {
    errors.push('vk-hosting-config.json must define static_path');
  } else {
    try {
      if (!statSync(staticPath).isDirectory()) errors.push(`static_path is not a directory: ${staticPath}`);
    } catch {
      errors.push(`static_path does not exist: ${staticPath}`);
    }
  }

  if (!config.endpoints || typeof config.endpoints !== 'object' || Array.isArray(config.endpoints)) {
    errors.push('vk-hosting-config.json must define an endpoints object');
  } else if (staticPath) {
    for (const [platform, endpoint] of Object.entries(config.endpoints)) {
      if (typeof endpoint !== 'string' || !endpoint || extname(endpoint) === '') {
        errors.push(`endpoint ${platform} must be a non-empty file path`);
        continue;
      }
      const endpointPath = resolve(staticPath, endpoint.replace(/^[/\\]+/, ''));
      if (!endpointPath.startsWith(`${staticPath}/`) && endpointPath !== staticPath) {
        errors.push(`endpoint ${platform} escapes static_path`);
      } else if (!existsSync(endpointPath)) {
        errors.push(`endpoint ${platform} does not exist: ${endpointPath}`);
      }
    }
  }

  let deployPackageVersion = null;
  try {
    deployPackageVersion = installedDeployVersion(projectRoot);
  } catch (error) {
    errors.push(`cannot read installed deploy package: ${error.message}`);
  }
  if (!deployPackageVersion) {
    errors.push('install @vkontakte/vk-miniapps-deploy before CI preflight');
  } else {
    const major = Number(String(deployPackageVersion).split('.')[0]);
    if (!Number.isInteger(major) || major < 1) {
      errors.push(`unsupported deploy package ${deployPackageVersion}; versions below 1.0.0 are deprecated`);
    }
  }

  return {
    errors,
    warnings,
    summary: {
      configPath,
      staticPath,
      appId: Number.isInteger(appId) ? appId : null,
      environment: deployEnvironment ?? null,
      accessTokenPresent,
      deployPackageVersion,
      productionAcknowledged: deployEnvironment === 'production' && options['allow-production'] === true,
    },
  };
}

export function run(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArgs(argv);
  const result = preflightCiDeploy(options, environment);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const warning of result.warnings) console.warn(`! ${warning}`);
    for (const error of result.errors) console.error(`✗ ${error}`);
    if (result.errors.length === 0) {
      console.log(`✓ CI deploy preflight passed for ${result.summary.environment}`);
      console.log(`  deploy package: ${result.summary.deployPackageVersion}`);
      console.log(`  static path: ${result.summary.staticPath}`);
    }
  }
  if (result.errors.length > 0) process.exitCode = 1;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
