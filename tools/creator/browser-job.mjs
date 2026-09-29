// Creator render jobs follow GUIDE's per-process browser / exclusive GPU policy.
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';

export async function withBrowserJob(name, run, {
  timeoutMs = 285000, loadWaitMs = 60000, loadPollMs = 5000,
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(loadWaitMs) || loadWaitMs < 0
    || !Number.isFinite(loadPollMs) || loadPollMs <= 0) throw new Error('Invalid browser job time limits');
  const started = Date.now();
  const owner = `${name} pid=${process.pid} ${randomUUID()}`, locks = [];
  let safeToRelease = true;
  const acquire = path => {
    fs.mkdirSync(path);
    try { fs.writeFileSync(path + '/owner', owner); }
    catch (error) { fs.rmdirSync(path); throw error; }
    locks.push(path);
  };
  const release = () => {
    // SIGKILL cannot run cleanup. A dead owner PID alone does not prove that its
    // Chromium children stopped, so this helper never scavenges stale locks.
    // Likewise, retain our locks if an exit/close failure leaves shutdown unclear.
    if (!safeToRelease) {
      console.error(`${name}: retaining locks; browser shutdown is unconfirmed (${owner})`);
      return;
    }
    for (const path of locks) {
      try {
        if (fs.readFileSync(path + '/owner', 'utf8') === owner) fs.rmSync(path, { recursive: true });
      } catch (error) { if (error.code !== 'ENOENT') console.error(error.message); }
    }
  };
  let browser, timer, pollTimer, rejectSignal, cancelledError, deadlineError;
  const cancelled = new Promise((_, reject) => { rejectSignal = reject; });
  cancelled.catch(() => {}); // A signal can arrive while Chromium is launching.
  const cancel = message => { cancelledError = new Error(`${name}: ${message}`); rejectSignal(cancelledError); };
  const signals = Object.entries({ SIGINT: 'interrupted', SIGTERM: 'terminated', SIGHUP: 'hangup', SIGQUIT: 'quit' })
    .map(([signal, message]) => [signal, () => cancel(message)]);
  process.on('exit', release);
  for (const [signal, handler] of signals) process.on(signal, handler);
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        deadlineError = new Error(`${name} exceeded ${timeoutMs / 1000} seconds`);
        reject(deadlineError);
      }, timeoutMs);
    });
    deadline.catch(() => {});
    const admissionUntil = started + Math.min(loadWaitMs, timeoutMs);
    let waiting = false, load;
    while ((load = os.loadavg()[0]) > 24) {
      const remaining = admissionUntil - Date.now();
      if (remaining <= 0) throw new Error(`Render deferred: load ${load.toFixed(1)} exceeds GUIDE's limit of 24 after ${Date.now() - started}ms`);
      if (!waiting) console.log(`${name}: waiting up to ${Math.min(loadWaitMs, timeoutMs) / 1000}s for load <= 24; no locks held`);
      waiting = true;
      await Promise.race([deadline, cancelled, new Promise(resolve => {
        pollTimer = setTimeout(resolve, Math.min(loadPollMs, remaining));
      })]);
      clearTimeout(pollTimer);
    }
    if (cancelledError) throw cancelledError;
    if (deadlineError) throw deadlineError;
    // Check the clock too: an event-loop stall can delay the deadline callback.
    if (Date.now() - started >= timeoutMs) throw new Error(`${name} exceeded ${timeoutMs / 1000} seconds`);
    acquire('/tmp/claude-1000/browser.lock.' + process.pid);
    let gpu = false;
    if (process.env.GL !== 'soft') {
      try { acquire('/tmp/claude-1000/gpu.lock'); gpu = true; }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    const args = gpu
      ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu']
      : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
    console.log(`${name}: ${gpu ? 'GPU' : 'software GL'}`);
    safeToRelease = false;
    try {
      browser = await chromium.launch({ headless: true,
        timeout: Math.max(1, Math.min(30000, timeoutMs - (Date.now() - started))), args,
        handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    } catch (error) {
      // A settled Playwright launch rejection runs its own process cleanup.
      safeToRelease = true;
      throw error;
    }
    if (cancelledError) throw cancelledError;
    if (deadlineError) throw deadlineError;
    return await Promise.race([deadline, cancelled, Promise.resolve().then(() => run(browser))]);
  } finally {
    clearTimeout(timer); clearTimeout(pollTimer);
    const closeLimit = setTimeout(() => { console.error(`${name}: browser close timed out`); process.exit(124); }, 5000);
    try {
      if (browser) await browser.close();
      safeToRelease = true;
    }
    finally {
      clearTimeout(closeLimit); release();
      process.off('exit', release);
      for (const [signal, handler] of signals) process.off(signal, handler);
    }
  }
}
