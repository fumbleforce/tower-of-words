// Jørgen's image gen dashboard has priority on the GPU (tools/gpu_priority.py, gpuPriority() in
// tools/lib/browser-gpu-slots.mjs). No GPU, ComfyUI or browser: temporary lock roots and fake records only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { gpuPriority, processStart, tryAcquireBrowserGpuSlot } from '../../../tools/lib/browser-gpu-slots.mjs';

const tools = new URL('../../../tools/', import.meta.url).pathname;
const quiet = { log: () => {} };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-priority-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
// A pid that has just exited (and will not be reused within the test).
function deadPid() {
  return Number(spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout);
}
const record = (pid, start = processStart(pid), extra = {}) =>
  JSON.stringify({ by: 'imagegen-dashboard', pid, start, time: Date.now() / 1000, at: '12:00:00', ...extra });
// Python in the same lock root; returns {status, out}.
function py(root, code) {
  const r = spawnSync('python3', ['-c', `import sys; sys.path.insert(0, ${JSON.stringify(tools)})\n${code}`],
    { encoding: 'utf8', env: { ...process.env, GPU_ROOT: root } });
  return { status: r.status, out: (r.stdout + r.stderr).trim() };
}
function deadPool(root, owner = 'browser-gpu-pool-v1 0b5e') {
  const pool = path.join(root, 'gpu.lock');
  fs.mkdirSync(pool);
  fs.writeFileSync(path.join(pool, 'owner'), owner);
  fs.writeFileSync(path.join(pool, 'slot.0'), JSON.stringify({ owner: 'fast pid=x', pid: deadPid(), start: '1' }));
  return pool;
}

test('a live priority file blocks browser GPU slots; a dead or reused writer does not', t => {
  const root = fixture(t), file = path.join(root, 'gpu.priority');
  assert.equal(gpuPriority({ root }), null);
  fs.writeFileSync(file, record(process.pid));
  assert.equal(gpuPriority({ root }).by, 'imagegen-dashboard');
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'fast', ...quiet }), null);
  assert.equal(fs.existsSync(path.join(root, 'gpu.lock')), false, 'no pool was created while the dashboard has priority');
  fs.writeFileSync(file, record(deadPid(), '1'));
  assert.equal(gpuPriority({ root }), null, 'a crashed dashboard is ignored');
  fs.writeFileSync(file, record(process.pid, '1'));
  assert.equal(gpuPriority({ root }), null, 'a reused pid is not the dashboard');
  fs.writeFileSync(file, 'not json');
  const lease = tryAcquireBrowserGpuSlot({ root, owner: 'fast', ...quiet });
  assert.equal(lease.slot, 0);
  lease.release();
});

test('a pool lock whose browser jobs died is freed even while the dashboard waits for it', t => {
  const root = fixture(t);
  const pool = deadPool(root);
  fs.writeFileSync(path.join(root, 'gpu.priority'), record(process.pid));
  assert.equal(tryAcquireBrowserGpuSlot({ root, owner: 'fast', ...quiet }), null);
  assert.equal(fs.existsSync(pool), false, 'the dead pool was reclaimed, and no new slot handed out');
});

test('Python waiters free a dead pool lock and never touch the dashboard or an exclusive owner', t => {
  const root = fixture(t), pool = deadPool(root);
  const reclaim = () => spawnSync('python3', [path.join(tools, 'gpu_priority.py'), 'reclaim'],
    { encoding: 'utf8', env: { ...process.env, GPU_ROOT: root } });
  assert.equal(reclaim().status, 0);
  assert.equal(fs.existsSync(pool), false);
  for (const owner of ['imagegen-dashboard (Jørgen) 12:00:00', `game3d-voices pid=${deadPid()}`]) {
    fs.mkdirSync(pool);
    fs.writeFileSync(path.join(pool, 'owner'), owner);
    reclaim();
    assert.equal(fs.readFileSync(path.join(pool, 'owner'), 'utf8'), owner);
    fs.rmSync(pool, { recursive: true });
  }
});

test('the GPU watchdog never removes the dashboard\'s lock, however old', t => {
  const root = fixture(t), pool = path.join(root, 'gpu.lock');
  fs.mkdirSync(pool);
  fs.writeFileSync(path.join(pool, 'owner'), 'imagegen-dashboard (Jørgen) 12:00:00');
  const old = new Date(Date.now() - 3600e3);
  fs.utimesSync(pool, old, old);
  const r = spawnSync('python3', [path.join(tools, 'gpu-watchdog.py')], { encoding: 'utf8', env: { ...process.env, GPU_WATCHDOG_BASE: root } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '');
  assert.equal(fs.existsSync(path.join(pool, 'owner')), true);
});

test('Python reads the same priority file, and a job stops only for a live dashboard', t => {
  const root = fixture(t), file = path.join(root, 'gpu.priority');
  const check = 'import gpu_priority as g; print(bool(g.priority()), g.should_stop("game3d-voices"))';
  assert.equal(py(root, check).out, 'False False');
  fs.writeFileSync(file, record(process.pid));
  assert.equal(py(root, check).out, 'True True');
  assert.equal(spawnSync('python3', [path.join(tools, 'gpu_priority.py'), 'live'], { env: { ...process.env, GPU_ROOT: root } }).status, 0);
  fs.writeFileSync(file, record(deadPid(), '1'));
  assert.equal(py(root, check).out, 'False False');
  assert.equal(spawnSync('python3', [path.join(tools, 'gpu_priority.py'), 'live'], { env: { ...process.env, GPU_ROOT: root } }).status, 1);
  // The dashboard itself is never told to stop.
  assert.equal(py(root, 'import gpu_priority as g; g.claim_priority(); print(g.should_stop(), g.priority()["by"])').out,
    'False imagegen-dashboard');
});

test('a yield request names the lock owner it is for', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'gpu.yield'), record(process.pid, undefined, { owner: 'game3d-voices' }));
  const stop = name => py(root, `import gpu_priority as g; print(g.should_stop(${JSON.stringify(name)}))`).out;
  assert.equal(stop('game3d-voices'), 'True');
  assert.equal(stop('codex-astra-creator'), 'False');
  fs.writeFileSync(path.join(root, 'gpu.yield'), record(deadPid(), '1', { owner: 'game3d-voices' }));
  assert.equal(stop('game3d-voices'), 'False', 'a yield from a dashboard that died is ignored');
});

test('the dashboard writes and removes its files; another live writer\'s files stay', t => {
  const root = fixture(t);
  const out = py(root, [
    'import gpu_priority as g, json, os',
    'g.claim_priority(); g.request_yield("game3d-voices")',
    'r = json.load(open(os.path.join(g.ROOT, "gpu.priority"))); y = json.load(open(os.path.join(g.ROOT, "gpu.yield")))',
    'print(r["pid"] == os.getpid(), r["start"] == g.process_start(os.getpid()), y["owner"])',
    'g.drop_priority(); print(sorted(os.listdir(g.ROOT)))',
  ].join('\n')).out;
  assert.equal(out, "True True game3d-voices\n[]");
  fs.writeFileSync(path.join(root, 'gpu.priority'), record(process.pid));
  py(root, 'import gpu_priority as g; g.drop_priority()');
  assert.equal(fs.existsSync(path.join(root, 'gpu.priority')), true);
});

test('ComfyUI batch clients stop with exit 75 for the dashboard, between images and on an interrupt', t => {
  const root = fixture(t);
  const yieldCheck = arg => py(root, `import comfy; comfy.yield_to_dashboard(${arg}); print("went on")`);
  const interrupted = '{"status_str": "error", "messages": [["execution_interrupted", {}]]}';
  assert.equal(yieldCheck('').out, 'went on');
  fs.writeFileSync(path.join(root, 'gpu.priority'), record(process.pid));
  const stopped = yieldCheck('');
  assert.equal(stopped.status, 75);
  assert.match(stopped.out, /image gen dashboard has the GPU/);
  assert.equal(yieldCheck(interrupted).status, 75);
  // Any other error is the batch's own and is raised as before.
  assert.equal(yieldCheck('{"status_str": "error", "messages": [["execution_error", {}]]}').out, 'went on');
});
