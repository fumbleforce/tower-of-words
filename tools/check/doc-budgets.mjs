// Byte ceilings for the docs and agent files every agent reads (limits in doc-budgets.json), and no dated
// provenance in them. A rule is stated as it stands; its history lives in git.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const RULE = 'state the rule; history lives in git';
const PROVENANCE = /J[øo]rgen\W{0,3}\d{4}-\d{2}-\d{2}/g;
const DATE = /\d{4}-\d{2}-\d{2}/g;

const isFile = file => fs.existsSync(file) && fs.statSync(file).isFile();
const isDirectory = dir => fs.existsSync(dir) && fs.statSync(dir).isDirectory();
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The files a pattern names. A '*' matches within one path segment, so "skills/*/SKILL.md" is one file per folder.
export function expandPattern(directory, pattern) {
  const found = pattern.split('/').reduce((bases, segment) => bases.flatMap(base => {
    if (!segment.includes('*')) return [path.posix.join(base, segment)];
    const dir = path.join(directory, base);
    if (!isDirectory(dir)) return [];
    const name = new RegExp(`^${segment.split('*').map(escapeRegExp).join('[^/]*')}$`);
    return fs.readdirSync(dir).filter(entry => name.test(entry)).map(entry => path.posix.join(base, entry));
  }), ['']);
  return found.filter(file => isFile(path.join(directory, file))).sort();
}

// Findings for one file: over its ceiling, or dated provenance. GUIDE.md may not carry any date.
export function fileFindings(file, data, limit) {
  const findings = [];
  if (data.length > limit) {
    findings.push(`${file} is ${data.length} bytes, over its ${limit}-byte limit; cut it or move detail into a `
      + 'linked doc; do not raise the limit');
  }
  const text = data.toString('utf8');
  const guide = file === 'GUIDE.md';
  for (const match of text.matchAll(guide ? DATE : PROVENANCE)) {
    const line = text.slice(0, match.index).split('\n').length;
    findings.push(`${file}:${line}: ${guide ? 'date' : 'dated provenance'} "${match[0]}"; ${RULE}`);
  }
  return findings;
}

export function checkDocBudgets(directory = root, budgets = readBudgets()) {
  const findings = [], limits = new Map();
  for (const [pattern, limit] of Object.entries(budgets.limits)) {
    assert(Number.isInteger(limit) && limit > 0, `${pattern}: a ceiling must be a positive whole number of bytes`);
    const files = expandPattern(directory, pattern);
    if (!files.length) findings.push(`${pattern} matches no file; remove its ceiling`);
    for (const file of files) limits.set(file, limit);
  }
  for (const [file, limit] of limits) {
    findings.push(...fileFindings(file, fs.readFileSync(path.join(directory, file)), limit));
  }
  return { findings, checked: limits.size };
}

export function readBudgets() {
  return JSON.parse(fs.readFileSync(new URL('./doc-budgets.json', import.meta.url), 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { findings, checked } = checkDocBudgets();
  if (findings.length) {
    console.error(findings.join('\n'));
    process.exitCode = 1;
  } else console.log(`doc budgets: ${checked} files within their byte ceilings; no dated provenance`);
}
