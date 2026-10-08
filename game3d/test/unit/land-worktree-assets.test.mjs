import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';

test('landing verifies task asset copies while preserving unrelated main asset changes', t => {
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
  const asset = 'art/used.bin', locked = 'locked task bytes';
  write(main, '.gitignore', '*.bin\n');
  write(main, 'tools/assets/assets.lock.json', JSON.stringify({ files: {
    [asset]: { sha256: crypto.createHash('sha256').update(locked).digest('hex') },
  } }));
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
  git(main, 'add', '.gitignore', 'tools');
  git(main, 'commit', '--quiet', '-m', 'fixture');
  const original = git(main, 'rev-parse', 'HEAD');
  git(main, 'worktree', 'add', '--quiet', '-b', 'task', task);
  write(task, 'notes/change.md', 'Candidate documentation.\n');
  git(task, 'add', 'notes/change.md');
  git(task, 'commit', '--quiet', '-m', 'candidate');
  const candidate = git(task, 'rev-parse', 'HEAD');
  write(main, asset, 'unrelated main changes');
  write(task, asset, 'unverified task bytes');
  const land = () => execFileSync('bash', [path.join(main, 'tools/land.sh'), 'task'], {
    cwd: main, env, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.throws(land, error => /locked assets are missing here or differ/.test(String(error.stderr)));
  assert.equal(git(main, 'rev-parse', 'HEAD'), original);
  write(task, asset, locked);
  assert.match(land(), /main is now/);
  assert.equal(git(main, 'rev-parse', 'HEAD'), candidate);
  assert.equal(fs.readFileSync(path.join(main, asset), 'utf8'), 'unrelated main changes');
  assert.equal(fs.readFileSync(path.join(main, 'notes/change.md'), 'utf8'), 'Candidate documentation.\n');
  assert(!fs.existsSync(env.LAND_TEST_LOCK));
});
