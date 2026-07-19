#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const json = process.argv.includes('--json');
const results = [];

function add(level, check, detail) {
  results.push({ level, check, detail });
}

function walk(dir, extensions) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'build', 'coverage', '.git'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path, extensions));
    else if (extensions.includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const installedPackage = (name) => {
  const file = join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const majorFromRange = (range) => Number(String(range ?? '').match(/\d+/)?.[0] ?? NaN);

const packagePath = join(root, 'package.json');
let projectPackage;
let declaredDependencies = {};
let declaredOfficialMock;
let installedOfficialMock;
if (!existsSync(packagePath)) {
  add('fail', 'package', 'package.json not found in the current directory');
} else {
  try {
    projectPackage = JSON.parse(readFileSync(packagePath, 'utf8'));
    add('ok', 'package', `loaded ${projectPackage.name ?? 'unnamed package'}`);
  } catch (error) {
    add('fail', 'package', `invalid package.json: ${error.message}`);
  }

  if (projectPackage) {
    const deps = { ...projectPackage.dependencies, ...projectPackage.devDependencies };
    declaredDependencies = deps;
    for (const dependency of ['react', 'react-dom', '@vkontakte/vkui', '@vkontakte/vk-bridge']) {
      const declared = deps[dependency];
      const installed = installedPackage(dependency);
      const level = !declared ? 'fail' : installed ? 'ok' : 'warn';
      const detail = !declared
        ? 'not declared'
        : installed
          ? `declared ${declared}; installed ${installed.version}`
          : `declared ${declared}, but not installed under node_modules`;
      add(level, `dependency:${dependency}`, detail);
    }
    for (const script of ['dev', 'build', 'test']) {
      add(
        projectPackage.scripts?.[script] ? 'ok' : 'warn',
        `script:${script}`,
        projectPackage.scripts?.[script] ?? 'missing'
      );
    }

    const testRunner = ['vitest', 'jest'].find((name) => deps[name]);
    const installedTestRunner = testRunner ? installedPackage(testRunner) : null;
    add(testRunner && installedTestRunner ? 'ok' : 'warn', 'test-runner', testRunner
      ? installedTestRunner
        ? `${testRunner} declared ${deps[testRunner]}; installed ${installedTestRunner.version}`
        : `${testRunner} declared ${deps[testRunner]}, but not installed`
      : 'no Vitest/Jest dependency declared');

    const browserRunner = ['@playwright/test', 'playwright', 'cypress'].find((name) => deps[name]);
    const installedBrowserRunner = browserRunner ? installedPackage(browserRunner) : null;
    add(browserRunner && installedBrowserRunner ? 'ok' : 'warn', 'browser-runner', browserRunner
      ? installedBrowserRunner
        ? `${browserRunner} declared ${deps[browserRunner]}; installed ${installedBrowserRunner.version}`
        : `${browserRunner} declared ${deps[browserRunner]}, but not installed`
      : 'no durable browser-test runner declared');

    declaredOfficialMock = deps['@vkontakte/vk-bridge-mock'];
    installedOfficialMock = installedPackage('@vkontakte/vk-bridge-mock');
  }
}

const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const files = walk(join(root, 'src'), codeExtensions);
const sources = files.map((path) => ({
  path,
  text: readFileSync(path, 'utf8'),
}));
const matching = (pattern) => sources.filter(({ text }) => pattern.test(text));

const initFiles = matching(/VKWebAppInit|initVkBridge/);
add(initFiles.length ? 'ok' : 'warn', 'bridge-init-definition', initFiles.length
  ? initFiles.map(({ path }) => relative(root, path)).join(', ')
  : 'no VKWebAppInit or initVkBridge implementation found');

const startupInit = sources.filter(({ path, text }) => {
  const name = basename(path);
  const outsideService = !/services?|bridge/i.test(relative(join(root, 'src'), path));
  return outsideService &&
    (/initVkBridge\s*\(/.test(text) || /(?:vkBridge|bridge)\.send\s*\(\s*['"]VKWebAppInit/.test(text)) &&
    !/\.(test|spec)\.[jt]sx?$/.test(name);
});
add(startupInit.length ? 'ok' : 'warn', 'bridge-init-startup-call', startupInit.length
  ? startupInit.map(({ path }) => relative(root, path)).join(', ')
  : 'Bridge init is defined/referenced but no startup call was found outside service/test files');

const mockFiles = sources.filter(({ path, text }) =>
  /mock/i.test(path) &&
  /(vi\.mock\s*\(|getMockResponse|new Map\s*<|@vkontakte\/vk-bridge-mock|VKWebAppGetUserInfo)/.test(text)
);
const hasBridgeMock = mockFiles.length > 0 || Boolean(installedOfficialMock);
add(hasBridgeMock ? 'ok' : 'warn', 'bridge-mock-implementation', mockFiles.length
  ? mockFiles.map(({ path }) => relative(root, path)).join(', ')
  : installedOfficialMock
    ? `official mock installed ${installedOfficialMock.version}`
    : 'no executable local Bridge mock behavior found');

add(
  declaredOfficialMock && installedOfficialMock ? 'ok' : mockFiles.length ? 'ok' : 'warn',
  'standalone-mock-mode',
  declaredOfficialMock
    ? installedOfficialMock
      ? `official mock declared ${declaredOfficialMock}; installed ${installedOfficialMock.version}`
      : `official mock declared ${declaredOfficialMock}, but not installed`
    : mockFiles.length
      ? 'centralized custom mock found; official package is optional'
      : 'neither the official mock nor a centralized custom mock is ready'
);

const mockBridgeRange = installedOfficialMock?.dependencies?.['@vkontakte/vk-bridge'];
if (mockBridgeRange) {
  const appMajor = majorFromRange(declaredDependencies['@vkontakte/vk-bridge']);
  const mockMajor = majorFromRange(mockBridgeRange);
  add(appMajor === mockMajor ? 'ok' : 'warn', 'bridge-mock-compatibility',
    `app declares Bridge ${declaredDependencies['@vkontakte/vk-bridge']}; installed mock expects ${mockBridgeRange}`);
}

const testFiles = sources.filter(({ path }) => /\.(test|spec)\.[jt]sx?$/.test(path));
const testCases = testFiles.reduce(
  (count, { text }) => count + [...text.matchAll(/\b(?:test|it)(?:\.\w+)?\s*\(/g)].length,
  0
);
add(testCases ? 'ok' : 'warn', 'test-cases', testCases
  ? `${testCases} test case declaration(s) across ${testFiles.length} file(s)`
  : testFiles.length
    ? `${testFiles.length} test/spec file(s), but no test()/it() declarations`
    : 'no test/spec files found under src');

const rawBridge = matching(/\b(?:vkBridge|bridge)\.send\s*\(/);
add(rawBridge.length <= 1 ? 'ok' : 'warn', 'bridge-boundary', rawBridge.length
  ? `${rawBridge.length} file(s) call Bridge directly; keep calls centralized`
  : 'no direct Bridge calls found (verify the app service boundary)');

const uiRoot = matching(/ConfigProvider|AppRoot/);
add(uiRoot.length ? 'ok' : 'warn', 'vkui-root', uiRoot.length
  ? uiRoot.map(({ path }) => relative(root, path)).join(', ')
  : 'no VKUI ConfigProvider/AppRoot reference found');

const usesVite = Object.values(projectPackage?.scripts ?? {}).some((script) => /\bvite\b/.test(script));
if (usesVite) {
  const hasIndex = existsSync(join(root, 'index.html'));
  const hasMain = files.some((path) => /^main\.[jt]sx?$/.test(basename(path)));
  const hasConfig = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']
    .some((name) => existsSync(join(root, name)));
  add(hasIndex ? 'ok' : 'warn', 'vite-index', hasIndex ? 'index.html exists' : 'index.html missing');
  add(hasMain ? 'ok' : 'warn', 'vite-entry', hasMain ? 'src/main entry exists' : 'no src/main.[jt]sx entry found');
  add(hasConfig ? 'ok' : 'warn', 'vite-config', hasConfig ? 'Vite config exists' : 'no vite.config file found');
}

const documentation = walk(root, ['.md']).map((path) => ({
  path,
  text: readFileSync(path, 'utf8'),
}));
const acceptanceDocs = documentation.filter(({ path, text }) =>
  /product.brief|requirements|spec/i.test(path) || /acceptance criteria|критерии при[её]мки/i.test(text)
);
add(acceptanceDocs.length ? 'ok' : 'warn', 'acceptance-criteria', acceptanceDocs.length
  ? acceptanceDocs.map(({ path }) => relative(root, path)).slice(0, 5).join(', ')
  : 'no product brief/spec with acceptance criteria found; define the core journey before browser automation');

if (json) {
  console.log(JSON.stringify({ root, results }, null, 2));
} else {
  for (const result of results) {
    const mark = result.level === 'ok' ? '✓' : result.level === 'warn' ? '⚠' : '✗';
    console.log(`${mark} ${result.check}: ${result.detail}`);
  }
  const counts = Object.groupBy
    ? Object.groupBy(results, ({ level }) => level)
    : results.reduce((acc, item) => ((acc[item.level] ??= []).push(item), acc), {});
  console.log(`\n${results.length} checks: ${(counts.ok ?? []).length} ok, ${(counts.warn ?? []).length} warning(s), ${(counts.fail ?? []).length} failure(s)`);
}

const hasFailure = results.some(({ level }) => level === 'fail');
const hasWarning = results.some(({ level }) => level === 'warn');
process.exit(hasFailure || (strict && hasWarning) ? 1 : 0);
