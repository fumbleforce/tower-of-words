#!/usr/bin/env bash
# Land one finished task branch on main: rebase it on main, check exactly the rebased commit, fast-forward main,
# then remove its worktree and branch.
#
#   tools/land.sh <branch | worktree path> [--keep]
#
# - One land at a time: takes /tmp/claude-1000/land.lock (waits up to 20 minutes; a lock whose owner process is
#   gone is taken over).
# - Refuses if the worktree has uncommitted or untracked changes, if the rebase conflicts (it is aborted, nothing
#   changes), if the commit checks fail (tools/check/commit-cpu.mjs: a Facts line on every new commit, and
#   `npm run check` on the rebased commit's own tree), or if main moves during the checks three times in a row.
# - main moves with `git merge --ff-only` in the main checkout, which only touches the files the branch changed and
#   refuses rather than overwrite someone's unsaved edit there (it waits while a commit there holds the index).
#   Nothing is pushed.
# - Afterwards the worktree is removed and the branch deleted (--keep leaves both). If the worktree holds new real
#   files under the asset roots (git-ignored, so not in the commit), it is kept and they are listed.
# - The day test is not run here: if game3d/ changed it must already have passed in the worktree (fast-qa skill).
#   What is run, once main has moved and only if game3d/ changed, is the boot check (tools/check/head-boot.mjs, a few
#   seconds): the landed commit's title screen at both sizes. If it fails, land.sh says so loudly, exits 1 and keeps the
#   worktree and branch; main keeps the landed commits (it moved in one fast-forward, never part-way).
set -uo pipefail

LOCK=/tmp/claude-1000/land.lock
WAIT_SECONDS=${LAND_WAIT:-1200}
mkdir -p /tmp/claude-1000
LAND_LOG=$(mktemp /tmp/claude-1000/land-XXXXXX.log)
say() { echo "land: $*"; }
refuse() { echo "land: REFUSED: $*" >&2; exit 1; }

target="${1:-}"; keep=0
[[ "${2:-}" == "--keep" ]] && keep=1
[[ -n "$target" && "$target" != -* ]] || refuse "usage: tools/land.sh <branch | worktree path> [--keep]"

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
main=$(dirname "$(git -C "$script_dir" rev-parse --path-format=absolute --git-common-dir)")
g() { git -C "$main" "$@"; }

# ---------------------------------------------------------------- which branch, which worktree
worktree_of() {  # the worktree that has refs/heads/$1 checked out, if any
  g worktree list --porcelain | awk -v ref="refs/heads/$1" '/^worktree /{p=substr($0,10)} $0=="branch " ref {print p}'
}
if [[ -d "$target" ]]; then
  wt=$(cd "$target" && git rev-parse --show-toplevel) || refuse "$target is not a git worktree"
  branch=$(git -C "$wt" symbolic-ref --quiet --short HEAD) || refuse "$wt has no branch checked out (detached HEAD)"
else
  branch="${target#refs/heads/}"
  g rev-parse --verify --quiet "refs/heads/$branch" >/dev/null || refuse "no branch or worktree called $target"
  wt=$(worktree_of "$branch")
fi
[[ "$branch" != main ]] || refuse "that is main itself"
main_wt=$(worktree_of main)   # usually the main checkout; empty if main isn't checked out anywhere
temp_wt=""

# ---------------------------------------------------------------- the lock
me="land.sh pid=$$ branch=$branch started=$(date +%H:%M:%S)"
mkdir -p "$(dirname "$LOCK")"
waited=0
until mkdir "$LOCK" 2>/dev/null; do
  owner=$(cat "$LOCK/owner" 2>/dev/null || true)
  pid=$(sed -n 's/.*pid=\([0-9]*\).*/\1/p' <<<"$owner")
  if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
    say "taking over a stale lock ($owner)"; rm -rf "$LOCK"; continue
  fi
  (( waited == 0 )) && say "waiting for the land lock ($owner)"
  (( waited >= WAIT_SECONDS )) && refuse "the land lock is still held after ${WAIT_SECONDS}s: $owner"
  sleep 5; waited=$((waited + 5))
done
echo "$me" > "$LOCK/owner"
cleanup() {
  [[ -n "$temp_wt" ]] && g worktree remove --force "$temp_wt" >/dev/null 2>&1
  [[ "$(cat "$LOCK/owner" 2>/dev/null)" == "$me" ]] && rm -rf "$LOCK"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# ---------------------------------------------------------------- a clean worktree to rebase in
if [[ -z "$wt" ]]; then
  temp_wt="$main/.claude/worktrees/land-${branch//\//-}"
  g worktree add --quiet "$temp_wt" "$branch" || refuse "could not check out $branch in a temporary worktree"
  wt="$temp_wt"
fi
# __pycache__ folders are rebuilt by any Python run (npm run check makes some) and never belong in a commit.
# Nor are tools/worktree.sh's links to a locked file git doesn't ignore (creator JSON): into its read-only store
# in main, or (setups before #148) to main's copy.
dirty=$(git -C "$wt" status --porcelain --untracked-files=all | grep -v '^?? \(.*/\)\{0,1\}__pycache__/' \
  | while IFS= read -r line; do
      rel=${line#?? }
      link=""; [[ "$line" == '?? '* && -L "$wt/$rel" ]] && link=$(readlink "$wt/$rel")
      [[ -n "$link" && ( "$link" == "$main/$rel" || "$link" == "$main/.claude/worktrees/.assets/"* ) ]] \
        || printf '%s\n' "$line"
    done)
[[ -z "$dirty" ]] || refuse "$wt has uncommitted or untracked changes; commit them (your own files only) or remove them:
$dirty"
[[ ! -d "$(git -C "$wt" rev-parse --git-path rebase-merge)" && ! -d "$(git -C "$wt" rev-parse --git-path rebase-apply)" ]] \
  || refuse "$wt is in the middle of a rebase"

# ---------------------------------------------------------------- rebase, check, fast-forward
# Agents still commit straight to main in the main checkout, so main may move while we check: up to three rounds.
fast_forward() {  # 0 landed; 1 main moved (go round again); refuses on anything else
  local out tries=0
  while (( tries < 18 )); do  # a commit in the main checkout holds its index.lock for its whole pre-commit (~15 s)
    [[ "$(g rev-parse main)" == "$base" ]] || return 1
    if [[ -z "$main_wt" ]]; then
      g update-ref refs/heads/main "$commit" "$base" && return 0
      return 1
    fi
    out=$(git -C "$main_wt" merge --ff-only --quiet "$commit" 2>&1) && return 0
    if grep -q 'index.lock' <<<"$out"; then tries=$((tries + 1)); sleep 5; continue; fi
    [[ "$(g rev-parse main)" == "$base" ]] || return 1
    refuse "main could not fast-forward in $main_wt (another agent's unsaved edits in the files this branch changes?):
$out"
  done
  refuse "the main checkout's index stayed locked for 90 s (a git command running there?); try again"
}
landed=""
for attempt in 1 2 3; do
  base=$(g rev-parse main)
  if ! git -C "$wt" rebase --quiet main >/dev/null 2>&1; then
    conflicts=$(git -C "$wt" diff --name-only --diff-filter=U)
    git -C "$wt" rebase --abort >/dev/null 2>&1
    refuse "$branch does not rebase cleanly on main; conflicts in:
$conflicts
Rebase it yourself in $wt (resolve only your own files), then land again."
  fi
  commit=$(git -C "$wt" rev-parse HEAD)
  count=$(g rev-list --count "$base..$commit")
  if (( count == 0 )); then
    say "$branch has nothing that main doesn't have"; landed="$base"; break
  fi
  say "checking $count commit(s) on main $(g rev-parse --short "$base"): $(g log --format=%s -1 "$commit")"
  # The checker is the rebased commit's own (the worktree is exactly that commit), so it's the one main will have.
  checker="$wt/tools/check/commit-cpu.mjs"; [[ -f "$checker" ]] || checker="$main/tools/check/commit-cpu.mjs"
  (cd "$main" && node "$checker" "$commit" --since "$base") > "$LAND_LOG" 2>&1 \
    || { tail -40 "$LAND_LOG" >&2; refuse "the commit checks failed on $(g rev-parse --short "$commit") (full log: $LAND_LOG); main is unchanged"; }
  grep -E '^(commit messages|commit CPU):' "$LAND_LOG" | sed 's/^/land: /'
  if fast_forward; then landed="$commit"; break; fi
  (( attempt < 3 )) && say "main moved during the checks; rebasing and checking again"
done
[[ -n "$landed" ]] || refuse "main moved during the checks three times; try again"
[[ "$landed" == "$base" ]] || say "main is now $(g rev-parse --short main) ($count commit(s) from $branch)"
if g diff --quiet "$base" "$landed" -- game3d/; then :; else
  say "game3d/ changed: the day test at both sizes should already have passed in the worktree (fast-qa skill)"
  # Does what main now holds boot? Main has already moved in one step, so a failure can't leave it half-landed; it
  # stops the land loudly instead, keeping the worktree and branch for the fix.
  booter="$wt/tools/check/head-boot.mjs"; [[ -f "$booter" ]] || booter="$main/tools/check/head-boot.mjs"
  node "$booter" "$landed" --record > "$LAND_LOG.boot" 2>&1; boot=$?
  sed 's/^/land: /' "$LAND_LOG.boot"
  if (( boot == 75 )); then
    say "WARNING: the boot check was deferred (machine or GPU busy), so main $(g rev-parse --short "$landed") is unchecked; run: node tools/check/head-boot.mjs $(g rev-parse --short "$landed")"
  elif (( boot != 0 )); then
    echo "land: ============================================================" >&2
    echo "land: MAIN DOES NOT BOOT. $branch landed as $(g rev-parse --short "$landed") and the title screen fails (above)." >&2
    echo "land: main holds the whole branch; fix it now in $wt (kept, with its branch) and land the fix." >&2
    echo "land: ============================================================" >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------- tidy up
if (( keep )) && [[ -z "$temp_wt" ]]; then say "kept $wt and $branch (--keep)"; exit 0; fi
roots=()
if [[ -f "$wt/tools/assets/sync.json" ]]; then
  mapfile -t roots < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["roots"]))' "$wt/tools/assets/sync.json")
fi
new_assets=""
if (( ${#roots[@]} )); then
  while IFS= read -r -d '' rel; do
    [[ -L "$wt/$rel" || "$rel" == *__pycache__* ]] && continue
    new_assets+="  $rel"$'\n'
  done < <(git -C "$wt" ls-files -z --others --ignored --exclude-standard -- "${roots[@]}")
fi
if [[ -n "$new_assets" && -z "$temp_wt" ]]; then
  say "kept $wt: it has git-ignored asset files that aren't links to the main checkout's, so removing it would lose them:"
  printf '%s' "$new_assets"
  say "move or sync them, then: git worktree remove --force $wt && git branch -d $branch"
  exit 0
fi
g worktree remove --force "$wt" || refuse "landed, but could not remove $wt"
[[ "$wt" == "$temp_wt" ]] && temp_wt=""
g branch -D "$branch" >/dev/null && say "removed $wt and branch $branch"
