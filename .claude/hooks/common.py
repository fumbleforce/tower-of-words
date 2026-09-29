"""Shared helpers for the project's Claude Code hooks (.claude/settings.json)."""
import json
import os
import sys


def read_input():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def main_root(data):
    """The main checkout's root, also when the session runs in a git worktree."""
    root = os.environ.get('CLAUDE_PROJECT_DIR') or data.get('cwd') or os.getcwd()
    git = os.path.join(root, '.git')
    if os.path.isfile(git):  # worktree: ".git" is a file pointing at <main>/.git/worktrees/<name>
        try:
            gitdir = open(git, encoding='utf-8').read().split('gitdir:', 1)[1].strip()
            gitdir = os.path.join(root, gitdir)
            common = open(os.path.join(gitdir, 'commondir'), encoding='utf-8').read().strip()
            return os.path.dirname(os.path.normpath(os.path.join(gitdir, common)))
        except Exception:
            pass
    return root
