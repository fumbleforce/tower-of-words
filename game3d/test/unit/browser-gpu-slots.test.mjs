import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import { BROWSER_GPU_SLOTS, reclaimDeadBrowserSlots, tryAcquireBrowserGpuSlot } from '../../../tools/lib/browser-gpu-slots.mjs';

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

// A pid that has just exited (and will not be reused within the test).
function deadPid() {
  const child = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  return Number(child.stdout);
}
const quiet = { log: () => {} };

test('a slot whose owner died is reclaimed on the next acquire, and its Chromium killed', async t => {
  const root = fixture(t), pool = path.join(root, 'gpu.lock');
  const take = (owner, extra = {}) => tryAcquireBrowserGpuSlot({ root, owner, ...quiet, ...extra });
  const live = take('live');
  // Two owners that will die without releasing.
  const owners = Array.from({ length: BROWSER_GPU_SLOTS - 1 }, () => spawn('sleep', ['30'], { stdio: 'ignore' }));
  t.after(() => owners.forEach(owner => owner.kill('SIGKILL')));
  const dead = owners.map((owner, i) => take('dead-' + i, { pid: owner.pid }));
  assert.deepEqual(dead.map(lease => lease.slot), [1, 2]);
  // The dead owner's browser outlived it: a detached process group, like Playwright's Chromium.
  const browser = spawn('sleep', ['30'], { detached: true, stdio: 'ignore' });
  t.after(() => { try { process.kill(-browser.pid, 'SIGKILL'); } catch { /* gone */ } });
  assert.equal(dead[0].track(browser.pid), true);
  const gone = once(browser, 'exit');
  assert.equal(take('full'), null);
  await Promise.all(owners.map(owner => { const exit = once(owner, 'exit'); owner.kill('SIGKILL'); return exit; }));
  const fresh = take('fresh');
  assert.equal(fresh.slot, 1);
  assert.equal((await gone)[1], 'SIGKILL');
  assert.equal(take('also-fresh').slot, 2);
  assert.equal(take('full'), null); // the live owner keeps its slot
  live.release(); fresh.release();
  assert.equal(fs.existsSync(pool), true);
  // The reclaimed leases cannot remove what replaced them.
  dead.forEach(lease => assert.equal(lease.release(), true));
  assert.equal(fs.readdirSync(pool).filter(name => name.startsWith('slot.')).length, 1);
});

test('reclaim frees the lock for an exclusive job; old-format, reused-pid and pid-less slots', t => {
  const root = fixture(t), pool = path.join(root, 'gpu.lock');
  const lease = tryAcquireBrowserGpuSlot({ root, owner: 'first', ...quiet });
  const poolOwner = fs.readFileSync(path.join(pool, 'owner'), 'utf8');
  lease.release();
  fs.mkdirSync(pool);
  fs.writeFileSync(path.join(pool, 'owner'), poolOwner);
  // Before slots recorded JSON they held "<name> pid=<n> <uuid>".
  fs.writeFileSync(path.join(pool, 'slot.0'), `loop-check pid=${deadPid()} 083dd290`);
  // Our own pid with another start time is a reused pid, not the owner.
  fs.writeFileSync(path.join(pool, 'slot.1'), JSON.stringify({ owner: 'reused', pid: process.pid, start: '1' }));
  assert.equal(reclaimDeadBrowserSlots({ root, ...quiet }), 2);
  assert.equal(fs.existsSync(pool), false);
  fs.mkdirSync(pool); // the image job gets the GPU
  fs.rmdirSync(pool);
  // An owner we cannot check (no pid) is respected.
  fs.mkdirSync(pool);
  fs.writeFileSync(path.join(pool, 'owner'), poolOwner);
  fs.writeFileSync(path.join(pool, 'slot.0'), 'someone');
  assert.equal(reclaimDeadBrowserSlots({ root, ...quiet }), 0);
  assert.equal(fs.readFileSync(path.join(pool, 'slot.0'), 'utf8'), 'someone');
  // An exclusive lock is never reclaimed, whatever its owner file says.
  fs.rmSync(pool, { recursive: true });
  fs.mkdirSync(pool);
  const exclusive = `voice pid=${deadPid()}`;
  fs.writeFileSync(path.join(pool, 'owner'), exclusive);
  assert.equal(reclaimDeadBrowserSlots({ root, ...quiet }), 0);
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'browser', ...quiet }), null);
  assert.equal(fs.readFileSync(path.join(pool, 'owner'), 'utf8'), exclusive);
});

test('a pool mutex left by a killed process is cleared after a few seconds', t => {
  const root = fixture(t), guard = path.join(root, 'gpu.browser.guard');
  fs.mkdirSync(guard);
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(guard, old, old);
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'waiting', ...quiet }), null); // clears it
  const lease = tryAcquireBrowserGpuSlot({ root, owner: 'waiting', ...quiet });
  assert.equal(lease.slot, 0);
  assert.equal(lease.release(), true);
});

test('a SIGKILLed slot holder is reclaimed by the next process', { timeout: 5000 }, async t => {
  const root = fixture(t);
  const helper = new URL('../../../tools/lib/browser-gpu-slots.mjs', import.meta.url).href;
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { tryAcquireBrowserGpuSlot } from ${JSON.stringify(helper)};
    const lease = tryAcquireBrowserGpuSlot({ root: process.argv[1], owner: 'killed pid=' + process.pid });
    process.send({ slot: lease?.slot ?? null });
    setInterval(() => {}, 1000);
  `, root], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  assert.equal((await once(child, 'message'))[0].slot, 0);
  child.kill('SIGKILL');
  await once(child, 'exit');
  const lease = tryAcquireBrowserGpuSlot({ root, owner: 'next', ...quiet });
  assert.equal(lease.slot, 0);
  lease.release();
  assert.equal(fs.existsSync(path.join(root, 'gpu.lock')), false);
});
