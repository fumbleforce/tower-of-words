#!/usr/bin/env python3
"""Wake the main Grok session when Claude or Codex appends to collab/to-grok.md.

A running turn is left alone. When the turn ends, the Stop hook in
.grok/hooks/inbox-wake.json delivers any entries that landed during the turn.
After that the session is idle, and `watch` (kept up by the monitor tool)
prints one line for entries that arrive later. That line wakes the session.

State lives in the common Git directory, next to the Codex watcher, so every
worktree shares one baseline. The inbox that is watched is the main checkout's
collab/to-grok.md, which is where the teams append.
"""
import argparse
from collections import Counter
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

HEADER = re.compile(r"^## ([CXG]P?(?:-[a-z0-9]+)?-\d+) · [^\n]+$", re.MULTILINE)
SETTLE_SECONDS = 2


def entries(text):
    """Keep repeated ids distinct. Skip a heading that has no body yet."""
    matches = list(HEADER.finditer(text))
    counts = Counter()
    result = {}
    for index, match in enumerate(matches):
        heading = match.group()
        counts[heading] += 1
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end():end]
        if not any(line.strip() and not line.startswith("refs:") for line in body.splitlines()):
            continue
        key = hashlib.sha256(f"{heading}\n{counts[heading]}".encode()).hexdigest()
        result[key] = match[1]
    return result


def paths(repo):
    common = Path(subprocess.check_output(
        ["git", "-C", str(repo), "rev-parse", "--path-format=absolute", "--git-common-dir"],
        text=True).strip())
    return common.parent, common / "grok-wake"


def inbox_path(root):
    return root / "collab/to-grok.md"


def message_for(root, ids):
    shown = ", ".join(ids[:12])
    if len(ids) > 12:
        shown += f" (+{len(ids) - 12} more)"
    return (f"New entries in {root}/collab/to-grok.md: {shown}. "
            "Read those entries and answer in the sender's inbox. "
            "The inbox is the record. If an entry is already answered, leave it.")


def watcher_command(root):
    script = root / "tools/collab/grok_wake.py"
    return (f"The Grok inbox watcher is not running. Start it with the monitor tool, "
            f"persistent true, description grok-inbox-wake, command: python3 -u {script} watch. "
            f"Then stop, with no other work.")


@contextmanager
def locked(directory):
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def read_state(directory):
    path = directory / "state.json"
    return json.loads(path.read_text()) if path.exists() else {}


def save_state(directory, state):
    temp = directory / "state.tmp"
    temp.write_text(json.dumps(state, indent=2) + "\n")
    temp.replace(directory / "state.json")


def pid_alive(pid):
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def watcher_alive(directory):
    with locked(directory):
        return pid_alive(read_state(directory).get("watcher_pid"))


def set_idle(directory, idle):
    with locked(directory):
        state = read_state(directory)
        state["idle"] = bool(idle)
        save_state(directory, state)


def collect(root, directory, now, require_idle):
    """Return a wake message, or None. Marks delivered entries as seen."""
    with locked(directory):
        state = read_state(directory)
        text = inbox_path(root).read_text() if inbox_path(root).exists() else ""
        digest = hashlib.sha256(text.encode()).hexdigest()
        if "seen" not in state:
            state["seen"] = list(entries(text))
            state["snapshot"] = digest
            state["changed_at"] = now
            save_state(directory, state)
            return None
        if digest != state.get("snapshot"):
            state["snapshot"] = digest
            state["changed_at"] = now
            save_state(directory, state)
            return None
        if now - state.get("changed_at", 0) < SETTLE_SECONDS:
            return None
        if require_idle and not state.get("idle"):
            return None
        seen = set(state["seen"])
        fresh = [(key, value) for key, value in entries(text).items() if key not in seen]
        if not fresh:
            return None
        state["seen"] = sorted(seen | {key for key, _ in fresh})
        state["idle"] = False
        state["last_delivery"] = {"time": now, "ids": [value for _, value in fresh]}
        save_state(directory, state)
        return message_for(root, [value for _, value in fresh])


def check(root, directory, event, now=None):
    """Stop-hook decision. None lets the turn end."""
    if event.get("subagentType") or event.get("reason") != "end_turn":
        return None
    now = time.time() if now is None else now
    message = collect(root, directory, now, require_idle=False)
    need_watcher = not watcher_alive(directory)
    if message or need_watcher:
        set_idle(directory, False)
        parts = [part for part in (message, watcher_command(root) if need_watcher else None) if part]
        return " ".join(parts)
    set_idle(directory, True)
    return None


def prompt(directory, event):
    """A new main-session turn is busy, so the watcher stays quiet."""
    if event.get("subagentType"):
        return
    set_idle(directory, False)


def remember_watcher(directory, pid):
    with locked(directory):
        state = read_state(directory)
        current = state.get("watcher_pid")
        if pid_alive(current) and current != pid:
            return False
        state["watcher_pid"] = pid
        save_state(directory, state)
        return True


def clear_watcher(directory, pid):
    with locked(directory):
        state = read_state(directory)
        if state.get("watcher_pid") == pid:
            state["watcher_pid"] = None
            save_state(directory, state)


def watch(root, directory):
    pid = os.getpid()
    if not remember_watcher(directory, pid):
        print("grok-inbox-wake already running", file=sys.stderr)
        return
    try:
        while True:
            try:
                message = collect(root, directory, time.time(), require_idle=True)
                if message:
                    print(message, flush=True)
            except (OSError, ValueError, RuntimeError) as error:
                print(f"Inbox wake: {error}", file=sys.stderr, flush=True)
            time.sleep(1)
    finally:
        clear_watcher(directory, pid)


def run_check(root, directory):
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        return
    if not isinstance(event, dict):
        return
    try:
        reason = check(root, directory, event)
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Inbox wake: {error}", file=sys.stderr)
        return
    if reason:
        json.dump({"decision": "block", "reason": reason}, sys.stdout)
        sys.stdout.write("\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("command", choices=["watch", "check", "prompt", "idle", "busy", "status"])
    args = parser.parse_args()
    root, directory = paths(args.repo)
    if args.command == "watch":
        watch(root, directory)
    elif args.command == "check":
        run_check(root, directory)
    elif args.command == "prompt":
        try:
            event = json.load(sys.stdin)
        except json.JSONDecodeError:
            event = {}
        if not isinstance(event, dict):
            event = {}
        prompt(directory, event)
    elif args.command == "idle":
        set_idle(directory, True)
    elif args.command == "busy":
        set_idle(directory, False)
    else:
        with locked(directory):
            state = read_state(directory)
        public = {key: value for key, value in state.items() if key != "seen"}
        public["seen"] = len(state.get("seen", []))
        public["watcher_alive"] = pid_alive(state.get("watcher_pid"))
        print(json.dumps(public, indent=2))


if __name__ == "__main__":
    main()
