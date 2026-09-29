// The browser pool holds gpu.lock until its last slot leaves. Legacy image/model
// jobs still acquire that directory exclusively, without knowing about slots.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const BROWSER_GPU_SLOTS = 3;
const poolPrefix = 'browser-gpu-pool-v1 ';

function readOwner(file) {
  try { return fs.readFileSync(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Only browser pool mutations use this short mutex. No browser runs or waits
// while holding it. We never reclaim an existing mutex or exclusive GPU lock.
function mutatePool(root, busy, action) {
  const guard = path.join(root, 'gpu.browser.guard');
  try { fs.mkdirSync(guard); }
  catch (error) { if (error.code === 'EEXIST') return busy; throw error; }
  try { return action(); }
  finally { fs.rmdirSync(guard); }
}

export function tryAcquireBrowserGpuSlot({ owner, root = '/tmp/claude-1000' }) {
  if (!owner) throw new Error('A browser GPU slot needs an owner');
  const pool = path.join(root, 'gpu.lock');
  const ownerFile = path.join(pool, 'owner');
  return mutatePool(root, null, () => {
    let poolOwner;
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
      try { fs.writeFileSync(slotFile, owner, { flag: 'wx' }); }
      catch (error) { if (error.code === 'EEXIST') continue; throw error; }
      return {
        slot,
        // False means the short mutex is occupied; the caller retries. A changed
        // owner means this lease no longer owns anything and must leave it alone.
        release: () => mutatePool(root, false, () => {
          if (readOwner(ownerFile) !== poolOwner || readOwner(slotFile) !== owner) return true;
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
