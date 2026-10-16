import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { ROOT, ensureGenerated, generatedOutputs, trackedGenerated } from '../../../tools/lib/generated.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, env: isolatedGitEnvironment(), encoding: 'utf8', stdio: 'pipe' });

test('every generated output has a builder that exists and a git-ignore rule', () => {
  const outputs = generatedOutputs(ROOT);
  const paths = outputs.map(o => o.path);
  assert.ok(paths.length > 0);
  assert.equal(new Set(paths).size, paths.length, 'an output is listed twice in tools/generated.json');
  for (const { path: file, builder } of outputs) {
    assert.ok(fs.existsSync(path.join(ROOT, builder[1])), `builder for ${file} is missing: ${builder[1]}`);
    git(ROOT, 'check-ignore', '--no-index', '-q', '--', file);  // exits non-zero, and throws, when no rule ignores it
  }
});

test('git tracks no generated output in this checkout', () => {
  const tracked = trackedGenerated(ROOT);
  if (tracked === null) return;  // no git here, so nothing can be tracked
  assert.deepEqual(tracked, [],
    `git tracks generated outputs; untrack them with git rm --cached, the tools rebuild them: ${tracked.join(', ')}`);
});

test('a builder runs once for the missing outputs it writes, and a tracked output is reported', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-outputs-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'tools'));
  fs.writeFileSync(path.join(dir, 'tools/generated.json'), JSON.stringify({ outputs: [
    { path: 'out/a.json', builder: ['python3', 'tools/build.py'] },
    { path: 'out/b.json', builder: ['python3', 'tools/build.py'] },
  ] }));
  fs.writeFileSync(path.join(dir, 'tools/build.py'), [
    'import os',
    "os.makedirs('out', exist_ok=True)",
    "open('runs.txt', 'a').write('run\\n')",
    "for name in ('a', 'b'): open(f'out/{name}.json', 'w').write('{}')",
  ].join('\n'));
  assert.deepEqual(ensureGenerated(undefined, dir), ['out/a.json', 'out/b.json']);
  assert.equal(fs.readFileSync(path.join(dir, 'runs.txt'), 'utf8'), 'run\n');
  assert.deepEqual(ensureGenerated(undefined, dir), []);
  git(dir, 'init', '--quiet');
  assert.deepEqual(trackedGenerated(dir), []);
  git(dir, 'add', '--', 'out/a.json');
  assert.deepEqual(trackedGenerated(dir), ['out/a.json']);
});
