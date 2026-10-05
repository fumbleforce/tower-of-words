#!/usr/bin/env python3
"""Wake the registered Codex thread for new collaboration inbox entries.

Run `install` from the main Codex session once, then `bind` at the start of
subsequent main sessions. Runtime state lives in the common Git directory.
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
import shutil
import subprocess
import sys
import time
import uuid

SERVICE = "amakawa-codex-wake.service"
HEADER = re.compile(r"^## ([CG]P?(?:-[a-z0-9]+)?-\d+) · [^\n]+$", re.MULTILINE)


def entries(text):
    """Keep repeated IDs distinct; ignore unfinished headings without a body."""
    matches = list(HEADER.finditer(text))
    counts = Counter()
    result = {}
    for i, match in enumerate(matches):
        heading = match.group()
        counts[heading] += 1
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
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
    return common.parent, common / "codex-wake"


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


def bind(root, directory, thread, codex):
    thread = str(uuid.UUID(thread))
    with locked(directory):
        state = read_state(directory)
        if not state:
            state["seen"] = list(entries((root / "collab/to-codex.md").read_text()))
        state.update(thread=thread, codex=codex)
        save_state(directory, state)
    print(f"Inbox wake target: {thread}")


def tick(root, directory, now=None):
    """Wait for a stable write; acknowledge only after queue accepts the nudge."""
    now = time.time() if now is None else now
    with locked(directory):
        state = read_state(directory)
        if not state.get("thread"):
            raise RuntimeError("No target registered. Run install or bind in the main Codex session.")
        content = (root / "collab/to-codex.md").read_text()
        digest = hashlib.sha256(content.encode()).hexdigest()
        if digest != state.get("snapshot"):
            state.update(snapshot=digest, changed_at=now)
            save_state(directory, state)
            return
        if now - state["changed_at"] < 2:
            return
        seen = set(state["seen"])
        fresh = {key: value for key, value in entries(content).items() if key not in seen}
        if not fresh:
            return
        # Keep the pointer short even after a long outage. The inbox holds the text.
        ids = list(fresh.values())
        summary = ", ".join(ids[:12]) + (f" (+{len(ids) - 12} more)" if len(ids) > 12 else "")
        message = (f"New collaboration inbox entries: {summary} in {root}/collab/to-codex.md. "
                   "Read the new entries and respond in the sender's inbox as appropriate. "
                   "Continue the user's current task; ignore nudges already handled.")
        env = dict(os.environ)
        env["PATH"] = str(Path(state["codex"]).parent) + os.pathsep + env.get("PATH", os.defpath)
        result = subprocess.run([state["codex"], "queue", "--thread", state["thread"],
                                 "--message", message], cwd=root, env=env,
                                capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise RuntimeError((result.stderr or result.stdout).strip() or "codex queue failed")
        state["seen"] = sorted(seen | fresh.keys())
        state["last_delivery"] = {"time": now, "ids": ids, "thread": state["thread"]}
        save_state(directory, state)
        print(f"Queued {summary} for {state['thread']}", flush=True)


def unit_quote(value):
    return '"' + str(value).replace('%', '%%').replace('\\', '\\\\').replace('"', '\\"') + '"'


def install(root):
    unit_dir = Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))) / "systemd/user"
    unit_dir.mkdir(parents=True, exist_ok=True)
    script = root / "tools/collab/codex_wake.py"
    unit = ("[Unit]\nDescription=Wake Codex for Amakawa collaboration messages\n\n"
            "[Service]\nType=simple\n"
            f"ExecStart={unit_quote(sys.executable)} {unit_quote(script)} --repo {unit_quote(root)} watch\n"
            "Restart=on-failure\nRestartSec=10\n\n[Install]\nWantedBy=default.target\n")
    (unit_dir / SERVICE).write_text(unit)
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "--user", "enable", SERVICE], check=True)
    subprocess.run(["systemctl", "--user", "restart", SERVICE], check=True)
    print(f"Installed {SERVICE}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("command", choices=["install", "bind", "once", "watch", "status"])
    parser.add_argument("--thread", default=os.environ.get("CODEX_THREAD_ID"))
    args = parser.parse_args()
    root, directory = paths(args.repo)
    if args.command in ("install", "bind"):
        if not args.thread:
            parser.error("pass --thread or run from a main Codex session with CODEX_THREAD_ID")
        codex = shutil.which("codex")
        if not codex:
            parser.error("codex must be on PATH")
        bind(root, directory, args.thread, codex)
        if args.command == "install":
            install(root)
    elif args.command == "status":
        with locked(directory):
            state = read_state(directory)
        print(json.dumps({key: value for key, value in state.items() if key != "seen"}, indent=2))
        subprocess.run(["systemctl", "--user", "is-active", SERVICE], check=True)
    elif args.command == "once":
        tick(root, directory)
    else:
        last_error = None
        while True:
            try:
                tick(root, directory)
                last_error = None
            except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
                if str(error) != last_error:
                    print(f"Inbox wake: {error}", file=sys.stderr, flush=True)
                    last_error = str(error)
                time.sleep(8)
            time.sleep(2)


if __name__ == "__main__":
    main()
