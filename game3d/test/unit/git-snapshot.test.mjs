import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { publicTree, withGitSnapshot } from '../../../tools/lib/git-snapshot.mjs';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { stagedSnapshot, readStagedFile, readStagedPrefix } from '../../../tools/lib/staged-tree.mjs';

test('private subtrees are excluded before their tree objects are requested', () => {
  const root = 'a'.repeat(40), hidden = 'b'.repeat(40), blob = 'c'.repeat(40), read = [];
  const entries = publicTree('.', root, { readTree: oid => {
    read.push(oid); assert.equal(oid, root, 'must not descend into private tree');
    return `040000 tree ${hidden}       -\tprivate\0` + `100644 blob ${blob}       3\ttext.txt\0`;
  } });
  assert.deepEqual(read, [root]);
  assert.deepEqual(entries, [{ file: 'text.txt', mode: '100644', oid: blob, bytes: 3 }]);
});

test('replacement refs cannot change staged identities or materialized bytes in either Git object format', async t => {
  for (const format of ['sha1', 'sha256']) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-snapshot-replace-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const env = isolatedGitEnvironment();
    const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      '-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, env, encoding: 'utf8' }).trim();
    git('init', '--quiet', `--object-format=${format}`);
    git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
    fs.writeFileSync(path.join(root, 'file.txt'), 'original');
    git('add', '--', 'file.txt');
    const snapshot = stagedSnapshot(root, { env }), blob = snapshot.changes[0].oid;
    fs.writeFileSync(path.join(root, 'replacement'), 'replaced');
    const replacement = git('hash-object', '-w', 'replacement');
    git('replace', blob, replacement);
    fs.writeFileSync(path.join(root, 'file.txt'), 'new tree');
    git('add', '--', 'file.txt');
    const replacementTree = git('write-tree');
    git('replace', snapshot.tree, replacementTree);
    git('update-index', '--cacheinfo', `100644,${blob},file.txt`);
    assert.deepEqual(stagedSnapshot(root, { env }), snapshot);
    assert.equal(readStagedFile(root, snapshot, 'file.txt', { env }).toString(), 'original');
    assert.equal(readStagedPrefix(root, snapshot, 'file.txt', { env }).toString(), 'original');
    await withGitSnapshot(root, snapshot.tree, async ({ directory, env: cleanEnv }) => {
      assert.equal(fs.readFileSync(path.join(directory, 'file.txt'), 'utf8'), 'original');
      assert.equal(execFileSync('git', ['show', ':file.txt'], { cwd: directory, env: cleanEnv, encoding: 'utf8' }), 'original');
    }, { env });
  }
});

test('snapshot copies exact staged bytes and modes with isolated tracked metadata, then cleans up', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-snapshot-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = isolatedGitEnvironment();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, env, encoding: 'utf8' });
  git('init', '--quiet'); git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
  const file = 'space and\nnewline.js', source = 'export const staged = 1;\n';
  fs.writeFileSync(path.join(root, file), source);
  fs.writeFileSync(path.join(root, 'binary'), Buffer.alloc(1024 * 1024, 123));
  git('add', '--', file, 'binary'); git('update-index', '--chmod=+x', '--', file);
  const snapshot = stagedSnapshot(root, { env });
  fs.writeFileSync(path.join(root, file), 'unstaged invalid code');
  const index = fs.readFileSync(path.join(root, '.git/index'));
  let workspace;
  await assert.rejects(withGitSnapshot(root, snapshot.tree, async ({ directory, env: childEnv }) => {
    workspace = directory;
    assert.equal(fs.readFileSync(path.join(directory, file), 'utf8'), source);
    assert(fs.statSync(path.join(directory, file)).mode & 0o100);
    assert.equal(fs.statSync(path.join(directory, 'binary')).size, 1024 * 1024);
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: directory, env: childEnv, encoding: 'utf8' }).split('\0');
    assert.deepEqual(files, ['binary', file, '']);
    fs.writeFileSync(path.join(directory, file), 'changed in isolated test');
    throw new Error('fixture failure');
  }, { env }), /fixture failure/);
  assert(!fs.existsSync(workspace));
  assert.deepEqual(fs.readFileSync(path.join(root, '.git/index')), index);
  assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), 'unstaged invalid code');
});
