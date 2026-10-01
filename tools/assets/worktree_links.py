#!/usr/bin/env python3
"""Link a worktree's asset files to read-only copies of the main checkout's (tools/worktree.sh setup runs this).

    python3 tools/assets/worktree_links.py <main checkout> <worktree> < paths (NUL-separated, relative)

A link straight to main's file let a script in the worktree write through it into main (#148: twice on
2026-10-01, Aoi's portrait and the cast-faces-1 images). So each link points at a copy in a shared store,
<main>/.claude/worktrees/.assets/<sha256>/<file name>, made once per version of a file and set read-only (0444):
a write through the link fails with "Permission denied" instead of changing anything, while reads, deleting the
link and replacing it (rename over it) work as before. The store is inside main (sync.py's hash cache in the
common git dir finds main's unchanged files fast; tools/check/locked-assets.mjs accepts sources inside main) and
inside .claude/worktrees/, which git ignores. Its files never change; an entry no link uses is just disk.

For each path: skipped if main has no file there or the worktree already has something there, except a link an
earlier setup made (to main's same path, or into the store), which is pointed at main's current version.
"""
import os
import shutil
import sys
import tempfile

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


def main():
    main_root, wt = (os.path.abspath(p) for p in sys.argv[1:3])
    store = os.path.join(main_root, STORE)
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
