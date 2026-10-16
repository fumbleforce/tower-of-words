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
import { checkCommitAssets } from '../../../tools/check/commit-cpu.mjs';

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
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
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

const CATALOG = 'tools/assets/assets.json';
const catalogText = JSON.stringify({ assets: [{ id: 'portrait/example', kind: 'portrait', paths: ['art/example.webp'] }],
  counts: {}, kinds: { portrait: 'Portraits' }, statuses: ['approved'] });
test('generated catalog allows bounded metadata while retaining immutable-byte and ordinary file gates', t => {
  const { cwd, env, git, stage } = assetFixture(t);
  const text = catalogText + ' '.repeat(8 * 1024 * 1024 - Buffer.byteLength(catalogText));
  assert.equal(Buffer.byteLength(text), 8 * 1024 * 1024);
  const snapshot = stage(CATALOG, text);
  fs.writeFileSync(path.join(cwd, CATALOG), 'unrelated working copy');
  assert.deepEqual(checkStagedSyntax(cwd, { env }).failures, []);
  checkStagedAssets(cwd, snapshot, { env });
  for (const [bad, error] of [
    ['{}', /schema/], ['{', /JSON|property/i], [catalogText + '\0', /binary/],
    [Buffer.from([0xff, 0xfe]), /UTF-8/],
    [catalogText.replace('"paths":["art/example.webp"]', '"paths":[3]'), /entry/],
    ...['private/a.webp', 'a/private/b.webp', '../escape.webp', 'a/../b.webp', '/absolute.webp',
      '.git/a.webp', 'a\\b.webp', 'C:/a.webp', 'a//b.webp'].map(file => [
      catalogText.replace(JSON.stringify('art/example.webp'), JSON.stringify(file)), /Unsafe asset catalog path/]),
    ...['blocked-assets/a.webp', 'a-reward.webp'].map(file => [
      catalogText.replace(JSON.stringify('art/example.webp'), JSON.stringify(file)), /excluded asset catalog path/]),
    [text + ' ', /exceeds 8388608 bytes/],
  ]) assert.throws(() => checkStagedAssets(cwd, stage(CATALOG, bad), { env }), error);
  assert.match(checkStagedSyntax(cwd, { env }).failures.find(failure => failure.file === CATALOG)?.error, /exceeds 8388608 bytes/);
  stage(CATALOG, catalogText);
  assert.throws(() => checkStagedAssets(cwd, stage('ordinary.json', text), { env }), /text exceeds/);
  assert.match(checkStagedSyntax(cwd, { env }).failures.find(failure => failure.file === 'ordinary.json')?.error, /exceeds 2097152 bytes/);
  git('reset', '--quiet', 'HEAD', '--', 'ordinary.json');
});

// Size and picture rules. Files over max_text_kb are refused unless a large_allow folder (the shipping game assets)
// holds them, and then only up to LARGE_ALLOW_LIMIT. Pictures and video are refused under any shots folder.
test('large files stay out of git outside the shipping asset folders, with a one-line pointer to where they go', t => {
  const { cwd, env, git, stage } = assetFixture(t);
  fs.writeFileSync(path.join(cwd, 'tools/assets/sync.json'), JSON.stringify({
    binary_ext: ['png', 'mp4'], commit_allow: [], max_text_kb: 2048, large_allow: ['game3d/assets/', 'game3d/audio/'],
  }));
  git('add', '--', 'tools/assets/sync.json');
  const big = 'x'.repeat(3 * 1024 * 1024);
  let snapshot = stage('docs/notes.txt', big);
  assert.throws(() => checkStagedAssets(cwd, snapshot, { env }), error => {
    assert.match(error.message, /^docs\/notes\.txt: text exceeds the 2 MB staged limit;/);
    assert.equal(error.message.includes('\n'), false, 'one line');
    assert.match(error.message, /~\/\.cache\/amakawa\/<name>\//);
    return true;
  });
  git('reset', '--quiet', 'HEAD', '--', 'docs/notes.txt');
  snapshot = stage('game3d/assets/characters/big.json', big);
  checkStagedAssets(cwd, snapshot, { env });
  git('reset', '--quiet', 'HEAD', '--', 'game3d/assets/characters/big.json');
  snapshot = stage('game3d/assets/characters/huge.txt', 'x'.repeat(17 * 1024 * 1024));
  assert.throws(() => checkStagedAssets(cwd, snapshot, { env }), /huge\.txt: text exceeds the 16 MB staged limit/);
  git('reset', '--quiet', 'HEAD', '--', 'game3d/assets/characters/huge.txt');
  snapshot = stage('game3d/assets/characters/hidden.dat', `${big}\0`);
  assert.throws(() => checkStagedAssets(cwd, snapshot, { env }), /hidden\.dat: binary belongs/);
  git('reset', '--quiet', 'HEAD', '--', 'game3d/assets/characters/hidden.dat');
});

test('pictures and video are refused under any shots folder, and code or data in shots folders passes', t => {
  const { cwd, env, git, stage } = assetFixture(t);
  fs.writeFileSync(path.join(cwd, 'tools/assets/sync.json'), JSON.stringify({
    binary_ext: ['png'], commit_allow: [], max_text_kb: 2048, large_allow: ['game3d/assets/'],
  }));
  git('add', '--', 'tools/assets/sync.json');
  for (const file of ['game3d/shots/fast/frame.png', 'bible/shots/clip.mp4', 'shots/root.webp',
    'game3d/assets/shots/inside.jpg', 'art/parts/base/shots/render.svg']) {
    assert.throws(() => checkStagedAssets(cwd, stage(file, 'tiny'), { env }), error => {
      assert.ok(error.message.startsWith(`${file}: pictures and video stay out of git`), error.message);
      return true;
    });
    git('reset', '--quiet', 'HEAD', '--', file);
  }
  for (const file of ['game3d/opening/shots/index.js', 'art/parts/base/shots/source/attempts.json', 'docs/shots.md']) {
    checkStagedAssets(cwd, stage(file, 'tiny'), { env });
    git('reset', '--quiet', 'HEAD', '--', file);
  }
});

test('landing checks the asset policy on every commit, including commits made without hooks', t => {
  const { cwd, git } = assetFixture(t);
  fs.writeFileSync(path.join(cwd, 'tools/assets/sync.json'), JSON.stringify({
    binary_ext: ['png'], commit_allow: [], max_text_kb: 2048, large_allow: ['game3d/assets/'],
  }));
  git('add', '--', 'tools/assets/sync.json');
  git('commit', '--quiet', '--no-verify', '-m', 'policy');
  const base = git('rev-parse', 'HEAD').trim();
  const commitWith = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    fs.writeFileSync(path.join(cwd, file), text);
    git('add', '--', file);
    git('commit', '--quiet', '--no-verify', '-m', `add ${file}`);
    return git('rev-parse', 'HEAD').trim();
  };
  const shipping = commitWith('game3d/assets/ok.json', 'x'.repeat(3 * 1024 * 1024));
  const docs = commitWith('docs/big.txt', 'x'.repeat(3 * 1024 * 1024));
  const picture = commitWith('game3d/shots/job/frame.png', 'tiny');
  assert.deepEqual(checkCommitAssets(cwd, base, shipping).failures, []);
  const single = checkCommitAssets(cwd, undefined, docs);
  assert.equal(single.commits.length, 1);
  assert.match(single.failures[0], /docs\/big\.txt: text exceeds the 2 MB staged limit/);
  const range = checkCommitAssets(cwd, base, picture);
  assert.deepEqual(range.commits.length, 3);
  assert.equal(range.failures.length, 2);
  assert.match(range.failures[1], /game3d\/shots\/job\/frame\.png: pictures and video stay out of git/);
});
