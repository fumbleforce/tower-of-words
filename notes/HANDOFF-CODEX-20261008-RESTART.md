Historical handoff preserved on 2026-10-13. Its task status, worktree paths and restart instructions describe the date below; check current Git and work issues before acting.

# Codex restart handoff — 8 October 2026

Jørgen explicitly requested preparation for a restart and written handoffs. Stop project work at this checkpoint; resume when he reconnects. No daemon restart has been performed by this agent. The broad goal is unfinished and must remain intact: improve the rest of the exterior, make equally large improvements to interiors, and deepen personal conversations/storyline, using available parallel work.

## Start here after restart

1. Read GUIDE.md, collab/PROTOCOL.md and the tail of collab/to-codex.md. Follow AGENTS.md prompt logging/check and main-session wake binding. The previous session id is `01a11c61-644d-7dd3-8331-30d733e9467e`.
2. Read this file and the three worker handoffs linked below. Inspect actual Git/worktree state before acting. Do not start duplicate jobs from old terminal handles.
3. Verify the effective agent capacity. `/home/jorgen/.codex/config.toml` now contains `[agents] max_concurrent_threads_per_session = 10` (Jørgen changed it). The old session explicitly advertised four total agents, including root. A live general config reload was not found; the installed CLI supports `codex app-server daemon restart`. Only the MCP reload endpoint is documented as a live reload. Config-on-disk does not prove the active agent limit changed. Do not bypass a reported capacity limit by creating headless agents.
4. Restart a local public review server on port 8771 as needed; verify no existing listener first. Preserve other people's processes and GPU locks. The main session's previous temporary server is being stopped for this restart; its final status is in the checkpoint section below.
5. Finish the office replacement first, then the prepared Works and karaoke passes. Review each builder's remaining gates before committing or landing. No new scope is needed before these land.

Worker handoffs (written at restart):
- [Karaoke contact repair](HANDOFF-CODEX-KARAOKE-20261008-RESTART.md)
- [Works facades](HANDOFF-CODEX-WORKS-20261008-RESTART.md)
- [Independent review](HANDOFF-CODEX-REVIEW-20261008-RESTART.md)

## Authoritative repository state

Main is `f6be87a11bd264bfd65bf2df94d5e67d6407a648`. Nothing was pushed.

Recent integrated commits:
- `f6be87a1`: harbour gallery (70 original frames) and rollout coverage index.
- `5f97ad4a`: harbour loading frontage/quay runtime, shared geometry and meaningful tests.
- `aff7bc8d`: current gym audit, store-approach gallery and rollout index.
- `9fa46760`: landing checks resolve assets from the verified task worktree (#352).
- `8463ed89`: gym store approach outside the ball-cart blocker.
- Earlier: `143378d1` sports facades/shared gardens, `192c14a7` sports/karaoke galleries, `7d6cddc0` scoped asset-lock update.

The main checkout has many unrelated modified and untracked files. In particular `notes/HANDOFF.md` already belongs to other ongoing work; it was NOT overwritten. Never stage/revert all files or sync arbitrary changed assets. Use isolated task worktrees, explicit file ownership, a Facts trailer, and tools/land.sh. No push unless Jørgen asks.

Harbour runtime and gallery worktrees were removed only after preserving/hash-verifying their nonlinked thumbnail copies. Backups are under `game3d/shots/harbour-detail-20261008/preserved-worktree-thumbs/` (8 old sports thumbs) and `preserved-records-thumbs/` (5 locked copies). Main's unrelated asset changes were untouched.

Fresh public Bible verification after harbour: `/tmp/codex-rollout-bible-after-harbour.log`, 324 routes and 14,548 distinct links/images/audio, all resolve. Scope receipt: `game3d/shots/environment-rollout-20261008/bible-after-harbour/scope-check.mjs-1984147.json`; root verified failures[] and all 647 settings checks privateMode=false.

## Office placeholder replacement — immediate priority (#353)

Worktree `.claude/worktrees/codex-office-people`, branch `wt/codex-office-people`, base `aff7bc8d`. UNCOMMITTED; 13 intended source/docs/gallery files, preserved on disk. A complete extra copy, hashes and tracked diff are at `game3d/shots/restart-20261008/office-people/{manifest.json,tracked.patch,files/}`. Treat the worktree as authoritative unless recovery is needed.

Owned files:
- `game3d/js/crowd/office-workers.js` (new)
- `game3d/js/crowd/office-pose.js` (new)
- `game3d/js/crowd/office-parcel.js` (new)
- `game3d/js/chibi-crowd.js` (exports the existing proxyParts helper)
- `game3d/js/places/lobby.js`, `lobby-commuters.js`, `lift.js`, `lifecycle.js`
- `game3d/test/unit/office-pose.test.mjs` (new)
- `game3d/tools/office-people-check.mjs` (new)
- `tools/check/module-budgets.json` (ONLY reduced lobby/lift exception rows)
- `docs/game/art-and-sound.md` (office-body facts and corrected chibi fallback description)
- `showcase/office-people-20261008/entry.json` (new, draft 81-image gallery)

Behavior: reuses approved crowd-pilot-5 A/B bodies for exactly seven visible roles. worker_a= B; worker_b=A; commuter_1/2/3=A; sales1=A; sales2=B. Preserves gender/voice IDs, routes, shared character scaling, forecourt shadow policy and existing cast. Cached approved model preload is awaited by lobby and lift lifecycle. Do not enable the rejected old chibi setting, do not resurrect hidden obsolete B2 workers.

Review fixes already implemented:
- `ph` initialized, preventing old idle code from writing NaN.
- Native head and spine receive authored queue glance/sigh offsets, restored before each native animation update so they cannot accumulate. Two meaningful unit tests cover accumulation and changing native poses.
- Full arm Euler reset after queue/tap, rather than X alone.
- The parcel no longer uses the procedural arm's offset (which pierced the new hand). New local helper follows native wrist/forearm, keeps the box level with fingers at its rear upper rim and places its label on its surface. Fallback still attaches to the procedural arm. No character mesh/texture changes.

Independent reviewer accepted the seven-role change at bounded 8/10 with no unresolved source/visual blocker, CONDITIONAL on final exact-source checks. Reviewer personally inspected all 24 route-1 frames, corrected phone stationary/lift views, parcel closeup and five real carrier motion phases. Root personally inspected every one of the 81 originals in the draft gallery. The later helper test did NOT run: see admission failures below. Gallery has no commit hash yet.

Evidence root: `game3d/shots/office-people-20261008/`.
- `baseline/` and `candidate-1/`: 7 desktop originals each, before/head-spine/parcel corrections.
- `probe-1/`: failed click harness, logs retained, no usable originals.
- `probe-2/`: 6 each viewport; phone targets cropped, retained failed framing. Lift cap=1 fixtures are frozen, not proof of animated travel.
- `route-1/`: 12 each viewport; actual station-to-office route, all seven roles, finite poses, queue/tap/through and completed ride. Before final parcel correction; all other runtime fixes included.
- `probe-3/`, `probe-4/`: phone diagnostics exposing parcel penetration and failed stationary framing; retain.
- `probe-5/390-stationary-detail.png`: correct phone view of both stationary workers.
- `parcel-1/390-parcel-queue-detail.png`: corrected oblique parcel grip; other frames retained, including obstructed stationary attempt.
- `parcel-motion-1/`: 14 phone originals and report, final runtime actual automated route with diagnostic camera tracking carrier in gate. Five carrier phases in/toqueue/queue/tap/through; in and tap partly occluded, queue/walking/through clearly show level attached parcel. Native lift afterward. PASS all seven roles and completed ride. Root inspected all 14 originals.
- Scratch `audit.mjs`, `probe*.mjs`, `route.mjs`, `parcel-motion.mjs` retain reproducible evidence. Tracked `office-people-check.mjs` adapts route.mjs, qualifies browser globals and writes a timestamped evidence folder.

Validation:
- FINAL full CPU: `/tmp/codex-office-people-cpu6.log` exit0, 749 tests pass, zero failures, all top-level checks PASS. This includes final parcel and checker source.
- Before parcel correction, strict DAY1 PASS desktop75s / phone73s: `/tmp/codex-office-people-final-fast-{1366,390}.log`.
- Final parcel actual phone route PASS: `/tmp/codex-office-people-parcel-motion.log`.
- Final strict DAY1 rechecks `/tmp/codex-office-people-parcel-fast-{1366,390}.log` and tracked checker `/tmp/codex-office-people-check-final.log` TERMINATED after 60s with GPU_DEFERRED, before a browser ran. No runtime failure established. These are finished jobs, not live waits; retry after restart when slots are available.
- Earlier CPU failures were formatting, reduced module-ceiling bookkeeping, then new checker bare browser globals. All fixed in final CPU6; logs retained.

Next exact actions:
1. Inspect hashes/WIP and review handoff; no source change currently required.
2. Run strict day1 at both sizes on this worktree and run the new tracked checker at least once. Use existing browser GPU admission, preserve deferred logs, no softer settings or reduced assertions. Do not flood the three browser GPU slots with all workers' jobs at once.
3. Inspect new originals, incorporate any genuinely new attempts in the gallery, record final evidence hashes/check logs. All existing 81 images have been inspected by root.
4. Commit only owned files (with `Facts: docs/game/art-and-sound.md`, and `Fixes #353` only if its scoped seven-role requirements are satisfied), then land through tools/land.sh, inspect exact rebased CPU/head-boot result. Main moved only in unrelated harbour files since base.
5. Add resulting runtime commit to gallery metadata in a followup if needed; verify public Bible after final gallery changes. Release claims, update #353, preserve #328 as broader unfinished crowd replacement.

Public browser commands from repo root:
```sh
BASE=.claude/worktrees/codex-office-people/game3d node --import /home/jorgen/repo/japanese/game3d/shots/caption-clearance-20261008/public-loader.mjs .claude/worktrees/codex-office-people/game3d/tools/fast.mjs 1366 860
BASE=.claude/worktrees/codex-office-people/game3d node --import /home/jorgen/repo/japanese/game3d/shots/caption-clearance-20261008/public-loader.mjs .claude/worktrees/codex-office-people/game3d/tools/fast.mjs 390 844
BASE=.claude/worktrees/codex-office-people/game3d node --import /home/jorgen/repo/japanese/game3d/shots/caption-clearance-20261008/public-loader.mjs .claude/worktrees/codex-office-people/game3d/tools/office-people-check.mjs 390
NODE_OPTIONS='--import /home/jorgen/repo/japanese/game3d/shots/caption-clearance-20261008/land-public-dispatcher.mjs' bash tools/land.sh wt/codex-office-people
```
Run CPU checks without the browser preload. Browser work uses BrowserJob, scopedRoute(publicOnly:true), privateMode:false and serviceWorkers:block. Do not alter runtime camera to improve screenshots: held diagnostic views are labelled separately from native views.

## Other ongoing goal scope

The canonical coverage index is `notes/environment-rollout-status.md`; it inventories remaining areas without claiming whole-district completion. Keep the original exterior/interior/story objective intact.

- Works facade pass: prepared in `.claude/worktrees/codex-works-facades`; see worker handoff. Source improves factory/power plant/shed/gatehouse, real window openings and roof north lights. Raycast tests caught/fixed factory upper glazing overlapping the sliding-door track. Latest reported full CPU760 passed. No land yet.
- Karaoke contact pass (#349): prepared in `.claude/worktrees/codex-karaoke-contacts`; see worker/reviewer handoffs. Final-2 both sizes passed (41 frames each); original .05/.075 mic contact limits unchanged, real Continue/cancellation tested. Root has NOT yet read all final82 frames or all receipt-targeted38; do that before land. Hundreds of older attempts are preserved, and the builder's gallery index is scratch, not yet a committed Showcase entry.
- Gym fixtures (#351): after karaoke contact repair, coherent detail pass for high window reveals, equipment storage, supported ball carts, shoe-cubby/counter/bench joinery and existing chairs/whiteboard/trolley mechanics. Preserve open court and activities. Current audit and store approach fix already landed; actual native fixture interactions/save/Continue still needed for future pass.
- Remaining exterior: ferry-front/office-quarter glazing, east lane/pocket park, remaining office rows/north courts, onsen/dorm joins. Inspect current evidence before adding more props. Older train/gate/lobby/plaza/dorm/B2/lift/canteen/print/konbini/terminal/pool need coverage audits; unbuilt interiors are not playable merely because an exterior improved.
- Opening clarity #345: utility icons, bubble colours, objective origin remain.
- Day3 desktop pool gait #350 is a reproduced existing baseline failure, not silently waived.

## Story, music and new crowd blockers

Personal conversation work (#344) is held clean at `.claude/worktrees/codex-conversation-reciprocity`, branch wt/codex-conversation-reciprocity, HEAD98e17a4b. Commits131fbdd4,212e24f7,73ed8ceb,98e17a4b. It is NOT in runtime. Actual Claude CLI story review returned HTTP429 weekly quota, zero output tokens, reset message7am without a date. Do not substitute another model or account to bypass this required review. Resume when real quota evidence changes. Missing54voice clips (44base+10Carina,56synthesis units); Emi reference approval not found. No voice generation done. Focused14 tests passed after rebase to143378d1.

Jørgen's new `reviews/karaoke-song-2/feedback.json` rejects the missing who/where/when/why context and boring songs, not just articulation. #320 touched with this interpretation. Feedback remains unread until acted upon. Do not treat it as approval of A6 or merely adjust pronunciation. Next revise review brief around the actual scene/singer and make a small musically distinct comparison; no generation started. See `/tmp/codex-karaoke-song-feedback-20261008.log`.

Placeholder gap: approved crowd-pilot-5 pair currently installed for ambient office walkers only on main, with seven more roles ready above. Casual/elder/sport/service/train categories still use procedural bodies. Crowd-everyday-1 has approved source pictures but no 3D models. Meshy balance was actually rechecked on8Oct and is0; #328 records this. No paid task submitted, no rejected old chibi look re-enabled. This is not a reason to leave reusable approved office models unintegrated.

## Collaboration and restart checkpoint

Claims remain owned by their named task worktrees until completion/release. Last root entry X-0959 releases harbour gallery/status. Reserved IDs: X-0955 karaoke release, X-0957 Works release, X-0958 Works extension. Next root use X-0960 or later after checking the inbox tail. Duplicate X-0951 exists (root office-pose and karaoke scope); karaoke corrected its reference inX-0954; do not rewrite append-only entries.

Latest user prompts were logged manually with stable turn ids, including reload-config-1 and restart-handoff-1. Goal continuation7 used the prior verbatim continuation template updated to7,073,164 usage. The old tools' session handles are not a resume plan: inspect actual processes after restart.

Stale-work check ran before handoff: `/tmp/codex-restart-stale.log` reports30 outstanding older items across owners. Do not mark them handled by touching everything.

Final checkpoint: all three active workers (izakaya_detail, north_grounds, review_rollout) report completed and no owned worker/reviewer processes running. The temporary review server PID1609627 has exited and port8771 has no listener. All13 office source files and their restart backup copies were verified against the SHA256 manifest. All four handoff files exist. No daemon restart was performed; effective agent capacity must be checked after reconnecting. Work remains unfinished and preserved in the named worktrees. Resume from this file and the linked worker handoffs.
