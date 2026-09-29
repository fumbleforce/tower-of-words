#!/usr/bin/env bash
# Agent worktrees: each writing agent works in its own checkout under .claude/worktrees/ and lands with tools/land.sh.
#
#   tools/worktree.sh new <name>      make .claude/worktrees/<name> on a new branch wt/<name> from local main, then setup
#   tools/worktree.sh setup [<path>]  give a worktree what the game and tools need that isn't in git (default: this one)
#
# Claude Code's Agent tool makes its own worktrees (isolation: "worktree"; .claude/settings.json sets the base to
# local HEAD and symlinks node_modules, .worktreeinclude copies .env). Run `setup` in those too: it's idempotent.
# Codex and hand-made worktrees use `new`.
#
# setup links, never copies, from the main checkout:
#   - node_modules (the folder) and .env
#   - every git-ignored file under the asset roots in tools/assets/sync.json (Meshy originals, music, and after the
#     asset move every binary), one symlink per file, so git sees them as ignored whatever the rules are.
# The links are read-only in spirit: to change an asset in a worktree, delete its link first and write a new file;
# tools/land.sh then keeps the worktree and lists the new file instead of deleting it.
set -euo pipefail

die() { echo "worktree: $*" >&2; exit 1; }

main_root() {  # the main checkout (the one whose .git is the common dir)
  local common; common=$(git -C "${1:-.}" rev-parse --path-format=absolute --git-common-dir)
  dirname "$common"
}

setup() {
  local wt; wt=$(cd "${1:-.}" && git rev-parse --show-toplevel)
  local main; main=$(main_root "$wt")
  [[ "$wt" != "$main" ]] || die "setup is for agent worktrees, not the main checkout ($main)"

  local linked=0
  link() {  # link <relative path>: symlink main's copy into the worktree if the worktree has nothing there
    local rel="$1"
    [[ -e "$main/$rel" || -L "$main/$rel" ]] || return 0
    [[ -e "$wt/$rel" || -L "$wt/$rel" ]] && return 0
    mkdir -p "$(dirname "$wt/$rel")"
    ln -s "$main/$rel" "$wt/$rel"
    linked=$((linked + 1))
  }
  link node_modules
  link .env

  local roots=()
  if [[ -f "$wt/tools/assets/sync.json" ]]; then
    mapfile -t roots < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["roots"]))' "$wt/tools/assets/sync.json")
  fi
  roots+=(art/approved/mio/meshy/ art/approved/mc/meshy/ art/approved/music/)
  local files=0 rel
  while IFS= read -r -d '' rel; do
    case "/$rel/" in */private/*) continue ;; esac
    case "$rel" in *__pycache__*|*.pyc) continue ;; esac
    files=$((files + 1))
    link "$rel"
  done < <(git -C "$main" ls-files -z --others --ignored --exclude-standard -- "${roots[@]}")
  echo "worktree setup: $wt; $linked new links ($files ignored asset files in main's asset roots)"
}

new() {
  local name="${1:-}"
  [[ "$name" =~ ^[A-Za-z0-9._-]+$ ]] || die "usage: tools/worktree.sh new <name> (letters, digits, . _ -)"
  local main; main=$(main_root .)
  local wt="$main/.claude/worktrees/$name" branch="wt/$name"
  [[ ! -e "$wt" ]] || die "$wt already exists"
  git -C "$main" worktree add -b "$branch" "$wt" main >/dev/null
  echo "worktree: $wt on branch $branch (from main $(git -C "$main" rev-parse --short main))"
  setup "$wt"
}

case "${1:-}" in
  new) shift; new "$@" ;;
  setup) shift; setup "$@" ;;
  *) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
