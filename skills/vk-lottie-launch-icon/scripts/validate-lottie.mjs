#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_FIELDS = ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers'];
const COMPATIBLE_SHAPE_TYPES = new Set(['gr', 'rc', 'el', 'sh', 'fl', 'st', 'tr']);

function arg(argv, name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function staticValue(property) {
  if (property === undefined || property === null) return undefined;
  if (typeof property === 'number' || typeof property === 'string') return property;
  if (Array.isArray(property)) return property;
  if (typeof property === 'object' && property.a !== 1 && property.k !== undefined) {
    return staticValue(property.k);
  }
  return undefined;
}

function numberValue(property, fallback) {
  const value = staticValue(property);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pairValue(property) {
  const value = staticValue(property);
  return Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every((n) => typeof n === 'number' && Number.isFinite(n))
    ? value.slice(0, 2)
    : undefined;
}

function multiplyScale(parent, child) {
  return [parent[0] * child[0], parent[1] * child[1]];
}

function normalizedScale(property) {
  const value = pairValue(property);
  if (!value) return [1, 1];
  return [value[0] / 100, value[1] / 100];
}

function collectGeometry(items, parentScale = [1, 1], output = []) {
  if (!Array.isArray(items)) return output;
  const groupTransform = items.find((item) => item?.ty === 'tr');
  const groupScale = groupTransform ? multiplyScale(parentScale, normalizedScale(groupTransform.s)) : parentScale;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    if (item.ty === 'gr') collectGeometry(item.it, groupScale, output);
    if (item.ty !== 'rc' && item.ty !== 'el') continue;
    const size = pairValue(item.s);
    if (!size) continue;
    output.push({
      width: Math.abs(size[0] * groupScale[0]),
      height: Math.abs(size[1] * groupScale[1]),
      type: item.ty,
    });
  }
  return output;
}

function hasOpaqueFill(items) {
  if (!Array.isArray(items)) return false;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    if (item.ty === 'gr' && hasOpaqueFill(item.it)) return true;
    if (item.ty !== 'fl' && item.ty !== 'gf') continue;
    const opacity = numberValue(item.o, 100);
    const colour = staticValue(item.c);
    const alpha = Array.isArray(colour) && colour.length >= 4 ? colour[3] : 1;
    if (opacity >= 95 && alpha >= 0.95) return true;
  }
  return false;
}

function layerOpacity(layer) {
  return numberValue(layer?.ks?.o, 100);
}

function layerOrderWarnings(data) {
  const layers = Array.isArray(data.layers) ? data.layers : [];
  if (layers.length < 2) return [];
  const top = layers[0];
  const label = top?.nm ? `"${top.nm}"` : 'layer 0';
  const warnings = [];

  if (top?.ty === 2) {
    warnings.push(`layer order: topmost ${label} is an image layer with content layers behind it; it may occlude the icon`);
  }

  if (top?.ty === 1 && Number(top.sw) >= data.w * 0.85 && Number(top.sh) >= data.h * 0.85 && layerOpacity(top) >= 95) {
    warnings.push(`layer order: topmost ${label} is an opaque solid covering nearly the canvas; move the background behind the icon layers`);
  }

  const geometries = collectGeometry(top?.shapes, normalizedScale(top?.ks?.s));
  const candidate = geometries.find((geometry) => (
    geometry.width >= data.w * 0.85 &&
    geometry.height >= data.h * 0.85
  ));
  if (candidate && hasOpaqueFill(top.shapes) && layerOpacity(top) >= 95) {
    const widthPercent = Math.round((candidate.width / data.w) * 100);
    const heightPercent = Math.round((candidate.height / data.h) * 100);
    warnings.push(`layer order: topmost ${label} contains an opaque ${candidate.type} at about ${widthPercent}%×${heightPercent}% of the canvas; it may cover later layers — keep the background last`);
  }
  return warnings;
}

function compatibilityWarnings(data) {
  const warnings = [];
  const seen = new Set();
  const add = (message) => {
    if (!seen.has(message)) {
      seen.add(message);
      warnings.push(message);
    }
  };

  const walkShapeItems = (items, path) => {
    if (!Array.isArray(items)) return;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item || typeof item !== 'object') continue;
      if (typeof item.ty === 'string' && !COMPATIBLE_SHAPE_TYPES.has(item.ty)) {
        add(`compatibility: ${path}[${index}] uses shape operator "${item.ty}" outside the compact default subset`);
      }
      if (item.ty === 'gr') walkShapeItems(item.it, `${path}[${index}].it`);
    }
  };

  if (Array.isArray(data.assets)) {
    for (const [index, asset] of data.assets.entries()) {
      if (asset && (asset.p || asset.u || asset.e)) {
        add(`compatibility: assets[${index}] contains an embedded or referenced image; prefer flat shape layers`);
      }
    }
  }

  for (const [index, layer] of (Array.isArray(data.layers) ? data.layers : []).entries()) {
    const path = `layers[${index}]`;
    if (layer?.ddd === 1) add(`compatibility: ${path} enables 3D`);
    if (Array.isArray(layer?.masksProperties) && layer.masksProperties.length) add(`compatibility: ${path} uses masks`);
    if (Array.isArray(layer?.ef) && layer.ef.length) add(`compatibility: ${path} uses effects`);
    if (layer?.tt !== undefined && layer.tt !== 0) add(`compatibility: ${path} uses a matte`);
    if (layer?.bm !== undefined && layer.bm !== 0) add(`compatibility: ${path} uses a non-normal blend mode`);
    if (layer?.ty === 4) walkShapeItems(layer.shapes, `${path}.shapes`);
  }

  const walkExpressions = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => walkExpressions(child, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (typeof node.x === 'string') add(`compatibility: ${path}.x contains an expression`);
    for (const [key, child] of Object.entries(node)) walkExpressions(child, `${path}.${key}`);
  };
  walkExpressions(data.layers, 'layers');
  return warnings;
}

function loopWarnings(data) {
  let animated = 0;
  const offenders = [];
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.a === 1 && Array.isArray(node.k) && node.k.length >= 2 && node.k[0]?.t !== undefined) {
      animated += 1;
      const first = node.k[0].s ?? node.k[0].e;
      const lastKeyframe = node.k.at(-1);
      const last = lastKeyframe?.s ?? lastKeyframe?.e ?? node.k.at(-2)?.e;
      if (first !== undefined && last !== undefined && !deepEqual(first, last)) {
        offenders.push(`${path} (start ${JSON.stringify(first)} ≠ end ${JSON.stringify(last)})`);
      }
    }
    for (const [key, child] of Object.entries(node)) walk(child, path ? `${path}.${key}` : key);
  };
  walk(data.layers, 'layers');
  const warnings = [];
  if (animated === 0) warnings.push('no animated properties found — is this actually animated?');
  if (offenders.length) {
    warnings.push(`loop seam: ${offenders.length} of ${animated} animated properties do NOT return to start`);
    warnings.push(...offenders.slice(0, 10));
  }
  return { animated, offenders, warnings };
}

export function inspectLottie(file, options = {}) {
  const bytes = statSync(file).size;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const errors = [];
  for (const key of REQUIRED_FIELDS) {
    if (data[key] === undefined) errors.push(`missing required field "${key}"`);
  }
  if (!Array.isArray(data.layers)) errors.push('layers must be an array');
  if (options.width !== undefined && data.w !== options.width) errors.push(`dimensions ${data.w}×${data.h} ≠ target ${options.width}×${options.height}`);
  if (options.height !== undefined && data.h !== options.height && data.w === options.width) errors.push(`dimensions ${data.w}×${data.h} ≠ target ${options.width}×${options.height}`);
  if (Number.isFinite(options.maxBytes) && bytes > options.maxBytes) errors.push(`size ${bytes} bytes exceeds ${options.maxBytes} byte budget`);
  if (typeof data.ip === 'number' && typeof data.op === 'number' && data.op <= data.ip) errors.push('op must be greater than ip');
  const loop = loopWarnings(data);
  return {
    data,
    bytes,
    errors,
    loop,
    layerOrderWarnings: layerOrderWarnings(data),
    compatibilityWarnings: compatibilityWarnings(data),
    width: data.w,
    height: data.h,
  };
}

export function run(argv = process.argv.slice(2)) {
  const file = argv[0];
  if (!file || file.startsWith('--')) {
    console.error('usage: validate-lottie.mjs <path.json> [--width 96] [--height 96] [--max-kb 24] [--strict-loop] [--strict-layer-order]');
    return 2;
  }
  const targetW = Number(arg(argv, 'width', 96));
  const targetH = Number(arg(argv, 'height', 96));
  const maxBytes = Number(arg(argv, 'max-kb', 24)) * 1024;
  const strictLoop = argv.includes('--strict-loop');
  const strictLayerOrder = argv.includes('--strict-layer-order');
  const strictCompatibility = argv.includes('--strict-compatible-subset');

  let result;
  try {
    result = inspectLottie(file, { width: targetW, height: targetH, maxBytes });
  } catch (error) {
    console.error(`✗ ${error.message}`);
    return 1;
  }

  const failures = [
    ...result.errors,
    ...(strictLoop ? result.loop.warnings : []),
    ...(strictLayerOrder ? result.layerOrderWarnings : []),
    ...(strictCompatibility ? result.compatibilityWarnings : []),
  ];

  if (result.bytes <= maxBytes) console.log(`✓ size ${(result.bytes / 1024).toFixed(1)} KB ≤ ${maxBytes / 1024} KB`);
  else console.error(`✗ size ${(result.bytes / 1024).toFixed(1)} KB exceeds ${maxBytes / 1024} KB budget`);
  console.log('✓ valid JSON');
  if (result.errors.every((error) => !error.startsWith('missing required field'))) console.log('✓ required fields present (v, fr, ip, op, w, h, layers)');
  if (result.width === targetW && result.height === targetH) console.log(`✓ dimensions ${result.width}×${result.height}`);
  else console.error(`✗ dimensions ${result.width}×${result.height} ≠ target ${targetW}×${targetH}`);
  const duration = typeof result.data.fr === 'number' && typeof result.data.ip === 'number' && typeof result.data.op === 'number'
    ? ((result.data.op - result.data.ip) / result.data.fr).toFixed(2)
    : '?';
  console.log(`  info: fr=${result.data.fr} ip=${result.data.ip} op=${result.data.op} (~${duration}s), layers=${Array.isArray(result.data.layers) ? result.data.layers.length : 0}`);

  for (const error of result.errors) console.error(`✗ ${error}`);
  if (result.loop.warnings.length) {
    for (const warning of result.loop.warnings) (strictLoop ? console.error : console.warn)(`${strictLoop ? '✗' : '⚠'} ${warning}`);
    if (!strictLoop && result.loop.offenders.length) console.warn('⚠ set the last keyframe value equal to the first so the loop is seamless');
  } else {
    console.log(`✓ seamless loop: all ${result.loop.animated} animated properties return to start`);
  }
  for (const warning of result.layerOrderWarnings) (strictLayerOrder ? console.error : console.warn)(`${strictLayerOrder ? '✗' : '⚠'} ${warning}`);
  for (const warning of result.compatibilityWarnings) (strictCompatibility ? console.error : console.warn)(`${strictCompatibility ? '✗' : '⚠'} ${warning}`);

  if (failures.length === 0) {
    console.log('✓ structural Lottie checks passed');
    return 0;
  }
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run();
}
