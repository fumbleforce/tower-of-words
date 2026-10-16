"""Append one entry to a collab inbox with the next free id, under a lock, so parallel agents never share an id.

    python3 tools/collab/post.py to-codex ask "claude-main/x" --refs "#362; C-0491" < body.txt
    python3 tools/collab/post.py to-codex release "claude-agent:grounds" --body "landed 9f0d985f and releases ..."
    python3 tools/collab/post.py --rotate

Prints the id it used. The prefix comes from the inbox: to-codex/to-grok take C- (Claude writes there).

The size rules are in collab/PROTOCOL.md ("Size limits"); the constants below are those rules.
Every inbox is checked after each post, and --rotate checks them without posting.
"""
import argparse
import contextlib
import datetime
import fcntl
import os
import pathlib
import re
import subprocess
import sys

# The inboxes live in the main checkout only (git-ignored), so resolve it from the shared .git even when run in a worktree.
_here = pathlib.Path(__file__).resolve().parents[2]
ROOT = pathlib.Path(subprocess.run(['git', '-C', str(_here), 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                   capture_output=True, text=True, check=True).stdout.strip()).parent
COLLAB = ROOT / 'collab'
ARCHIVE = COLLAB / 'archive'
PREFIX = {'to-codex': 'C', 'to-grok': 'C'}
INBOXES = ('to-claude', 'to-codex', 'to-grok')  # the size rules cover every inbox file
BODY_LIMIT = 1500  # characters in one entry body
ROTATE_OVER = 150_000  # bytes: an inbox this big has its oldest entries archived
ROTATE_TO = 100_000  # bytes: archiving stops once the inbox is under this
HEADING = re.compile(rb'(?m)^## \S+ \xc2\xb7 ')  # "## <id> · <date> · <type>" starts an entry
DATE = re.compile(rb'\d{4}-\d{2}-\d{2}')
TYPES = ['ask', 'review', 'answer', 'claim', 'release', 'done', 'blocked', 'correction']


@contextlib.contextmanager
def locked():
    """One writer at a time. post.py and the rotation share this lock; Codex and Grok append without it."""
    with open(COLLAB / '.post.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def used_numbers(prefix):
    """Every number an id with this prefix already uses, in the inboxes and their archives, so ids are never reused."""
    paths = [COLLAB / 'to-codex.md', COLLAB / 'to-grok.md']
    paths += sorted(ARCHIVE.glob('to-codex-*.md')) + sorted(ARCHIVE.glob('to-grok-*.md'))
    return [int(n) for path in paths if path.exists()
            for n in re.findall(rf'^## {prefix}-(\d+)', path.read_text(), re.M)]


def split_entries(data):
    """The text before the first entry, then each entry from its heading up to the next heading. Joined, they are data."""
    starts = [m.start() for m in HEADING.finditer(data)]
    if not starts:
        return data, []
    bounds = starts + [len(data)]
    return data[:starts[0]], [data[bounds[i]:bounds[i + 1]] for i in range(len(starts))]


def plan_rotation(data):
    """Which oldest entries move: (text before the first entry, all entries, how many of them to archive)."""
    preamble, entries = split_entries(data)
    headings = [entry.split(b'\n', 1)[0] for entry in entries]
    size = len(preamble) + sum(map(len, entries))
    count = 0
    while size >= ROTATE_TO and count < len(entries):
        size -= len(entries[count])
        count += 1
    # A repeated heading moves as a whole. The wake watchers number repeated headings by position, so a copy left
    # behind would be renumbered and nudged again. Extend the move until no heading is both moved and kept.
    while True:
        moved = set(headings[:count])
        later = [i for i in range(count, len(entries)) if headings[i] in moved]
        if not later:
            return preamble, entries, count
        count = later[-1] + 1


def rotate_inbox(name):
    """Archive the oldest entries of collab/<name>.md when it is over ROTATE_OVER. The caller holds the lock."""
    path = COLLAB / f'{name}.md'
    if not path.exists() or path.stat().st_size <= ROTATE_OVER:
        return 0
    data = path.read_bytes()
    preamble, entries, count = plan_rotation(data)
    if not count:
        return 0
    # Runs of moved entries grouped by month, in their order. The archive is written first, so a crash in between
    # leaves an entry in both places, never in neither.
    ARCHIVE.mkdir(exist_ok=True)
    runs, month = [], None
    for entry in entries[:count]:
        date = DATE.search(entry.split(b'\n', 1)[0])
        month = date.group().decode()[:7] if date else (month or datetime.date.today().strftime('%Y-%m'))
        if runs and runs[-1][0] == month:
            runs[-1][1].append(entry)
        else:
            runs.append((month, [entry]))
    for month, chunks in runs:
        with open(ARCHIVE / f'{name}-{month}.md', 'ab') as f:
            f.write(b''.join(chunks))
            f.flush()
            os.fsync(f.fileno())
    # Then cut them out of the inbox, keeping anything appended since the read. The inbox is rewritten in place so
    # that anything following the file (tail -f) keeps its place.
    now = path.read_bytes()
    if not now.startswith(data):
        sys.exit(f'{name}.md was rewritten during the rotation. The moved entries are in {ARCHIVE}/{name}-*.md; '
                 'check them for duplicates before rotating again.')
    kept = preamble + b''.join(entries[count:]) + now[len(data):]
    with open(path, 'r+b') as f:
        f.write(kept)
        f.truncate(len(kept))
        f.flush()
        os.fsync(f.fileno())
    moved = sum(map(len, entries[:count]))
    print(f'rotated {name}.md: {count} entries ({moved} bytes) to the archive, {len(kept)} bytes left', file=sys.stderr)
    return count


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('inbox', nargs='?', choices=sorted(PREFIX))
    ap.add_argument('type', nargs='?', choices=TYPES)
    ap.add_argument('author', nargs='?')
    ap.add_argument('--refs', default='')
    ap.add_argument('--body')
    ap.add_argument('--rotate', action='store_true', help='only archive old entries of the inboxes over 150 KB')
    a = ap.parse_args()
    if a.rotate:
        with locked():
            for name in INBOXES:
                rotate_inbox(name)
        return
    if not (a.inbox and a.type and a.author):
        ap.error('give inbox, type and author, or --rotate')
    body = (a.body if a.body is not None else sys.stdin.read()).strip()
    if not body:
        sys.exit('empty body')
    p = PREFIX[a.inbox]
    with locked():
        eid = f'{p}-{max(used_numbers(p), default=0) + 1:04d}'
        if len(body) > BODY_LIMIT:
            sys.exit(f'post.py: refused. The body is {len(body):,} characters; the limit is {BODY_LIMIT:,}. Put the '
                     f'details in a local note, collab/notes/{eid}.md (git-ignored; {eid} is the next free id), and '
                     'post a short body that links the note in --refs.')
        refs = f'refs: {a.refs}\n' if a.refs else ''
        with open(COLLAB / f'{a.inbox}.md', 'a') as f:
            f.write(f'\n## {eid} · {datetime.date.today()} · {a.type}\n{refs}{a.author}: {body}\n')
        for name in INBOXES:
            rotate_inbox(name)
    print(eid)


if __name__ == '__main__':
    main()
