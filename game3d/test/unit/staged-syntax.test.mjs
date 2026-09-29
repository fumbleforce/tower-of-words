import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkStagedSyntax } from '../../../tools/check/staged.mjs';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';

test('staged syntax reads the index, checks each language, and leaves work untouched', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-staged-syntax-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8', env: isolatedGitEnvironment() });
  git('init', '--quiet');
  git('commit', '--allow-empty', '--quiet', '-m', 'fixture');
  const files = { 'a.js': 'export const a = ;', 'b.cjs': 'module.exports = {', 'c.json': '{',
    'd.py': 'if :\n', 'e.sh': 'if then\n', 'pre-commit': '#!/usr/bin/env python3.12\nif :\n',
    'start': '#!/usr/bin/env bash\nif then\n' };
  for (const [file, contents] of Object.entries(files)) fs.writeFileSync(path.join(root, file), contents);
  git('add', '--', ...Object.keys(files));
  for (const file of Object.keys(files)) fs.writeFileSync(path.join(root, file), '// fixed only in worktree');
  const before = git('status', '--porcelain=v1');
  const result = checkStagedSyntax(root, { env: isolatedGitEnvironment() });
  assert.deepEqual(result.failures.map(failure => failure.file), Object.keys(files));
  assert.match(result.failures.find(failure => failure.file === 'd.py').error, /<staged>\/d.py/);
  assert(!result.failures.find(failure => failure.file === 'd.py').error.includes('fixed only in worktree'));
  assert.equal(git('status', '--porcelain=v1'), before);
  for (const file of Object.keys(files)) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), '// fixed only in worktree');
  const valid = { 'a.js': 'export const a = 1;', 'b.cjs': 'module.exports = {};', 'c.json': '{}',
    'd.py': 'value = 1\n', 'e.sh': 'echo syntax-only\n', 'pre-commit': '#!/usr/bin/env python3.12\nvalue = 1\n',
    'start': '#!/usr/bin/env bash\necho syntax-only\n' };
  for (const [file, contents] of Object.entries(valid)) fs.writeFileSync(path.join(root, file), contents);
  git('add', '--', ...Object.keys(valid));
  const passed = checkStagedSyntax(root, { env: isolatedGitEnvironment() });
  assert.deepEqual(passed.failures, []);
  assert.equal(passed.checked.length, 7);
  // Asset policy is a separate gate. Syntax does not mistake executable assets for source.
  fs.writeFileSync(path.join(root, 'large'), Buffer.alloc(3 * 1024 * 1024, 0));
  fs.writeFileSync(path.join(root, 'asset.png'), Buffer.from([0, 1, 2]));
  fs.symlinkSync('missing', path.join(root, 'link'));
  git('add', 'large', 'asset.png', 'link');
  git('update-index', '--chmod=+x', 'asset.png');
  const assets = checkStagedSyntax(root, { env: isolatedGitEnvironment() });
  assert.deepEqual(assets.failures, []);
  assert.deepEqual(assets.checked, passed.checked);
});
