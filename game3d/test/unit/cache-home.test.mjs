import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HELPER = fileURLToPath(new URL('../../../tools/lib/cachedir.py', import.meta.url));

function run(home, name) {
  return spawnSync('python3', [HELPER, name], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
}

test('tool state goes to ~/.cache/amakawa/<name>, created on first use, and never inside .git', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cache-home-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const first = run(home, 'pages-cache');
  assert.equal(first.status, 0, first.stderr);
  const expected = path.join(home, '.cache', 'amakawa', 'pages-cache');
  assert.equal(first.stdout.trim(), expected);
  assert.ok(fs.statSync(expected).isDirectory());
  assert.equal(run(home, 'codex-reviews').stdout.trim(), path.join(home, '.cache', 'amakawa', 'codex-reviews'));
  assert.equal(expected.split(path.sep).includes('.git'), false);
});

test('the helper refuses anything but a plain folder name', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cache-home-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  for (const name of ['', '..', '.', '.git', 'a/b', '../escape']) {
    const result = run(home, name);
    assert.notEqual(result.status, 0, `accepted ${JSON.stringify(name)}`);
  }
  assert.equal(fs.existsSync(path.join(home, '.cache', 'amakawa')), false);
});
