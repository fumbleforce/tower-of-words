---
name: land
description: Lands a finished task branch or worktree onto main with tools/land.sh: rebase, run the commit checks on exactly that commit, fast-forward main, remove the worktree. Use it when an agent's work in its own worktree is done and committed. Also says how to start a worktree (tools/worktree.sh) and what to do when a land is refused.
---

# Land a branch

Each writing agent works in its own git worktree on its own branch, and one script puts finished work on main. The plan and its reasons: notes/productivity-review.md, section 1 (Isolation and integration).

## Start

- Claude Code agents: the Agent tool's `isolation: "worktree"` makes `.claude/worktrees/<name>` on a new branch from local main (`worktree.baseRef: head` in .claude/settings.json), with node_modules linked and .env copied. First thing in it, run `tools/worktree.sh setup`: it links the git-ignored asset files (Meshy originals, music, and after the asset move every binary) from the main checkout. It's safe to run twice.
- Codex, or by hand: `tools/worktree.sh new <name>` makes `.claude/worktrees/<name>` on branch `wt/<name>` from main and runs setup.
- The asset links point at the main checkout's files. To change an asset, delete its link and write a new file; never write through the link.
- Headless browser runs from a worktree go through the review server: `BASE=.claude/worktrees/<name>/game3d node game3d/tools/fast.mjs 390 844`.

## Land

1. In the worktree, commit everything the task changed (GUIDE: Definition of done; every commit needs its `Facts:` line). Nobody else's edits are in your tree, so `git add` of your files is enough.
2. If game3d/ changed, the day test must pass at both sizes in the worktree first (fast-qa skill). land.sh doesn't run the browser.
3. `tools/land.sh <branch or worktree path>` (from anywhere). It:
   - takes the land lock (`/tmp/claude-1000/land.lock`; it waits while another land runs),
   - refuses if the worktree has uncommitted or untracked files,
   - rebases the branch on main (a conflicting rebase is aborted and refused),
   - checks the rebased commit: a valid Facts line on every new commit and `npm run check` on that commit's own tree in a throwaway copy (tools/check/commit-cpu.mjs, about 15 s),
   - fast-forwards main in the main checkout, retrying once if main moved during the checks,
   - removes the worktree and deletes the branch. `--keep` leaves them.

It prints `land: main is now <sha>` and `removed ...` when done. Nothing is pushed (GUIDE: Definition of done).

## When it refuses

- Uncommitted or untracked files: commit your own, delete scratch files, and land again.
- Rebase conflicts: it lists the files. Run `git rebase main` in the worktree yourself and resolve conflicts in your own files only; if a conflict is in another agent's file, stop and report it.
- Commit checks failed: the output shows the failing check (log path included). Fix, commit, land again. main is unchanged.
- main could not fast-forward in the main checkout: someone has unsaved edits in a file your branch changes. Don't touch them; report the files.
- Kept the worktree because of new asset files: they're git-ignored, so the commit doesn't carry them. Sync or move them as the asset storage notes say, then remove the worktree as printed.
