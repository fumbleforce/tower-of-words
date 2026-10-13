Historical handoff preserved on 2026-10-13. Its task status, worktree paths and restart instructions describe the date below; check current Git and work issues before acting.

# Codex Works facade pass — restart handoff, 2026-10-08

User explicitly requested prepare for restart. No new work, browser jobs, checks, commit, land or push should start during shutdown. All builder-owned jobs finished naturally and were polled; no active builder process remains. Root owns review server and other agents; do not stop those.

## Ownership and state

- Agent `/root/north_grounds`, independent reviewer `/root/review_rollout`, coordinator `/root`.
- Task is the broader exterior rollout #260, current bounded pass is Works factory/power plant/shed/gatehouse physical facades. Previous harbour runtime is landed at `5f97ad4a4926d510aa3d96bab9131c6e081ceb65`; root handles its gallery and old worktree cleanup.
- Worktree `/home/jorgen/repo/japanese/.claude/worktrees/codex-works-facades`, branch `wt/codex-works-facades`, HEAD/base `5f97ad4a4926d510aa3d96bab9131c6e081ceb65`.
- WIP is uncommitted and unstaged. Do not remove it. Exactly five owned files listed below; first and last tracked edits, middle helpers and test untracked. Untracked art/parts directories are hydrated assets, not task source and must not be staged.
- Scope claim **X-0952** posted in main `collab/to-claude.md`. Root reserved **X-0957** for Works release and **X-0958** for any extension; both unused. Do not collide with other root/agent IDs.
- No land or push by subagent. Commit only after final independent review, with `Codex:` title and `Facts: docs/game/places.md` trailer. Root lands, rebases if needed, runs headboot, integrates Showcase and handles all broader release work.
- Owned files: `game3d/js/scenes/works/buildings.js`; new `works/industrial-facades.js`; new `works/factory-facade.js`; new `game3d/test/unit/works-facades.test.mjs`; `docs/game/places.md` Works facade description only.

## Current implementation

Source/native baseline confirmed applied grey/black panes over solid bodies and corrugation, including solid north-light roof wedges. Two independent design options were written before implementation in `notes.md`: industrial daylight construction vs stronger repaired-workshop panels. Selected industrial daylight preserves the original industrial silhouette and dense window rhythm.

`industrial-facades.js` cuts actual shallow wall shells around windows/doors, stopping ribs at holes. Glazing lies 0.21 m inside wall face with slim grids, shallow sills and head trim. A small cached cube reflection uses a restrained sky/ground gradient with continuous building-height response. No per-pane black cards or fake interiors. Local metal options add response without modifying generic materials.

Factory roof north lights now use thin sloping roof boxes and thin triangular end walls, with openings and real inset glass. A source ray test found the original sliding-track/sign crossing the upper window row. The current factory has a solid wall section over that existing mechanism and keeps the outer upper windows (15 actual wall windows total). Closed sliding leaves rest at the base, with four hangers and rollers reaching the track. Existing chain, lock, signs, pipework/yard are preserved. Plant, shed and kiosk doors/windows are recessed into actual holes. Closed doors stay closed. No plan, nav, footprint, tree, hall fitting, grounds, generic helper, ceiling or story change.

Six focused unit tests cover asymmetric shell holes through all orientations, all actual factory wall windows clear of solid/ribs with glass at correct depth, no glass/track or leaf overlap, actual tall plant windows clear, four north-light openings clear, and unchanged hall/chimney full-geometry fingerprints. Actual main fingerprints retained in `original-invariance.log`.

## Evidence and exact validation

All evidence is in MAIN `/home/jorgen/repo/japanese/game3d/shots/works-facades-20261008/`, not the worktree shots path. Every image, failed run, script and log is retained. Do not overwrite attempts.

- `baseline/`: 12 fresh native main originals, six destinations both sizes; all personally inspected. Main baseline was post-harbour 5f97ad4a.
- `attempt-1/`: 12 native originals before track collision correction. Reviewer inspected all 12; retain them as iteration evidence.
- `attempt-2/`: 12 native + 10 supplemental originals. All native and eight usable details inspected. **Both `*-detail-factory.png` files are failed composition: camera was inside foreground shed. Do not use as final proof.** Runtime is final except later comment/Facts edits.
- `attempt-3-details/`: corrected factory oblique glass/reveal proof both sizes; also retained redundant native/roof frames. Corrected factory details personally inspected.
- `final-construction/`: native factory plus roof-end joins and track/hanger details, both sizes. All four important detail originals personally inspected: roof end walls meet slopes, hangers reach track. Phone appropriately focuses a roof end/one hanger.
- `final-evening-shared/`: evening plant/factory/kiosk native and detail frames, then fresh morning harbour native lane. Both reports PASS with zero page errors, zero overlaps/spins/gait episodes. **Morning is a fresh load, not backwards period mutation.** All 10 authoritative evening/shared images inspected. Harbour native phone crops changed buildings and desktop primarily shows shed. A held-camera supplemental plant view built in harbour frame is still advisable to prove shared output clearly; no such extra job was started before shutdown.
- `restart-authoritative-images.json`: explicit 32 current-source originals, all personally inspected, and source hashes. Final independent acceptance still pending.
- `restart-source-hashes.json`: exact SHA256 of five WIP files, below.
- `cpu-final.log`: FULL CPU exit 0, **760 tests passed / 0 failed**, syntax, lint, format, module budgets, dependencies, facts/story checks PASS. No ceiling raised. Be precise: do not conflate incidental test title containing “FAIL” with suite verdict.
- `strict-day1-desktop.log`: PASS 1366×860, 73 seconds, no overrides, zero overlaps/spins/gait. Scope receipt in `strict-desktop/`.
- `strict-day1-phone.log`: FAIL scheduling only, GPU-deferred after 60 seconds, **0 route steps**, retained. `strict-phone/` receipt retained.
- `strict-day1-phone-2.log`: PASS 390×844, 73 seconds, no overrides. Scope receipt in `strict-phone-2/`. Existing informational PERF WARN lines remain; do not present those as new measured facade effects.
- `unit-attempt-1.log`: caught original track intersection; `unit-attempt-2.log`: test count expectation adjusted from obsolete >20 to exact 15 after correction; `unit-attempt-3.log`: six focused tests PASS. Full final CPU includes same six tests after final flush heads.
- `source-counts.json` / `source-counts-final.log`: Works 160005→161255 triangles, 140→144 meshes (+1250/+4); harbour 175951→176849 triangles, 169→173 meshes (+898/+4). Old counts retained as `source-counts-attempt-1.json`. Plan, grounds, props and yard/service source hashes equal main. Module budgets unchanged/pass.
- `perf-baseline/` and `perf-baseline-{desktop,phone}.log`: **just completed during restart shutdown**, both process exit 0. Main q1 native plant/factory images + 20 full-frame calls/triangles samples each. Not yet personally inspected. **Candidate paired performance captures NOT run**, so no before/after render claim yet. `native-perf.mjs` samples actual full frame as tools/perf/ab, not postprocessing 1-triangle counters. Source counts are not frame-time certification.

## Reviewer status

Reviewer read current three runtime source files and focused tests, inspected all 12 attempt-1 originals and eight usable attempt-2 details. Early positive view, no remaining blocker then. He requested final roof end joins, sliding-track contact, kiosk west detail and evening proof. These now exist, but final review was paused for restart. Latest reviewer limitations: kiosk glass reads nearly uniform green at that angle and shed personnel door remains a plain slab without handle; nonblocking for bounded facade-opening scope. No speculative extra feature added. Do not claim final independent 8/10 acceptance yet.

Root received progress that CPU760/760 and desktop strict passed; phone retry has now also passed. Root must inspect authoritative final originals and source before landing.

## Resume steps (only after user resumes work)

1. Read GUIDE.md, collab/PROTOCOL.md and inbox; check current claims. No wake bind for subagent. Revalidate review server8771 (root owned session1528 last known), never blindly wait on stale process IDs.
2. Preserve exact WIP source hashes. Root main may have advanced due Office People/karaoke/gallery; do not overwrite concurrent source/docs. If rebase later, keep only owned Works paragraph and source.
3. Complete paired candidate q1 native plant/factory performance captures at both sizes using existing `native-perf.mjs`; baseline already complete. Inspect originals and summarize median calls/triangles with limitations. No need rerun successful CPU/day checks unless runtime changes or rebase requires them.
4. Add a meaningful shared harbour supplemental view at both sizes because ordinary phone lane crops changed buildings. Keep player on actual native harbour lane; same plant oblique camera island coordinates [-81.4,3.8,-111.6] → [-85.4,3.8,-114.3], converted with harbour `pt()`, would match existing Works detail and demonstrate shared geometry. Keep native shared originals. Do not hide objects.
5. Build final source/hash/evidence manifest from 32 current images plus useful shared proof. Request final independent source/visual review from existing review_rollout. All source is currently stable; avoid new features. Fix any concrete findings with retained attempts and scoped checks.
6. Prepare scratch Showcase entry with **every surviving image attempt**, chronological sections, truthful failed camera/queue captions. Root owns Showcase integration, no runtime agent gallery commit. Notes and eventual independent-review.md should quote reviewer verdict with attribution, not self-label independent.
7. After acceptance, stage exactly five owned files, commit `Codex: …` + Facts trailer. Use reserved X-0957 release, send root SHA/hashes/manifest/receipts. Keep worktree intact for root land; no push/land yourself.

## Processes at shutdown

All builder jobs are finished and polled. CPU8575 exit0; detail65279/11604 finished; strict desktop61812 PASS and phone23519 GPU-deferred ended; retry99918 PASS; evening55469/21103 PASS; construction46860/84105 PASS; count92472 finished; performance baseline53931 and56263 both exit0 while preparing this handoff. Last known actual performance PIDs2115441/2116473 are gone. No commit was started. Do not restart those jobs simply from these old handles.

## Exact source hashes

- `game3d/js/scenes/works/buildings.js`: `6d13d952423f3cce3a75837859b361bcdf44897cd8e1da70b10d3c3ec0ff0d1a`
- `game3d/js/scenes/works/industrial-facades.js`: `d3adc59cbe0ff2f8a694dd0370c77f54282403559c2f450bc966ebc0efa4c563`
- `game3d/js/scenes/works/factory-facade.js`: `55e5a3adf9f2ee44bb2f2808a104b4a3fb1072f425cd034fc665e9935ae48fa4`
- `game3d/test/unit/works-facades.test.mjs`: `9e4076bbb4b2059420451524fbe0ab0fcbdee48ab0f8af4a84915b8198f2ae51`
- `docs/game/places.md`: `cf1e9642e9a6fea6dd87f8d66cbe223ee6f2a80029c7a8293c1d67895a0a9586`
