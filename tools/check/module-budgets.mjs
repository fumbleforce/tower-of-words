import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceFiles } from './source-files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const moduleSize = source => ({ lines: source.trimEnd().split('\n').length, bytes: Buffer.byteLength(source) });

export function checkBudgets(sizes, baseline) {
  const findings = [];
  assert.equal(baseline.defaultLines, 400, 'New runtime modules have a 400-line ceiling');
  for (const [file, size] of Object.entries(sizes)) {
    const limit = baseline.exceptions[file];
    if (!limit) {
      if (size.lines > baseline.defaultLines) findings.push(`${file}: ${size.lines} lines exceeds ${baseline.defaultLines}; needs a reviewed responsibility exception`);
      continue;
    }
    assert(limit.reason && limit.owner && limit.review, `${file}: exception must name reason, owner and review`);
    assert(Number.isInteger(limit.lines) && Number.isInteger(limit.bytes) && limit.lines > 400 && limit.bytes > 0, `${file}: invalid exception ceiling`);
    if (size.lines > limit.lines || size.bytes > limit.bytes)
      findings.push(`${file}: ${size.lines}/${limit.lines} lines, ${size.bytes}/${limit.bytes} bytes`);
    else if (size.lines <= baseline.defaultLines) findings.push(`${file}: now fits the default; remove its obsolete exception`);
    else if (size.lines < limit.lines || size.bytes < limit.bytes)
      findings.push(`${file}: lower the ceiling to its current ${size.lines} lines and ${size.bytes} bytes`);
  }
  for (const file of Object.keys(baseline.exceptions)) if (!Object.hasOwn(sizes, file)) findings.push(`${file}: stale budget for a removed module`);
  return findings;
}

export function runtimeSizes(directory = root) {
  return Object.fromEntries(sourceFiles(directory, ['game3d/js'])
    .map(file => [file, moduleSize(fs.readFileSync(path.join(directory, file), 'utf8'))]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sizes = runtimeSizes();
  if (process.argv.includes('--inventory')) console.log(JSON.stringify(sizes, null, 2));
  else {
    const baseline = JSON.parse(fs.readFileSync(new URL('./module-budgets.json', import.meta.url), 'utf8'));
    const failures = checkBudgets(sizes, baseline);
    assert(!failures.length, failures.join('\n'));
    console.log(`module budgets: ${Object.keys(sizes).length} runtime modules; ${Object.keys(baseline.exceptions).length} documented existing exceptions`);
  }
}
