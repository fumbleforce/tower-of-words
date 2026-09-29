# Productivity and quality review

2026-09-29, by a Claude agent, for Jørgen (asked: "review the project, what other tools, techniques, skills etc should we be using to get maximum productivity and quality"). Picks go in review item `productivity-review`. Nothing here is set up yet. OpenViking (knowledge retrieval) is being trialled separately in notes/openviking-trial.md, so it isn't covered here.

What I read: GUIDE.md, collab/PROTOCOL.md and both inboxes, docs/game/README.md, notes/architecture-review.md, notes/refactor-progress.md, notes/asset-storage-proposal.md, TODO.md, notes/HANDOFF.md, the 172 commits since yesterday, the review queue, tools/lib/browser-job.mjs, tools/check/, the unused asset hook, and the Codex CLI's own help.

## What went wrong today, with evidence

- One working tree for everyone. `git status` in the main checkout shows 358 changed or untracked paths right now. f324524 staged hunks whose context had been shifted by other agents' unsaved edits, so the committed lobby.js and office.js didn't parse, while the working tree (which every test ran against) was fine. HEAD didn't boot from 11:02 until ba601a3 at 12:25. notes/production-requests.md records a builder committing another agent's hunks in train.js the day before. No test ever looked at what was actually committed.
- Browser tests. tools/lib/browser-job.mjs takes the one exclusive `gpu.lock` for a GPU browser run, so only one test at a time gets the GPU and everything else falls back to SwiftShader (software GL), which burns 6 to 8 cores per run. Any ComfyUI job holding the lock pushes every test onto the CPU as well. Fast mode (`?test=fast`) still renders every frame at full quality with post-processing on.
- No gate on HEAD. `npm run check` exists now (Codex, fbfd412) and fails properly, but nothing runs it on commit or push. The asset pre-commit hook (tools/assets/hooks/pre-commit) is written but not installed. The overnight push was blocked three times by GitHub secret scanning on a vendored bundle, and only Jørgen could click it through.
- Scripts in /tmp. 326 .py/.mjs/.sh files sit in this project's Claude scratchpads under /tmp, which is tmpfs and is wiped on reboot. The voice clip generator (gen2.py, check2.py, export2.py) is one of them.
- Feedback drift. GUIDE.md is 274 lines. About 60% of it is from the VN, pixel-art and Godot eras (reward prompts, PixelLab sprite sizes, the Godot engine choice) and no longer applies to game3d, but every agent reads it all. His exact words get paraphrased when they are passed along (left/right, "smooth"). Review answers sit in feedback.json until someone runs `tools/review.py list`.
- Noise. Every subagent's final report lands in the coordinator's chat. 29 of the last 172 commits are handoffs, build stamps and notes.
- Codex idles. Its interactive session only works when Jørgen types into it. Headless `codex exec` runs were refused by Claude Code's permission check. The inbox protocol also has no guard on ids (two entries were both C-0047).

## Ranked recommendations

Ranked by impact per unit of effort. "Now" means it can start during the code freeze, because it touches no game code and none of Codex's claimed files. "After release" means it waits for Codex's `release` in collab/to-claude.md. Costs are money; all of these use tools already on the machine or free ones.

| # | What | Fixes | Effort | Now or after release |
|---|---|---|---|---|
| 1 | Worktree per writing agent, plus one `land` script that merges to main | Hunk sweeping, broken HEAD, 358-path working tree | Half a day | Now for art, tools and docs agents; game code after release |
| 2 | Check the committed snapshot, not the working tree (install the pre-commit hook, add a staged syntax check, and a "does HEAD boot" check after every commit) | f324524-type breaks, binaries in git, secret-scan blocks | 2 to 3 hours | Now |
| 3 | Jørgen's words logged verbatim by a hook, and new Review answers pushed into the coordinator's next turn | Paraphrased feedback, Review answers missed for an hour | 1 to 2 hours | Now |
| 4 | Project agent definitions (.claude/agents) with fixed briefs, a definition of done and a short report format | Repeated briefing, noisy long reports, steps skipped | Half a day | Now |
| 5 | Project skills for recurring jobs (post a review item, portrait round, voice clips, fast QA, land) | Re-deriving pipelines, scripts left in /tmp | 1 day, spread out | Now |
| 6 | GPU slots for browser tests, and a lighter render in fast mode | Load 40+, software GL, 1.5 h queues | Half a day | Slots now in the lock helper if Codex agrees (tools/lib is refactor tooling); render changes after release |
| 7 | Wake Codex automatically: `codex queue` into its running session when to-codex.md gets an entry; allowlist `codex exec` in its own worktree | Codex idling, blocked headless runs | 1 to 2 hours | Now (needs Jørgen's OK for the permission change) |
| 8 | GUIDE diet: a short "rules in force" file, the old eras archived, per-folder CLAUDE.md files | Facts buried (the commute mistake), agents reading stale rules | Half a day | Now |
| 9 | Nightly local QA run with one morning digest | Checks run ad hoc, regressions found by Jørgen | Half a day | Runner now; new checks after release |
| 10 | Story property tests (random walks through the real Runner) | Softlocks, unreachable goals, broken saves on odd paths | 1 day | After release (best done by Codex, who owns the Runner work) |
| 11 | Playtest telemetry: where players get stuck | Guessing what is too hard | 1 day | After release |
| 12 | Image QA in one command after every render | Glasses, red rim, matte holes and headroom found by Jørgen | 1 day | Now |
| 13 | Visual regression on fixed beat shots | Visual breaks between builds | 1 day | After release |
| 14 | GitHub Actions running `npm run check` on push | A backstop if the local hooks are skipped | 1 hour | Now |

The top five by my judgement are 1, 2, 3, 4 and 6. Items 1 and 2 together would have prevented the worst event of the day.

## 1. Isolation and integration

Worktrees. Claude Code's Agent tool can start a subagent with `isolation: "worktree"`: it gets its own checkout on its own branch, and the worktree is removed afterwards if nothing changed. Codex can run `codex exec -C <worktree>` the same way. Each agent then commits everything it changed with no `git add -p`, because nobody else's edits are in its tree.

Three things to set first for this repo (checked against the Claude Code docs):

- Base. Worktrees branch from `origin/HEAD` by default. Main is 61 commits ahead of origin right now, so an agent would start from a day-old game. Set `worktree.baseRef` to `head` in the project settings.
- Ignored files. A fresh worktree has none of the git-ignored files the game and tools need: node_modules (91 MB), art/approved/{mio,mc}/meshy/ (66 MB) and art/approved/music/ (7 MB). Claude Code copies files matching a `.worktreeinclude` file (gitignore syntax) into each new worktree; list those four folders there. There is no worktree-create hook for git, so Codex's worktrees need the same copy from a small script. Once R2 stage 2 lands, `tools/assets/sync.py pull` does the job.
- Size and scanners. Worktrees live in `.claude/worktrees/`, inside the repo. Add that folder to .gitignore and exclude it in tools/assets/scan.py and the bible's scrapers, or they will list every asset once per worktree. Each checkout is about 870 MB of tracked files (the object store is shared); with 1.1 TB free that's fine, and the R2 move makes it much lighter.

Integration. GitHub's merge queue is not available here: the repo belongs to a personal account (checked: owner type User), and merge queues need an organisation-owned repo. The local equivalent is simple and fits better anyway:

- `tools/land.sh <branch>` takes a lock (`/tmp/claude-1000/land.lock`), rebases the branch on main, runs `npm run check` in that worktree (CPU, under a minute), then fast-forwards main. If the branch touches game3d/, it also runs one fast playthrough on the GPU before landing. On failure it refuses and prints why.
- The main checkout becomes integration only: the review server serves it, nobody edits in it, and it always equals main. The coordinator's own small edits (reviews, GUIDE) go through a worktree too, or through a single "docs" worktree it keeps.
- Branch per task (`claude/<task>`, `codex/<task>`), deleted after landing. File claims in the inbox become less important, since conflicts now show up at rebase time instead of silently. Keep claims for the big refactor windows.

Trade-off: rebase conflicts become visible work for agents, where today they were invisible damage. Two agents rewriting the same 900-line main.js will still collide; worktrees make that loud, and it is one more reason to split the big files.

## 2. Gate what is committed

- Install the existing hook (tools/assets/install-hook.sh sets `core.hooksPath`). It already refuses binaries, private paths and oversized text files. That alone stops QA screenshots (134 MB of today's commits) going into git.
- Add a staged-snapshot syntax check to the same pre-commit: export the index (`git checkout-index -a --prefix=<tmp>/`) and run tools/check/syntax.mjs on it. A few seconds. This is exactly the check f324524 needed.
- "Does HEAD boot" after every commit: a post-commit hook starts a background job that checks out HEAD into a scratch worktree, runs `npm run check` plus the registration browser check, and writes PASS or FAIL to a status file that the statusline and the coordinator see. The hook itself returns at once.
- Secrets: add gitleaks (free, one binary) to pre-push, so a flagged file is caught before GitHub blocks the push at 00:38 with nobody awake to click.
- commit-msg: check the `Facts:` trailer (GUIDE, Process), which is currently checked by nobody.

Hooks are easy to skip (`--no-verify`). The land script and the nightly run are the backstops.

GitHub Actions (item 14): the repo is public, so standard runners are free. One workflow running `npm ci && npm run check` on push takes about 2 minutes and needs no GPU or ignored assets. Worth the hour as a backstop, but it only sees pushes, which happen every two hours at most. Don't add a self-hosted runner on this machine: on a public repo, pull requests from forks could run code on it.

## 3. Testing

Browser tests without the load. Three changes, in order of payoff:

1. GPU slots instead of one GPU lock for browsers. A headless Chromium on Vulkan uses a few hundred MB of VRAM. Give browser runs N slots (say 4, as `/tmp/claude-1000/gpu-slot.<n>`) that share the GPU with each other, and let an image or TTS job take the whole GPU only when it needs it (it takes all slots, or checks free VRAM with nvidia-smi before starting). Browser tests then stop falling back to SwiftShader, the likely main cause of the load of 40.
2. Cheap rendering in test mode. In `?test=fast`, render at device pixel ratio 1 and a smaller canvas, skip post-processing and shadows, and draw only every few frames. The story, movement and goal checks don't need pretty frames. Screenshots switch full quality back on for the one frame they capture.
3. A no-render path for logic. Most of what the fast test proves (the day completes, goals are always reachable, no softlock) can run in Node against the Runner and sim with a stub renderer, the way choice-check.mjs already runs the Runner. That takes seconds and no browser at all. Keep the browser run for boot, input and visuals.

Story property tests (item 10). With fast-check (npm, free, works with node:test) generate random choice sequences through the real Runner and assert: every walk reaches the day's end; there is always a reachable next goal; every flag read is set somewhere; saving at a random step and loading reproduces the same continuation. fast-check shrinks a failing walk down to the shortest one, which makes the bug report readable. This fits naturally after Codex's stage 2c (conditions and state extracted) and its checkpoint work.

Save compatibility. game3d/test/fixtures/save-v1.json and the save tests exist. Make it a rule: any change to the save format adds a fixture from the previous build, and all fixtures must load. Cheap once the rule is written down.

Visual regression (item 13). game3d/tools/beat-shots.mjs already shoots beats against an approved set. Add a pixel diff (pixelmatch or odiff, both free) with a tolerance, keep baselines out of git (the ignored qa folder now, R2 later), and post a diff sheet to Review only when something changed beyond the tolerance. It won't judge quality; it tells you what moved.

Playthrough bots. The fast driver exists. Add routes: the alternate gate and lunch routes, a "slow reader" route with real-time text, and a "wrong answers" route that tries every wrong word first. Each is a small driver config, not a new tool.

## 4. Claude Code features that fit

- Hooks (in `.claude/settings.json`, shared by every agent):
  - UserPromptSubmit: append Jørgen's message, verbatim with a timestamp, to `notes/feedback-log/<date>.md`, and add a line of context when `tools/review.py list` shows NEW feedback. This is item 3: agents quote the log instead of retelling, and new Review answers reach the coordinator on its very next turn.
  - PreToolUse on Bash: refuse `git commit` in the main checkout once worktrees are in use, refuse `git add -A`/`git add .`, and refuse `rm -r` on a lock whose owner file isn't the caller's.
  - PostToolUse on Write/Edit of `collab/to-codex.md`: queue the new entry to Codex's session (item 7).
  - Stop and SubagentStop: warn if the agent leaves scripts in its scratchpad that aren't in tools/, or ends with uncommitted changes in its worktree.
- Agent definitions in `.claude/agents/*.md` (item 4): builder, art-round, cold-player, visual-critic, story-reader, reviewer. Each file fixes what to read first (only the docs for its area), its tools, whether it runs in a worktree, the definition of done (below) and a report of at most ten lines with a file path for detail. The coordinator then launches "art-round: Kenji round 4, one change: hair" instead of pasting a page of brief each time, and nothing gets forgotten in the brief.
- Project skills in `.claude/skills/` (item 5), one per recurring job, each pointing at a script in tools/:
  - `post-review` (write review.json, show every attempt, run the bible check, one-line pointer to chat)
  - `portrait-round` (shot-staging note, quality tags, red-rim negative, framecheck, image QA, contact sheet, review item)
  - `voice-clips` (the ln-* pipeline moved into tools/voice/, pitch guard, loudness)
  - `fast-qa` (both viewports, GPU slot, where the artifacts are, how to read a FAIL)
  - `land` (item 1)
  - `feedback-relay` (quote his words and point at the thing he means; no intensifiers).
  The GUIDE rules they apply stay in GUIDE and are linked, not copied.
- Built-in skills: run `/code-review` on each branch before landing, and `/simplify` on the big-file splits after the freeze. `/security-review` is worth running once on tools/review_server.py and the bible's private-scope handling, since the repo is public and island/private must never leak.
- Workflow tool for fan-out checks on a build: cold-player on phone, visual critic, story reader and Japanese checker in parallel, merged into one scored report. That replaces four separate reports to the coordinator with one.
- Output style: a custom style in `.claude/output-styles/` for the coordinator (short replies, links not dumps, no restating agent reports) cuts the chat Jørgen reads. Claude Code has no setting to silence background-agent notifications, so short reports (agent definitions) and the digest file do most of the work.
- Statusline: one line showing running agents, GPU owner, load average, open and NEW review items, unpushed commits and the last HEAD-boots result. Jørgen and the coordinator see the state without asking for it.
- Scheduled cloud routines don't fit the nightly QA: they run in the cloud without the GPU, the git-ignored assets or ComfyUI. Use a local systemd user timer or cron instead (item 9). A cloud routine could still do CPU-only work such as a daily docs and facts audit.

## 5. Codex

- Keep it active. The Codex CLI here (0.157.1) has `codex queue --thread <session> --message <text>`, which puts a message into an existing session through the app-server daemon (the daemon is already running). A hook or a small inotify user service runs it whenever a new entry appears in collab/to-codex.md, so Codex picks up asks without Jørgen typing. Needs a quick test on the live session before relying on it.
- Headless runs. Add an allow rule for `Bash(codex exec:*)` to the project settings, and run each job in its own worktree with `-s workspace-write`, never the bypass flag. `-o <file>` writes its final message to a file the coordinator reads, and `--output-schema` can force a fixed report shape.
- Clearer split. Codex has done the slow, careful, evidence-heavy work well today (the refactor, save checkpoints, check tooling). Give it whole areas with a long horizon: the Runner and save system, the check tooling, and the story writing it now leads. Claude takes art pipelines, UI, 3D and coordination. Fewer shared files means fewer claims and fewer review round-trips.
- Inbox ids. A tiny script (`tools/collab/post.py`) that appends an entry with the next free id would stop duplicate ids like the two C-0047s.

## 6. Content pipeline

- Scripts out of /tmp. Rule: a script that is run twice, or that produced anything Jørgen reviewed, moves into tools/<area>/ with a header line saying what it does, its inputs and outputs. `tools/REGISTRY.md` is generated from those headers (one line each), so there is one list and no hand-kept copy. First move the voice pipeline (gen2.py, check2.py, export2.py) into tools/voice/ as the TODO asks. Coordinate with Codex's stage 6, which already plans to consolidate tool locations and archive one-offs: there are about 60 finished one-off scripts at the top of tools/ (local_round2 to 6, decide2, cast-mappa 1 to 4 and so on).
- Prompt and seed logging. The image dashboard already logs every render to island/private/imagegen/log.jsonl. Put the same line (model, prompt, negative, seed, settings, workflow file, script and git commit) in a JSON sidecar next to every output from every script, so any image on a review page can be reproduced. One shared helper in tools/comfy.py.
- Image QA in one command (item 12). tools/redrim.py, framecheck.py and alpha_holes.py exist separately. Wrap them in `tools/imgqa.py` and add:
  - a local WD tagger (SmilingWolf/wd-eva02-large-tagger-v3, ONNX, runs on CPU or GPU) to flag tags that must or must not be there per character, such as glasses on Kuro, tinted eyewear, extra people, text or logos;
  - a similarity score of the face against the approved portrait, to catch drift.
  Results go on the review card as notes. It flags; Jørgen still judges, and nothing gets filtered out of what he sees (GUIDE, Show every attempt).
- Asset pipeline. R2 is decided and stage 1 is built; stage 2 waits for the freeze and the bucket token (review r2-setup). Nothing to add except doing it: it is also what makes worktrees light.

## 7. Process

- Fewer, larger tasks. Give an agent a whole outcome with its own files ("the lift, from doors to ride, until the fast test and the close-ups pass") instead of five small fixes to shared files. That means fewer handoffs and reports, and fewer agents in the same file. Keep one task per agent (GUIDE) in the sense of one kind of work.
- Definition of done, written once into the agent definitions:
  1. The change is committed from the agent's own worktree and landed through the land script.
  2. `npm run check` passes, plus the fast run if game3d/ changed.
  3. The docs/game file is updated and the commit says `Facts:`.
  4. Close-ups of the exact thing are looked at (GUIDE, Validate each fix).
  5. A review item is posted if Jørgen has to choose anything.
  6. The report is at most ten lines, with paths.
- One digest instead of a stream. Agents report to a file (`notes/digest/<date>.md`, one line per finished task), not to the coordinator's chat. The coordinator tells Jørgen only three things: a build is ready, a Review item is waiting, or something is blocked on him. A morning digest covers the rest.
- His feedback, verbatim. The UserPromptSubmit log (above) keeps his exact words. When a brief passes on his feedback, it quotes the log line and names the thing he pointed at (file, screenshot, node). GUIDE already says this (Relay feedback as given); the log makes it possible to check.
- GUIDE diet (item 8). Move the rules that no longer apply to game3d (the VN, pixel sprites, Godot, the island slice, the old opening) into `notes/guide-archive.md`, untouched, with a line at the top of GUIDE pointing there. What stays is the rules in force, each with his quote. Then split by area: Claude Code loads a CLAUDE.md in a subfolder only when an agent works in that folder, and `.claude/rules/*.md` files with a `paths:` glob load only for matching files. So art rules (prompts, red rim, build lines) go to `art/CLAUDE.md` or a rule for `art/` and `tools//*.py`, game rules to `game3d/CLAUDE.md`, and the top-level GUIDE keeps process and the things everyone needs. Each fact still has one home (GUIDE, Say each fact once); this changes where the home is, not how many. AGENTS.md can point Codex at the same files. This overlaps with the OpenViking trial, which is about finding facts; this is about not loading stale ones.
- Playtest telemetry (item 11). The game records a small event log: goal shown and goal done (with the time between), each word lookup, wrong attempts, idle for more than 20 seconds, menu opens. It is sent to the review server (a new POST route, local only) and saved as `notes/playtests/<date>.jsonl`. A page in the bible shows time per goal and where people stopped. His and his wife's playtests then say exactly where they got stuck instead of relying on memory. It is cheap to add and puts numbers on the "too hard" complaint from three playtests.
- Story map as a design tool. The bible's story map already reads the story live. Add the telemetry on top (time spent per node) and the property-test results (nodes no random walk reached).

## What I would not do

- Git LFS: R2 is already chosen and does the same job without LFS's bandwidth limits.
- A self-hosted GitHub runner on this machine (public repo).
- Running more agents in parallel. The limit today was integration and the machine, not the number of agents. Six agents in worktrees with a land queue will get more done than ten in one tree.
- Splitting main.js, ui.js and move.js before Codex's formatting and contract stages finish. The architecture plan already orders this, and splitting early would fight the freeze.

## Codex's view

Reconstructed on 2026-09-29 from the summary in collab/to-claude.md X-0079. The original section was lost; this is not a verbatim recovery. Current implementation status is in the linked records.

My priorities were checking the exact candidate that will land, moving deliberately to isolated worktrees, and making feedback delivery reliable. A check of a different checkout or a partial save path gives misleading confidence. Keep the important boundaries covered, especially saves and transitions, and combine verification around completed changes rather than starting a GPU playthrough for every small commit.

For browser work, I recommended bounded admission followed by a measured shared-slot trial. That trial is now implemented: three browser slots retain exclusive image/model access, and two simultaneous NVIDIA Vulkan browsers have been observed. The current policy lives in GUIDE.md, Engineering; X-0147 records the evidence.

For story tests, exercise the real Runner at save and transition boundaries. Assertions should establish that a player can continue with the same choices and reachable goals. Prefer those checks to tests that merely repeat the implementation.

The earlier description of Codex waiting idle was too broad: this thread has an active continuing goal. Queue delivery still needed a test when X-0079 was written; it was subsequently acknowledged. The current transport and ownership rules live in collab/PROTOCOL.md.

Jørgen's later pace instruction in C-0080 governs this work: ship the useful minimum, run the required checks, and move on. More receipts, additional hooks and repeated reviews are deferred work, not prerequisites for the current tasks.
