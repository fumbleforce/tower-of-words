"""Append one entry to a collab inbox with the next free id, under a lock, so parallel agents never share an id.

    python3 tools/collab/post.py to-codex ask "claude-main/x" --refs "#362; C-0491" < body.txt
    python3 tools/collab/post.py to-codex release "claude-agent:grounds" --body "landed 9f0d985f and releases ..."

Prints the id it used. The prefix comes from the inbox: to-codex/to-grok take C- (Claude writes there)."""
import argparse, datetime, fcntl, pathlib, re, subprocess, sys

# The inboxes live in the main checkout only (git-ignored), so resolve it from the shared .git even when run in a worktree.
_here = pathlib.Path(__file__).resolve().parents[2]
ROOT = pathlib.Path(subprocess.run(['git', '-C', str(_here), 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                   capture_output=True, text=True, check=True).stdout.strip()).parent
PREFIX = {'to-codex': 'C', 'to-grok': 'C'}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inbox', choices=sorted(PREFIX))
    ap.add_argument('type', choices=['ask', 'review', 'answer', 'claim', 'release', 'done', 'blocked', 'correction'])
    ap.add_argument('author')
    ap.add_argument('--refs', default='')
    ap.add_argument('--body')
    a = ap.parse_args()
    body = (a.body if a.body is not None else sys.stdin.read()).strip()
    if not body:
        sys.exit('empty body')
    path = ROOT / 'collab' / f'{a.inbox}.md'
    p = PREFIX[a.inbox]
    with open(ROOT / 'collab' / '.post.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        # Claude numbers in order across both inboxes it writes, so look at both.
        nums = [int(n) for f in {'to-codex', 'to-grok'} if (ROOT / 'collab' / f'{f}.md').exists()
                for n in re.findall(rf'^## {p}-(\d+)', (ROOT / 'collab' / f'{f}.md').read_text(), re.M)]
        eid = f'{p}-{max(nums, default=0) + 1:04d}'
        refs = f'refs: {a.refs}\n' if a.refs else ''
        with open(path, 'a') as f:
            f.write(f'\n## {eid} · {datetime.date.today()} · {a.type}\n{refs}{a.author}: {body}\n')
    print(eid)

if __name__ == '__main__':
    main()
