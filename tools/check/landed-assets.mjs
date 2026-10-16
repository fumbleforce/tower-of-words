// Put the landed commit's ignored assets in main before the source worktree can be removed, and move out the ones the
// commit retires (tools/assets/live.mjs retire). A retire from a worktree leaves main's copy in place until the retire
// commit lands, so main keeps every file its landed registry lists; landing moves that copy to the retired area the
// registry log names (#606).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LOCK = 'tools/assets/assets.lock.json';
const REGISTRY = 'tools/assets/live.json';

function lockedFiles(main, commit) {
  const git = args => execFileSync('git', args, { cwd: main, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (!git(['ls-tree', '--name-only', commit, '--', LOCK]).trim()) return {};
  return JSON.parse(git(['show', `${commit}:${LOCK}`])).files;
}

// The public registry at a commit (its generated area and its log); {} when the commit has none.
function registryAt(main, commit) {
  const git = args => execFileSync('git', args, { cwd: main, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (!git(['ls-tree', '--name-only', commit, '--', REGISTRY]).trim()) return {};
  return JSON.parse(git(['show', `${commit}:${REGISTRY}`]));
}

function digest(file) {
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(1 << 20);
  const fd = fs.openSync(file, 'r');
  try { for (let n; (n = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0;) hash.update(buffer.subarray(0, n)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

function validate(file, entry) {
  const parts = file.split('/');
  assert(!path.isAbsolute(file) && !parts.some(p => ['', '.', '..', '.git', 'private'].includes(p)),
    `Unsafe lock path: ${file}`);
  assert(/^[a-f0-9]{64}$/.test(entry.sha256), `Invalid lock sha256: ${file}`);
}

// Never write through a link in main, including a link to the worktree being removed.
function destination(main, file) {
  let current = main;
  const parts = file.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) return null;
    assert(!stat.isSymbolicLink(), `Refusing linked destination in main: ${file}`);
    assert(i === parts.length - 1 ? stat.isFile() : stat.isDirectory(), `Not a regular asset path in main: ${file}`);
  }
  return digest(current);
}

function sourceFile(main, worktree, file, expected) {
  const source = fs.realpathSync(path.join(worktree, file));
  const allowed = [main, worktree].some(root => {
    const rel = path.relative(root, source), parts = rel.split(path.sep);
    return rel && !path.isAbsolute(rel) && !parts.some(p => ['..', '.git', 'private'].includes(p));
  });
  assert(allowed, `Locked asset ${file} resolves outside the checkouts or into an excluded folder`);
  assert(fs.statSync(source).isFile() && digest(source) === expected, `Task asset differs from the landed lock: ${file}`);
  return source;
}

// Where each locked file the landed commit retires goes: the retire entries it adds to the registry log name the retired
// path (one entry per path, or one per batch), and a folder's files go under it. Maps file -> retired path in main.
function retiredPlaces(main, base, commit, before) {
  const landed = registryAt(main, commit), places = new Map();
  const old = new Set((registryAt(main, base).log ?? []).map(entry => JSON.stringify(entry)));
  for (const entry of landed.log ?? []) {
    if (entry.action !== 'retire' || old.has(JSON.stringify(entry))) continue;
    for (const from of entry.paths ?? [entry.path]) {
      assert(entry.paths || entry.to.endsWith(from), `Retire log entry does not end at its path: ${from}`);
      const prefix = entry.paths ? entry.to : entry.to.slice(0, entry.to.length - from.length);
      assert(prefix.startsWith(`${landed.generated}retired/`) && !prefix.split('/').includes('..'),
        `Retire log entry names a place outside the retired area: ${entry.to}`);
      for (const file of Object.keys(before))
        if (file === from || (from.endsWith('/') && file.startsWith(from))) places.set(file, prefix + file);
    }
  }
  return places;
}

// The copies main keeps in step with the lock: retired files move first (a replaced file's previous bytes are archived
// before its new ones land), then the landed copies are put in. Plan everything first so an existing conflict cannot
// cause a partial asset handoff. Returns how many assets were copied and how many retired files moved.
export function materializeLandedAssets(main, worktree, base, commit, { dryRun = false } = {}) {
  main = fs.realpathSync(main); worktree = fs.realpathSync(worktree);
  const before = lockedFiles(main, base), landed = lockedFiles(main, commit), plan = [], retire = [];
  for (const [file, dest] of retiredPlaces(main, base, commit, before)) {
    const current = destination(main, file);
    if (current === null) continue; // not in main: nothing to move
    assert(current === before[file].sha256, `Preserved changed asset in main: ${file}. A retire moves only the locked bytes`);
    const there = destination(main, dest);
    assert(there === null || there === current, `Preserved retired copy in main: ${dest} holds other bytes`);
    assert(!dest.split('/').some(p => ['', '.', '..', '.git', 'private'].includes(p)), `Unsafe retired path: ${dest}`);
    retire.push({ file, dest, current, keep: there !== null });
  }
  const leaving = new Set(retire.map(r => r.file));
  for (const [file, entry] of Object.entries(landed)) {
    validate(file, entry);
    const current = leaving.has(file) ? null : destination(main, file);
    if (current === entry.sha256) continue;
    assert(current === null || current === before[file]?.sha256,
      `Preserved unrelated changed asset in main: ${file}. Its bytes match neither the previous nor landed lock`);
    plan.push({ file, expected: entry.sha256, current, source: sourceFile(main, worktree, file, entry.sha256) });
  }
  if (dryRun) return { copied: plan.length, retired: retire.length };
  for (const { file, dest, keep } of retire) {
    const from = path.join(main, file), to = path.join(main, dest);
    if (keep) fs.unlinkSync(from); // the retired area already holds these bytes
    else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.linkSync(from, to); // exclusive creation: never over a copy another task put there
      fs.unlinkSync(from);
    }
    assert.equal(destination(main, file), null, `Retired file still in main: ${file}`);
  }
  for (const { file, expected, current, source } of plan) {
    const target = path.join(main, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = fs.mkdtempSync(path.join(path.dirname(target), '.land-assets-'));
    const copy = path.join(temporary, 'asset');
    try {
      fs.copyFileSync(source, copy, fs.constants.COPYFILE_EXCL);
      assert.equal(digest(copy), expected, `Task asset changed while copying: ${file}`);
      // worktree.sh stores read-only copies. Main's independent copy must remain editable.
      fs.chmodSync(copy, (fs.statSync(copy).mode & 0o777) | 0o200);
      assert.equal(destination(main, file), current, `Main asset changed during handoff, preserved: ${file}`);
      if (current === null) fs.linkSync(copy, target); // exclusive creation, even if another task creates it now
      else fs.renameSync(copy, target); // replace only the verified previous locked version
      assert.equal(destination(main, file), expected, `Main asset failed verification after copying: ${file}`);
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  }
  for (const { dest, current } of retire)
    assert.equal(destination(main, dest), current, `Retired copy failed verification: ${dest}`);
  for (const [file, entry] of Object.entries(landed))
    assert.equal(destination(main, file), entry.sha256, `Main asset differs from the landed lock: ${file}`);
  return { copied: plan.length, retired: retire.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), dryRun = args.includes('--dry-run');
    const [main, worktree, base, commit] = args.filter(arg => arg !== '--dry-run');
    assert(main && worktree && base && commit, 'Usage: landed-assets.mjs [--dry-run] <main> <worktree> <base> <commit>');
    const { copied, retired } = materializeLandedAssets(main, worktree, base, commit, { dryRun });
    console.log(`land assets: ${dryRun ? 'dry run for' : 'verified main against'} ${commit.slice(0, 8)}, copied ${copied} asset(s), retired ${retired} file(s)`);
  } catch (error) {
    console.error(`land assets: FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
