#!/usr/bin/env python3
"""UserPromptSubmit: if Review items or Showcase entries have unread feedback, add one line of context:
"New Review/Showcase answers: <ids>" (a showcase entry as showcase/<id>). With it, or on its own whenever the set
changes, the stuck work from tools/work.py stale (GitHub issues).

Uses review.unread() from tools/review.py (feedback.json present and not marked read, the same test as
`python3 tools/review.py list`), imported rather than spawned. Each answer (item id + sent time) is announced once per session; the seen list lives in
.git/claude-review-seen.json (untracked, shared by worktrees). Prints nothing when there is nothing new.
"""
import json
import os
import sys
sys.dont_write_bytecode = True  # leave no __pycache__ in .claude/hooks or tools/

sys.path.insert(0, os.path.dirname(__file__))
from common import main_root, read_input  # noqa: E402


def main():
    data = read_input()
    root = main_root(data)
    sys.path.insert(0, os.path.join(root, 'tools'))
    import review  # tools/review.py

    new = [(rid if kind == 'review' else f'showcase/{rid}', sent) for kind, rid, sent in review.unread()]
    try:
        stuck = review.work.stale()  # GitHub issues through a 60 s cache; offline means no stale list, not an error
    except Exception:
        stuck = []
    if not new and not stuck:
        return
    session = data.get('session_id', '?')
    state_path = os.path.join(root, '.git', 'claude-review-seen.json')
    try:
        state = json.load(open(state_path, encoding='utf-8'))
    except Exception:
        state = {}
    seen = set(state.get(session, []))
    fresh = [(rid, sent) for rid, sent in new if f'{rid}@{sent}' not in seen]
    # stuck work is announced again only when the set of stuck items changes
    stuck_ids = sorted(s['id'] for s in stuck)
    stuck_changed = bool(stuck_ids) and stuck_ids != state.get(session + ':stale')
    if not fresh and not stuck_changed:
        return
    state[session] = sorted(seen | {f'{rid}@{sent}' for rid, sent in fresh})
    state[session + ':stale'] = stuck_ids
    state = dict(list(state.items())[-40:])  # keep the last 20 sessions (two keys each)
    try:
        tmp = state_path + '.tmp'
        json.dump(state, open(tmp, 'w', encoding='utf-8'))
        os.replace(tmp, state_path)
    except Exception:
        pass
    parts = ['New Review/Showcase answers: ' + ', '.join(rid for rid, _ in fresh)] if fresh else []
    if stuck:
        parts.append('\n'.join(review.work.stale_lines(limit=8)))
    line = '\n'.join(parts)
    print(json.dumps({'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': line}}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
