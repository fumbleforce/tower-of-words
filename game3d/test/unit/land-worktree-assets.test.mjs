import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { checkStagedCpu } from '../../../tools/check/staged-cpu.mjs';
import { materializeLandedAssets } from '../../../tools/check/landed-assets.mjs';

const LOCK = 'tools/assets/assets.lock.json', ASSET = 'art/used.bin';
const record = text => ({ sha256: crypto.createHash('sha256').update(text).digest('hex') });

function fixture(t, initial = { [ASSET]: 'old locked bytes' }) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'land-assets-fixture-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const main = path.join(base, 'main'), task = path.join(base, 'task');
  fs.mkdirSync(main);
  const env = { ...isolatedGitEnvironment(), LAND_TEST_LOCK: path.join(base, 'land.lock'), LAND_WAIT: '0' };
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (root, file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  git(main, 'init', '--quiet', '-b', 'main');
  git(main, 'config', 'user.name', 'Fixture');
  git(main, 'config', 'user.email', 'fixture@example.invalid');
  git(main, 'config', 'core.hooksPath', '/dev/null');
  const script = fs.readFileSync(new URL('../../../tools/land.sh', import.meta.url), 'utf8');
  // A fixture must never acquire the operational repository's landing lock.
  assert(script.includes('LOCK=/tmp/claude-1000/land.lock'));
  write(main, 'tools/land.sh', script.replace('LOCK=/tmp/claude-1000/land.lock', 'LOCK="$LAND_TEST_LOCK"'));
  write(main, 'tools/check/landed-assets.mjs', fs.readFileSync(new URL('../../../tools/check/landed-assets.mjs', import.meta.url), 'utf8'));
  const lock = (root, files) => write(root, LOCK, JSON.stringify({ files: Object.fromEntries(
    Object.entries(files).map(([file, text]) => [file, record(text)]),
  ) }));
  write(main, '.gitignore', '*.bin\n');
  lock(main, initial);
  // The next real staged CPU check has no dependencies or network work in this fixture.
  write(main, 'package.json', JSON.stringify({ name: 'land-fixture', version: '1.0.0', scripts: { check: 'node verify.cjs' } }));
  write(main, 'package-lock.json', JSON.stringify({ name: 'land-fixture', version: '1.0.0', lockfileVersion: 3,
    packages: { '': { name: 'land-fixture', version: '1.0.0' } } }));
  write(main, 'verify.cjs', `
    const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
    for (const [file, entry] of Object.entries(JSON.parse(fs.readFileSync('${LOCK}')).files))
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), entry.sha256);
  `);
  // Keep the real hash-verifying materializer; avoid unrelated npm/browser work in this shell regression.
  const materializer = new URL('../../../tools/check/locked-assets.mjs', import.meta.url).href;
  write(main, 'tools/check/commit-cpu.mjs', `
    import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
    import { materializeLockedAssets } from ${JSON.stringify(materializer)};
    const snapshot = fs.mkdtempSync(path.join(os.tmpdir(), 'land-asset-snapshot-'));
    try {
      fs.mkdirSync(path.join(snapshot, 'tools/assets'), { recursive: true });
      fs.copyFileSync('tools/assets/assets.lock.json', path.join(snapshot, 'tools/assets/assets.lock.json'));
      materializeLockedAssets(process.cwd(), snapshot);
      console.log('commit CPU: PASS; fixture asset verification');
    } finally { fs.rmSync(snapshot, { recursive: true, force: true }); }
  `);
  git(main, 'add', '.gitignore', 'tools', 'package.json', 'package-lock.json', 'verify.cjs');
  git(main, 'commit', '--quiet', '-m', 'fixture');
  const original = git(main, 'rev-parse', 'HEAD');
  git(main, 'worktree', 'add', '--quiet', '-b', 'task', task);
  const commit = (files = initial) => {
    lock(task, files);
    write(task, 'notes/change.md', 'Candidate documentation.\n');
    git(task, 'add', LOCK, 'notes/change.md');
    git(task, 'commit', '--quiet', '-m', 'candidate');
    return git(task, 'rev-parse', 'HEAD');
  };
  const land = () => execFileSync('bash', [path.join(main, 'tools/land.sh'), 'task'], {
    cwd: main, env, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { base, main, task, env, git, write, lock, commit, land, original };
}

test('landing verifies task copies and fails loudly after landing if main has unrelated asset changes', t => {
  const { main, task, env, git, write, commit, land, original } = fixture(t);
  const candidate = commit();
  write(main, ASSET, 'unrelated main changes');
  write(task, ASSET, 'unverified task bytes');
  assert.throws(land, error => /locked assets are missing here or differ/.test(String(error.stderr)));
  assert.equal(git(main, 'rev-parse', 'HEAD'), original);
  write(task, ASSET, 'old locked bytes');
  assert.throws(land, error => /Preserved unrelated changed asset/.test(String(error.stderr))
    && /main already holds/.test(String(error.stderr)) && /Kept .*task/.test(String(error.stderr)));
  assert.equal(git(main, 'rev-parse', 'HEAD'), candidate);
  assert.equal(fs.readFileSync(path.join(main, ASSET), 'utf8'), 'unrelated main changes');
  assert.equal(fs.readFileSync(path.join(main, 'notes/change.md'), 'utf8'), 'Candidate documentation.\n');
  assert(fs.existsSync(task));
  assert.equal(git(main, 'rev-parse', 'task'), candidate);
  assert(!fs.existsSync(env.LAND_TEST_LOCK));
});

test('new, missing and changed locked bytes survive source removal and the next staged CPU check', async t => {
  const missing = 'art/missing.bin', added = 'art/new.bin';
  const initial = { [ASSET]: 'old locked bytes', [missing]: 'missing old bytes' };
  const { main, task, git, write, commit, land, env } = fixture(t, initial);
  const files = { ...initial, [ASSET]: 'new locked bytes', [added]: 'new asset bytes' };
  write(main, ASSET, initial[ASSET]);
  // Match worktree.sh's read-only store links, including links to assets new to the lock.
  for (const [file, text] of Object.entries(files)) {
    const stored = `.claude/worktrees/.assets/${path.basename(file)}`;
    write(main, stored, text);
    fs.chmodSync(path.join(main, stored), 0o444);
    fs.mkdirSync(path.dirname(path.join(task, file)), { recursive: true });
    fs.symlinkSync(path.join(main, stored), path.join(task, file));
  }
  const candidate = commit(files);
  assert.match(land(), /copied 3 asset\(s\)/);
  assert.equal(git(main, 'rev-parse', 'HEAD'), candidate);
  assert(!fs.existsSync(task), 'successful handoff permits source cleanup');
  for (const [file, text] of Object.entries(files)) {
    assert.equal(fs.readFileSync(path.join(main, file), 'utf8'), text);
    assert(!fs.lstatSync(path.join(main, file)).isSymbolicLink());
    assert(fs.statSync(path.join(main, file)).mode & 0o200, 'main copies remain writable');
  }
  write(main, 'notes/next.md', 'The next independent commit.\n');
  git(main, 'add', 'notes/next.md');
  await checkStagedCpu(main, { env, stdio: 'pipe', timeoutMs: 30000 });
});

test('a temporary source is kept when post-land asset verification fails', t => {
  const { main, task, git, write, commit, land } = fixture(t);
  write(main, ASSET, 'another task is editing this');
  // This test targets cleanup after the FF, so the fixture commit gate deliberately does no asset work.
  write(task, 'tools/check/commit-cpu.mjs', "console.log('commit CPU: PASS; cleanup fixture');\n");
  git(task, 'add', 'tools/check/commit-cpu.mjs');
  const candidate = commit();
  git(main, 'worktree', 'remove', '--force', task);
  assert.throws(land, error => /main already holds/.test(String(error.stderr)));
  assert.equal(git(main, 'rev-parse', 'HEAD'), candidate);
  assert(fs.existsSync(path.join(main, '.claude/worktrees/land-task/.git')));
  assert.equal(fs.readFileSync(path.join(main, ASSET), 'utf8'), 'another task is editing this');
});

test('handoff verifies immutable locks and refuses mismatched task bytes without modifying main', t => {
  const { main, task, write, commit, original } = fixture(t);
  write(main, ASSET, 'old locked bytes');
  write(task, ASSET, 'wrong task bytes');
  const candidate = commit({ [ASSET]: 'new locked bytes' });
  // A concurrent working lock edit cannot authorize the wrong bytes.
  write(main, LOCK, JSON.stringify({ files: { [ASSET]: record('wrong task bytes') } }));
  assert.throws(() => materializeLandedAssets(main, task, original, candidate), /Task asset differs/);
  assert.equal(fs.readFileSync(path.join(main, ASSET), 'utf8'), 'old locked bytes');
});

test('handoff does not overwrite a new asset path already owned by another task', t => {
  const { main, task, write, commit, original } = fixture(t, {});
  const candidate = commit({ [ASSET]: 'locked bytes' });
  write(task, ASSET, 'locked bytes');
  write(main, ASSET, 'unrelated new bytes');
  assert.throws(() => materializeLandedAssets(main, task, original, candidate), /Preserved unrelated changed asset/);
  assert.equal(fs.readFileSync(path.join(main, ASSET), 'utf8'), 'unrelated new bytes');
});

test('handoff refuses linked destinations and sources outside the checkouts', t => {
  const { base, main, task, write, commit, original } = fixture(t);
  const candidate = commit();
  write(base, 'outside/used.bin', 'old locked bytes');
  fs.symlinkSync(path.join(base, 'outside'), path.join(main, 'art'));
  assert.throws(() => materializeLandedAssets(main, task, original, candidate), /linked destination/);
  fs.unlinkSync(path.join(main, 'art'));
  fs.mkdirSync(path.join(task, 'art'));
  fs.symlinkSync(path.join(base, 'outside/used.bin'), path.join(task, ASSET));
  assert.throws(() => materializeLandedAssets(main, task, original, candidate), /outside the checkouts/);
  assert.equal(fs.readFileSync(path.join(base, 'outside/used.bin'), 'utf8'), 'old locked bytes');
});
