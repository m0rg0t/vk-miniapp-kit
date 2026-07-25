#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseArgs(argv) {
  const values = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }
    const key = value.slice(2);
    values[key] = argv[i + 1];
    i += 1;
  }
  return { values, positional };
}

export function countCharacters(value) {
  return Array.from(typeof value === 'string' ? value : '').length;
}

export function normalizePlainText(value) {
  return String(value ?? '')
    .replace(/\r\n?|\n/g, '; ')
    .replace(/(^|[.;]\s+)(?:[-*•]|\d+[.)])\s+/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s*;\s*/g, '; ')
    .replace(/(?:;\s*){2,}/g, '; ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validatePlainText(name, value, limit) {
  const errors = [];
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${name} is empty`);
  if (/[\r\n]/.test(value)) errors.push(`${name} contains a line break`);
  if (/(^|[.;]\s+)(?:[-*•]|\d+[.)])\s+/.test(value)) errors.push(`${name} contains a list marker`);
  if (/[*_`#>•]/.test(value) || /!?\[[^\]]+\]\([^)]+\)/.test(value)) {
    errors.push(`${name} contains Markdown formatting`);
  }
  if (/\p{Extended_Pictographic}/u.test(value)) errors.push(`${name} contains emoji`);
  const characters = countCharacters(value);
  if (characters > limit) errors.push(`${name} has ${characters} characters; limit is ${limit}`);
  return { errors, characters };
}

export function validateCopyDocument(document) {
  const requirements = document?.requirements ?? {};
  const descriptionLimit = Number(requirements.descriptionMaxCharacters);
  const shortLimit = Number(requirements.shortDescriptionMaxCharacters);
  const errors = [];

  if (!isDate(requirements.checkedAt)) {
    errors.push('requirements.checkedAt must be YYYY-MM-DD');
  }
  if (typeof requirements.source !== 'string' || requirements.source.trim() === '') {
    errors.push('requirements.source is required');
  }
  if (!Number.isInteger(descriptionLimit) || descriptionLimit < 1) {
    errors.push('requirements.descriptionMaxCharacters must be a positive integer');
  }
  if (!Number.isInteger(shortLimit) || shortLimit < 1) {
    errors.push('requirements.shortDescriptionMaxCharacters must be a positive integer');
  }

  const description = document?.description?.value;
  const shortDescription = document?.shortDescription?.value;
  const descriptionResult = validatePlainText('description', description, descriptionLimit);
  const shortResult = validatePlainText('shortDescription', shortDescription, shortLimit);
  errors.push(...descriptionResult.errors, ...shortResult.errors);

  if (document?.description?.characters !== descriptionResult.characters) {
    errors.push(`description.characters must equal ${descriptionResult.characters}`);
  }
  if (document?.shortDescription?.characters !== shortResult.characters) {
    errors.push(`shortDescription.characters must equal ${shortResult.characters}`);
  }

  return {
    errors,
    counts: {
      description: descriptionResult.characters,
      shortDescription: shortResult.characters,
    },
    limits: { description: descriptionLimit, shortDescription: shortLimit },
  };
}

function printPasteBlocks(document) {
  console.log(`Описание (${document.description.characters}/${document.requirements.descriptionMaxCharacters})`);
  console.log(document.description.value);
  console.log('');
  console.log(`Краткое описание (${document.shortDescription.characters}/${document.requirements.shortDescriptionMaxCharacters})`);
  console.log(document.shortDescription.value);
}

function fail(errors) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exitCode = 1;
}

export function run(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const { values, positional } = parseArgs(rest);

  if (command === 'prepare') {
    if (
      !values.input ||
      !values.out ||
      !values['checked-at'] ||
      !values['requirements-source'] ||
      !values['description-limit'] ||
      !values['short-limit']
    ) {
      throw new Error('prepare requires --input, --out, --checked-at, --requirements-source, --description-limit, and --short-limit');
    }
    const draft = JSON.parse(readFileSync(values.input, 'utf8'));
    const description = normalizePlainText(draft.description);
    const shortDescription = normalizePlainText(draft.shortDescription);
    const document = {
      requirements: {
        checkedAt: values['checked-at'],
        source: values['requirements-source'],
        descriptionMaxCharacters: Number(values['description-limit']),
        shortDescriptionMaxCharacters: Number(values['short-limit']),
      },
      description: { value: description, characters: countCharacters(description) },
      shortDescription: { value: shortDescription, characters: countCharacters(shortDescription) },
    };
    const result = validateCopyDocument(document);
    if (result.errors.length) {
      fail(result.errors);
      return;
    }
    mkdirSync(dirname(resolve(values.out)), { recursive: true });
    writeFileSync(values.out, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`✓ wrote ${values.out}`);
    printPasteBlocks(document);
    return;
  }

  if (command === 'validate') {
    const file = positional[0];
    if (!file) throw new Error('validate requires a catalog-copy.json path');
    const document = JSON.parse(readFileSync(file, 'utf8'));
    const result = validateCopyDocument(document);
    if (result.errors.length) {
      fail(result.errors);
      return;
    }
    console.log(`✓ catalog copy valid: description ${result.counts.description}/${result.limits.description}, short ${result.counts.shortDescription}/${result.limits.shortDescription}`);
    printPasteBlocks(document);
    return;
  }

  throw new Error('usage: catalog-copy.mjs prepare ... | validate <catalog-copy.json>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(2);
  }
}
