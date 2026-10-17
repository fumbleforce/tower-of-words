// How long a render waits for the GPU while browser tests keep arriving (#691). It runs the real queue code
// (tools/gpu_priority.py for the render, tools/lib/browser-gpu-slots.mjs for the tests) in a temporary GPU root, so
// it never touches the live lock, with time scaled down SCALE times: a test holds its slot 6-30 s here (1-5 min for
// real), a new one arrives every 3 s (30 s), more than three slots can take, and the render queues 60 s (10 min)
// into the stream, with a backlog of tests ahead of it, as on 2026-10-17.
//
//   node tools/lib/gpu-render-wait.mjs           with the bound (gpu_priority.RENDER_BOUND, scaled)
//   node tools/lib/gpu-render-wait.mjs --old     a render ticket without a bound: the order from before #691
//
// It prints the render's wait and how many tests took a slot after the render had queued, in sim and real seconds.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { enqueueGpuTicket, tryAcquireBrowserGpuSlot, RENDER_BOUND } from './browser-gpu-slots.mjs';

const SCALE = 10;
const ARRIVE = 3, HOLD = [6, 30], RENDER_AT = 60, RENDER_RUN = 3, LIMIT = 300; // sim seconds
const old = process.argv.includes('--old');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-render-wait-'));
const tools = path.dirname(path.dirname(new URL(import.meta.url).pathname)); // tools/, for gpu_priority
const t0 = Date.now() / 1000, now = () => Date.now() / 1000 - t0;
const sleep = s => new Promise(resolve => setTimeout(resolve, s * 1000));
let renderQueued = null, renderGot = null, cutIn = 0, stop = false, seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // the same stream every run

async function browserJob(n) {
  const owner = `test-${n}`, ticket = enqueueGpuTicket({ owner, root });
  let slot;
  while (!(slot = tryAcquireBrowserGpuSlot({ owner, root, ticket, log: () => {} }))) {
    if (stop) { ticket.remove(); return; }
    await sleep(1 / SCALE); // browser-job.mjs looks every second
  }
  ticket.remove();
  if (renderQueued !== null && renderGot === null) cutIn++;
  await sleep(HOLD[0] + random() * (HOLD[1] - HOLD[0]));
  while (!slot.release()) await sleep(0.01);
}

function render() {
  // The render waits as gpu_priority.acquire does (polling 5 s, scaled), with the bound scaled too, or none (--old).
  const bound = old ? 'None' : String(RENDER_BOUND / SCALE);
  const code = `import sys, time; sys.path.insert(0, ${JSON.stringify(tools)})
import gpu_priority as g
g.RENDER_BOUND = ${bound}
g.acquire('render', 'render', root=${JSON.stringify(root)}, poll=${5 / SCALE}, log=None)
print('got', flush=True)
time.sleep(${RENDER_RUN})
g.release('render', root=${JSON.stringify(root)})`;
  const child = spawn('python3', ['-c', code], { stdio: ['ignore', 'pipe', 'inherit'] });
  child.stdout.on('data', d => { if (String(d).includes('got')) renderGot = now(); });
  return { child, exit: new Promise(resolve => child.on('exit', resolve)) };
}

const jobs = [];
const stream = (async () => {
  for (let n = 1; !stop; n++) { jobs.push(browserJob(n)); await sleep(ARRIVE); }
})();
await sleep(RENDER_AT);
renderQueued = now();
const done = render();
while (renderGot === null && now() < LIMIT) await sleep(0.1);
stop = true;
if (renderGot === null) done.child.kill();
await Promise.all([stream, done.exit, ...jobs]);
fs.rmSync(root, { recursive: true, force: true });

const wait = renderGot === null ? null : renderGot - renderQueued;
const label = old ? 'before (no bound)' : `after (bound ${RENDER_BOUND} s)`;
console.log(`${label}: render waited ${wait === null ? `over ${LIMIT - RENDER_AT} s (gave up)` : `${wait.toFixed(1)} s`}`
  + ` in the sim, ~${wait === null ? '?' : Math.round(wait * SCALE)} s for real; ${cutIn} test(s) took a slot after it queued`);
