// The browser pool holds gpu.lock until its last slot leaves. Legacy image/model
// jobs still acquire that directory exclusively, without knowing about slots.
//
// Each slot file records its owner's pid and start time, and later the pid of the
// Chromium it launched. A slot whose owner process is gone is reclaimed on the next
// acquire (or by `node tools/lib/browser-gpu-slots.mjs reclaim`): a leftover
// Chromium of that owner is killed first, so a reclaimed slot never hides a GPU
// browser that is still running. An exclusive owner (anything without the pool
// prefix) is never touched.
//
// Jørgen's image gen dashboard has priority over every agent job: while its
// gpu.priority file is live (tools/gpu_priority.py writes and reads it) no new
// slot is handed out.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const BROWSER_GPU_SLOTS = 3;
const poolPrefix = 'browser-gpu-pool-v1 ';
const DEFAULT_ROOT = '/tmp/claude-1000';
// Pool mutations take milliseconds; a guard this old was left by a killed process.
const STALE_GUARD_MS = 10000;

function readOwner(file) {
  try { return fs.readFileSync(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Start time in clock ticks since boot (/proc/<pid>/stat field 22), so a reused
// pid is not mistaken for the original owner. Null when the process is gone.
export function processStart(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  } catch { return null; }
}

function alive(pid, start) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  const now = processStart(pid);
  if (now === null) {
    // No /proc (or no access): fall back to a signal-0 probe.
    try { process.kill(pid, 0); return true; }
    catch (error) { return error.code === 'EPERM'; }
  }
  return start == null || String(start) === now;
}

// Slot files are JSON {owner, pid, start, browser?}. Older slots held just the
// owner string with "pid=<n>" in it; those are still understood.
function parseSlot(text) {
  if (text == null) return null;
  try {
    const data = JSON.parse(text);
    if (data && typeof data.owner === 'string') return data;
  } catch { /* plain owner string */ }
  const pid = Number(/\bpid=(\d+)/.exec(text)?.[1]);
  return { owner: text, pid: Number.isInteger(pid) && pid > 0 ? pid : null };
}

// The dashboard's live priority record ({by, pid, start, time}), or null. A file
// whose writer has died is ignored.
export function gpuPriority({ root = DEFAULT_ROOT } = {}) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(root, 'gpu.priority'), 'utf8')); }
  catch { return null; }
  return data && Number.isInteger(data.pid) && alive(data.pid, data.start) ? data : null;
}

function slotDead(data) {
  // An owner without a pid cannot be checked, so it is respected.
  return data?.pid != null && !alive(data.pid, data.start);
}

function killBrowser(browser) {
  if (!browser?.pid || !alive(browser.pid, browser.start)) return;
  // Playwright starts Chromium as its own process group; take the whole group.
  for (const target of [-browser.pid, browser.pid]) {
    try { process.kill(target, 'SIGKILL'); } catch { /* already gone */ }
  }
}

// Only browser pool mutations use this short mutex. No browser runs or waits
// while holding it. A guard older than STALE_GUARD_MS was left by a killed process
// and is removed; the caller retries on its next poll.
function mutatePool(root, busy, action) {
  const guard = path.join(root, 'gpu.browser.guard');
  try { fs.mkdirSync(guard); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    try {
      if (Date.now() - fs.statSync(guard).mtimeMs > STALE_GUARD_MS) fs.rmdirSync(guard);
    } catch { /* another process got there first */ }
    return busy;
  }
  try { return action(); }
  finally { fs.rmdirSync(guard); }
}

// Remove the slots of dead owners, and the pool itself once it is empty. Runs
// inside the mutex. Returns the number of slots reclaimed.
function reclaimInPool(pool, log) {
  const ownerFile = path.join(pool, 'owner');
  if (!readOwner(ownerFile)?.startsWith(poolPrefix)) return 0;
  let reclaimed = 0;
  for (const name of fs.readdirSync(pool)) {
    if (!name.startsWith('slot.')) continue;
    const file = path.join(pool, name), data = parseSlot(readOwner(file));
    if (!slotDead(data)) continue;
    killBrowser(data.browser);
    try { fs.unlinkSync(file); reclaimed++; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    log?.(`browser GPU ${name}: reclaimed from dead owner ${data.owner.split(' ').slice(0, 2).join(' ')}`);
  }
  const remaining = fs.readdirSync(pool);
  if (remaining.length === 1 && remaining[0] === 'owner') {
    fs.unlinkSync(ownerFile);
    fs.rmdirSync(pool);
  }
  return reclaimed;
}

// For exclusive GPU jobs that find gpu.lock held by the browser pool: frees the
// slots of dead browser jobs and the lock if no live browser remains. Returns
// null when the pool mutex is busy (retry), otherwise the number reclaimed.
export function reclaimDeadBrowserSlots({ root = DEFAULT_ROOT, log } = {}) {
  const pool = path.join(root, 'gpu.lock');
  return mutatePool(root, null, () => (fs.existsSync(pool) ? reclaimInPool(pool, log) : 0));
}

export function tryAcquireBrowserGpuSlot({ owner, root = DEFAULT_ROOT, pid = process.pid, log = console.error }) {
  if (!owner) throw new Error('A browser GPU slot needs an owner');
  const pool = path.join(root, 'gpu.lock');
  const ownerFile = path.join(pool, 'owner');
  const start = processStart(pid);
  return mutatePool(root, null, () => {
    let poolOwner;
    if (fs.existsSync(pool)) reclaimInPool(pool, log);
    if (gpuPriority({ root })) return null;
    try {
      fs.mkdirSync(pool);
      poolOwner = poolPrefix + randomUUID();
      try { fs.writeFileSync(ownerFile, poolOwner); }
      catch (error) { fs.rmdirSync(pool); throw error; }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      poolOwner = readOwner(ownerFile);
      if (!poolOwner?.startsWith(poolPrefix)) return null;
    }
    for (let slot = 0; slot < BROWSER_GPU_SLOTS; slot++) {
      const slotFile = path.join(pool, 'slot.' + slot);
      const record = { owner, pid, start };
      try { fs.writeFileSync(slotFile, JSON.stringify(record), { flag: 'wx' }); }
      catch (error) { if (error.code === 'EEXIST') continue; throw error; }
      const mine = () => readOwner(ownerFile) === poolOwner && parseSlot(readOwner(slotFile))?.owner === owner;
      return {
        slot,
        // Record the launched Chromium so a reclaim after our death can kill it.
        // False means the short mutex is busy; the caller may retry.
        track: browserPid => mutatePool(root, false, () => {
          if (!mine()) return true;
          record.browser = { pid: browserPid, start: processStart(browserPid) };
          fs.writeFileSync(slotFile, JSON.stringify(record));
          return true;
        }),
        // False means the short mutex is occupied; the caller retries. A changed
        // owner means this lease no longer owns anything and must leave it alone.
        release: () => mutatePool(root, false, () => {
          if (!mine()) return true;
          fs.unlinkSync(slotFile);
          const remaining = fs.readdirSync(pool);
          if (remaining.length === 1 && remaining[0] === 'owner') {
            fs.unlinkSync(ownerFile);
            fs.rmdirSync(pool);
          }
          return true;
        }),
      };
    }
    return null;
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && process.argv[2] === 'reclaim') {
  const n = reclaimDeadBrowserSlots({ root: process.argv[3] || DEFAULT_ROOT, log: console.log });
  console.log(n === null ? 'pool mutex busy; try again' : `reclaimed ${n} dead browser GPU slot(s)`);
}
