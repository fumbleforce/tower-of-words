import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkAssetSync, materializeLockedAssets } from '../../../tools/check/locked-assets.mjs';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';

const LOCK = 'tools/assets/assets.lock.json', ASSET = 'game3d/assets/a.bin';
const env = isolatedGitEnvironment();

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'locked-assets-fixture-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const main = path.join(base, 'main'), snapshot = path.join(base, 'snapshot');
  fs.mkdirSync(main); fs.mkdirSync(path.join(snapshot, 'tools/assets'), { recursive: true });
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8' });
  git(main, 'init', '--quiet'); git(main, 'commit', '--quiet', '--allow-empty', '-m', 'fixture');
  const write = (root, file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
  const lock = text => write(snapshot, LOCK, JSON.stringify({ files: { [ASSET]: { sha256: crypto.createHash('sha256').update(text).digest('hex') } } }));
  return { base, main, snapshot, git, write, lock };
}

test('a lock file changed but left unstaged fails the asset sync check', t => {
  const { main, git, write } = fixture(t);
  write(main, LOCK, '{"files": {}}\n');
  git(main, 'add', LOCK);
  write(main, LOCK, '{"files": {"game3d/assets/new.bin": {}}}\n');
  assert.throws(() => checkAssetSync(main, { env }), /differs from the staged copy; stage it/);
});

test('a locked asset that links outside the checkouts is refused before it is read', t => {
  const { base, main, snapshot, write, lock } = fixture(t);
  write(base, 'outside/sentinel.bin', 'outside');
  fs.mkdirSync(path.join(main, 'game3d/assets'), { recursive: true });
  fs.symlinkSync(path.join(base, 'outside/sentinel.bin'), path.join(main, ASSET));
  lock('outside');
  assert.throws(() => materializeLockedAssets(main, snapshot, { env }), /resolves outside the checkouts/);
  assert(!fs.existsSync(path.join(snapshot, ASSET)));
});

test('a worktree asset linked into the main checkout is copied', t => {
  const { base, main, snapshot, git, write, lock } = fixture(t);
  const worktree = path.join(base, 'worktree');
  git(main, 'worktree', 'add', '--quiet', '--detach', worktree);
  write(main, ASSET, 'main copy');
  fs.mkdirSync(path.join(worktree, 'game3d/assets'), { recursive: true });
  fs.symlinkSync(path.join(main, ASSET), path.join(worktree, ASSET));
  lock('main copy');
  assert.equal(materializeLockedAssets(worktree, snapshot, { env }), 1);
  assert.equal(fs.readFileSync(path.join(snapshot, ASSET), 'utf8'), 'main copy');
  assert(!fs.lstatSync(path.join(snapshot, ASSET)).isSymbolicLink());
});
