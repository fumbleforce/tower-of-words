# Approved refactor execution

Scope: [architecture plan](architecture-review.md), stages 0–2c. Exclusive code freeze: Claude C-0029; Codex root is the only editor. Read-only subagents inspect contracts and review changes. Creator comparisons and story changes stay queued until release.

## Frozen baseline

Runtime input hashes are recorded in `/tmp/codex-refactor-baseline/inputs.json` (117 source/check/page files). Claude may still commit portraits, voice assets and documentation during the freeze; those are not runtime refactor edits.

- Story, choices and 14 bond tests pass.
- Facts check passes with four already documented pending cast removals.
- Story map: 186 nodes, 129 edges, 88 flags; three existing unreachable nodes and nine unread flags.
- Seven initially missing voice clips were supplied by Claude in `158ee8f`; all 218 spoken lines now have clips.
- Desktop full day: 70 seconds, all places and day-end reached, zero movement overlaps/spins, `VOICE_WARN=1`.
- Phone full day: GPU, 69 seconds, no overrides, all places and day-end reached, 12 practice prompts, zero overlaps/spins. Artifacts: `game3d/shots/fast/2026-09-29T11-17-00-743Z-2605985`. Earlier software runs timed out after 183/188 seconds in the office; those remain recorded failures.

## Stage 0

Implemented: all active JS syntax scan (vendor/dependencies/legacy excluded); pure final-result aggregation; early error reporting for both uncaught scripts and caught async boot failure; unique run artifacts; browser lifecycle reused from the previously reviewed creator helper. No game runtime or story behavior changed.

Eighteen unit tests pass across startup, syntax discovery, negative fixtures and final reporting. Real HTTP fixtures report caught boot failures and missing module URLs promptly. Claude C-0036 findings are addressed: one final verdict after lifecycle cleanup, distinct DEFERRED/75, completion coverage, source-relative artifacts and constrained voice overrides. Total job remains within GUIDE’s five-minute cap. Inline HTML scripts are outside the syntax scanner and require browser boot checks. Internal re-review found a late page-error aggregation gap; fixed and exercised through the real CLI reporting path with a controlled lifecycle.

## Stage 1a

Exact dependency pins installed with a lockfile: Playwright 1.63.0, ESLint 10.11.0, Prettier 3.9.9, Madge 8.0.0. Tested Node 24.21.0 / npm 11.19.0. Root package leaves module interpretation unchanged; Node currently warns when inferring existing `.js` ES modules.

`npm run check` is CPU-only and currently runs syntax, unit tests, choices, story, language, bonds, facts and story map. All eight groups passed in the latest run (syntax covered 193 JS files before the final reporting test was added); language reports 11 existing warnings and no errors. Lint, format, size and cycle enforcement join it after contracts and the formatting pass; their absence is not a passing result for those future gates.

Isolated install: `/tmp/amakawa-tooling-install-ioszyw6z` contains a copied source snapshot, its own `npm ci` install, and real portraits required by facts checks. The first source-only run correctly failed on missing portraits; copying those assets made all checks pass. This proves the current CPU suite does not require the external opening repository or a browser. It is an isolated source snapshot, not yet a clean Git checkout of committed tooling.

## Stage 1b

Shared lifecycle lives in `tools/lib/browser-job.mjs`, with the creator import facade retained. `openGame` owns the context and handles real title/fast readiness, explicit history fixtures and startup cleanup. Fast and Words captures use both helpers. Lifecycle CPU tests pass. Claude C-0038 cleanup and timeout findings are fixed; fixture storage errors and non-404 console errors intentionally fail checks. Words capture exited 0 with confirmed lifecycle shutdown. Both viewports show 10 rows and pass the dictionary-form/note checks. Root inspected all four top/bottom screenshots: text fits horizontally, remaining rows and Close are accessible by scrolling. Artifacts: `game3d/shots/words-menu/2026-09-29T11-23-41-691Z-2623412/`.

## External Playwright callers

These active scripts still resolve Playwright through the separate opening repository. Inventory only; migration remains staged. The CPU gate works without that repository. Regenerate this inventory after further caller migrations.

- `game3d/js/bonds/day1-check.mjs`
- `game3d/qa/capture-fast.mjs`
- `game3d/qa/diag-click.mjs`
- `game3d/qa/human.mjs`
- `game3d/qa/title-hover.mjs`
- `game3d/tools/a11y.mjs`
- `game3d/tools/beat-shots.mjs`
- `game3d/tools/hud-shots.mjs`
- `game3d/tools/lift-door-shots.mjs`
- `game3d/tools/look-bench.mjs`
- `game3d/tools/look-extra-shots.mjs`
- `game3d/tools/look-shots.mjs`
- `game3d/tools/lunch-shots.mjs`
- `game3d/tools/opening-frames.mjs`
- `game3d/tools/perf.mjs`
- `game3d/tools/perf/ab.mjs`
- `game3d/tools/perf/budget.mjs`
- `game3d/tools/perf/calls.mjs`
- `game3d/tools/perf/day.mjs`
- `game3d/tools/perf/probe.mjs`
- `game3d/tools/play.mjs`
- `game3d/tools/printer-shots.mjs`
- `game3d/tools/shell-shots.mjs`
- `game3d/tools/shoot.mjs`
- `game3d/tools/showcase-shots.mjs`
- `game3d/tools/soft-collision.mjs`
- `game3d/tools/speech/bench.mjs`
- `game3d/tools/speech/level.mjs`
- `game3d/tools/speech/states.mjs`
- `game3d/tools/style-perf.mjs`
- `game3d/tools/style-shots.mjs`
- `game3d/tools/talk-clicks.mjs`
- `game3d/tools/target-ring-shots.mjs`
- `tools/assets/render3d.mjs`
- `tools/assets/shots.mjs`
- `tools/characters/snap.mjs`
- `tools/creator/run.mjs`
- `tools/feel/movement-scenes.mjs`
- `tools/feel/rec.mjs`
- `tools/feel/seq.mjs`
- `tools/figures/posecheck.mjs`
- `tools/figures/reproject.mjs`
- `tools/figures/room.mjs`
- `tools/figures/views.mjs`

## Next gates

Stage1 browser registration is complete: `npm run check:browser` runs desktop, phone and public Bible sequentially; individual names select a focused run. Public Bible passed 93 routes and 1048 distinct links after route-readiness and redirect handling fixes. Private mode was not exercised. Commit the reviewed tooling. Public Bible checking must exclude protected private sources. Six real-operation save tests now cover the fixed v1 snapshot, cleared-state roundtrip, legacy saves, three thumbnail slots and Continue, plus schedule application. Internal review verified ten mutation probes fail. Main boot/place re-entry and rendered thumbnail correctness remain browser checks. Before formatting, migrate structural scrapers to runtime-backed declarations and add autosave/three-slot characterization plus deterministic behavior traces. C-0030 clarified that sim owns autosave while menu owns three thumbnail slots; there is no documentation mismatch.
