#!/usr/bin/env python3
"""UserPromptSubmit: when Jørgen has sent feedback from the game's feedback window (notes/feedback-game/<time>/,
written by tools/review_server.py), add it to the session's context: the folder, where he was, and his text.

Each folder is announced once, ever (not once per session): the seen list lives in
.git/claude-game-feedback-seen.json (untracked, shared by worktrees). Prints nothing when there is nothing new.
Only folders from the last three days count, so an old checkout doesn't replay its history.
"""
import json
import os
import sys
import time
sys.dont_write_bytecode = True  # leave no __pycache__ in .claude/hooks

sys.path.insert(0, os.path.dirname(__file__))
from common import main_root, read_input  # noqa: E402

MAX_TEXT = 1200


def main():
    data = read_input()
    root = main_root(data)
    base = os.path.join(root, 'notes', 'feedback-game')
    if not os.path.isdir(base):
        return
    cutoff = time.time() - 3 * 86400
    folders = sorted(f for f in os.listdir(base)
                     if os.path.isfile(os.path.join(base, f, 'text.md')) and os.path.getmtime(os.path.join(base, f)) > cutoff)
    if not folders:
        return
    state_path = os.path.join(root, '.git', 'claude-game-feedback-seen.json')
    try:
        seen = set(json.load(open(state_path, encoding='utf-8')))
    except Exception:
        seen = set()
    fresh = [f for f in folders if f not in seen]
    if not fresh:
        return
    try:
        tmp = state_path + '.tmp'
        json.dump(sorted(seen | set(fresh))[-500:], open(tmp, 'w', encoding='utf-8'))
        os.replace(tmp, state_path)
    except Exception:
        pass
    parts = []
    for f in fresh:
        folder = os.path.join(base, f)
        try:
            ctx = json.load(open(os.path.join(folder, 'context.json'), encoding='utf-8'))
        except Exception:
            ctx = {}
        where = ', '.join(f'{k} {ctx[k]}' for k in ('build', 'place', 'period', 'node', 'goal') if ctx.get(k))
        text = open(os.path.join(folder, 'text.md'), encoding='utf-8').read().split('\n\n', 2)[-1].strip()
        if len(text) > MAX_TEXT:
            text = text[:MAX_TEXT] + ' [...]'
        shot = ' + shot.png' if os.path.exists(os.path.join(folder, 'shot.png')) else ''
        parts.append(f'notes/feedback-game/{f}/ (text.md{shot}, context.json; {where}):\n{text}')
    line = 'New in-game feedback from Jørgen, sent from the game\'s feedback window:\n\n' + '\n\n'.join(parts)
    print(json.dumps({'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': line}}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
