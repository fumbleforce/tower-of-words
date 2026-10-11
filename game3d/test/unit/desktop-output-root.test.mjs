import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mainCheckoutRoot } from '../../../tools/lib/git-snapshot.mjs';

const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe', env });

test('desktop output root is the main checkout from main and from a worktree', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'outroot-')));
  try {
    const main = path.join(dir, 'main'), tree = path.join(dir, 'tree');
    fs.mkdirSync(main);
    git(main, 'init', '-q');
    git(main, 'commit', '-q', '--allow-empty', '-m', 'x');
    git(main, 'worktree', 'add', '-q', tree);
    assert.equal(mainCheckoutRoot(main), main);
    assert.equal(mainCheckoutRoot(tree), main);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
