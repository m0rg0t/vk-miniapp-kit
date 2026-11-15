#!/usr/bin/env node
/**
 * Rewrite a Lottie launch icon into the conservative, exporter-shaped form that the VK
 * uploader accepted (see references/lottie-format.md → "Upload form"). The picture and the
 * motion are not changed: only names, omitted default fields and float precision.
 *
 * usage: normalize-lottie.mjs <in.json> [--out <out.json>] [--name <ascii-name>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const isAscii = (value) => typeof value === 'string' && /^[\x20-\x7E]*$/.test(value);

function round(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value * 100) / 100;
    return Object.is(rounded, -0) ? 0 : rounded;
  }
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = round(value[key]);
  }
  return value;
}

function setDefault(target, key, value) {
  if (target[key] === undefined) target[key] = value;
}

function normalizeShape(item) {
  if (!item || typeof item !== 'object') return;
  if (!isAscii(item.nm)) item.nm = String(item.ty ?? 'shape');
  setDefault(item, 'hd', false);
  switch (item.ty) {
    case 'fl':
      setDefault(item, 'o', { a: 0, k: 100 });
      setDefault(item, 'r', 1);
      setDefault(item, 'bm', 0);
      break;
    case 'st':
      setDefault(item, 'o', { a: 0, k: 100 });
      setDefault(item, 'lc', 2);
      setDefault(item, 'lj', 2);
      setDefault(item, 'ml', 4);
      setDefault(item, 'bm', 0);
      break;
    case 'el':
      setDefault(item, 'p', { a: 0, k: [0, 0] });
      setDefault(item, 'd', 1);
      break;
    case 'rc':
      setDefault(item, 'p', { a: 0, k: [0, 0] });
      setDefault(item, 'r', { a: 0, k: 0 });
      setDefault(item, 'd', 1);
      break;
    case 'tr':
      setDefault(item, 'p', { a: 0, k: [0, 0] });
      setDefault(item, 'a', { a: 0, k: [0, 0] });
      setDefault(item, 's', { a: 0, k: [100, 100] });
      setDefault(item, 'r', { a: 0, k: 0 });
      setDefault(item, 'o', { a: 0, k: 100 });
      setDefault(item, 'sk', { a: 0, k: 0 });
      setDefault(item, 'sa', { a: 0, k: 0 });
      break;
    case 'gr':
      if (Array.isArray(item.it)) {
        item.it.forEach(normalizeShape);
        item.np = item.it.filter((child) => child?.ty !== 'tr').length;
      }
      break;
    default:
      break;
  }
}

/** Returns a new, normalized animation object. */
export function normalizeLottie(input, options = {}) {
  const data = round(structuredClone(input));
  data.nm = options.name ?? (isAscii(data.nm) && data.nm ? data.nm : 'launch-icon');
  setDefault(data, 'ddd', 0);
  if (!Array.isArray(data.assets)) data.assets = [];
  if (!Array.isArray(data.markers)) data.markers = [];
  (Array.isArray(data.layers) ? data.layers : []).forEach((layer, index) => {
    if (!layer || typeof layer !== 'object') return;
    if (!isAscii(layer.nm) || !layer.nm) layer.nm = `layer ${index + 1}`;
    layer.ddd = 0;
    setDefault(layer, 'ind', index + 1);
    setDefault(layer, 'sr', 1);
    setDefault(layer, 'ao', 0);
    setDefault(layer, 'ip', data.ip);
    setDefault(layer, 'op', data.op);
    setDefault(layer, 'st', 0);
    setDefault(layer, 'bm', 0);
    if (Array.isArray(layer.shapes)) layer.shapes.forEach(normalizeShape);
  });
  return data;
}

/** ASCII-only compact JSON: any remaining non-ASCII character is written as \uXXXX. */
export function stringifyAscii(data) {
  return JSON.stringify(data).replace(/[^\x00-\x7F]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function run(argv = process.argv.slice(2)) {
  const file = argv[0];
  if (!file || file.startsWith('--')) {
    console.error('usage: normalize-lottie.mjs <in.json> [--out <out.json>] [--name <ascii-name>]');
    return 2;
  }
  const flag = (name) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const out = flag('out') ?? file;
  const name = flag('name');
  if (name !== undefined && !isAscii(name)) {
    console.error('✗ --name must be ASCII');
    return 2;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`✗ ${error.message}`);
    return 1;
  }
  const text = stringifyAscii(normalizeLottie(data, { name }));
  writeFileSync(out, text);
  console.log(`✓ wrote ${out} (${Buffer.byteLength(text)} bytes, ASCII-only)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run();
}
