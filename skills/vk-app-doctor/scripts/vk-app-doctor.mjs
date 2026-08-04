#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

const args = new Set(process.argv.slice(2));
const allowed = new Set(['--release', '--strict', '--json']);
const unknown = [...args].filter((arg) => !allowed.has(arg));
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  process.exit(2);
}

const root = process.cwd();
const release = args.has('--release');
const strict = args.has('--strict');
const json = args.has('--json');
const findings = [];

const add = (category, level, check, detail, remediation = '') => {
  findings.push({ category, level, check, detail, remediation });
};

const ignored = new Set([
  '.git',
  'node_modules',
  'coverage',
  '.next',
  '.cache',
  'dist',
  'build',
]);

function walk(dir, predicate = () => true) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path, predicate));
    else if (predicate(path)) files.push(path);
  }
  return files;
}

const readText = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};

const parseJson = (path) => {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return { error: error.message };
  }
};

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const allFiles = walk(root);
const sourceFiles = allFiles.filter((path) => sourceExtensions.has(extname(path)));
const sources = sourceFiles.map((path) => ({ path, text: readText(path) }));
const docs = allFiles
  .filter((path) =>
    ['.md', '.txt', '.json'].includes(extname(path)) &&
    !/(?:^|\/)(?:package-lock|npm-shrinkwrap)\.json$/.test(path),
  )
  .map((path) => ({ path, text: readText(path) }));
const rel = (path) => relative(root, path) || '.';
const matchingSources = (pattern) => sources.filter(({ text }) => pattern.test(text));

let pkg;
const packagePath = join(root, 'package.json');
if (!existsSync(packagePath)) {
  add('project', 'fail', 'package', 'package.json is missing', 'Run from the application root.');
} else {
  const parsed = parseJson(packagePath);
  if (parsed.error) {
    add('project', 'fail', 'package', `Invalid package.json: ${parsed.error}`, 'Fix JSON syntax.');
  } else {
    pkg = parsed.value;
    add('project', 'ok', 'package', `Loaded ${pkg.name ?? 'unnamed package'}`);
  }
}

const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
for (const name of ['react', 'react-dom', '@vkontakte/vkui', '@vkontakte/vk-bridge']) {
  const declared = deps[name];
  const installedPath = join(root, 'node_modules', ...name.split('/'), 'package.json');
  const installed = existsSync(installedPath) ? parseJson(installedPath).value?.version : null;
  add(
    'project',
    !declared ? 'fail' : installed ? 'ok' : 'warn',
    `dependency:${name}`,
    !declared
      ? 'not declared'
      : installed
        ? `declared ${declared}; installed ${installed}`
        : `declared ${declared}; node_modules installation not found`,
    !declared ? `Add ${name} through the project package manager.` : '',
  );
}

for (const script of ['dev', 'build', 'test']) {
  const command = pkg?.scripts?.[script];
  add(
    'project',
    command ? 'ok' : release && script !== 'dev' ? 'fail' : 'warn',
    `script:${script}`,
    command ?? 'missing',
    command ? '' : `Define a real ${script} script.`,
  );
}

const init = matchingSources(/(?:VKWebAppInit|initVkBridge)\b/);
add(
  'platform',
  init.length ? 'ok' : 'fail',
  'bridge-init',
  init.length ? init.map(({ path }) => rel(path)).slice(0, 5).join(', ') : 'not found',
  'Initialize VK Bridge once before dependent calls.',
);

const directBridge = matchingSources(/\b(?:vkBridge|bridge)\.send\s*\(/);
add(
  'platform',
  directBridge.length <= 2 ? 'ok' : 'warn',
  'bridge-boundary',
  `${directBridge.length} source file(s) call Bridge directly`,
  'Centralize send(), timeout, and error normalization in one service.',
);

const runtimeMocks = sources.filter(({ path, text }) =>
  /mock/i.test(rel(path)) &&
  /(?:__VK_BRIDGE_MOCK__|vk_mock|Unsupported method in runtime mock|@vkontakte\/vk-bridge-mock)/.test(text),
);
add(
  'platform',
  runtimeMocks.length ? 'ok' : 'warn',
  'runtime-mock',
  runtimeMocks.length ? runtimeMocks.map(({ path }) => rel(path)).join(', ') : 'not found',
  'Use vk-app-test to install an explicit browser runtime mock.',
);

const viteConfigs = allFiles.filter((path) => /^vite\.config\.[cm]?[jt]s$/.test(basename(path)));
const unsafeAliases = viteConfigs.filter((path) => {
  const text = readText(path);
  const hasMockAlias = /vk-bridge-mock|vkBridgeRuntimeMock/.test(text);
  const modeBound = /mode\s*===\s*['"]vk-mock/.test(text);
  const serveOnly = /command\s*===\s*['"]serve/.test(text);
  return hasMockAlias && !(modeBound && serveOnly);
});
const appMockImports = sources.filter(({ path, text }) =>
  !/\.(?:test|spec)\.[jt]sx?$/.test(path) &&
  !/^vite\.config\.[cm]?[jt]s$/.test(basename(path)) &&
  !/test|mock/i.test(rel(path)) &&
  /vk-bridge-mock|vkBridgeRuntimeMock/.test(text),
);
add(
  'platform',
  unsafeAliases.length || appMockImports.length ? 'fail' : 'ok',
  'mock-production-isolation',
  unsafeAliases.length || appMockImports.length
    ? [...unsafeAliases, ...appMockImports]
      .map((item) => rel(typeof item === 'string' ? item : item.path))
      .join(', ')
    : 'no unconditional production mock path found',
  'Bind the exact Bridge alias only when command === serve and mode === vk-mock.',
);

const testFiles = sources.filter(({ path }) => /\.(?:test|spec)\.[jt]sx?$/.test(path));
const testCases = testFiles.reduce(
  (total, { text }) => total + [...text.matchAll(/\b(?:test|it)(?:\.\w+)?\s*\(/g)].length,
  0,
);
add(
  'tests',
  testCases ? 'ok' : 'warn',
  'automated-tests',
  testCases ? `${testCases} case(s) in ${testFiles.length} file(s)` : 'no executable test()/it() declarations',
  'Add behavior tests rather than empty test filenames.',
);

const browserRunner = ['@playwright/test', 'playwright', 'cypress'].find((name) => deps[name]);
add(
  'tests',
  browserRunner ? 'ok' : 'warn',
  'browser-runner',
  browserRunner ?? 'not declared',
  'Keep the critical mocked-browser journey in CI.',
);

const acceptance = docs.filter(({ path, text }) =>
  /(?:brief|requirements|spec)/i.test(rel(path)) ||
  /acceptance criteria|критерии при[её]мки/i.test(text),
);
add(
  'tests',
  acceptance.length ? 'ok' : 'warn',
  'acceptance-criteria',
  acceptance.length ? acceptance.map(({ path }) => rel(path)).slice(0, 5).join(', ') : 'not found',
  'Use vk-app-plan to define testable acceptance criteria.',
);

const secretFindings = sources.filter(({ text }) =>
  /\bVITE_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY)\b|(?:app_|secure_?)key\s*[:=]\s*['"][^'"]{8,}/i.test(text),
);
add(
  'security',
  secretFindings.length ? 'fail' : 'ok',
  'client-secrets',
  secretFindings.length ? secretFindings.map(({ path }) => rel(path)).join(', ') : 'no high-confidence client secret pattern',
  'Remove secure keys from browser code and rotate exposed values.',
);

const backendLike = sources.filter(({ path }) =>
  /(?:^|\/)(?:server|api|backend|functions?|middleware)(?:\/|$)/i.test(rel(path)),
);
const usesLaunchIdentity = backendLike.some(({ text }) => /\bvk_user_id\b/.test(text));
const verifiesLaunch = backendLike.some(({ text }) =>
  /timingSafeEqual|createHmac\s*\(\s*['"]sha256|verifyVkLaunchParams|verifyLaunch/i.test(text),
);
add(
  'security',
  usesLaunchIdentity && !verifiesLaunch ? 'fail' : usesLaunchIdentity ? 'ok' : 'warn',
  'launch-authentication',
  usesLaunchIdentity
    ? verifiesLaunch
      ? 'backend identity use has signature-verification evidence'
      : 'backend reads vk_user_id without verification evidence'
    : 'no backend VK identity flow detected',
  'Use vk-app-security and verify signed launch params on the backend.',
);

const hostingPath = join(root, 'vk-hosting-config.json');
let hosting;
if (existsSync(hostingPath)) {
  const parsed = parseJson(hostingPath);
  if (parsed.error) {
    add('hosting', 'fail', 'hosting-config', parsed.error, 'Fix vk-hosting-config.json.');
  } else {
    hosting = parsed.value;
    add('hosting', 'ok', 'hosting-config', 'valid JSON');
  }
} else {
  add(
    'hosting',
    release ? 'fail' : 'warn',
    'hosting-config',
    'vk-hosting-config.json is missing',
    'Add the config before VK hosting deployment.',
  );
}

if (hosting) {
  add(
    'hosting',
    String(hosting.app_id ?? '').trim() ? 'ok' : 'fail',
    'hosting-app-id',
    String(hosting.app_id ?? 'missing'),
    'Set the VK application ID.',
  );
  const staticPath = typeof hosting.static_path === 'string' ? hosting.static_path : '';
  add(
    'hosting',
    staticPath ? 'ok' : 'fail',
    'hosting-static-path',
    staticPath || 'missing',
    'Set static_path to the build output directory.',
  );
  for (const endpoint of ['mobile', 'mvk', 'web']) {
    const value = hosting.endpoints?.[endpoint];
    const validEndpoint = typeof value === 'string' && value.endsWith('.html');
    add(
      'hosting',
      validEndpoint ? 'ok' : 'fail',
      `hosting-endpoint:${endpoint}`,
      value ?? 'missing',
      `Point ${endpoint} to an HTML entry.`,
    );
    if (staticPath && validEndpoint) {
      const staticRoot = resolve(root, staticPath);
      const output = resolve(staticRoot, value);
      const contained = output === staticRoot || output.startsWith(`${staticRoot}${sep}`);
      add(
        'hosting',
        !contained ? 'fail' : existsSync(output) ? 'ok' : release ? 'fail' : 'warn',
        `build-output:${endpoint}`,
        !contained
          ? `${value} escapes static_path`
          : existsSync(output)
            ? rel(output)
            : `${rel(output)} not found`,
        !contained
          ? 'Keep endpoint files inside static_path.'
          : 'Run the production build before the release doctor.',
      );
    }
  }
}

function pngDimensions(path) {
  try {
    const buffer = readFileSync(path);
    if (
      buffer.length < 24 ||
      buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      buffer.toString('ascii', 12, 16) !== 'IHDR'
    ) return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } catch {
    return null;
  }
}

const pngs = allFiles
  .filter((path) => extname(path).toLowerCase() === '.png')
  .map((path) => ({ path, dimensions: pngDimensions(path) }))
  .filter(({ dimensions }) => dimensions);
const catalogManifestPath = allFiles.find((path) => /catalog-manifest\.json$/i.test(rel(path)));
const catalogManifestValue = catalogManifestPath ? parseJson(catalogManifestPath).value : null;
const manifestScreenshotWidth = Number(catalogManifestValue?.requirements?.screenshots?.width);
const manifestScreenshotHeight = Number(catalogManifestValue?.requirements?.screenshots?.height);
const manifestScreenshotMinimum = Number(catalogManifestValue?.requirements?.screenshots?.minCount);
const screenshotMinimum = Number.isInteger(manifestScreenshotMinimum) && manifestScreenshotMinimum > 0
  ? manifestScreenshotMinimum
  : 3;
const screenshotTargets =
  Number.isInteger(manifestScreenshotWidth) && manifestScreenshotWidth > 0 &&
  Number.isInteger(manifestScreenshotHeight) && manifestScreenshotHeight > 0
    ? [[manifestScreenshotWidth, manifestScreenshotHeight]]
    : [[600, 1200], [1200, 600]];
const icons = pngs.filter(({ path, dimensions }) =>
  /icon/i.test(rel(path)) && dimensions.width === dimensions.height &&
  dimensions.width === 576,
);
const snippets = pngs.filter(({ path, dimensions }) =>
  /catalog-snippet/i.test(rel(path)) &&
  dimensions.width === 1120 && dimensions.height === 630,
);
const splashes = pngs.filter(({ path, dimensions }) =>
  /splash/i.test(rel(path)) &&
  [[1080, 1920], [1920, 1080]].some(([w, h]) => dimensions.width === w && dimensions.height === h),
);
const screenshots = pngs.filter(({ path, dimensions }) =>
  /screenshot/i.test(rel(path)) &&
  screenshotTargets.some(([w, h]) => dimensions.width === w && dimensions.height === h),
);

for (const [check, items, minimum, remediation] of [
  ['catalog-icon', icons, 1, 'Provide the mandatory readable 576×576 icon-576.png.'],
  ['catalog-snippet', snippets, 1, 'Provide catalog-snippet-1120x630.png from the real UI/icon and retain its source.'],
  ['splashscreen', splashes, 1, 'Provide a 1080×1920 or 1920×1080 PNG with splash in its name.'],
  ['catalog-screenshots', screenshots, screenshotMinimum, `Provide at least ${screenshotMinimum} consistent ${screenshotTargets.map(([w, h]) => `${w}×${h}`).join(' or ')} PNGs.`],
]) {
  add(
    'assets',
    items.length >= minimum ? 'ok' : release ? 'fail' : 'warn',
    check,
    `${items.length} recognized`,
    items.length >= minimum ? '' : remediation,
  );
}

if (screenshots.length >= 2) {
  const orientations = new Set(
    screenshots.map(({ dimensions }) => dimensions.width > dimensions.height ? 'landscape' : 'portrait'),
  );
  add(
    'assets',
    orientations.size === 1 ? 'ok' : 'fail',
    'screenshot-consistency',
    orientations.size === 1 ? [...orientations][0] : 'mixed orientations',
    'Use one catalog screenshot orientation.',
  );
}

const catalogText = docs.filter(({ path, text }) =>
  /catalog|listing|store-copy|каталог/i.test(rel(path)) ||
  /short description|краткое описание/i.test(text),
);
const catalogManifest = docs.filter(({ path, text }) =>
  /catalog-manifest\.json$/i.test(rel(path)) &&
  /"checkedAt"|"requirements"/.test(text),
);
const privacy = docs.filter(({ path, text }) =>
  /privacy|confidential|политик[аи] конфиденциальности/i.test(rel(path) + text),
);
const support = docs.filter(({ text }) =>
  /support|поддержк[аи]|contact|контакт/i.test(text),
);
for (const [check, items, remediation] of [
  ['catalog-copy', catalogText, 'Use vk-catalog-copy to create validated one-line copy based on shipped behavior.'],
  ['catalog-manifest', catalogManifest, 'Use vk-app-assets to create and run the common catalog preflight manifest.'],
  ['privacy-evidence', privacy, 'Document the actual data behavior and public policy location.'],
  ['support-contact', support, 'Record a current support/contact destination.'],
]) {
  add(
    'catalog',
    items.length ? 'ok' : release ? 'fail' : 'warn',
    check,
    items.length ? items.map(({ path }) => rel(path)).slice(0, 5).join(', ') : 'not found',
    items.length ? '' : remediation,
  );
}

const counts = findings.reduce(
  (acc, finding) => ({ ...acc, [finding.level]: acc[finding.level] + 1 }),
  { ok: 0, warn: 0, fail: 0 },
);

if (json) {
  console.log(JSON.stringify({ root, mode: release ? 'release' : 'development', counts, findings }, null, 2));
} else {
  for (const finding of findings) {
    const mark = finding.level === 'ok' ? '✓' : finding.level === 'warn' ? '⚠' : '✗';
    console.log(`${mark} [${finding.category}] ${finding.check}: ${finding.detail}`);
    if (finding.level !== 'ok' && finding.remediation) console.log(`  → ${finding.remediation}`);
  }
  console.log(`\n${findings.length} checks: ${counts.ok} ok, ${counts.warn} warning(s), ${counts.fail} failure(s)`);
}

process.exit(counts.fail > 0 || (strict && counts.warn > 0) ? 1 : 0);
