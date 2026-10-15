#!/usr/bin/env python3
"""UserPromptSubmit: append Jørgen's prompt, word for word, to notes/feedback-log/YYYY-MM-DD.md.

Never changes the prompt. Prints failures to stderr and exits 1 so clients can report them.
Skips slash commands and harness traffic, which are not Jørgen's feedback.
"""
import os
import re
import sys
import fcntl
import hashlib
import json
sys.dont_write_bytecode = True  # leave no __pycache__ in .claude/hooks or tools/
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from common import main_root  # noqa: E402

ONLY_SLASH = re.compile(r'^/[\w:.-]+$')
REMINDER = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)
INTERNAL_OPEN = re.compile(
    r'<(agent-message|cross-session-message|codex_internal_context|task-notification|'
    r'command-[\w.-]+|local-command(?:-[\w.-]+)?|bash-[\w.-]+|'
    r'user-prompt-submit-hook|teammate-message)(?:\s[^>]*)?>')


def internal_envelopes(text):
    """Recognize whole control envelopes, including examples nested in a report."""
    position = 0
    while position < len(text):
        opening = INTERNAL_OPEN.match(text, position)
        if not opening:
            return False
        tag = re.escape(opening.group(1))
        tokens = re.compile(r'</' + tag + r'>|<' + tag + r'(?:\s[^>]*)?>')
        depth = 1
        for token in tokens.finditer(text, opening.end()):
            depth += -1 if token.group().startswith('</') else 1
            if depth == 0:
                position = re.compile(r'\s*').match(text, token.end()).end()
                break
        else:
            return False
    return bool(text)


def main():
    data = json.load(sys.stdin)
    text = data.get('prompt')
    if not isinstance(text, str):
        return
    stripped = text.strip()
    # Only a complete internal envelope is excluded. A user can discuss or quote
    # these tags in ordinary prose without losing their feedback.
    if internal_envelopes(stripped):
        return
    if not stripped or ONLY_SLASH.fullmatch(stripped):
        return
    now = datetime.now().astimezone()
    folder = os.path.join(main_root(data), 'notes', 'feedback-log')
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, now.strftime('%Y-%m-%d') + '.md')
    fence = '`' * max(3, max((len(m) for m in re.findall(r'`+', text)), default=0) + 1)
    entry = f"## {now.strftime('%H:%M:%S %z')} · session {data.get('session_id', '?')}\n\n{fence}\n{text}\n{fence}\n\n"
    if not os.path.exists(path):
        entry = (f"# Feedback log {now.strftime('%Y-%m-%d')}\n\n"
                 "Jørgen's messages to Claude and Codex, word for word (.claude/hooks/feedback_log.py).\n\n") + entry
    # Codex can retry a prompt hook or run the manual fallback for the same turn.
    event = data.get('turn_id')
    marker = ''
    if event:
        # Keep the existing marker identity so a retry can find an entry written
        # before verbatim whitespace was retained.
        normalized = REMINDER.sub('', text).strip()
        identity = f"{data.get('session_id', '?')}\0{event}\0{normalized}"
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
    except Exception as error:
        print(f'Feedback log failed: {error}', file=sys.stderr)
        sys.exit(1)
