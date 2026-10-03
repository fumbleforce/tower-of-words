import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { stagedSnapshot as snapshot, readStagedFile as readFile, assertSnapshotCurrent as assertCurrent,
  reapInterruptedIndexes } from '../../../tools/lib/staged-tree.mjs';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';

const stagedSnapshot = cwd => snapshot(cwd, { env: isolatedGitEnvironment() });
const readStagedFile = (cwd, data, file, options = {}) => readFile(cwd, data, file, { ...options, env: isolatedGitEnvironment() });
const assertSnapshotCurrent = (cwd, data) => assertCurrent(cwd, data, { env: isolatedGitEnvironment() });

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-staged-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8', env: isolatedGitEnvironment() });
  git('init', '--quiet');
  git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  return { root, git, write };
}

test('staged contents and review digest ignore unstaged edits but detect index changes', t => {
  const { root, git, write } = repository(t);
  write('a.js', 'export const staged = 1;');
  git('add', 'a.js');
  const snapshot = stagedSnapshot(root);
  write('a.js', 'export const unstaged = 2;');
  assert.equal(readStagedFile(root, snapshot, 'a.js').toString(), 'export const staged = 1;');
  assert.equal(stagedSnapshot(root).diffHash, snapshot.diffHash);
  assertSnapshotCurrent(root, snapshot);
  git('add', 'a.js');
  assert.notEqual(stagedSnapshot(root).diffHash, snapshot.diffHash);
  assert.throws(() => assertSnapshotCurrent(root, snapshot), /Index changed/);
  // A captured object remains readable even after the shared index changes.
  assert.equal(readStagedFile(root, snapshot, 'a.js').toString(), 'export const staged = 1;');
});

test('raw Git records preserve unusual filenames, deletions and mode changes', t => {
  const { root, git, write } = repository(t);
  const file = 'space and\nnewline.js';
  write(file, 'console.log(1);');
  git('add', '--', file);
  assert.equal(stagedSnapshot(root).changes[0].file, file);
  git('commit', '--quiet', '-m', 'file');
  git('update-index', '--chmod=+x', '--', file);
  const executable = stagedSnapshot(root);
  assert.equal(executable.changes[0].mode, '100755');
  git('rm', '-f', '--', file);
  const deleted = stagedSnapshot(root);
  assert.equal(deleted.changes[0].status, 'D');
  assert.notEqual(deleted.diffHash, executable.diffHash);
  assert.throws(() => readStagedFile(root, deleted, file), /No staged file/);
});

test('private paths, symlinks and oversized staged objects fail closed', t => {
  const { root, git, write } = repository(t);
  write('private/fixture.txt', 'synthetic fixture');
  git('add', 'private/fixture.txt');
  assert.throws(() => stagedSnapshot(root), /refuse private/);
  git('reset', '--quiet');
  fs.symlinkSync('missing.js', path.join(root, 'link.js'));
  write('large.txt', '123456789');
  git('add', 'link.js', 'large.txt');
  const snapshot = stagedSnapshot(root);
  assert.throws(() => readStagedFile(root, snapshot, 'link.js'), /regular file/);
  assert.throws(() => readStagedFile(root, snapshot, 'large.txt', { maxBytes: 4 }), /exceeds 4 bytes/);
});

test('snapshot leaves a stale shared index untouched even while another writer holds its lock', t => {
  const { root, git, write } = repository(t);
  write('a.js', 'export const a = 1;');
  git('add', 'a.js');
  const index = path.join(root, '.git/index'), lock = `${index}.lock`;
  const before = fs.readFileSync(index), stat = fs.statSync(index, { bigint: true });
  fs.writeFileSync(lock, 'another writer');
  const snapshot = stagedSnapshot(root);
  assert.equal(readStagedFile(root, snapshot, 'a.js').toString(), 'export const a = 1;');
  assertSnapshotCurrent(root, snapshot);
  assert.deepEqual(fs.readFileSync(index), before);
  assert.equal(fs.statSync(index, { bigint: true }).mtimeNs, stat.mtimeNs);
  assert.equal(fs.readFileSync(lock, 'utf8'), 'another writer');
});

test('snapshot respects alternate and split indexes', t => {
  const { root, git, write } = repository(t);
  write('a.js', 'export const a = 1;');
  git('add', 'a.js');
  git('update-index', '--split-index');
  for (let i = 0; i < 30; i++) write(`extra-${i}.txt`, 'fixture');
  git('-c', 'splitIndex.maxPercentChange=100', 'add', '--', ...Array.from({ length: 30 }, (_, i) => `extra-${i}.txt`));
  const shared = () => fs.readdirSync(path.join(root, '.git')).filter(name => name.startsWith('sharedindex.')).sort();
  const beforeShared = shared();
  assert.equal(stagedSnapshot(root).changes[0].file, 'a.js');
  assert.deepEqual(shared(), beforeShared, 'snapshot must not create orphan shared indexes');
  git('reset', '--quiet', '--', ...Array.from({ length: 30 }, (_, i) => `extra-${i}.txt`));
  const alternate = path.join(root, '.git/alternate-index');
  fs.copyFileSync(path.join(root, '.git/index'), alternate);
  write('b.js', 'export const b = 2;');
  git('add', 'b.js');
  const module = new URL('../../../tools/lib/staged-tree.mjs', import.meta.url).href;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { stagedSnapshot } from ${JSON.stringify(module)}; console.log(JSON.stringify(stagedSnapshot(process.cwd())));`],
  { cwd: root, encoding: 'utf8', env: { ...isolatedGitEnvironment(), GIT_INDEX_FILE: alternate } });
  assert.deepEqual(JSON.parse(output).changes.map(change => change.file), ['a.js']);
  assert.deepEqual(stagedSnapshot(root).changes.map(change => change.file), ['a.js', 'b.js']);
});

test('interrupted-index cleanup only removes old directories owned by dead processes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-index-reap-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  // This child has exited, so its PID has authoritative terminal evidence.
  const dead = Number(execFileSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8' }).trim());
  const entries = [`codex-check-index-${dead}-old`, `codex-check-index-${dead}-new`,
    `codex-check-index-${process.pid}-live`, 'unrelated'];
  const now = Date.now(), old = new Date(now - 700000);
  for (const entry of entries) {
    const location = path.join(root, entry);
    fs.mkdirSync(location);
    fs.writeFileSync(path.join(location, 'index'), 'fixture');
    if (!entry.endsWith('-new')) fs.utimesSync(location, old, old);
  }
  fs.symlinkSync(path.join(root, 'unrelated'), path.join(root, `codex-check-index-${dead}-link`));
  reapInterruptedIndexes(root, now);
  assert(!fs.existsSync(path.join(root, entries[0])));
  for (const entry of entries.slice(1)) assert(fs.existsSync(path.join(root, entry)));
  assert(fs.lstatSync(path.join(root, `codex-check-index-${dead}-link`)).isSymbolicLink());
});
