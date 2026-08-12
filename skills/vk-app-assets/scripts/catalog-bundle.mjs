#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { preflight } from './catalog-preflight.mjs';

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    values[value.slice(2)] = argv[index + 1];
    index += 1;
  }
  return values;
}

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function assetPath(value) {
  return typeof value === 'string' ? value : value?.path;
}

function ensureEmptyOrMissing(directory) {
  if (!existsSync(directory)) return;
  if (!statSync(directory).isDirectory()) throw new Error(`output exists and is not a directory: ${directory}`);
  if (readdirSync(directory).length) throw new Error(`output directory is not empty: ${directory}`);
}

export function bundleCatalog(manifestFile, outputDirectory, options = {}) {
  const sourceManifest = resolve(manifestFile);
  const sourceBase = dirname(sourceManifest);
  const output = resolve(outputDirectory);
  const sourceRelativeToOutput = relative(sourceBase, output);
  if (!sourceRelativeToOutput || (!sourceRelativeToOutput.startsWith('..') && !isAbsolute(sourceRelativeToOutput))) {
    throw new Error('output directory must not be the source catalog directory or its child');
  }
  ensureEmptyOrMissing(output);
  mkdirSync(output, { recursive: true });

  const manifest = JSON.parse(readFileSync(sourceManifest, 'utf8'));
  if (options.appId !== undefined) manifest.appId = Number(options.appId);
  if (!Number.isInteger(manifest.appId) || manifest.appId < 1) {
    throw new Error('manifest appId is missing; set it or pass --app-id from vk-hosting-config.json');
  }

  const copied = new Map();
  const copyReference = (value, destination, label) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} path is empty`);
    if (isHttpUrl(value)) return value;
    const source = resolve(sourceBase, value);
    if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`${label} is missing: ${source}`);
    const portable = destination.replaceAll('\\', '/');
    const previous = copied.get(portable);
    if (previous && previous !== source) throw new Error(`two files collide at ${portable}: ${previous} and ${source}`);
    const target = join(output, portable);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    copied.set(portable, source);
    return portable;
  };

  if (!isHttpUrl(manifest.requirements?.source)) {
    manifest.requirements.source = copyReference(
      manifest.requirements?.source,
      `evidence/${basename(manifest.requirements?.source ?? '')}`,
      'requirements.source',
    );
  }

  const icon = manifest.assets?.icon;
  const originalIconPath = assetPath(icon);
  icon.path = copyReference(originalIconPath, 'icon-576.png', 'assets.icon.path');
  icon.source = copyReference(icon.source, `sources/${basename(icon.source ?? '')}`, 'assets.icon.source');

  const snippet = manifest.assets?.snippet;
  snippet.path = copyReference(assetPath(snippet), 'catalog-snippet-1120x630.png', 'assets.snippet.path');
  snippet.compositionSource = copyReference(
    snippet.compositionSource,
    `sources/${basename(snippet.compositionSource ?? '')}`,
    'assets.snippet.compositionSource',
  );
  const originalIconSource = resolve(sourceBase, snippet.iconSource ?? '');
  const originalIcon = resolve(sourceBase, originalIconPath ?? '');
  snippet.iconSource = originalIconSource === originalIcon
    ? icon.path
    : copyReference(snippet.iconSource, `sources/${basename(snippet.iconSource ?? '')}`, 'assets.snippet.iconSource');

  const screenshots = manifest.assets?.screenshots;
  if (!Array.isArray(screenshots)) throw new Error('assets.screenshots must be an array');
  const screenshotDestinations = new Map();
  manifest.assets.screenshots = screenshots.map((entry, index) => {
    const sourceValue = assetPath(entry);
    const destination = `screenshots/${String(index + 1).padStart(2, '0')}-${basename(sourceValue ?? '')}`;
    const portable = copyReference(sourceValue, destination, `assets.screenshots[${index}]`);
    screenshotDestinations.set(resolve(sourceBase, sourceValue), portable);
    return typeof entry === 'string' ? portable : { ...entry, path: portable };
  });
  const interfaceSource = resolve(sourceBase, snippet.interfaceSource ?? '');
  snippet.interfaceSource = screenshotDestinations.get(interfaceSource)
    ?? copyReference(snippet.interfaceSource, `sources/${basename(snippet.interfaceSource ?? '')}`, 'assets.snippet.interfaceSource');
  if (snippet.contentSources !== undefined) {
    if (!Array.isArray(snippet.contentSources)) throw new Error('assets.snippet.contentSources must be an array');
    snippet.contentSources = snippet.contentSources.map((source, index) => copyReference(
      source,
      `sources/content/${String(index + 1).padStart(2, '0')}-${basename(source ?? '')}`,
      `assets.snippet.contentSources[${index}]`,
    ));
  }

  const lottie = manifest.assets?.lottie;
  if (lottie?.path) {
    lottie.path = copyReference(lottie.path, 'icon-animation.json', 'assets.lottie.path');
  } else if (lottie?.required) {
    throw new Error('assets.lottie.required is true but path is empty');
  }

  manifest.copy.path = copyReference(manifest.copy?.path, 'catalog-copy.json', 'copy.path');
  const bundledCopyPath = join(output, manifest.copy.path);
  const bundledCopy = JSON.parse(readFileSync(bundledCopyPath, 'utf8'));
  bundledCopy.requirements = {
    ...(bundledCopy.requirements ?? {}),
    checkedAt: manifest.requirements.checkedAt,
    source: manifest.requirements.source,
  };
  writeFileSync(bundledCopyPath, `${JSON.stringify(bundledCopy, null, 2)}\n`);
  const bundledManifest = join(output, 'catalog-manifest.json');
  writeFileSync(bundledManifest, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = preflight(bundledManifest);
  return { manifest: bundledManifest, copied: [...copied.keys()], ...result };
}

export function run(argv = process.argv.slice(2)) {
  const values = parseArgs(argv);
  if (!values.manifest || !values.out) {
    throw new Error('usage: catalog-bundle.mjs --manifest release/catalog/catalog-manifest.json --out release/catalog-package [--app-id 123]');
  }
  const result = bundleCatalog(values.manifest, values.out, { appId: values['app-id'] });
  console.log(`✓ wrote portable catalog package: ${resolve(values.out)}`);
  console.log(`✓ copied ${result.copied.length} files; all manifest paths are package-relative`);
  for (const error of result.errors) console.error(`✗ ${error}`);
  if (!result.errors.length) console.log('✓ переносимый пакет готов');
  process.exitCode = result.errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(2);
  }
}
