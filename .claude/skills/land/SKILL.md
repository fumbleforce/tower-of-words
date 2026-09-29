---
name: land
description: Lands a finished task branch or worktree onto main: rebase, run the checks on exactly that commit, fast-forward main. Use it when an agent's work in its own worktree is done and ready to merge. The land script is pending; until it exists, this skill says how to land by hand.
---

# Land a branch

The plan is in notes/productivity-review.md, section 1 (Integration), with Codex's view at the end: one `tools/land.sh <branch>` that takes a lock, rebases the branch on main, runs `npm run check` in that worktree (plus one fast playthrough if game3d/ changed), checks main hasn't moved, then fast-forwards main. On failure it keeps the branch and prints why.

That script doesn't exist yet (tool pending; it waits for the code freeze to end, see collab/to-claude.md for Codex's `release`). Worktrees also need `worktree.baseRef` and a `.worktreeinclude` set up first (same section), which isn't done.

## By hand, until then

The main checkout still has other agents' unsaved work in it, so main is advanced there with a fast-forward merge, which updates only the files the branch changed and refuses if that would overwrite someone's unsaved edit. Never reset, stash or check out in the main checkout.

1. In the task worktree: commit your work (GUIDE: Definition of done).
2. `git rebase main`. Resolve conflicts in your own files only; if a conflict is in another agent's file, stop and report it.
3. In the worktree, on the rebased commit: `npm run check`, and if game3d/ changed, the day test (fast-qa skill).
4. Take the land lock: `mkdir /tmp/claude-1000/land.lock` and write your name to its `owner` file. If it's held, wait and retry; never delete someone else's.
5. In the main checkout: `git merge --ff-only <branch>`. If main moved since step 2 it refuses: release the lock and go back to step 2. If it refuses because of unsaved changes in the main checkout, stop and report which files; they belong to another agent.
6. Release the lock (`rm -r` only if the owner file has your name), remove the worktree and delete the branch.

No push to GitHub unless Jørgen asked (GUIDE: Definition of done).
