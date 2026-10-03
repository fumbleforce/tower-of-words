// CPU-only refactor gates. Browser routes are an explicit separate command.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const unitTests = fs.readdirSync(path.join(root, 'game3d/test/unit'), { recursive: true })
  .filter(name => name.endsWith('.test.mjs')).sort().map(name => path.join('game3d/test/unit', name));
const checks = [
  ['robots', ['tools/check/robots.py'], 'python3'],
  ['syntax', ['tools/check/syntax.mjs']],
  ['lint', ['tools/check/lint.mjs']],
  ['runtime format', ['tools/check/format-runtime.mjs', '--check']],
  ['module budgets', ['tools/check/module-budgets.mjs']],
  ['dependencies', ['tools/check/dependencies.mjs']],
  ['unit', ['--test', ...unitTests]],
  ['choices', ['game3d/tools/choice-check.mjs']],
  ['story', ['game3d/tools/story-check.mjs']],
  ['day 2 story', ['game3d/tools/day2-story-check.mjs']],
  ['language', ['game3d/tools/lang-audit.mjs']],
  ['bonds', ['game3d/js/bonds/test.mjs']],
  ['facts', ['tools/facts/check.mjs']],
  ['story map', ['tools/bible/story-map-check.mjs']],
];
let failures = 0;
for (const [name, args, command = process.execPath] of checks) {
  const start = performance.now();
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 55000 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const pass = result.status === 0 && !result.error;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${((performance.now() - start) / 1000).toFixed(2)}s${result.error ? ` (${result.error.message})` : ''}`);
}
process.exitCode = failures ? 1 : 0;
