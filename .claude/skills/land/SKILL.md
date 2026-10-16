---
name: land
description: Lands a finished task branch or worktree onto main with tools/land.sh, through the land queue: queued branches are rebased onto main together, checked once on exactly that commit (a failing batch is split until the bad branch is refused alone), main fast-forwards, the worktrees go. Use it when an agent's work in its own worktree is done and committed. Also says how to start a worktree (tools/worktree.sh) and what to do when a land is refused.
---

# Land a branch

Each writing agent works in its own git worktree and one script puts finished work on main.

## Start

- Claude Code agents: the Agent tool's `isolation: "worktree"` makes `.claude/worktrees/<name>` on branch `worktree-<name>` from local main. First run `tools/worktree.sh setup` in it: it links the locked assets and other git-ignored files from the main checkout. Safe to run twice. Links that show as untracked in `git status` aren't yours to add.
- Codex, or by hand: `tools/worktree.sh new <name>` makes the worktree on branch `wt/<name>` and runs setup.
- Asset links point at read-only copies; to change an asset, delete its link and write a new file.
- Claude Code's Read tool may refuse a link outside the worktree; read the main checkout's path instead.
- Browser runs from a worktree: `BASE=.claude/worktrees/<name>/game3d node game3d/tools/fast.mjs 390 844`.

## Land

1. Commit everything the task changed (GUIDE: Definition of done, with the `Facts:` line).
2. If game3d/ changed, the day test passes at both sizes in the worktree first (fast-qa). land.sh doesn't run the browser.
3. `tools/land.sh <branch or worktree path> [--keep] [--priority]`. `--priority` only for work Jørgen is waiting on.

land.sh queues the branch, rebases the batch onto main, runs the commit checks (Facts lines, `npm run check`) and, if game3d/ changed, the place budgets for places the batch can move. A failing batch is split until the bad branch is refused alone. Then main fast-forwards, landed assets are copied and verified, and the worktree and branch are removed. It prints `land: main is now <sha>`. Nothing is pushed. Logs: `/tmp/claude-1000/land-*/`. How it works: tools/land/.

## When it refuses

- Uncommitted or untracked files: commit yours, delete scratch, land again.
- Rebase conflicts: `git rebase main` in the worktree and resolve conflicts in your own files only; if one is in another agent's file, stop and report it.
- Commit checks failed: it's your branch (the batch was split). Fix, commit, land again.
- Already in the land queue: another land.sh of the branch is running; wait.
- A place or screen is over budget (calls, triangles, memory, load, or p95 frame time at 120 Hz) and worse than on main: bring it down, or add a known exception with an issue in game3d/tools/perf/place-budgets.json (notes/PERF.md, "Place budgets"). Rerun one: `node game3d/tools/perf/place-budget.mjs --places <place or screen>`.
- `NOT MEASURED` in the log is not a refusal: the GPU stayed busy, the land went through, the next land measures those places, and a work tracker issue holds them until then.
- main could not fast-forward: someone has unsaved edits in a file you change. Don't touch them; report the files.
- Kept the worktree for new asset files: sync or move them (notes/asset-lifecycle.md), then remove the worktree as printed. Don't leave worktrees behind (`tools/worktree.sh gone`).
