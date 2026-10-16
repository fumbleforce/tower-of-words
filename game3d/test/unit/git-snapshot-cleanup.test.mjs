import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { withGitSnapshot } from '../../../tools/lib/git-snapshot.mjs';

const MODULE = fileURLToPath(new URL('../../../tools/lib/git-snapshot.mjs', import.meta.url));
const SIGNALS = ['SIGINT', 'SIGTERM'];

function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-snapshot-clean-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const env = isolatedGitEnvironment();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8' }).trim();
  git('init', '--quiet');
  fs.writeFileSync(path.join(cwd, 'file.txt'), 'text');
  git('add', '--', 'file.txt');
  git('commit', '--quiet', '-m', 'fixture');
  return { cwd, env, tree: git('rev-parse', 'HEAD^{tree}'), base: path.join(cwd, '.git', 'snapshots') };
}

test('a new run removes snapshots of processes that are gone, and keeps live and foreign folders', async t => {
  const { cwd, env, tree, base } = fixture(t);
  const dead = spawnSync(process.execPath, ['-e', '']).pid; // exited, so no longer running
  const stale = path.join(base, `git-snapshot-${dead}-abc123`);
  const live = path.join(base, `git-snapshot-${process.pid}-live01`);
  const foreign = path.join(base, 'other-tool');
  for (const folder of [stale, live, foreign]) {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'leftover'), 'x');
  }
  await withGitSnapshot(cwd, tree, async () => {}, { env });
  assert.deepEqual(fs.readdirSync(base).sort(), [path.basename(foreign), path.basename(live)].sort());
});

test('a finished or failed run removes its snapshot and leaves no signal handlers behind', async t => {
  const { cwd, env, tree, base } = fixture(t);
  const before = SIGNALS.map(signal => process.listenerCount(signal));
  let seen;
  await withGitSnapshot(cwd, tree, async ({ directory }) => { seen = directory; assert.ok(fs.existsSync(directory)); }, { env });
  assert.equal(fs.existsSync(seen), false);
  await assert.rejects(withGitSnapshot(cwd, tree, async ({ directory }) => {
    seen = directory;
    throw new Error('synthetic failure');
  }, { env }), /synthetic failure/);
  assert.equal(fs.existsSync(seen), false);
  assert.deepEqual(fs.readdirSync(base), []);
  assert.deepEqual(SIGNALS.map(signal => process.listenerCount(signal)), before);
});

// A child process holds a snapshot open until it is signalled; the parent checks the folder is gone afterwards.
for (const signal of SIGNALS) {
  test(`${signal} removes the live snapshot, and the process still ends by ${signal}`, async t => {
    const { cwd, tree } = fixture(t);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-snapshot-hold-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const script = path.join(dir, 'hold.mjs');
    fs.writeFileSync(script, [
      `import { withGitSnapshot } from ${JSON.stringify(pathToFileURL(MODULE).href)};`,
      'const [cwd, tree] = process.argv.slice(2);',
      'setInterval(() => {}, 1000);',
      'await withGitSnapshot(cwd, tree, async ({ directory }) => {',
      "  console.log('DIR ' + directory);",
      '  await new Promise(() => {});',
      '});',
    ].join('\n'));
    const child = spawn(process.execPath, [script, cwd, tree], { stdio: ['ignore', 'pipe', 'pipe'] });
    t.after(() => child.kill('SIGKILL'));
    const directory = await new Promise((resolve, reject) => {
      let out = '';
      const timer = setTimeout(() => reject(new Error('child never made a snapshot')), 20000);
      child.stdout.on('data', chunk => {
        out += chunk;
        const line = out.split('\n').find(text => text.startsWith('DIR '));
        if (line) { clearTimeout(timer); resolve(line.slice(4)); }
      });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`child exited early with ${code}`)); });
    });
    assert.ok(fs.existsSync(directory), 'the snapshot exists while the run is live');
    child.kill(signal);
    const [, received] = await once(child, 'exit');
    assert.equal(received, signal, 'the process ends with the signal, not an exit status');
    assert.equal(fs.existsSync(directory), false, 'the snapshot is removed');
  });
}
