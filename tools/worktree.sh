#!/usr/bin/env bash
# Agent worktrees: each writing agent works in its own checkout under .claude/worktrees/ and lands with tools/land.sh.
#
#   tools/worktree.sh new <name>      make .claude/worktrees/<name> on a new branch wt/<name> from local main, then setup
#   tools/worktree.sh setup [<path>]  give a worktree what the game and tools need that isn't in git (default: this one)
#   tools/worktree.sh gone [--remove] list each worktree as gone (nothing in it that isn't on main) or keep (and why);
#                                     --remove deletes the gone ones and their branches
#
# Claude Code's Agent tool makes its own worktrees (isolation: "worktree"; .claude/settings.json sets the base to
# local HEAD and symlinks node_modules, .worktreeinclude copies .env). Run `setup` in those too: it's idempotent.
# Codex and hand-made worktrees use `new`. Either way, land the branch with tools/land.sh.
#
# setup links, from the main checkout:
#   - node_modules (the folder) and .env, straight to main's
#   - every file in this worktree's asset lock file (tools/assets/assets.lock.json) that it lacks, binary or not,
#     if main's copy is the locked version (same sha256; sync.py's hash cache keeps this fast). A locked file main
#     has changed (another task's round in progress) is fetched from R2 into the worktree instead (sync.py pull),
#     or left out and listed if that fails; a link an earlier setup made to such a file is replaced the same way;
#   - main's other untracked files under the asset roots (tools/assets/sync.json, plus the voice pipeline's) that
#     this worktree's .gitignore ignores, except unpushed assets (used but not in the lock: another task's work in
#     progress, which the commit check would count). One symlink per file, to a read-only copy of main's version
#     in a store all worktrees share, .claude/worktrees/.assets/ (tools/assets/worktree_links.py: one copy per
#     version, made the first time a setup needs it), so a script writing through a link fails with "Permission
#     denied" and can't change main's file (#148). Rerunning setup points the links at main's current versions.
# To change an asset in a worktree, delete its link first and write a new file; tools/land.sh then keeps the
# worktree and lists the new file instead of deleting it.
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
  # the voice pipeline's local models and reference transcripts (without them voice-clips falls back to edge-tts)
  roots+=(art/approved/mio/meshy/ art/approved/mc/meshy/ art/approved/music/ tools/island_audio/ tools/voice-refs/)
  lock_paths() {  # every file in this worktree's lock file (used assets, some outside the roots, some JSON)
    [[ -f "$wt/tools/assets/assets.lock.json" ]] || return 0
    python3 -c 'import json,sys; sys.stdout.write("".join(p + "\0" for p in json.load(open(sys.argv[1]))["files"]))' \
      "$wt/tools/assets/assets.lock.json"
  }
  not_unpushed() {  # drop the files sync.py counts as used that this worktree's lock file doesn't have: someone's
    # unpushed work in main (a Showcase round being shot), not this branch's, and the commit check would count them
    [[ -f "$wt/tools/assets/sync.py" ]] || { cat; return 0; }
    python3 -c 'import sys; sys.path.insert(0, sys.argv[1]); sys.dont_write_bytecode = True; import sync
lock = sync.load_lock()
for p in filter(None, sys.stdin.buffer.read().decode().split("\0")):
    used = sync.matches(p, sync.CONF["roots"]) and sync.is_binary(p) and not sync.matches(p, sync.CONF["exclude"])
    if p in lock or not used:
        sys.stdout.write(p + "\0")' "$wt/tools/assets"
  }
  # Locked files whose copy in main isn't the locked version: another task is changing them in main (an art round
  # repainting a portrait before its lock line is updated). Linking those would bring that task's work in, and the
  # commit check would count it as this branch's, so they are fetched from R2 further down instead. Hashes come
  # from sync.py's cache in the common git dir (size + mtime), so only files changed since their last hash are read.
  local changed=()
  if [[ -f "$wt/tools/assets/sync.py" && -f "$wt/tools/assets/assets.lock.json" ]]; then
    mapfile -d '' -t changed < <(python3 -c 'import json, sys; sys.path.insert(0, sys.argv[1]); sys.dont_write_bytecode = True
import sync
lock = json.load(open(sys.argv[3], encoding="utf-8"))["files"]
sync.ROOT = sys.argv[2]  # hash the main checkout copies
cache = sync.load_cache()
have = sync.local_state(sorted(lock), cache)
sync.save_cache(cache)
sys.stdout.write("".join(p + "\0" for p in sorted(have) if have[p][1] != lock[p]["sha256"]))' \
      "$wt/tools/assets" "$main" "$wt/tools/assets/assets.lock.json")
  fi
  local -A skip=()
  local rel store="$main/.claude/worktrees/.assets" old
  for rel in "${changed[@]}"; do
    skip[$rel]=1
    # a link from an earlier setup holds main's old version, or (setups before #148) points at the changed copy:
    # drop it so the locked version can come in
    [[ -L "$wt/$rel" ]] || continue
    old=$(readlink "$wt/$rel")
    if [[ "$old" == "$main/$rel" || "$old" == "$store/"* ]]; then rm "$wt/$rel"; fi
  done

  # Linked: every locked file this worktree lacks, whatever its type or this branch's .gitignore says; and main's
  # other untracked files under the roots that this worktree ignores (so a link never shows up as a new file to
  # commit) and that aren't unpushed assets. Links to locked files git doesn't ignore (the public creator's JSON) do
  # show as untracked; tools/land.sh passes over links to main's same path.
  local counts new_links relinked stored
  counts=$(while IFS= read -r -d '' rel; do
      [[ -n "${skip[$rel]:-}" ]] || printf '%s\0' "$rel"
    done < <({ lock_paths; git -C "$main" ls-files -z --others -- "${roots[@]}" \
                 | git -C "$wt" check-ignore -z --no-index --stdin | not_unpushed; } \
               | sort -z -u | grep -z -v -e '/private/' -e '^private/' -e '__pycache__' -e '\.pyc$') \
    | python3 "$wt/tools/assets/worktree_links.py" "$main" "$wt")
  read -r new_links relinked stored <<<"$counts"
  echo "worktree setup: $wt; $((linked + new_links - relinked)) new links, $relinked repointed to main's current version;" \
    "$stored new read-only copies in $store"

  # The changed ones this worktree lacks: fetch the locked version from R2. Only files this worktree's .gitignore
  # ignores, so a fetched copy never shows up as a file to commit; the others (a locked JSON in a tracked folder)
  # are left out and listed, like any that fail to download.
  local want=() fetch=() left=() out=""
  for rel in "${changed[@]}"; do [[ -e "$wt/$rel" || -L "$wt/$rel" ]] || want+=("$rel"); done
  (( ${#want[@]} )) || return 0
  mapfile -d '' -t fetch < <(printf '%s\0' "${want[@]}" | git -C "$wt" check-ignore -z --no-index --stdin || true)
  if (( ${#fetch[@]} )); then
    out=$(cd "$wt" && python3 tools/assets/sync.py pull "${fetch[@]}" 2>&1) || true
  fi
  for rel in "${want[@]}"; do [[ -e "$wt/$rel" ]] || left+=("$rel"); done
  echo "worktree setup: ${#want[@]} locked file(s) differ in main (another task is changing them there): fetched $(( ${#want[@]} - ${#left[@]} )) from R2 instead of linking"
  if (( ${#left[@]} )); then
    echo "worktree setup: left out ${#left[@]} locked file(s); get one with: python3 tools/assets/sync.py pull <path>"
    printf '  %s\n' "${left[@]:0:20}"
    (( ${#left[@]} <= 20 )) || echo "  ... $(( ${#left[@]} - 20 )) more"
    if [[ -n "$out" ]]; then printf '%s\n' "$out" | tail -n 3 | sed 's/^/  sync.py: /'; fi
  fi
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

gone() {  # gone [--remove]: which worktrees hold nothing that isn't on main, and (with --remove) delete them
  local main; main=$(main_root .)
  local remove=0; [[ "${1:-}" == --remove ]] && remove=1
  local wt="" branch="" lock="" freed=0
  check() {
    [[ -n "$wt" && "$wt" != "$main" ]] || return 0
    [[ -d "$wt" ]] || { echo "gone          $wt: the folder is missing (--remove prunes it)"; return 0; }
    local why="" size
    size=$(du -sh "$wt" 2>/dev/null | cut -f1 || true)
    if [[ -z "$branch" ]]; then why="detached HEAD"
    elif [[ "$lock" =~ pid\ ([0-9]+) ]] && kill -0 "${BASH_REMATCH[1]}" 2>/dev/null; then why="its agent is still running (pid ${BASH_REMATCH[1]})"
    elif compgen -G "/proc/[0-9]*/cwd" >/dev/null && find /proc/[0-9]*/cwd -maxdepth 0 -lname "$wt*" 2>/dev/null | grep -q .; then why="a process is working in it"
    elif git -C "$main" cherry main "$branch" | grep -q '^+'; then why="$(git -C "$main" cherry main "$branch" | grep -c '^+') commit(s) not on main"
    else
      # uncommitted edits to tracked files, and untracked files that aren't links into the main checkout
      local dirty; dirty=$(git -C "$wt" status --porcelain --untracked-files=all | while IFS= read -r l; do
        local f="${l:3}"; [[ "$l" == '??'* && -L "$wt/$f" && "$(readlink "$wt/$f")" == "$main/"* ]] || echo "$f"; done | wc -l)
      (( dirty == 0 )) || why="$dirty uncommitted file(s)"
    fi
    if [[ -n "$why" ]]; then
      echo "keep    $size  ${wt#"$main"/}  ($branch): $why"
    elif (( remove )); then
      git -C "$main" worktree remove --force --force "$wt" && git -C "$main" branch -D "$branch" >/dev/null \
        && echo "removed $size  ${wt#"$main"/}  ($branch)"
    else
      echo "gone    $size  ${wt#"$main"/}  ($branch): everything is on main"
    fi
  }
  while IFS= read -r line; do
    case "$line" in
      "worktree "*) check; wt="${line#worktree }"; branch=""; lock="" ;;
      "branch "*) branch="${line#branch refs/heads/}" ;;
      locked*) lock="$line" ;;
    esac
  done < <(git -C "$main" worktree list --porcelain)
  check
  if (( remove )); then git -C "$main" worktree prune
  else echo "(tools/worktree.sh gone --remove deletes the 'gone' ones and their branches)"; fi
}

case "${1:-}" in
  new) shift; new "$@" ;;
  setup) shift; setup "$@" ;;
  gone) shift; gone "$@" ;;
  *) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
