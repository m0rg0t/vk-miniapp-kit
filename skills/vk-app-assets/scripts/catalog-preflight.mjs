#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function inspectPng(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a PNG file');
  }
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  let sawIhdr = false;
  const idat = [];
  let sawIend = false;
  let chunkIndex = 0;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const crcStart = dataStart + length;
    if (crcStart + 4 > buffer.length) throw new Error('truncated PNG chunk');
    const type = buffer.toString('ascii', typeStart, dataStart);
    const expectedCrc = buffer.readUInt32BE(crcStart);
    const actualCrc = crc32(buffer.subarray(typeStart, crcStart));
    if (actualCrc !== expectedCrc) throw new Error(`invalid PNG CRC in ${type}`);
    if (chunkIndex === 0 && type !== 'IHDR') throw new Error('PNG does not start with IHDR');
    if (type === 'IHDR') {
      if (sawIhdr) throw new Error('PNG has multiple IHDR chunks');
      if (length !== 13) throw new Error('invalid PNG IHDR length');
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
      interlace = buffer[dataStart + 12];
      sawIhdr = true;
    } else if (type === 'IDAT') {
      idat.push(buffer.subarray(dataStart, crcStart));
    } else if (type === 'IEND') {
      if (length !== 0) throw new Error('invalid PNG IEND length');
      sawIend = true;
      offset = crcStart + 4;
      break;
    }
    offset = crcStart + 4;
    chunkIndex += 1;
  }
  if (!width || !height) throw new Error('missing or invalid PNG IHDR');
  if (!idat.length) throw new Error('PNG has no IDAT data');
  if (!sawIend) throw new Error('PNG has no IEND chunk');
  if (offset !== buffer.length) throw new Error('PNG has trailing data after IEND');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const validDepths = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  }[colorType] ?? [];
  if (!channels || !validDepths.includes(bitDepth)) throw new Error('unsupported or invalid PNG color type/bit depth');
  if (![0, 1].includes(interlace)) throw new Error('invalid PNG interlace method');
  const passes = interlace === 0
    ? [[0, 0, 1, 1]]
    : [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
  const rows = [];
  let expectedBytes = 0;
  for (const [startX, startY, stepX, stepY] of passes) {
    const passWidth = width > startX ? Math.ceil((width - startX) / stepX) : 0;
    const passHeight = height > startY ? Math.ceil((height - startY) / stepY) : 0;
    if (!passWidth || !passHeight) continue;
    const rowBytes = Math.ceil((passWidth * channels * bitDepth) / 8);
    rows.push({ rowBytes, passHeight });
    expectedBytes += (rowBytes + 1) * passHeight;
  }
  try {
    const inflated = inflateSync(Buffer.concat(idat), { maxOutputLength: expectedBytes + 1 });
    if (inflated.length !== expectedBytes) {
      throw new Error(`decoded ${inflated.length} bytes; expected ${expectedBytes}`);
    }
    let rowOffset = 0;
    for (const { rowBytes, passHeight } of rows) {
      for (let row = 0; row < passHeight; row += 1) {
        if (inflated[rowOffset] > 4) throw new Error(`invalid PNG filter byte ${inflated[rowOffset]}`);
        rowOffset += rowBytes + 1;
      }
    }
  } catch (error) {
    throw new Error(`unreadable PNG image data: ${error.message}`);
  }
  return { format: 'png', width, height, bytes: buffer.length };
}

export function inspectJpeg(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('not a JPEG file');
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) throw new Error('truncated JPEG segment');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        format: 'jpeg',
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
        bytes: buffer.length,
      };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

export function inspectImage(file, pngOnly = false) {
  if (pngOnly || extname(file).toLowerCase() === '.png') return inspectPng(file);
  if (['.jpg', '.jpeg'].includes(extname(file).toLowerCase())) return inspectJpeg(file);
  throw new Error('unsupported image format; use PNG or JPEG');
}

function countCharacters(value) {
  return Array.from(value).length;
}

function validatePlainText(name, value, limit) {
  const errors = [];
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${name} is empty`);
  if (/[\r\n]/.test(value)) errors.push(`${name} contains a line break`);
  if (/(^|[.;]\s+)(?:[-*•]|\d+[.)])\s+/.test(value)) errors.push(`${name} contains a list marker`);
  if (/[*_`#>•]/.test(value) || /!?\[[^\]]+\]\([^)]+\)/.test(value)) errors.push(`${name} contains Markdown`);
  if (/\p{Extended_Pictographic}/u.test(value)) errors.push(`${name} contains emoji`);
  const characters = countCharacters(value ?? '');
  if (characters > limit) errors.push(`${name} has ${characters} characters; limit is ${limit}`);
  return { errors, characters };
}

export function inspectLottie(file, requirements) {
  const bytes = statSync(file).size;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const errors = [];
  for (const key of ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers']) {
    if (data[key] === undefined) errors.push(`missing required Lottie field ${key}`);
  }
  if (data.w !== requirements.width || data.h !== requirements.height) {
    errors.push(`Lottie is ${data.w}x${data.h}; expected ${requirements.width}x${requirements.height}`);
  }
  if (bytes > requirements.maxBytes) {
    errors.push(`Lottie is ${bytes} bytes; maximum is ${requirements.maxBytes}`);
  }
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
      const first = node.k[0].s;
      const last = node.k.at(-1).s ?? node.k.at(-2)?.e;
      if (first !== undefined && last !== undefined && JSON.stringify(first) !== JSON.stringify(last)) {
        offenders.push(path);
      }
    }
    for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`);
  };
  walk(data.layers, 'layers');
  if (animated === 0) errors.push('Lottie has no animated properties');
  if (offenders.length) errors.push(`Lottie loop is not seamless: ${offenders.join(', ')}`);
  return { errors, bytes, width: data.w, height: data.h, animated };
}

function absolute(base, value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('path is empty');
  return resolve(base, value);
}

function isPlaceholder(value) {
  return /^(?:todo|tbd|none|null|n\/a|https?:\/\/(?:(?:[^/]+\.)?example\.(?:com|org|net)|[^/]+\.invalid|localhost)|support@(?:example\.com|[^@]+\.invalid))/i.test(value.trim());
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isContact(value) {
  if (typeof value !== 'string' || !value.trim() || isPlaceholder(value)) return false;
  const trimmed = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  if (/^@[A-Za-z0-9_.-]{2,}$/.test(trimmed)) return true;
  if (/^\+?[\d\s()-]{7,}$/.test(trimmed)) return true;
  try {
    return ['http:', 'https:'].includes(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

export function preflight(manifestFile) {
  const manifestPath = resolve(manifestFile);
  const base = dirname(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const errors = [];
  const report = {
    manifest: manifestPath,
    requirements: null,
    sources: {},
    images: [],
    copy: null,
    lottie: null,
    links: manifest.links ?? {},
    contacts: manifest.contacts ?? {},
  };
  const requirements = manifest.requirements ?? {};
  report.requirements = {
    checkedAt: requirements.checkedAt,
    source: requirements.source,
  };

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!isDate(requirements.checkedAt)) {
    errors.push('requirements.checkedAt must be YYYY-MM-DD');
  }
  if (typeof requirements.source !== 'string' || !requirements.source.trim() || isPlaceholder(requirements.source)) {
    errors.push('requirements.source is required');
  } else {
    try {
      const sourceUrl = new URL(requirements.source);
      if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('non-HTTP URL');
    } catch {
      try {
        statSync(absolute(base, requirements.source));
      } catch (error) {
        errors.push(`requirements.source must be a current form URL or existing screenshot: ${error.message}`);
      }
    }
  }
  if (requirements.icon?.width !== 576 || requirements.icon?.height !== 576) {
    errors.push('requirements.icon must be exactly 576x576');
  }
  if (requirements.snippet?.width !== 1120 || requirements.snippet?.height !== 630) {
    errors.push('requirements.snippet must be exactly 1120x630');
  }
  if (requirements.lottie?.width !== 96 || requirements.lottie?.height !== 96) {
    errors.push('requirements.lottie must be exactly 96x96');
  }
  if (!Number.isInteger(requirements.lottie?.maxBytes) || requirements.lottie.maxBytes < 1) {
    errors.push('requirements.lottie.maxBytes must be a positive integer');
  }

  const checkImage = (label, entry, target, pngOnly, sizeBudget) => {
    try {
      const file = absolute(base, entry?.path ?? entry);
      const image = inspectImage(file, pngOnly);
      report.images.push({ label, path: file, ...image });
      if (image.width !== target?.width || image.height !== target?.height) {
        errors.push(`${label} is ${image.width}x${image.height}; expected ${target?.width}x${target?.height}`);
      }
      if (sizeBudget) {
        if (image.bytes < sizeBudget.minBytes) errors.push(`${label} is ${image.bytes} bytes; minimum is ${sizeBudget.minBytes}`);
        if (image.bytes > sizeBudget.maxBytes) errors.push(`${label} is ${image.bytes} bytes; maximum is ${sizeBudget.maxBytes}`);
      }
      return file;
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      return null;
    }
  };

  const icon = manifest.assets?.icon;
  const iconPath = checkImage('icon-576', icon, requirements.icon, true);
  if (iconPath && !iconPath.endsWith('icon-576.png')) errors.push('catalog icon filename must be icon-576.png');
  if (icon?.unroundedReviewed !== true) {
    errors.push('icon.unroundedReviewed must be true (leave outer corners unmasked; VK applies the catalog mask)');
  }
  try {
    const iconSource = absolute(base, icon?.source);
    statSync(iconSource);
    report.sources.iconMaster = iconSource;
    if (extname(iconSource).toLowerCase() !== '.svg') errors.push('icon source must be the retained master SVG');
    else if (!/<svg\b/i.test(readFileSync(iconSource, 'utf8'))) errors.push('icon source is not readable SVG content');
  } catch (error) {
    errors.push(`icon.source: ${error.message}`);
  }

  const snippet = manifest.assets?.snippet;
  const snippetRequirements = requirements.snippet ?? {};
  if (!Number.isInteger(snippetRequirements.minBytes) || snippetRequirements.minBytes < 1024) {
    errors.push('requirements.snippet.minBytes must be at least 1024');
  }
  if (!Number.isInteger(snippetRequirements.maxBytes) || snippetRequirements.maxBytes <= snippetRequirements.minBytes) {
    errors.push('requirements.snippet.maxBytes must exceed minBytes');
  }
  const snippetPath = checkImage('catalog snippet', snippet, snippetRequirements, true, snippetRequirements);
  if (snippetPath && !snippetPath.endsWith('catalog-snippet-1120x630.png')) {
    errors.push('catalog snippet filename must be catalog-snippet-1120x630.png');
  }
  const snippetSources = {};
  for (const field of ['compositionSource', 'iconSource', 'interfaceSource']) {
    try {
      const file = absolute(base, snippet?.[field]);
      statSync(file);
      snippetSources[field] = file;
      report.sources[`snippet${field[0].toUpperCase()}${field.slice(1)}`] = file;
    } catch (error) {
      errors.push(`snippet.${field}: ${error.message}`);
    }
  }
  if (snippetSources.compositionSource === snippetPath) errors.push('snippet composition source must differ from the rendered PNG');
  if (snippetSources.interfaceSource) {
    try {
      inspectImage(snippetSources.interfaceSource);
    } catch (error) {
      errors.push(`snippet.interfaceSource must be a readable PNG/JPEG: ${error.message}`);
    }
  }
  if (snippetSources.iconSource && snippetSources.iconSource !== iconPath) {
    errors.push('snippet.iconSource must reference the verified icon-576.png');
  }
  if (snippet?.unroundedReviewed !== true) {
    errors.push('snippet.unroundedReviewed must be true (leave the outer 1120x630 canvas rectangular)');
  }
  if (snippet?.realUiReviewed !== true) errors.push('snippet.realUiReviewed must be true');
  if (snippet?.privacyReviewed !== true) errors.push('snippet.privacyReviewed must be true');

  const screenshots = manifest.assets?.screenshots;
  if (!Array.isArray(screenshots)) {
    errors.push('assets.screenshots must be an array');
  } else {
    const minimum = requirements.screenshots?.minCount;
    if (!Number.isInteger(minimum) || minimum < 1) errors.push('requirements.screenshots.minCount must be positive');
    if (screenshots.length < minimum) errors.push(`only ${screenshots.length} screenshots; minimum is ${minimum}`);
    screenshots.forEach((entry, index) => {
      checkImage(`screenshot ${index + 1}`, entry, requirements.screenshots, false);
    });
  }

  const lottieEntry = manifest.assets?.lottie;
  if (lottieEntry?.required || lottieEntry?.path) {
    try {
      const file = absolute(base, lottieEntry.path);
      if (!lottieEntry.required) {
        try {
          statSync(file);
        } catch {
          report.lottie = { skipped: true };
          throw null;
        }
      }
      const result = inspectLottie(file, requirements.lottie ?? {});
      report.lottie = { path: file, ...result };
      errors.push(...result.errors.map((error) => `Lottie: ${error}`));
    } catch (error) {
      if (error) errors.push(`Lottie: ${error.message}`);
    }
  }

  try {
    const copyFile = absolute(base, manifest.copy?.path);
    const copy = JSON.parse(readFileSync(copyFile, 'utf8'));
    const copyRequirements = copy.requirements ?? {};
    if (copyRequirements.checkedAt !== requirements.checkedAt) {
      errors.push('copy requirements date does not match manifest requirements date');
    }
    if (copyRequirements.source !== requirements.source) {
      errors.push('copy requirements source does not match manifest requirements source');
    }
    if (!Number.isInteger(copyRequirements.descriptionMaxCharacters) || copyRequirements.descriptionMaxCharacters < 1) {
      errors.push('copy description limit must be a positive integer');
    }
    if (!Number.isInteger(copyRequirements.shortDescriptionMaxCharacters) || copyRequirements.shortDescriptionMaxCharacters < 1) {
      errors.push('copy short description limit must be a positive integer');
    }
    const description = validatePlainText('description', copy.description?.value, copyRequirements.descriptionMaxCharacters);
    const shortDescription = validatePlainText('shortDescription', copy.shortDescription?.value, copyRequirements.shortDescriptionMaxCharacters);
    errors.push(...description.errors, ...shortDescription.errors);
    if (copy.description?.characters !== description.characters) errors.push('description character count is stale');
    if (copy.shortDescription?.characters !== shortDescription.characters) errors.push('shortDescription character count is stale');
    report.copy = {
      path: copyFile,
      descriptionCharacters: description.characters,
      descriptionLimit: copyRequirements.descriptionMaxCharacters,
      shortDescriptionCharacters: shortDescription.characters,
      shortDescriptionLimit: copyRequirements.shortDescriptionMaxCharacters,
    };
  } catch (error) {
    errors.push(`copy: ${error.message}`);
  }

  for (const [key, value] of Object.entries(manifest.links ?? {})) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || isPlaceholder(value)) throw new Error('placeholder or non-HTTP URL');
    } catch (error) {
      errors.push(`links.${key} is invalid: ${error.message}`);
    }
  }
  if (!manifest.links?.privacyPolicy) errors.push('links.privacyPolicy is required');
  for (const [key, value] of Object.entries(manifest.contacts ?? {})) {
    if (!isContact(value)) errors.push(`contacts.${key} is unfilled or invalid`);
  }
  if (!manifest.contacts?.support) errors.push('contacts.support is required');

  return { errors, report };
}

export function run(argv = process.argv.slice(2)) {
  const manifest = argv[0] ?? 'release/catalog/catalog-manifest.json';
  const json = argv.includes('--json');
  const result = preflight(manifest);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✓ requirements checked ${result.report.requirements.checkedAt}: ${result.report.requirements.source}`);
    for (const [label, file] of Object.entries(result.report.sources)) {
      console.log(`✓ ${label}: ${file}`);
    }
    for (const image of result.report.images) {
      console.log(`✓ ${image.label}: ${image.path} (${image.width}x${image.height}, ${image.bytes} bytes, ${image.format})`);
    }
    if (result.report.copy) {
      console.log(`✓ copy: ${result.report.copy.path} (description ${result.report.copy.descriptionCharacters}/${result.report.copy.descriptionLimit}, short ${result.report.copy.shortDescriptionCharacters}/${result.report.copy.shortDescriptionLimit})`);
    }
    if (result.report.lottie?.path) {
      console.log(`✓ Lottie: ${result.report.lottie.path} (${result.report.lottie.width}x${result.report.lottie.height}, ${result.report.lottie.bytes} bytes)`);
    }
    for (const error of result.errors) console.error(`✗ ${error}`);
    if (result.errors.length === 0) console.log('✓ пакет готов');
  }
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
