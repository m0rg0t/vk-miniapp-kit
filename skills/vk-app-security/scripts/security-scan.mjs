#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const args = new Set(process.argv.slice(2));
const allowed = new Set(['--strict', '--json']);
const unknown = [...args].filter((arg) => !allowed.has(arg));
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  process.exit(2);
}

const root = process.cwd();
const strict = args.has('--strict');
const json = args.has('--json');
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.env']);
const findings = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (extensions.has(extname(path)) || entry.name.startsWith('.env')) files.push(path);
  }
  return files;
}

const files = walk(root).map((path) => ({
  path,
  relative: relative(root, path),
  text: (() => {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return '';
    }
  })(),
}));

const addMatches = (id, severity, pattern, message, remediation, filter = () => true) => {
  for (const file of files.filter(filter)) {
    const lines = file.text.split(/\r?\n/);
    lines.forEach((line, index) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        findings.push({
          id,
          severity,
          file: file.relative,
          line: index + 1,
          message,
          remediation,
        });
      }
    });
  }
};

const isSource = ({ path }) => ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(path));
const isClient = ({ relative: path }) =>
  /(?:^|\/)(?:src|client|frontend|app)(?:\/|$)/i.test(path) &&
  !/(?:server|api|backend|functions?|middleware)/i.test(path);

addMatches(
  'client-secret-env',
  'high',
  /\b(?:VITE_|REACT_APP_|NEXT_PUBLIC_)[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY)\b/,
  'A secret-like value is exposed through a browser-public environment prefix.',
  'Move the credential to backend/CI secret storage and rotate it if deployed.',
);
addMatches(
  'hardcoded-secure-key',
  'high',
  /\b(?:app_?secret|secure_?key|service_?token)\b\s*[:=]\s*['"][^'"]{8,}['"]/i,
  'A secret-like credential appears hardcoded.',
  'Remove it from source/history, rotate it, and load it from server secrets.',
);
addMatches(
  'token-in-url',
  'high',
  /(?:https?:\/\/|[?&])(?:access_token|token|sign)=/i,
  'A token or signature appears in a URL.',
  'Send credentials in an appropriate protected header/body and redact URLs.',
);
addMatches(
  'insecure-http',
  'medium',
  /http:\/\/(?!localhost(?::\d+)?(?:\/|['"]))/i,
  'A non-local HTTP URL can expose or modify traffic.',
  'Use HTTPS and validate redirects/fetch targets.',
);
for (const file of files.filter(isSource)) {
  const lines = file.text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/(?:origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*)/i.test(line)) {
      return;
    }
    const withCredentials =
      /credentials\s*:\s*true|Access-Control-Allow-Credentials['"]?\s*[:,]\s*true/i.test(file.text);
    findings.push({
      id: 'wildcard-cors',
      severity: withCredentials ? 'high' : 'medium',
      file: file.relative,
      line: index + 1,
      message: withCredentials
        ? 'Wildcard CORS is combined with credentialed requests.'
        : 'Wildcard CORS is present; confirm the endpoint is intentionally public and credentialless.',
      remediation: withCredentials
        ? 'Allow-list deployed origins before enabling credentials.'
        : 'Allow-list origins if this endpoint handles private or future credentialed data.',
    });
  });
}
addMatches(
  'unsafe-html',
  'medium',
  /\b(?:dangerouslySetInnerHTML|innerHTML\s*=|eval\s*\(|new Function\s*\()/,
  'Dynamic HTML or code execution needs an explicit sanitization review.',
  'Prefer text/components; otherwise sanitize with an appropriate allow-list.',
  isSource,
);
addMatches(
  'sensitive-logging',
  'medium',
  /\bconsole\.(?:log|info|debug|error)\s*\([^)]*(?:location\.search|access_token|secure_?key|phone_number|email|sign\b)/i,
  'A log statement may capture credentials, launch data, or personal data.',
  'Log a redacted event identifier instead of raw values.',
  isSource,
);

const backendFiles = files.filter(({ relative: path }) =>
  /(?:server|api|backend|functions?|middleware)/i.test(path),
);
const hasBackendVerifier = backendFiles.some(({ text }) =>
  /verifyVkLaunchParams|timingSafeEqual|createHmac\s*\(\s*['"]sha256|verifyLaunch/i.test(text),
);
if (!hasBackendVerifier) {
  const identityFile = backendFiles.find(({ text }) => /\bvk_user_id\b/.test(text));
  if (identityFile) {
    findings.push({
      id: 'unverified-launch-identity',
      severity: 'high',
      file: identityFile.relative,
      line: identityFile.text
        .slice(0, identityFile.text.search(/\bvk_user_id\b/))
        .split(/\r?\n/).length,
      message: 'Backend code uses vk_user_id but no launch-signature verifier is evident in the backend.',
      remediation: 'Verify signed launch params, app ID, and timestamp in authentication middleware before creating a session.',
    });
  }
}

for (const file of files.filter(isClient)) {
  if (/verifyVkLaunchParams|createHmac\s*\(\s*['"]sha256/.test(file.text)) {
    findings.push({
      id: 'client-launch-verifier',
      severity: 'high',
      file: file.relative,
      line: 1,
      message: 'Launch signature verification appears in browser-side code.',
      remediation: 'Move verification and the secure key to backend-only code.',
    });
  }
}

const severityRank = { high: 0, medium: 1, low: 2 };
findings.sort(
  (a, b) =>
    severityRank[a.severity] - severityRank[b.severity] ||
    a.file.localeCompare(b.file) ||
    a.line - b.line,
);
const counts = findings.reduce(
  (acc, finding) => ({ ...acc, [finding.severity]: acc[finding.severity] + 1 }),
  { high: 0, medium: 0, low: 0 },
);

if (json) {
  console.log(JSON.stringify({ root, counts, findings }, null, 2));
} else if (!findings.length) {
  console.log('✓ No high-confidence VK Mini App security patterns found.');
} else {
  for (const finding of findings) {
    console.log(`${finding.severity.toUpperCase()} ${finding.id} ${finding.file}:${finding.line}`);
    console.log(`  ${finding.message}`);
    console.log(`  → ${finding.remediation}`);
  }
  console.log(`\n${findings.length} finding(s): ${counts.high} high, ${counts.medium} medium, ${counts.low} low`);
}

process.exit(counts.high > 0 || (strict && counts.medium + counts.low > 0) ? 1 : 0);
