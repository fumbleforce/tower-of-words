#!/usr/bin/env bash
# Land finished task branches on main through the land queue (#389): tools/land/land.mjs.
#
#   tools/land.sh <branch | worktree path> [--keep] [--priority]
#
# The land joins one queue (under the shared .git, tools/land/queue.mjs). Whichever land holds the land lock
# (/tmp/claude-1000/land.lock, the same lock earlier versions of this script took, so a land already running finishes
# first) lands everything waiting as one batch: the branches rebased one after another onto main, the checks run once
# on the result, and main fast-forwarded through all of them; a batch that fails is split in halves until the bad
# branch is refused alone (tools/land/runner.mjs). Waiting lands print their own output and exit with their result.
# --priority puts the branch at the front of the queue; --keep leaves the worktree and branch after landing.
# The checks, what is reused and when it refuses: .claude/skills/land/SKILL.md.
# Always run the main checkout's copy, so a land started from an older worktree batches everyone with today's rules.
here="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
main="$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")"
[ -f "$main/tools/land/land.mjs" ] && here="$main/tools"
exec node "$here/land/land.mjs" "$@"
