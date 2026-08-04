#!/usr/bin/env node
/**
 * Verify PNG catalog screenshots without relying on macOS `sips` or an image
 * library. This checks the physical PNG dimensions; it does not resize files.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join, resolve } from 'node:path';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function inspectPngDimensions(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a PNG file');
  }
  if (buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('PNG does not start with an IHDR chunk');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function positiveInteger(name, value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name} must be a positive integer`);
  return number;
}

export function verifyScreenshots({ dir, width = 600, height = 1200, minCount = 3, files = null }) {
  const root = resolve(dir);
  const selected = files
    ? files.map((file) => resolve(root, file))
    : readdirSync(root)
      .filter((file) => extname(file).toLowerCase() === '.png')
      .sort()
      .map((file) => join(root, file));
  const errors = [];

  if (selected.length < minCount) {
    errors.push(`only ${selected.length} PNG screenshot(s); minimum is ${minCount}`);
  }

  const report = selected.map((file) => {
    try {
      if (!existsSync(file) || !statSync(file).isFile()) throw new Error('file does not exist');
      if (extname(file).toLowerCase() !== '.png') throw new Error('screenshot must use the .png extension');
      const dimensions = inspectPngDimensions(file);
      if (dimensions.width !== width || dimensions.height !== height) {
        errors.push(`${file} is ${dimensions.width}x${dimensions.height}; expected ${width}x${height}`);
      }
      return { file, ...dimensions };
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
      return { file, error: error.message };
    }
  });

  if (errors.length) {
    const error = new Error(errors.join('\n'));
    error.report = { target: { width, height }, minCount, files: report, errors };
    throw error;
  }
  return { target: { width, height }, minCount, files: report };
}

const HELP = `Usage: node verify.mjs [options]

Verify physical PNG dimensions without resizing screenshots.

Options:
  --dir <dir>                 Screenshot directory (default: ./screenshots)
  --width <px>                Physical width (default: 600)
  --height <px>               Physical height (default: 1200)
  --min-count <number>        Minimum number of screenshots (default: 3)
  --files <a.png,b.png>       Verify these files in this display order
  --json                      Print a machine-readable report
  --help                      Show this help
`;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith('--')) continue;
    const body = token.slice(2);
    const separator = body.indexOf('=');
    const key = separator === -1 ? body : body.slice(0, separator);
    const inlineValue = separator === -1 ? undefined : body.slice(separator + 1);
    if (inlineValue !== undefined) args[key] = inlineValue;
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      args[key] = argv[index + 1];
      index += 1;
    } else args[key] = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const width = positiveInteger('--width', args.width, 600);
  const height = positiveInteger('--height', args.height, 1200);
  const minCount = positiveInteger('--min-count', args['min-count'], 3);
  const files = args.files ? String(args.files).split(',').map((file) => file.trim()).filter(Boolean) : null;
  const result = verifyScreenshots({
    dir: args.dir || './screenshots',
    width,
    height,
    minCount,
    files,
  });
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    for (const file of result.files) console.log(`[verify] ${file.file} -> ${file.width}x${file.height}`);
    console.log(`[verify] passed: ${result.files.length} PNG screenshot(s) at ${width}x${height}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[verify] failed:\n${error.message}`);
    process.exit(1);
  }
}
