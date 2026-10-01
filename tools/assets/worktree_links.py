#!/usr/bin/env python3
"""Link a worktree's asset files to read-only copies of the main checkout's (tools/worktree.sh setup runs this).

    python3 tools/assets/worktree_links.py <main checkout> <worktree> < paths (NUL-separated, relative)
    python3 tools/assets/worktree_links.py prune <main checkout> [--min-age MINUTES] [--dry-run]

A link straight to main's file let a script in the worktree write through it into main (#148: twice on
2026-10-01, Aoi's portrait and the cast-faces-1 images). So each link points at a copy in a shared store,
<main>/.claude/worktrees/.assets/<sha256>/<file name>, made once per version of a file and set read-only (0444):
a write through the link fails with "Permission denied" instead of changing anything, while reads, deleting the
link and replacing it (rename over it) work as before. The store is inside main (sync.py's hash cache in the
common git dir finds main's unchanged files fast; tools/check/locked-assets.mjs accepts sources inside main) and
inside .claude/worktrees/, which git ignores. Its files never change.

prune (tools/worktree.sh prune-assets; gone --remove runs it after removing worktrees) deletes the store entries
no link points at. It reads every symlink in the main checkout (the worktrees under .claude/worktrees/ included)
and in any other worktree git lists, skipping .git and node_modules. A setup holds a shared lock on <store>/.lock
while it links and prune takes it exclusively, so the two never interleave. A setup running an older copy of this
script (a worktree branched before the lock) doesn't take it, so prune also keeps every entry changed in the last
--min-age minutes (default 10).

For each path: skipped if main has no file there or the worktree already has something there, except a link an
earlier setup made (to main's same path, or into the store), which is pointed at main's current version.
"""
import fcntl
import os
import shutil
import subprocess
import sys
import tempfile
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync  # noqa: E402

STORE = os.path.join('.claude', 'worktrees', '.assets')


def store_copy(store, src, sha, name):
    """The store's read-only copy of src (sha256 sha), made if missing. Returns its path."""
    dest = os.path.join(store, sha, name)
    if os.path.isfile(dest):
        return dest
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), prefix='.copy-')
    try:
        with os.fdopen(fd, 'wb') as out, open(src, 'rb') as f:
            shutil.copyfileobj(f, out, 1 << 20)
        got = sync.sha_file(tmp)
        if got != sha:  # main's file changed while it was hashed or copied: file the copy under what it holds
            os.chmod(tmp, 0o444)
            dest = os.path.join(store, got, name)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
        os.chmod(tmp, 0o444)
        os.replace(tmp, dest)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return dest


def lock_store(store, mode):
    """Hold <store>/.lock (fcntl.LOCK_SH for a setup, LOCK_EX for prune) until the returned file is closed."""
    os.makedirs(store, exist_ok=True)
    f = open(os.path.join(store, '.lock'), 'a')
    fcntl.flock(f, mode)
    return f


def linked_entries(main_root, store):
    """Names of the store entries (sha256 folders) that some symlink in some checkout points into."""
    roots = [main_root]
    out = subprocess.run(['git', '-C', main_root, 'worktree', 'list', '--porcelain'],
                         capture_output=True, text=True, check=True).stdout
    for line in out.splitlines():
        wt = os.path.abspath(line[len('worktree '):]) if line.startswith('worktree ') else ''
        if wt and not (wt + os.sep).startswith(main_root + os.sep) and os.path.isdir(wt):
            roots.append(wt)
    used, prefix, stack = set(), store + os.sep, roots
    while stack:
        d = stack.pop()
        try:
            it = os.scandir(d)
        except OSError:
            continue
        with it:
            for e in it:
                if e.is_symlink():
                    try:
                        t = os.path.normpath(os.path.join(d, os.readlink(e.path)))
                    except OSError:
                        continue
                    if t.startswith(prefix):
                        used.add(t[len(prefix):].split(os.sep, 1)[0])
                elif e.name not in ('.git', 'node_modules') and e.path != store and e.is_dir(follow_symlinks=False):
                    stack.append(e.path)
    return used


def entry_stats(path):
    """(latest mtime or ctime of the entry and its files, bytes on disk). ctime also moves on chmod and rename."""
    newest = size = 0
    for d, _, files in os.walk(path):
        for n in [d] + [os.path.join(d, f) for f in files]:
            try:
                st = os.lstat(n)
            except OSError:
                continue
            newest = max(newest, st.st_mtime, st.st_ctime)
            size += st.st_blocks * 512 if n != d else 0
    return newest, size


def prune(args):
    main_root = os.path.abspath(args[0])
    min_age = float(args[args.index('--min-age') + 1]) if '--min-age' in args else 10.0
    dry = '--dry-run' in args
    store = os.path.join(main_root, STORE)
    if not os.path.isdir(store):
        print(f'prune-assets: no store at {store}, nothing to do')
        return
    with lock_store(store, fcntl.LOCK_EX):
        used = linked_entries(main_root, store)
        cutoff = time.time() - min_age * 60
        entries = [e for e in os.listdir(store) if not e.startswith('.') and os.path.isdir(os.path.join(store, e))]
        freed = deleted = recent = 0
        for e in entries:
            if e in used:
                continue
            newest, size = entry_stats(os.path.join(store, e))
            if newest > cutoff:
                recent += 1
                continue
            freed += size
            deleted += 1
            if not dry:
                shutil.rmtree(os.path.join(store, e))
    print(f'prune-assets: {"would delete" if dry else "deleted"} {deleted} of {len(entries)} file versions in the '
          f'asset store (no worktree links to them), {"would free" if dry else "freed"} {freed / 1e6:.1f} MB; kept '
          f'{len(used & set(entries))} linked and {recent} unlinked but changed in the last {min_age:g} min')


def main():
    if sys.argv[1:2] == ['prune']:
        return prune(sys.argv[2:])
    main_root, wt = (os.path.abspath(p) for p in sys.argv[1:3])
    store = os.path.join(main_root, STORE)
    with lock_store(store, fcntl.LOCK_SH):
        link(main_root, wt, store)


def link(main_root, wt, store):
    want = []
    for rel in filter(None, sys.stdin.buffer.read().decode().split('\0')):
        here = os.path.join(wt, rel)
        if os.path.islink(here):
            old = os.readlink(here)
            if old != os.path.join(main_root, rel) and not old.startswith(store + os.sep):
                continue
        elif os.path.lexists(here):
            continue
        if os.path.isfile(os.path.join(main_root, rel)):
            want.append(rel)
    sync.ROOT = main_root  # hash main's copies, with its cache
    cache = sync.load_cache()
    have = sync.local_state(want, cache)
    sync.save_cache(cache)
    linked = replaced = copied = 0
    for rel in want:
        if rel not in have:
            continue
        name = os.path.basename(rel)
        known = os.path.isfile(os.path.join(store, have[rel][1], name))
        target = store_copy(store, os.path.join(main_root, rel), have[rel][1], name)
        copied += not known
        here = os.path.join(wt, rel)
        if os.path.islink(here) and os.readlink(here) == target:
            continue
        os.makedirs(os.path.dirname(here), exist_ok=True)
        tmp = here + '.wtlink'
        if os.path.lexists(tmp):
            os.unlink(tmp)
        os.symlink(target, tmp)
        replaced += os.path.islink(here)
        os.replace(tmp, here)
        linked += 1
    print(f'{linked} {replaced} {copied}')


if __name__ == '__main__':
    main()
