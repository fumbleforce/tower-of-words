// The GPU queue (tools/gpu_priority.py, and the browser side in tools/lib/browser-gpu-slots.mjs): ordering by rank and
// time, dead and reused-pid tickets, browser slots against exclusive jobs, and the dashboard's preemption. No GPU,
// ComfyUI or browser: temporary lock roots, fake tickets and short-lived helper processes only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  enqueueGpuTicket, processStart, readGpuQueue, ticketsAhead, tryAcquireBrowserGpuSlot,
} from '../../../tools/lib/browser-gpu-slots.mjs';

const tools = new URL('../../../tools/', import.meta.url).pathname;
const quiet = { log: () => {} };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-queue-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function deadPid() {
  return Number(spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout);
}
// A live process other than this one (for a dashboard that is not the waiter).
function otherProcess(t) {
  const child = spawn('sleep', ['60'], { stdio: 'ignore' });
  t.after(() => child.kill());
  return child.pid;
}
// A ticket as a waiter writes it; time is seconds, so the order is explicit.
function ticket(root, name, { rank, time, pid = process.pid, start = processStart(pid) }) {
  const dir = path.join(root, 'gpu.queue');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ rank, time, owner: name, pid, start, kind: rank === 4.5 ? 'browser' : 'exclusive' }));
  return file;
}
function py(root, code) {
  const r = spawnSync('python3', ['-c', `import sys; sys.path.insert(0, ${JSON.stringify(tools)})\nimport gpu_priority as g\n${code}`],
    { encoding: 'utf8', env: { ...process.env, GPU_ROOT: root } });
  return { status: r.status, out: (r.stdout + r.stderr).trim() };
}
const take = (root, owner, file) => py(root, `print(g.try_take(${JSON.stringify(owner)}, ${JSON.stringify(file)}))`).out;
const lockOwner = root => { try { return fs.readFileSync(path.join(root, 'gpu.lock', 'owner'), 'utf8').trim(); } catch { return null; } };
const names = list => list.map(t => t.owner).sort();

test('the queue goes by rank, then by time, the same in Python and JavaScript', t => {
  const root = fixture(t);
  const files = {
    render_old: ticket(root, 'render_old', { rank: 5, time: 100 }),
    voice: ticket(root, 'voice', { rank: 4, time: 300 }),
    carina: ticket(root, 'carina', { rank: 2, time: 400 }),
    render_new: ticket(root, 'render_new', { rank: 5, time: 200 }),
  };
  const expected = { carina: [], voice: ['carina'], render_old: ['carina', 'voice'], render_new: ['carina', 'render_old', 'voice'] };
  for (const [name, file] of Object.entries(files)) {
    assert.deepEqual(names(ticketsAhead({ path: file }, { root })), expected[name], `JS: ahead of ${name}`);
    const out = py(root, `print(sorted(t["owner"] for t in g.ahead(${JSON.stringify(file)})))`).out;
    assert.equal(out, JSON.stringify(expected[name]).replaceAll('"', "'").replaceAll(',', ', '), `Python: ahead of ${name}`);
  }
  // Only the first ticket takes the lock; it leaves the queue when it does, and the next one follows on release.
  assert.equal(take(root, 'render_old', files.render_old), 'False');
  assert.equal(take(root, 'carina', files.carina), 'True');
  assert.equal(lockOwner(root), 'carina');
  assert.equal(fs.existsSync(files.carina), false, 'the ticket goes once the lock is taken');
  assert.equal(take(root, 'voice', files.voice), 'False', 'the lock is held');
  assert.equal(py(root, 'print(g.release("carina"))').out, 'True');
  assert.equal(take(root, 'voice', files.voice), 'True');
});

test('dead tickets and tickets of a reused pid are dropped and do not hold anyone up', t => {
  const root = fixture(t);
  const dead = ticket(root, 'dead', { rank: 2, time: 1, pid: deadPid(), start: '1' });
  const reused = ticket(root, 'reused', { rank: 2, time: 2, start: '1' }); // our pid, another process's start time
  const mine = ticket(root, 'mine', { rank: 5, time: 3 });
  assert.equal(take(root, 'mine', mine), 'True');
  assert.equal(fs.existsSync(dead), false);
  assert.equal(fs.existsSync(reused), false);
  // JavaScript drops them the same way.
  ticket(root, 'dead2', { rank: 1, time: 1, pid: deadPid(), start: '1' });
  assert.deepEqual(readGpuQueue({ root }).map(q => [q.owner, q.live]), [['dead2', false]]);
  assert.deepEqual(readGpuQueue({ root }), []);
});

test('the queue command shows rank, owner, waiting time, live or dead, and the holder', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'gpu.lock'));
  fs.writeFileSync(path.join(root, 'gpu.lock', 'owner'), 'carina-faces-3\n');
  ticket(root, 'game3d-voices', { rank: 4, time: Date.now() / 1000 - 6600 });
  ticket(root, 'gone-job', { rank: 5, time: Date.now() / 1000 - 60, pid: deadPid(), start: '1' });
  const r = spawnSync('python3', [path.join(tools, 'gpu_priority.py'), 'queue'], { encoding: 'utf8', env: { ...process.env, GPU_ROOT: root } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GPU lock: held by carina-faces-3/);
  assert.match(r.stdout, /1 +4 voice +game3d-voices +1h50m +live/);
  assert.match(r.stdout, /- +5 render +gone-job +1m0\ds +dead, dropped/);
  assert.equal(fs.readdirSync(path.join(root, 'gpu.queue')).length, 1, 'the dead ticket is gone after the listing');
});

test('acquire waits its turn, gives up on its timeout and leaves no ticket behind', t => {
  const root = fixture(t);
  ticket(root, 'carina', { rank: 2, time: 1 });
  const cli = (...args) => spawnSync('python3', [path.join(tools, 'gpu_priority.py'), ...args], { encoding: 'utf8', env: { ...process.env, GPU_ROOT: root } });
  const r = cli('acquire', 'game3d-voices', '--rank', 'voice', '--timeout', '0');
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /1 ahead in the GPU queue, next carina \(carina-image\)/);
  assert.deepEqual(names(readGpuQueue({ root })), ['carina']);
  fs.rmSync(path.join(root, 'gpu.queue'), { recursive: true });
  const run = cli('run', 'blender-job', '--rank', 'render', '--', 'sh', '-c', `cat ${path.join(root, 'gpu.lock', 'owner')}`);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), 'blender-job', 'the command ran holding the lock');
  assert.equal(lockOwner(root), null, 'and the lock was released after it');
  assert.equal(cli('acquire', 'x', '--rank', 'seven').status, 2, 'an unknown rank is refused');
});

test('the dashboard keeps its preemption: nobody else takes the lock or a slot while gpu.priority is live', t => {
  const root = fixture(t);
  const dashboard = otherProcess(t);
  const render = ticket(root, 'render', { rank: 5, time: 1 });
  fs.writeFileSync(path.join(root, 'gpu.priority'),
    JSON.stringify({ by: 'imagegen-dashboard', pid: dashboard, start: processStart(dashboard), time: 0, at: '12:00:00' }));
  assert.equal(take(root, 'render', render), 'False', 'first in the queue, but the dashboard has priority');
  const browser = enqueueGpuTicket({ owner: 'fast', root });
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'fast', ticket: browser, ...quiet }), null);
  browser.remove();
  // The dashboard's own ticket (rank 1, the same process as gpu.priority) goes first and takes the lock.
  const dash = ticket(root, 'imagegen-dashboard', { rank: 1, time: 9, pid: dashboard });
  assert.equal(take(root, 'imagegen-dashboard', dash), 'True');
  assert.equal(lockOwner(root), 'imagegen-dashboard');
  // A job holding the lock is still asked to stop through gpu.yield, as before.
  assert.equal(py(root, 'print(g.should_stop("render"))').out, 'True');
});

test('browser slots and exclusive jobs cannot keep each other out', t => {
  const root = fixture(t), now = Date.now() / 1000;
  // A voice batch is waiting: no new browser job gets a slot, even with the pool running and slots free.
  const first = tryAcquireBrowserGpuSlot({ root, owner: 'running-test', ...quiet });
  assert.equal(first.slot, 0);
  const voice = ticket(root, 'voice', { rank: 4, time: now });
  const late = enqueueGpuTicket({ owner: 'late-test', root });
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'late-test', ticket: late, ...quiet }), null);
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'no-ticket', ...quiet }), null, 'nor a job without a ticket');
  first.release();
  assert.equal(take(root, 'voice', voice), 'True', 'the pool drained, so the voice batch is next');
  py(root, 'g.release("voice")');
  // A render that waited longer than a new browser job: the pool does not grow past it.
  const running = tryAcquireBrowserGpuSlot({ root, owner: 'running-test', ...quiet });
  const render = ticket(root, 'render', { rank: 5, time: now - 10 });
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'late-test', ticket: late, ...quiet }), null);
  // A browser job that was already waiting before the render joins.
  const early = { path: ticket(root, 'early-test', { rank: 4.5, time: now - 20 }) };
  const joined = tryAcquireBrowserGpuSlot({ root, owner: 'early-test', ticket: early, ...quiet });
  assert.equal(joined.slot, 1);
  fs.rmSync(early.path);
  joined.release(); running.release();
  // When the lock changes hands, the render that queued first goes first; the later browser test waits its turn.
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'late-test', ticket: late, ...quiet }), null, 'no cutting in');
  assert.equal(take(root, 'render', render), 'True', 'the older render goes first');
  py(root, 'g.release("render")');
  const after = tryAcquireBrowserGpuSlot({ root, owner: 'late-test', ticket: late, ...quiet });
  assert.equal(after.slot, 0, 'then the browser test');
  late.remove(); after.release();
});

// A long holder (a voice batch) gives waiting browser tests a turn between two items, then queues again at its own rank.
function holdLock(root, owner, ageSeconds) {
  const lock = path.join(root, 'gpu.lock');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, 'owner'), owner + '\n');
  const when = new Date(Date.now() - ageSeconds * 1000);
  fs.utimesSync(lock, when, when);
}
const turn = root => py(root, 'print(g.let_browsers_in("voice-batch", "voice", poll=0.1, limit=5, log=None))\nprint(g.lock_owner())');

test('a holder past its slice lets a waiting browser test in, then takes the lock again', t => {
  const root = fixture(t);
  holdLock(root, 'voice-batch', 600);
  const file = ticket(root, 'fast-test', { rank: 4.5, time: Date.now() / 1000 - 30 });
  const r = py(root, `
import threading, os, time
def go():
    time.sleep(0.5)
    print('while waiting', g.lock_owner())
    os.remove(${JSON.stringify(file)})
threading.Thread(target=go).start()
print(g.let_browsers_in("voice-batch", "voice", poll=0.1, limit=5, log=None))
print(g.lock_owner())`);
  assert.equal(r.out, 'while waiting None\nTrue\nvoice-batch', 'the lock is free while the test takes its turn, and ours again after');
});

test('the turn waits at most its limit, and the holder keeps the voice rank', t => {
  const root = fixture(t);
  holdLock(root, 'voice-batch', 600);
  const file = ticket(root, 'fast-test', { rank: 4.5, time: Date.now() / 1000 - 30 });
  const r = py(root, 'import time; t=time.time()\nprint(g.let_browsers_in("voice-batch", "voice", poll=0.1, limit=1, log=None), round(time.time()-t))\nprint(g.lock_owner())');
  assert.equal(r.out, 'True 1\nvoice-batch');
  assert.ok(fs.existsSync(file), 'the browser ticket is untouched');
});

test('no turn when the holder is within its slice, nobody waits, or only an exclusive job waits', t => {
  const root = fixture(t);
  holdLock(root, 'voice-batch', 10);
  ticket(root, 'fast-test', { rank: 4.5, time: 1 });
  assert.equal(turn(root).out, 'False\nvoice-batch', 'held for 10 s only');
  holdLock(root, 'voice-batch', 600);
  fs.rmSync(path.join(root, 'gpu.queue'), { recursive: true });
  assert.equal(turn(root).out, 'False\nvoice-batch', 'no browser ticket');
  ticket(root, 'render-job', { rank: 5, time: 1 });
  assert.equal(turn(root).out, 'False\nvoice-batch', 'a render is not a browser test; ranks stay as they are');
  assert.equal(py(root, 'print(g.let_browsers_in("someone-else", "voice", after=0, log=None))').out, 'False', 'not the holder');
});

test('GPU_WAIT sets how long a browser job waits in the queue, on top of its own time limit', async () => {
  const { gpuWaitOptions } = await import('../../../tools/lib/browser-job.mjs');
  const saved = process.env.GPU_WAIT;
  try {
    delete process.env.GPU_WAIT;
    assert.deepEqual(gpuWaitOptions(900, 295000), { gpuWaitMs: 900000, timeoutMs: 1195000 });
    process.env.GPU_WAIT = '1800';
    assert.deepEqual(gpuWaitOptions(900, 295000), { gpuWaitMs: 1800000, timeoutMs: 2095000 });
    process.env.GPU_WAIT = 'soon';
    assert.throws(() => gpuWaitOptions(900, 295000), /GPU_WAIT/);
  } finally { if (saved === undefined) delete process.env.GPU_WAIT; else process.env.GPU_WAIT = saved; }
});
