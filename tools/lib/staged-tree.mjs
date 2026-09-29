import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const git = (cwd, args, options = {}) => execFileSync('git', args,
  { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 10000, ...options });

export function reapInterruptedIndexes(directory = os.tmpdir(), now = Date.now()) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const match = /^codex-check-index-(\d+)-[A-Za-z0-9]+$/.exec(entry.name);
    if (!match || !entry.isDirectory() || entry.isSymbolicLink()) continue;
    const location = path.join(directory, entry.name);
    try {
      const stat = fs.lstatSync(location);
      if (stat.uid !== process.getuid() || now - stat.mtimeMs < 600000) continue;
      try { process.kill(Number(match[1]), 0); continue; }
      catch (error) { if (error.code !== 'ESRCH') continue; }
      fs.rmSync(location, { recursive: true, force: true });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function publicPath(file) {
  assert(file && !file.startsWith('/') && !file.split('/').some(part => ['..', 'private'].includes(part)),
    'Staged checks refuse private or non-repository paths');
}

function indexTree(cwd, env) {
  // Respect a hook's alternate index (commit -a/--only), including linked worktrees.
  const index = git(cwd, ['rev-parse', '--path-format=absolute', '--git-path', 'index'], { env }).trim();
  reapInterruptedIndexes();
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `codex-check-index-${process.pid}-`));
  const copy = path.join(scratch, 'index');
  try {
    try { fs.copyFileSync(index, copy); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    // write-tree updates its index cache. Only the private copy may be locked or rewritten.
    return git(cwd, ['-c', 'core.splitIndex=false', 'write-tree'], { env: { ...env, GIT_INDEX_FILE: copy } }).trim();
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}

// Read immutable Git objects, never substitute working-tree file contents.
// An unmerged index fails write-tree; the shared index is never locked or rewritten.
export function stagedSnapshot(cwd, { env = process.env } = {}) {
  const base = git(cwd, ['rev-parse', 'HEAD'], { env }).trim();
  const tree = indexTree(cwd, env);
  const raw = git(cwd, ['diff-tree', '-r', '--raw', '-z', '--no-abbrev', '--no-renames', base, tree], { env });
  const fields = raw.split('\0');
  if (fields.at(-1) === '') fields.pop();
  assert.equal(fields.length % 2, 0, 'Malformed staged diff');
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    const match = /^:([0-7]{6}) ([0-7]{6}) ([a-f0-9]{40,64}) ([a-f0-9]{40,64}) ([A-Z])$/.exec(fields[index]);
    assert(match, 'Malformed staged object record');
    const file = fields[index + 1];
    publicPath(file);
    const [, beforeMode, mode, before, oid, status] = match;
    changes.push({ file, status, beforeMode, mode, before, oid });
  }
  const diffHash = createHash('sha256').update(JSON.stringify({ base, changes })).digest('hex');
  return { base, tree, changes, diffHash };
}

export function readStagedFile(cwd, snapshot, file, { maxBytes = 2 * 1024 * 1024, env = process.env } = {}) {
  publicPath(file);
  const change = snapshot.changes.find(change => change.file === file);
  assert(change && change.status !== 'D', `No staged file contents: ${file}`);
  assert(['100644', '100755'].includes(change.mode), `Staged checks require a regular file: ${file}`);
  const size = Number(git(cwd, ['cat-file', '-s', change.oid], { env }).trim());
  assert(Number.isSafeInteger(size) && size <= maxBytes, `Staged file exceeds ${maxBytes} bytes: ${file}`);
  return git(cwd, ['cat-file', 'blob', change.oid], { env, encoding: null, maxBuffer: maxBytes + 1 });
}

// Detect shebangs without loading an arbitrarily large executable asset into memory.
export function readStagedPrefix(cwd, snapshot, file, { env = process.env } = {}) {
  publicPath(file);
  const change = snapshot.changes.find(change => change.file === file);
  assert(change && change.status !== 'D' && ['100644', '100755'].includes(change.mode), 'No regular staged blob');
  const result = spawnSync('git', ['cat-file', 'blob', change.oid],
    { cwd, env, encoding: null, timeout: 10000, maxBuffer: 1024 });
  assert(result.status === 0 || (result.error?.code === 'ENOBUFS' && result.stdout?.length >= 1024),
    result.error?.message || 'Cannot read staged script prefix');
  return result.stdout.subarray(0, 1024);
}

export function assertSnapshotCurrent(cwd, snapshot, options) {
  const current = stagedSnapshot(cwd, options);
  assert.equal(current.base, snapshot.base, 'HEAD changed during staged checks');
  assert.equal(current.tree, snapshot.tree, 'Index changed during staged checks');
}
