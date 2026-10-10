// Browser jobs keep per-process markers and share a bounded GPU slot pool.
// Every exit path releases them: a normal end, an error, the time limit, a signal
// and a browser close that hangs (Chromium is killed after CLOSE_GRACE_MS). If this
// process is SIGKILLed instead, the next job to acquire reclaims its slot and kills
// its Chromium (browser-gpu-slots.mjs).
// A long GPU job (the opening video) passes gpuLock: '<name>' to hold the exclusive
// gpu.lock under that name (tools/gpu_priority.py, rank render) instead of a slot.
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { enqueueGpuTicket, processStart, tryAcquireBrowserGpuSlot } from './browser-gpu-slots.mjs';

const ROOT = '/tmp/claude-1000';
const CLOSE_GRACE_MS = 10000;
const GPU_PRIORITY = fileURLToPath(new URL('../gpu_priority.py', import.meta.url));

function childPids(parent) {
  const pids = [];
  for (const name of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const stat = fs.readFileSync(`/proc/${name}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      if (+fields[1] === parent) pids.push(+name);
    } catch { /* exited while we looked */ }
  }
  return pids;
}

// Markers of jobs that died without cleanup (browser.lock.<pid> of a gone pid).
function clearDeadMarkers() {
  for (const name of fs.readdirSync(ROOT)) {
    const pid = Number(/^browser\.lock\.(\d+)$/.exec(name)?.[1]);
    if (!pid || processStart(pid) !== null) continue;
    try { fs.rmSync(`${ROOT}/${name}`, { recursive: true }); } catch { /* raced */ }
  }
}

// GPU_WAIT (seconds in the GPU queue before the job defers; env GPU_WAIT, else defaultSeconds) as withBrowserJob
// options. Two separate budgets: gpuWaitMs is the wait for the GPU and the load; timeoutMs (jobMs) is the run
// deadline, which starts once the GPU is ours. A busy GPU costs waiting time, never run time, and an immediate
// admission leaves no extra allowance.
export function gpuWaitOptions(defaultSeconds, jobMs) {
  const seconds = process.env.GPU_WAIT === undefined || process.env.GPU_WAIT === '' ? defaultSeconds : +process.env.GPU_WAIT;
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error(`GPU_WAIT must be a number of seconds, not ${process.env.GPU_WAIT}`);
  return { gpuWaitMs: seconds * 1000, timeoutMs: jobMs };
}

export async function withBrowserJob(name, run, {
  timeoutMs = 285000, loadWaitMs = 60000, loadPollMs = 5000, gpuWaitMs = 60000, gpuLock = null,
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(loadWaitMs) || loadWaitMs < 0
    || !Number.isFinite(loadPollMs) || loadPollMs <= 0
    || !Number.isFinite(gpuWaitMs) || gpuWaitMs < 0) throw new Error('Invalid browser job time limits');
  const queued = Date.now();
  let started = queued; // the run deadline counts from admission (the GPU is ours), not from the queue
  const owner = `${name} pid=${process.pid} ${randomUUID()}`, locks = [];
  let safeToRelease = true, gpuSlot, browserPid = null, gpuTicket = null, lockWaiter = null, lockHeld = false;
  // Kill Chromium's process group (Playwright starts it detached) when a close hangs
  // or the process is going away; after that the locks are safe to drop.
  const killBrowser = () => {
    // Mid-launch we don't know the pid yet: take any Chromium child of ours.
    const pids = browserPid ? [browserPid] : childPids(process.pid).filter(pid => {
      try { return /chrom|headless/i.test(fs.readFileSync(`/proc/${pid}/comm`, 'utf8')); } catch { return false; }
    });
    for (const pid of pids) {
      if (processStart(pid) === null) continue;
      for (const target of [-pid, pid]) {
        try { process.kill(target, 'SIGKILL'); } catch { /* already gone */ }
      }
    }
    safeToRelease = true;
  };
  const acquire = path => {
    fs.mkdirSync(path);
    try { fs.writeFileSync(path + '/owner', owner); }
    catch (error) { fs.rmdirSync(path); throw error; }
    locks.push(path);
  };
  const release = () => {
    gpuTicket?.remove(); gpuTicket = null;
    if (!safeToRelease) killBrowser();
    if (gpuSlot && !gpuSlot.release()) return false;
    gpuSlot = null;
    if (lockWaiter?.exitCode === null) lockWaiter.kill('SIGKILL');
    lockWaiter = null;
    if (lockHeld) {
      try { execFileSync('python3', [GPU_PRIORITY, 'release', gpuLock], { stdio: 'ignore' }); } catch { /* not ours any more */ }
      lockHeld = false;
    }
    for (const path of locks) {
      try {
        if (fs.readFileSync(path + '/owner', 'utf8') === owner) fs.rmSync(path, { recursive: true });
      } catch (error) { if (error.code !== 'ENOENT') console.error(error.message); }
    }
    return true;
  };
  let browser, timer, pollTimer, rejectSignal, cancelledError, deadlineError;
  const cancelled = new Promise((_, reject) => { rejectSignal = reject; });
  cancelled.catch(() => {}); // A signal can arrive while Chromium is launching.
  const cancel = message => {
    // A second signal means the polite shutdown is stuck: kill, release, leave.
    if (cancelledError) { killBrowser(); releaseNow(); process.exit(130); }
    cancelledError = new Error(`${name}: ${message}`); rejectSignal(cancelledError);
  };
  // In 'exit' and on a forced signal nothing async runs, so wait out a busy pool
  // mutex synchronously (it is held for milliseconds).
  const releaseNow = () => {
    const nap = new Int32Array(new SharedArrayBuffer(4));
    for (let i = 0; i < 100 && release() === false; i++) Atomics.wait(nap, 0, 0, 10);
  };
  const onExit = () => releaseNow();
  const signals = Object.entries({ SIGINT: 'interrupted', SIGTERM: 'terminated', SIGHUP: 'hangup', SIGQUIT: 'quit' })
    .map(([signal, message]) => [signal, () => cancel(message)]);
  process.on('exit', onExit);
  for (const [signal, handler] of signals) process.on(signal, handler);
  try {
    // One deadline promise, armed twice: first as a backstop on the queue wait (load wait + GPU wait), then, once the
    // job is admitted, as the run deadline (timeoutMs from admission).
    let rejectDeadline;
    const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
    deadline.catch(() => {});
    const arm = (ms, what) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        deadlineError = Object.assign(new Error(`${name} exceeded ${ms / 1000} seconds ${what}`),
          what === 'in the queue' ? { code: 'GPU_DEFERRED' } : {});
        rejectDeadline(deadlineError);
      }, ms);
    };
    arm(loadWaitMs + gpuWaitMs + 5000, 'in the queue');
    const admissionUntil = queued + loadWaitMs;
    let waiting = false, load;
    while ((load = os.loadavg()[0]) > 24) {
      const remaining = admissionUntil - Date.now();
      if (remaining <= 0) throw Object.assign(new Error(`Render deferred: load ${load.toFixed(1)} exceeds GUIDE's limit of 24 after ${Date.now() - queued}ms`), { code: 'LOAD_DEFERRED' });
      if (!waiting) console.log(`${name}: waiting up to ${loadWaitMs / 1000}s for load <= 24; no locks held`);
      waiting = true;
      await Promise.race([deadline, cancelled, new Promise(resolve => {
        pollTimer = setTimeout(resolve, Math.min(loadPollMs, remaining));
      })]);
      clearTimeout(pollTimer);
    }
    if (cancelledError) throw cancelledError;
    if (deadlineError) throw deadlineError;
    clearDeadMarkers();
    acquire(`${ROOT}/browser.lock.${process.pid}`);
    const gpu = process.env.GL !== 'soft';
    if (gpu && gpuLock) {
      const wait = Math.max(1, gpuWaitMs);
      console.log(`${name}: waiting up to ${Math.round(wait / 1000)}s for the exclusive GPU lock as ${gpuLock}`);
      lockHeld = true; // release() is a no-op unless gpu.lock names us
      lockWaiter = spawn('python3', [GPU_PRIORITY, 'acquire', gpuLock, '--rank', 'render', '--pid', String(process.pid),
        '--timeout', String(Math.ceil(wait / 1000))], { stdio: ['ignore', 'inherit', 'inherit'] });
      const waiter = lockWaiter;
      const code = await Promise.race([deadline, cancelled, new Promise((resolve, reject) => {
        waiter.on('error', reject);
        waiter.on('exit', resolve);
      })]);
      if (code !== 0) throw Object.assign(new Error(`${name}: render deferred; the exclusive GPU lock stayed busy (python3 tools/gpu_priority.py queue)`), { code: 'GPU_DEFERRED' });
    } else if (gpu) {
      const gpuUntil = Date.now() + gpuWaitMs;
      let waitingForGpu = false;
      // A place in the GPU queue (tools/gpu_priority.py), dropped once a slot is ours or on any exit.
      gpuTicket = enqueueGpuTicket({ owner, rank: 'browser' });
      while (!(gpuSlot = tryAcquireBrowserGpuSlot({ owner, ticket: gpuTicket }))) {
        const remaining = gpuUntil - Date.now();
        if (remaining <= 0) throw Object.assign(new Error(`${name}: render deferred; browser GPU slots or exclusive GPU lock busy, an image or model job is ahead in the GPU queue (python3 tools/gpu_priority.py queue), or Jørgen's image gen dashboard has priority (gpu.priority)`), { code: 'GPU_DEFERRED' });
        if (!waitingForGpu) console.log(`${name}: waiting up to ${gpuWaitMs / 1000}s for a browser GPU slot`);
        waitingForGpu = true;
        await Promise.race([deadline, cancelled, new Promise(resolve => {
          pollTimer = setTimeout(resolve, Math.min(1000, remaining));
        })]);
        clearTimeout(pollTimer);
      }
      gpuTicket.remove(); gpuTicket = null;
    }
    if (cancelledError) throw cancelledError;
    if (deadlineError) throw deadlineError;
    // Admitted: from here the run deadline counts, separate from the wait above.
    started = Date.now();
    arm(timeoutMs, 'to run');
    const args = gpu
      ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu']
      : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
    console.log(`${name}: ${!gpu ? 'software GL (explicit GL=soft)' : gpuSlot ? `GPU slot ${gpuSlot.slot + 1}` : `exclusive GPU lock as ${gpuLock}`}`);
    safeToRelease = false;
    const before = new Set(childPids(process.pid));
    try {
      browser = await chromium.launch({ headless: true,
        timeout: Math.max(1, Math.min(30000, timeoutMs - (Date.now() - started))), args,
        handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    } catch (error) {
      // A settled Playwright launch rejection runs its own process cleanup.
      safeToRelease = true;
      throw error;
    }
    browserPid = childPids(process.pid).find(pid => !before.has(pid)) ?? null;
    if (browserPid && gpuSlot) gpuSlot.track(browserPid);
    if (cancelledError) throw cancelledError;
    if (deadlineError) throw deadlineError;
    return await Promise.race([deadline, cancelled, Promise.resolve().then(() => run(browser))]);
  } finally {
    clearTimeout(timer); clearTimeout(pollTimer);
    // Software GL sometimes needs several seconds to release a large room. A close
    // that takes longer than the grace is hung: kill Chromium and go on releasing.
    let closeLimit;
    try {
      if (browser) {
        const closed = await Promise.race([
          browser.close().then(() => true, () => false),
          new Promise(resolve => { closeLimit = setTimeout(() => resolve(false), CLOSE_GRACE_MS); }),
        ]);
        if (!closed) console.error(`${name}: browser close failed or took over ${CLOSE_GRACE_MS / 1000}s; killing it`);
        if (!closed) killBrowser();
      }
      safeToRelease = true;
    }
    finally {
      clearTimeout(closeLimit);
      const releaseUntil = Date.now() + 3000;
      while (release() === false && Date.now() < releaseUntil)
        await new Promise(resolve => setTimeout(resolve, 25));
      if (gpuSlot) console.error(`${name}: retaining GPU slot; pool mutex remained busy`);
      process.off('exit', onExit);
      for (const [signal, handler] of signals) process.off(signal, handler);
    }
  }
}
