import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { stagedSnapshot } from '../../../tools/lib/staged-tree.mjs';
import { checkStagedAssets } from '../../../tools/check/staged-assets.mjs';
import { checkFactsTrailer } from '../../../tools/check/commit-message.mjs';
import { checkStagedSyntax } from '../../../tools/check/staged.mjs';

test('binary gate uses staged policy/bytes and refuses private or nonregular entries', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-commit-gate-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const env = isolatedGitEnvironment();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8' });
  git('init', '--quiet'); git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
  fs.mkdirSync(path.join(cwd, 'tools/assets'), { recursive: true });
  const config = { binary_ext: ['png'], commit_allow: [], max_text_kb: 2 };
  const policy = path.join(cwd, 'tools/assets/sync.json');
  fs.writeFileSync(policy, JSON.stringify(config));
  fs.writeFileSync(path.join(cwd, 'data'), 'text\0binary');
  fs.writeFileSync(path.join(cwd, '.gitattributes'), 'data text\n');
  git('add', '--', 'tools/assets/sync.json', 'data', '.gitattributes');
  const snapshot = stagedSnapshot(cwd, { env });
  fs.writeFileSync(path.join(cwd, 'data'), 'working text');
  fs.writeFileSync(policy, JSON.stringify({ ...config, commit_allow: ['data'] }));
  assert.throws(() => checkStagedAssets(cwd, snapshot, { env }), /binary belongs/);
  git('add', '--', 'tools/assets/sync.json');
  checkStagedAssets(cwd, stagedSnapshot(cwd, { env }), { env });
  assert.throws(() => checkStagedAssets(cwd, { ...snapshot, changes: [
    { file: 'private/synthetic', status: 'A', mode: '100644' },
  ] }, { env }), /Private paths/);
  assert.throws(() => checkStagedAssets(cwd, { ...snapshot, changes: [
    { file: 'symlink', status: 'A', mode: '120000' },
  ] }, { env }), /Nonregular/);
});

test('Facts identifies a retained staged document and allows attribution trailers after it', () => {
  const snapshot = { changes: [{ file: 'docs/game/systems.md', status: 'M', mode: '100644' }] };
  checkFactsTrailer('Change\n\nFacts: docs/game/systems.md\nCo-Authored-By: Reviewer\nClaude-Session: fixture', snapshot);
  checkFactsTrailer('Change\n\nFacts: none', snapshot);
  for (const message of ['Change only', 'Facts:none', 'Facts: none\nFacts: none',
    'Facts: docs/game/missing.md', 'Facts: docs/game/../private.md']) {
    assert.throws(() => checkFactsTrailer(message, snapshot));
  }
  assert.throws(() => checkFactsTrailer('Facts: docs/game/systems.md', { changes: [
    { file: 'docs/game/systems.md', status: 'D', mode: '000000' },
  ] }));
});

const LOCK = 'tools/assets/assets.lock.json';
const lockRecord = { size: 42, sha256: 'a'.repeat(64), type: 'image/webp' };
const lockText = (files = { 'game3d/assets/example.webp': lockRecord }) => JSON.stringify({ about: 'Used public assets', files });
function assetFixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-lock-gate-')), env = isolatedGitEnvironment();
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8' });
  git('init', '--quiet'); git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
  fs.mkdirSync(path.join(cwd, 'tools/assets'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'tools/assets/sync.json'), JSON.stringify({
    binary_ext: ['png'], commit_allow: [], max_text_kb: 2, never: ['blocked-assets/', '*reward*'],
  }));
  git('add', '--', 'tools/assets/sync.json');
  const stage = (file, text) => {
    fs.writeFileSync(path.join(cwd, file), text);
    git('add', '--', file);
    return stagedSnapshot(cwd, { env });
  };
  return { cwd, env, git, stage };
}

test('generated lock over eight MiB passes both staged gates using immutable staged bytes', t => {
  const { cwd, env, stage } = assetFixture(t);
  const files = Object.fromEntries(Array.from({ length: 64000 }, (_, i) => [`game3d/assets/example-${i}.webp`, lockRecord]));
  const text = lockText(files);
  assert(Buffer.byteLength(text) > 8 * 1024 * 1024);
  const snapshot = stage(LOCK, text);
  fs.writeFileSync(path.join(cwd, LOCK), 'working copy is deliberately malformed');
  assert.deepEqual(checkStagedSyntax(cwd, { env }).failures, []);
  checkStagedAssets(cwd, snapshot, { env });
  const bad = stage(LOCK, lockText({ 'private/synthetic.webp': lockRecord }));
  fs.writeFileSync(path.join(cwd, LOCK), text);
  assert.throws(() => checkStagedAssets(cwd, bad, { env }), /Unsafe asset lock path/);
});

test('generated lock validates schema, public paths and every record without weakening policy', t => {
  const { cwd, env, stage } = assetFixture(t);
  const invalid = [
    ['{}', /schema/], ['[]', /schema/], ['{', /JSON|property/i],
    [lockText() + '\0', /binary/], [Buffer.from([0xff, 0xfe]), /UTF-8/],
    [JSON.stringify({ about: 'assets', files: [] }), /files/],
    [JSON.stringify({ about: 'x'.repeat(1025), files: {} }), /description/],
    [JSON.stringify({ about: 'assets', files: {}, extra: true }), /schema/],
    ...['/absolute.webp', '../escape.webp', 'a/../escape.webp', './a.webp', 'a//b.webp', '.git/a.webp',
      'a/private/b.webp', 'C:/a.webp', 'a\\b.webp', 'a\0b.webp', 'a/\ud800.webp', 'a/\udc00.webp'].map(file => [lockText({ [file]: lockRecord }), /Unsafe/]),
    ...[-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '42'].map(size => [lockText({ 'a.webp': { ...lockRecord, size } }), /size/]),
    [lockText({ 'a.webp': { ...lockRecord, sha256: 'wrong' } }), /sha256/],
    [lockText({ 'a.webp': { ...lockRecord, type: 'plain text' } }), /content type/],
    [lockText({ 'a.webp': { ...lockRecord, extra: true } }), /record/],
    [lockText({ 'a.webp': null }), /record/],
    [lockText({ 'blocked-assets/a.webp': lockRecord }), /excluded asset lock path/],
    [lockText({ 'a-reward.webp': lockRecord }), /excluded asset lock path/],
  ];
  for (const [text, error] of invalid) assert.throws(() => checkStagedAssets(cwd, stage(LOCK, text), { env }), error);
  checkStagedAssets(cwd, stage(LOCK, lockText()), { env });
  checkStagedAssets(cwd, stage(LOCK, lockText({ 'game3d/assets/木-🌲.webp': lockRecord })), { env });
});

test('generated lock has a hard sixteen MiB ceiling and other files retain their normal caps', t => {
  const { cwd, env, git, stage } = assetFixture(t);
  const oversized = lockText() + ' '.repeat(16 * 1024 * 1024);
  const snapshot = stage(LOCK, oversized);
  assert.throws(() => checkStagedAssets(cwd, snapshot, { env }), /exceeds 16777216 bytes/);
  assert.match(checkStagedSyntax(cwd, { env }).failures[0].error, /exceeds 16777216 bytes/);
  stage(LOCK, lockText());
  for (const [file, text, error] of [
    ['assets.lock.json', lockText() + ' '.repeat(3000), /text exceeds/],
    ['ordinary.txt', 'x'.repeat(3000), /text exceeds/],
    ['image.png', 'small text', /binary belongs/],
    ['binary.dat', 'text\0binary', /binary belongs/],
  ]) {
    assert.throws(() => checkStagedAssets(cwd, stage(file, text), { env }), error);
    git('reset', '--quiet', 'HEAD', '--', file);
  }
});
