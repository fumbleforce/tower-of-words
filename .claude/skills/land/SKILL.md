---
name: land
description: Lands a finished task branch or worktree onto main with tools/land.sh, through the land queue: queued branches are rebased onto main together, checked once on exactly that commit (a failing batch is split until the bad branch is refused alone), main fast-forwards, the worktrees go. Use it when an agent's work in its own worktree is done and committed. Also says how to start a worktree (tools/worktree.sh) and what to do when a land is refused.
---

# Land a branch

Each writing agent works in its own git worktree on its own branch, and one script puts finished work on main. The plan and its reasons: notes/productivity-review.md, section 1 (Isolation and integration).

## Start

- Claude Code agents: the Agent tool's `isolation: "worktree"` makes `.claude/worktrees/<name>` on a new branch `worktree-<name>` from local main (`worktree.baseRef: head` in .claude/settings.json), with node_modules linked and .env copied. First thing in it, run `tools/worktree.sh setup`: it links every locked asset (tools/assets/assets.lock.json: the binaries and the creator's JSON) and the other git-ignored files under the asset roots (Meshy originals, music, voice models) from the main checkout, but never an unpushed asset there (another task's work in progress). It's safe to run twice. Links to locked files that git doesn't ignore show as untracked in `git status`; don't add them, land.sh passes over them.
- Codex, or by hand: `tools/worktree.sh new <name>` makes `.claude/worktrees/<name>` on branch `wt/<name>` from main and runs setup.
- The asset links point at read-only copies of the main checkout's files (in `.claude/worktrees/.assets/`), so writing through one fails with "Permission denied". To change an asset, delete its link and write a new file.
- Claude Code's Read tool may refuse a link that points outside the worktree; read the main checkout's path instead. Node, Python and the review server follow the links.
- Headless browser runs from a worktree go through the review server: `BASE=.claude/worktrees/<name>/game3d node game3d/tools/fast.mjs 390 844`.

## Land

1. In the worktree, commit everything the task changed (GUIDE: Definition of done; every commit needs its `Facts:` line). Nobody else's edits are in your tree, so `git add` of your files is enough.
2. If game3d/ changed, the day test must pass at both sizes in the worktree first (fast-qa skill). land.sh doesn't run the browser.
3. `tools/land.sh <branch or worktree path> [--keep] [--priority]` (from anywhere; code in tools/land/). Landing goes through one queue (#389):
   - It refuses at once if the worktree has uncommitted or untracked files, then joins the queue (`.git/land-queue/`). The queue lands in the order branches joined; `--priority` puts a branch first. Use it only for work Jørgen is waiting on.
   - Whichever land holds the land lock (`/tmp/claude-1000/land.lock`, the lock older copies of land.sh take too) lands everything waiting as one batch, up to six branches. The others print `waiting for the land lock`, then their own lines as the batch runs, and exit with their own result. A waiting land gives up after an hour (`LAND_WAIT`, seconds).
   - The batch's branches are rebased one after another onto main in `.claude/worktrees/land-candidate`, a detached worktree land.sh keeps. Your branch isn't touched until it lands. A branch that doesn't rebase cleanly on main and the branches ahead of it is refused alone.
   - The checks run once, on the batch's last commit: a valid Facts line on every new commit and `npm run check` on that commit's own tree (its tools/check/commit-cpu.mjs, about 100 s). If game3d/ changed, the place budgets run too (game3d/tools/perf/place-budget.mjs; notes/PERF.md, "Place budgets"), but only for the places the batch can move (a place that is already over on main doesn't block a land that can't move it). A place reuses its last pass when nothing changed since then can move it (tools/land/impact.mjs: its own modules and the files they name; shared game code, the budget tool or an unknown file re-measures every place; notes, reviews, docs, tests, sound and the opening re-measure none).
   - If the checks fail, the batch is split in halves and each half is tried again, down to single branches, so one bad branch is refused and the rest still land.
   - main fast-forwards in the main checkout through the whole batch (waiting while a commit there holds the index). If main moved during the checks (a commit straight to main), the batch is rebased and checked again, up to five rounds. The commit checks rerun every round, but the place budgets usually reuse their passes.
   - Then, branch by branch, the landed locked assets are copied into main and verified (tools/check/landed-assets.mjs). If game3d/ changed, the boot check runs once on what main now holds (tools/check/head-boot.mjs).
   - Each worktree is removed and its branch deleted. `--keep` leaves them; remove them as soon as you can (collab/PROTOCOL.md, Sharing the repo; `tools/worktree.sh gone` lists what's safe). A branch that got new commits while it waited is kept, and only the commits that were queued land.

It prints `land: main is now <sha>` and `removed ...` when done. Nothing is pushed (GUIDE: Definition of done). Check logs stay in `/tmp/claude-1000/land-*/`.

## When it refuses

- Uncommitted or untracked files: commit your own, delete scratch files, and land again.
- Rebase conflicts: it lists the files (and names the branches landing ahead of yours, if the conflict may be with them). Run `git rebase main` in the worktree yourself and resolve conflicts in your own files only; if a conflict is in another agent's file, stop and report it.
- Commit checks failed: the output shows the failing check (log path included). The batch was split until your branch failed alone, so it is your branch's failure. Fix, commit, land again. main is unchanged by it.
- Already in the land queue: another land.sh of the same branch is still waiting or running; wait for it.
- A place is over its budget: the output names the place, the tier, the number and the budget. Bring it down, or, if it has to go over for now, add a known exception with an issue in game3d/tools/perf/place-budgets.json (notes/PERF.md, "Place budgets"). To rerun just that place: `node game3d/tools/perf/place-budget.mjs --places <place>`.
- main could not fast-forward in the main checkout: someone has unsaved edits in a file your branch changes. Don't touch them; report the files.
- Kept the worktree because of new asset files: they're git-ignored, so the commit doesn't carry them. Sync or move them as the asset storage notes say, then remove the worktree as printed.
