# Claude, Codex and Grok: how we work together

Three teams work in this repo: Claude (the main sessions and their subagents), Codex (the Codex session and `codex exec` runs) and Grok (Grok Build). Jørgen directs all three.

## Right now

No code freeze is active, and normal file claims apply. A freeze, when there is one, is announced here.

## Channels

- One inbox per team, append only. Never edit or delete an earlier entry. To Claude: `collab/to-claude.md`. To Codex: `collab/to-codex.md`. To Grok: `collab/to-grok.md`. The receiver answers in the sender's inbox, quoting the message id. Claude agents post with `python3 tools/collab/post.py`, which takes the next id under a lock.
- Entry format:
  ```
  ## C-0007 · 2026-09-29 14:05 · review
  refs: game3d/story/train.js (commit 5f8bec9)
  Body in plain sentences. What you need, by when, and what "done" means.
  ```
  Types: `ask`, `review`, `answer`, `claim`, `release`, `done`, `blocked`.
- An entry body is at most 1,500 characters. Put longer details in a local note, `collab/notes/<id>.md`, and link it in `refs`. When an inbox passes 150 KB, `post.py` moves its oldest entries word for word to `collab/archive/<inbox>-<yyyy-mm>.md` until it is under 100 KB (`post.py --rotate` does that without a post). Archived ids are never reused. `post.py` enforces this for Claude, and Codex and Grok keep to it by hand.
- Under `collab/`, only this file is tracked. The inboxes, notes and archive are git-ignored and stay in the main checkout.
- Ids: `claude-main` (the game, tools, engine) uses `C-`, and `claude-private` (reward scenes, encounters, private mode) uses `CP-`. Codex uses `X-`. Grok uses `G-`, one sequence across both inboxes. Each Claude session names itself in the first line of every entry body ("claude-main: ..."), and its agents write as `<session>/<agent>`. Never reuse an id; fix a clash with a new entry.
- Claude wakes on every new entry in its inbox. Codex and Grok read theirs at the start of each turn and before new work. The wake hooks only nudge, and the inbox is the record ([tools/collab/README.md](../tools/collab/README.md)).
- Fast path: Claude can run a headless Codex job (`codex exec -C /home/jorgen/repo/japanese -s workspace-write "..."`) for a self-contained ask or review. Its final message is its answer.
- Private work (reward scenes, encounters, private mode) uses its own git-ignored, append-only channel, `collab/private.md`. Its content never goes in these inboxes or any public doc.
- Decisions for Jørgen go to Review (reviews/README.md), never into the inboxes.

## Sharing the repo

- The work tracker rule is in GUIDE (Process, Work tracker). Issues can be owned by `claude-main`, `claude-agent:<name>`, `codex`, `grok` or `jorgen`.
- Ship small and often. Commit each working step in your worktree and land it the same day. A lane with no landed commit for a day isn't working, and another team may take it over. At most four lanes per team, and finish what you have before opening another. `tools/work.py stale` flags a running issue with no commit naming it for 12 h.
- Code work happens in a worktree (`tools/worktree.sh new <name>` or the Agent tool's worktree isolation) and lands with `tools/land.sh` (land skill). The shared checkout is for docs, inboxes and review items only. A worktree goes as soon as its work is landed, dropped or handed over. When a worker stops, and at each check, run `tools/worktree.sh gone` and remove what it lists with `--remove`. Deal with anything it keeps.
- Claim before editing a file another team may touch: a `claim` entry naming the files and the holder (`claude-main`, `claude-private`, `<session>/<agent>`, `codex-tui`, `codex-exec:<task>`, `grok-main`, `grok-agent:<task>`), then a `release` when committed. The first claim wins; ask before editing claimed files.
- Commit messages say which team made them.
- GPU and headless browsers: [notes/tools/gpu.md](../notes/tools/gpu.md).

## Who leads what

Jørgen can change this split. Grok leads only what he assigns.

Codex is more expensive, so it does creative writing, detail passes on finished work, QA and review. Claude does the bulk building: modelling, places, engine, UI, tools, image work and fixes, and starts Codex jobs itself with `codex exec`, handing it the next one when a run ends. When in doubt, Claude builds and Codex reviews.

- Story, dialogue and characters: Codex writes. Claude reviews as a cold first-time reader: does it make sense, is anything unexplained, too long, or against the setting?
- Engine, systems, performance, tools, UI, 3D modelling and the Blender pipeline: Claude leads. Codex reviews for bugs and implementation cost.
- Concept images and portraits: both make separate attempts in one review round, and Jørgen picks.
- Language content: Codex reviews the data and the audit tooling.
- Reward scenes and private mode: Claude leads, in `collab/private.md`. Codex and Grok stay out unless Claude asks for a review.
- QA playthroughs: whoever changed it runs the fast test, and the other team runs the cold-player pass.

Codex's own standing duties:

- Quality control across code structure, plans, narratives and project processes. Write focused reports backed by evidence. Track defects as work issues, and put decisions for Jørgen in Review.
- Help from Claude on Codex work doesn't move responsibility. Codex resolves blockers, verifies and lands its own work, and Jørgen should never have to chase it.
- When Claude is out of usage, Codex picks up outstanding feedback work itself, up to four lanes, with separate Codex reviewers, without waiting for Claude.

Every change of real size gets a review from the other team before it's called done: a `review` entry with the commit and what to check. The reviewer answers with concrete findings (file:line, what breaks, how to see it) or "no findings".

## Creative work in pairs

For writing and design, try two independent drafts first, one per team. Then both read both and merge one version, or send both to Jørgen's Review if they differ in direction. Each draft notes the GUIDE rules it was checked against.
