# Claude, Codex and Grok: how we work together

Three teams work on this repo: Claude (Claude Code, the main session plus its subagents), Codex (the Codex session plus `codex exec` runs) and Grok (Grok Build, this machine). Jørgen directs all three. This file holds who owns the code right now (the code freeze), how to message the other teams (the inboxes), how to claim files, and who leads and who reviews each area. Everything about the game and how he wants work done is in GUIDE.md.

## Right now

- Refactor freeze released by Codex in X-0128 (2026-09-29), through stage 5 commit `42e65dd`. Normal file claims apply again. Codex owns the creator follow-ups named in that entry; Claude may resume the queued engine/UI work. Refactor evidence: notes/refactor-progress.md.

## Channels

- To message Codex, append an entry to `collab/to-codex.md` (Claude agents use `python3 tools/collab/post.py`, which takes the next id under a lock). Codex writes to Claude in `collab/to-claude.md`. To message Grok, append to `collab/to-grok.md`. Grok writes to Claude in `collab/to-claude.md` and to Codex in `collab/to-codex.md`. One inbox each, append only; never edit or delete an earlier entry. The receiver answers in the sender's inbox, quoting the message id.
- Entry format:
  ```
  ## C-0007 · 2026-09-29 14:05 · review
  refs: game3d/story/train.js (commit 5f8bec9)
  Body in plain sentences. What you need, by when, and what "done" means.
  ```
  Ids: `C-` from Claude, `X-` from Codex, `G-` from Grok. Claude and Codex number in order in their own file. Grok uses one sequence across both inboxes, and a note posted to both teams keeps the same id. Types: `ask` (do a task), `review` (check work), `answer`, `claim` (I'm taking these files), `release`, `done`, `blocked`.
- Claude watches `to-claude.md` and wakes on every new entry. Codex reads `to-codex.md` at the start of each turn and before starting new work; main Codex sessions register for automatic wake delivery as described in [tools/collab/README.md](../tools/collab/README.md). Grok reads `to-grok.md` at the start of each turn and before starting new work; a main Grok session wakes from new entries when its turn ends, as described in [tools/collab/README.md](../tools/collab/README.md).
- Fast path: Claude can run a headless Codex job directly (`codex exec -C /home/jorgen/repo/japanese -s workspace-write "..."`). Use it for self-contained asks and reviews that need an answer in minutes. The job's final message is its answer; it also appends a `done` entry to `to-claude.md`.
- Waking Codex: append the entry to `collab/to-codex.md`; the installed watcher queues the pointer automatically. Installation, session binding, delivery behavior and controls: [tools/collab/README.md](../tools/collab/README.md). The inbox stays the record; the queued message is only a nudge.
- Waking Grok: append the entry to `collab/to-grok.md`. The session hook delivers the new ids when Grok's turn ends, and does not interrupt a running turn. Details: [tools/collab/README.md](../tools/collab/README.md). The inbox stays the record.
- Private work (reward scenes, encounters, private mode, the private folder) has its own append-only channel, `collab/private.md`, git-ignored. Don't mention its content in these inboxes or any public doc.
- Decisions for Jørgen go to the Review section (reviews/README.md), never into these inboxes.

## Sharing the repo

- Every task, request, decision follow-up and parked item is a GitHub issue labelled work (https://github.com/fumbleforce/tower-of-words/issues?q=label%3Awork), kept with python3 tools/work.py. Update it when you start, park or finish; a commit that finishes one says "Fixes #N"; run python3 tools/work.py stale before reporting.
- Ship small and often (Jørgen, 2026-10-10: "make it understand it is supposed to commit and ship things regularly"). Commit each working step in your worktree as you go and land it the same day; a lane with no landed commit for a day isn't working. At most 4 lanes per team, and finish what you have before opening another. A progress note is not progress: `tools/work.py stale` flags a running issue that has no commit naming it for 12 h. Work not landed within a day may be taken over and ported by another team.
- Code work happens in a worktree (`tools/worktree.sh new <name>`, or the Agent tool's worktree isolation) and lands with `tools/land.sh`; the shared checkout is for docs, inbox and review items only. A worktree goes as soon as its work is landed, dropped or handed over, to free the disk: land.sh removes it, and `--keep` isn't a place to hold captures (put them in the bible or the Review item first). When a worker stops or is interrupted, and at each check, run `tools/worktree.sh gone` and remove what it lists as gone with `--remove`. Anything it keeps is still in use or holds work to land or drop; deal with it, don't leave it.
- Claude sessions name themselves (Jørgen, 2026-10-05: "make the claudes name themselves better"). Two Claude sessions run at once and both numbered from `C-`, which collided (C-0436 to C-0438 exist twice). Each session has one fixed name, says it in the first line of every entry body ("claude-main: ..." / "claude-private: ..."), and takes its ids from its own prefix: `claude-main` (the game, tools, engine, day-2 build) uses `C-`, `claude-private` (reward scenes, encounters, private mode, collab/private.md) uses `CP-` with its own count. A session's agents write as `<session>/<agent>` (`claude-private/encounter-pictures`). Agents that can't write the inbox are posted by their session, which says so. Never reuse an id; a clash is corrected by a new entry.
- Claim before editing a file another team may touch: a `claim` entry naming the files and who holds them (`claude-main`, `claude-private`, `claude-agent:<task>` or `<session>/<agent>`, `codex-tui`, `codex-exec:<task>`, `grok-main`, `grok-agent:<task>`), and a `release` when committed. The first claim wins; ask before editing claimed files.
- Commit your own hunks only (`git add -p`), and don't push unless Jørgen asked. Commit messages say which team made them.
- GPU and headless browser: use the locks in GUIDE (Engineering, GPU lock and Headless browser runs); all three teams follow them.
- Work issues can be owned by `grok` as well as `claude-main`, `claude-agent:<name>`, `codex` and `jorgen` (`python3 tools/work.py`). The repo is public, so an issue still cannot name a private path.
- Say each fact once (GUIDE, Process). Don't copy GUIDE rules into the inboxes or other docs; link to them.

## Who leads what

A starting split between Claude and Codex. Grok does not take a lead from this list unless Jørgen assigns it. Jørgen can change the split, and any team can propose a change in the inboxes.

Cost rule (Jørgen, 2026-09-30): "Reserve codex for more detail passes, review and creative writing, it is more expensive". Claude does the bulk building: modelling, places and trips integration, engine, UI, tools and fixes. Codex takes creative writing, detail passes on finished work, and reviews. When in doubt, Claude builds and Codex reviews.

- Story, dialogue, characters (writing): Codex leads (Jørgen's pick after the day-2 contest, 2026-09-29). Claude reviews as a cold first-time reader: does it make sense, is anything unexplained, too long, or contradicting the setting?
- Engine, systems, performance, tools: Claude leads; Codex reviews.
- UI design (UI and UX): Claude leads; Codex reviews for implementation cost and bugs.
- 3D modelling, rigging, Blender pipeline: Claude leads; Codex reviews.
- Concept images and portraits: both lead, as separate attempts in one review round; Jørgen picks.
- Language content (words, pacing, audit): who leads is decided after the competition; Codex reviews the data and the audit tooling.
- Reward scenes and private mode: Claude leads (Jørgen, 2026-10-05: "take grok's work off his hands ... re-direct future private collab in collab/private.md"; before that Grok led, from 2026-10-01). Everything about them is discussed in `collab/private.md`, not in the other inboxes. Codex and Grok stay out of that area unless Claude asks for a review there.
- QA playthroughs: whoever changed it runs the fast test; the other team runs the cold-player pass.

Every change of real size gets a review from the other team before it's called done: send a `review` entry with the commit and what to check. The reviewer answers with concrete findings (file:line, what breaks, how to see it), or "no findings".

## Creative work in pairs

For writing and design, try two independent drafts before merging: each team makes its own version of a scene, screen or model without seeing the other's, then both read both and one merged version goes forward (or both go to Jørgen's Review section if they differ in direction). Each draft notes the GUIDE rules it was checked against.
