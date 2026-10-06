#!/usr/bin/env python3
"""UserPromptSubmit: append Jørgen's prompt, word for word, to notes/feedback-log/YYYY-MM-DD.md.

Never blocks or changes the prompt: prints nothing and always exits 0.
Skips prompts that are only a slash command, and harness text (task notifications, command output).
"""
import os
import re
import sys
import fcntl
import hashlib
sys.dont_write_bytecode = True  # leave no __pycache__ in .claude/hooks or tools/
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from common import main_root, read_input  # noqa: E402

HARNESS = ('<task-notification', '<command-', '<local-command', '<bash-', '<system-reminder',
           '<user-prompt-submit-hook', '<teammate-message')
ONLY_SLASH = re.compile(r'^/[\w:.-]+$')
REMINDER = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)


def main():
    data = read_input()
    text = data.get('prompt')
    if not isinstance(text, str):
        return
    text = REMINDER.sub('', text).strip()
    if not text or ONLY_SLASH.match(text) or text.startswith(HARNESS):
        return
    now = datetime.now().astimezone()
    folder = os.path.join(main_root(data), 'notes', 'feedback-log')
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, now.strftime('%Y-%m-%d') + '.md')
    fence = '`' * max(3, max((len(m) for m in re.findall(r'`+', text)), default=0) + 1)
    entry = f"## {now.strftime('%H:%M:%S %z')} · session {data.get('session_id', '?')}\n\n{fence}\n{text}\n{fence}\n\n"
    if not os.path.exists(path):
        entry = (f"# Feedback log {now.strftime('%Y-%m-%d')}\n\n"
                 "Jørgen's messages to Claude Code, word for word (.claude/hooks/feedback_log.py).\n\n") + entry
    # Codex can retry a prompt hook or run the manual fallback for the same turn.
    event = data.get('turn_id')
    marker = ''
    if event:
        identity = f"{data.get('session_id', '?')}\0{event}\0{text}"
        marker = '<!-- feedback-event ' + hashlib.sha256(identity.encode()).hexdigest() + ' -->'
        entry = marker + '\n' + entry
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        if marker:
            with os.fdopen(os.dup(fd), 'r', encoding='utf-8') as prior:
                if marker in prior.read():
                    return
        os.write(fd, entry.encode('utf-8'))
    finally:
        os.close(fd)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
