import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';

test('sanitized subprocesses cannot stage files into a parent hook index', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-git-env-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const clean = isolatedGitEnvironment();
  const git = (cwd, args, env = clean) => execFileSync('git', args, { cwd, env, encoding: 'utf8' });
  const parent = path.join(root, 'parent'), child = path.join(root, 'child');
  for (const directory of [parent, child]) {
    fs.mkdirSync(directory);
    git(directory, ['init', '--quiet']);
    fs.writeFileSync(path.join(directory, 'base.txt'), 'fixture');
    git(directory, ['add', 'base.txt']);
  }
  const index = path.join(parent, '.git/index'), before = fs.readFileSync(index);
  const inherited = { ...clean, GIT_INDEX_FILE: index, GIT_DIR: path.join(parent, '.git'),
    GIT_WORK_TREE: parent, GIT_COMMON_DIR: path.join(parent, '.git'),
    GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/fixture',
    TASK_SETTING: 'preserved' };
  const env = isolatedGitEnvironment(inherited);
  assert.equal(env.TASK_SETTING, 'preserved');
  for (const key of ['GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR',
    'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0']) assert.equal(env[key], undefined);
  fs.writeFileSync(path.join(child, 'child-only.txt'), 'new');
  git(child, ['add', 'child-only.txt'], env);
  assert.deepEqual(fs.readFileSync(index), before);
  assert.equal(git(parent, ['ls-files']), 'base.txt\n');
  assert.equal(git(child, ['ls-files']), 'base.txt\nchild-only.txt\n');
});
