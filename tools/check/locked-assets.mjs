import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Git keeps no binaries; tools/assets/assets.lock.json lists the used ones (notes/asset-storage-proposal.md).
// The staged snapshot gets a copy of each locked file from this checkout (or, in an agent worktree, the main
// checkout), checked against the staged lock file's sha256, so the CPU checks see the files the game loads.
const LOCK = 'tools/assets/assets.lock.json';
const FIX = 'python3 tools/assets/sync.py pull (missing) or push, then stage tools/assets/assets.lock.json (changed)';

function sha256(file) {
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(1 << 20), fd = fs.openSync(file, 'r');
  try { for (let n; (n = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0;) hash.update(buffer.subarray(0, n)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

export function materializeLockedAssets(cwd, directory, { env = process.env } = {}) {
  const lockFile = path.join(directory, LOCK);
  if (!fs.existsSync(lockFile)) return 0;
  const files = JSON.parse(fs.readFileSync(lockFile, 'utf8')).files;
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd, env, encoding: 'utf8', timeout: 10000 }).trim();
  const sources = [...new Set([cwd, path.dirname(common)])];
  const failures = [];
  let copied = 0;
  for (const [file, entry] of Object.entries(files)) {
    const parts = file.split('/');
    assert(!path.isAbsolute(file) && !parts.includes('..') && !parts.includes('private'), `Unsafe lock path: ${file}`);
    assert(/^[a-f0-9]{64}$/.test(entry.sha256), `Invalid lock sha256: ${file}`);
    if (fs.existsSync(path.join(directory, file))) continue; // still tracked in this tree
    let found = false;
    for (const root of sources) {
      const source = path.join(root, file);
      if (!fs.statSync(source, { throwIfNoEntry: false })?.isFile() || sha256(source) !== entry.sha256) continue;
      const target = path.join(directory, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      found = true; copied++;
      break;
    }
    if (!found) failures.push(file);
  }
  assert(!failures.length, `${failures.length} locked assets are missing here or differ from the staged lock file `
    + `(${failures.slice(0, 5).join(', ')}${failures.length > 5 ? ', ...' : ''}); ${FIX}`);
  return copied;
}

// Refuse a commit while a used asset is not in the lock file or changed without a push (no network).
export function checkAssetSync(cwd, { env = process.env } = {}) {
  if (!fs.existsSync(path.join(cwd, LOCK))) return;
  try {
    execFileSync('python3', ['tools/assets/sync.py', 'check', '--offline'],
      { cwd, env, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const lines = `${error.stdout || ''}${error.stderr || ''}`.trim().split('\n');
    throw new Error(`asset sync: ${lines.slice(-12).join('\n')}\nRun python3 tools/assets/sync.py push and commit ${LOCK}.`);
  }
}
