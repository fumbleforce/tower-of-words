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
  ['private layout', ['tools/private_layout.py'], 'python3'],
  ['outputs prune', ['tools/outputs_test.py'], 'python3'],
  ['worktree links', ['-m', 'unittest', 'discover', '-s', 'tools/assets', '-p', 'test_worktree_links.py'], 'python3'],
  ['character recipes', ['tools/characters/check_recipes.py'], 'python3'],
  ['syntax', ['tools/check/syntax.mjs']],
  ['lint', ['tools/check/lint.mjs']],
  ['runtime format', ['tools/check/format-runtime.mjs', '--check']],
  ['module budgets', ['tools/check/module-budgets.mjs']],
  ['doc budgets', ['tools/check/doc-budgets.mjs']],
  ['layout', ['tools/check/layout.mjs']],
  ['dependencies', ['tools/check/dependencies.mjs']],
  ['unit', ['--test', ...unitTests]],
  ['choices', ['game3d/tools/choice-check.mjs']],
  ['story', ['game3d/tools/story-check.mjs']],
  ['day 2 story', ['game3d/tools/day2-story-check.mjs']],
  ['day 3 story', ['game3d/tools/day3-story-check.mjs']],
  ['voice manifest fresh', ['game3d/tools/voice-manifest.mjs', '--fresh']],
  ['language', ['game3d/tools/lang-audit.mjs']],
  ['blur', ['game3d/tools/blur-check.mjs']],
  ['bonds', ['game3d/js/bonds/test.mjs']],
  ['facts', ['tools/facts/check.mjs']],
  ['direct render', ['tools/facts/direct-render.mjs']],
  ['direct render test', ['--test', 'tools/facts/direct-render.test.mjs']],
  ['art scripts', ['tools/facts/art-scripts.mjs']],
  ['art scripts test', ['--test', 'tools/facts/art-scripts.test.mjs']],
  ['audio scripts', ['tools/audio/ratchet.py'], 'python3'],
  ['audio presets and refusals', ['tools/audio/test_audio.py'], 'python3'],
  ['story map', ['tools/bible/story-map-check.mjs']],
  ['public bible pictures', ['tools/bible/pages_test.py'], 'python3'],
  ['nav registry', ['tools/check/nav-registry.mjs']],
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
