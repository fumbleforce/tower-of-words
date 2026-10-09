// Put the landed commit's ignored assets in main before the source worktree can be removed.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LOCK = 'tools/assets/assets.lock.json';

function lockedFiles(main, commit) {
  const git = args => execFileSync('git', args, { cwd: main, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (!git(['ls-tree', '--name-only', commit, '--', LOCK]).trim()) return {};
  return JSON.parse(git(['show', `${commit}:${LOCK}`])).files;
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

export function materializeLandedAssets(main, worktree, base, commit) {
  main = fs.realpathSync(main); worktree = fs.realpathSync(worktree);
  const before = lockedFiles(main, base), landed = lockedFiles(main, commit), plan = [];
  // Plan everything first so an existing conflict cannot cause a partial asset handoff.
  for (const [file, entry] of Object.entries(landed)) {
    validate(file, entry);
    const current = destination(main, file);
    if (current === entry.sha256) continue;
    assert(current === null || current === before[file]?.sha256,
      `Preserved unrelated changed asset in main: ${file}. Its bytes match neither the previous nor landed lock`);
    plan.push({ file, expected: entry.sha256, current, source: sourceFile(main, worktree, file, entry.sha256) });
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
  for (const [file, entry] of Object.entries(landed))
    assert.equal(destination(main, file), entry.sha256, `Main asset differs from the landed lock: ${file}`);
  return plan.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [main, worktree, base, commit] = process.argv.slice(2);
    assert(main && worktree && base && commit, 'Usage: landed-assets.mjs <main> <worktree> <base> <commit>');
    const copied = materializeLandedAssets(main, worktree, base, commit);
    console.log(`land assets: verified main against ${commit.slice(0, 8)}, copied ${copied} asset(s)`);
  } catch (error) {
    console.error(`land assets: FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
