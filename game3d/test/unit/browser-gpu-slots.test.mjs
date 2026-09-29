import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import { BROWSER_GPU_SLOTS, tryAcquireBrowserGpuSlot } from '../../../tools/lib/browser-gpu-slots.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-gpu-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('three browsers share the legacy lock, reuse slots and release it only when empty', t => {
  const root = fixture(t), pool = path.join(root, 'gpu.lock');
  const take = owner => tryAcquireBrowserGpuSlot({ root, owner });
  const leases = Array.from({ length: BROWSER_GPU_SLOTS }, (_, i) => take('browser-' + i));
  assert.deepEqual(leases.map(lease => lease.slot), [0, 1, 2]);
  assert.equal(take('fourth'), null);
  assert.throws(() => fs.mkdirSync(pool), { code: 'EEXIST' });
  assert.equal(leases[1].release(), true);
  const replacement = take('replacement');
  assert.equal(replacement.slot, 1);
  // Releasing an old lease again cannot remove its replacement.
  assert.equal(leases[1].release(), true);
  assert.equal(take('still-full'), null);
  leases[0].release(); leases[2].release();
  assert.equal(fs.existsSync(pool), true);
  replacement.release();
  assert.equal(fs.existsSync(pool), false);
  fs.mkdirSync(pool); // An image job can acquire immediately after the last browser.
});

test('exclusive owners and a busy pool mutex are left untouched', t => {
  const root = fixture(t), pool = path.join(root, 'gpu.lock'), guard = path.join(root, 'gpu.browser.guard');
  fs.mkdirSync(pool);
  fs.writeFileSync(path.join(pool, 'owner'), 'imagegen-dashboard');
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'browser' }), null);
  assert.equal(fs.readFileSync(path.join(pool, 'owner'), 'utf8'), 'imagegen-dashboard');
  fs.rmSync(pool, { recursive: true });
  const lease = tryAcquireBrowserGpuSlot({ root, owner: 'browser' });
  fs.mkdirSync(guard);
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'waiting' }), null);
  assert.equal(lease.release(), false);
  assert.equal(fs.existsSync(guard), true);
  fs.rmdirSync(guard);
  assert.equal(lease.release(), true);
  assert.equal(fs.existsSync(pool), false);
});

test('competing processes never admit more than three GPU browsers', { timeout: 5000 }, async t => {
  const root = fixture(t);
  const helper = new URL('../../../tools/lib/browser-gpu-slots.mjs', import.meta.url).href;
  const children = Array.from({ length: 6 }, () => spawn(process.execPath, ['--input-type=module', '-e', `
    import { tryAcquireBrowserGpuSlot } from ${JSON.stringify(helper)};
    let lease;
    const until = Date.now() + 500;
    do {
      lease = tryAcquireBrowserGpuSlot({ root: process.argv[1], owner: 'child-' + process.pid });
      if (!lease) await new Promise(resolve => setTimeout(resolve, 5));
    } while (!lease && Date.now() < until);
    process.send({ slot: lease?.slot ?? null });
    process.on('message', async () => {
      while (lease && !lease.release()) await new Promise(resolve => setTimeout(resolve, 5));
      process.disconnect();
    });
  `, root], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] }));
  t.after(() => children.forEach(child => { if (child.exitCode === null) child.kill(); }));
  const exits = children.map(child => once(child, 'exit'));
  const reports = await Promise.all(children.map(async child => (await once(child, 'message'))[0]));
  assert.deepEqual(reports.map(report => report.slot).filter(slot => slot !== null).sort(), [0, 1, 2]);
  assert.throws(() => fs.mkdirSync(path.join(root, 'gpu.lock')), { code: 'EEXIST' });
  children.forEach(child => child.send('release'));
  for (const [code] of await Promise.all(exits)) assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(root, 'gpu.lock')), false);
  assert.equal(fs.existsSync(path.join(root, 'gpu.browser.guard')), false);
});
