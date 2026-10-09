"""Commit a Review or Showcase status or answer change right away.

The public bible (game3d/tools/deploy-pages.sh, tools/bible/pages.py stage) is built from committed files only, so
review.json, entry.json and feedback.json edits made by tools/review.py and tools/review_server.py commit their own
change at once. Only those paths go in, with "Facts: none". The commit is skipped, with a warning, in a worktree
(the change would be lost with it), when the index already holds other staged changes (they are someone else's
work), or for files outside reviews/ and showcase/ (private items stay out of git).
"""
import os
import subprocess
import sys
import threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NAMES = ('review.json', 'entry.json', 'feedback.json')
FOLDERS = ('reviews', 'showcase')
_LOCK = threading.Lock()  # the review server saves from several threads; one git index at a time


def _git(root, *args):
    # HEAD_BOOT=0: skip the post-commit boot and stale checks; a json-only commit has nothing for them
    try:
        return subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, errors='replace', timeout=180,
                              env=dict(os.environ, HEAD_BOOT='0'))
    except (OSError, subprocess.TimeoutExpired) as e:
        return subprocess.CompletedProcess(args, 1, '', str(e))


def _warn(msg):
    print(f'review commit: {msg}', file=sys.stderr, flush=True)


def commit(paths, subject, root=ROOT):
    """Commit just `paths` with `subject` and "Facts: none". Returns True when a commit was made."""
    rels = []
    for p in paths:
        rel = os.path.relpath(os.path.abspath(p), root).replace(os.sep, '/')
        parts = rel.split('/')
        if len(parts) == 3 and parts[0] in FOLDERS and parts[2] in NAMES:
            rels.append(rel)
    if not rels:
        return False
    with _LOCK:
        dirs = _git(root, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir').stdout.split()
        if len(dirs) != 2:
            _warn(f'not a git checkout; {", ".join(rels)} not committed')
            return False
        if os.path.realpath(dirs[0]) != os.path.realpath(dirs[1]):
            _warn(f'in a worktree; {", ".join(rels)} not committed (do it in the main checkout)')
            return False
        staged = [f for f in _git(root, 'diff', '--cached', '--name-only').stdout.splitlines() if f]
        other = [f for f in staged if f not in rels]
        if other:
            _warn(f'other changes are staged ({", ".join(other[:3])}{"..." if len(other) > 3 else ""}); '
                  f'{", ".join(rels)} not committed: commit it yourself with "Facts: none"')
            return False
        if not _git(root, 'status', '--porcelain', '--', *rels).stdout.strip():
            return False  # nothing changed
        r = _git(root, 'add', '--', *rels)
        if r.returncode == 0:
            r = _git(root, 'commit', '-q', '-m', f'{subject}\n\nFacts: none', '--', *rels)
        if r.returncode != 0:
            _git(root, 'reset', '-q', '--', *rels)  # leave nothing staged for someone else's commit
            _warn(f'git failed, {", ".join(rels)} not committed: {(r.stderr or r.stdout).strip()[-400:]}')
            return False
        return True
