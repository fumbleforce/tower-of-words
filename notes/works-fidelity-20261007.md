# Works frontage detail — #337

This pass replaces the four plain recycling cubes with lidded containers on a continuous concrete wash pad. Each has a front label, lifting lip, hinge, two rear wheels and two front feet. A shallow rear drain, narrow gravel edge and short grass finish the edge against the lawn. The weather enclosure gains flat service slabs, instrument footings, a rain-collector rim and a small sign attached to its existing fence.

The first construction pass left the station sign between fence posts without a visible attachment. The revision adds two rails and four clamps at the existing post positions. There are no changes to sensor, door, gate, navigation or story coordinates. No Research interior source is included. Its separately held `station()` export is compatible with this additive module.

## Physical review

Bin wheel radius is 0.065 m, axle height is 0.1 m, and the pad top is 0.035 m. The wheels therefore meet the pad. The front feet start at the same pad height and overlap the body by 0.01 m; the rear wheels overlap the body by 0.025 m. The sign rails bridge the last two existing fence posts, with clamps around both. The screen's four feet sit on concrete pads, and the wind mast has a bolted footing. The original rain collector and wind instrument positions stay fixed.

The author inspected all 66 native frames, including the original baseline, the first construction pass, rejected diagnostic framing and the final views. The ordinary q1 camera shows an open station entrance and service path. Actual mouse clicks at 1366 × 860 and touch taps at 390 × 844 take the player through the gate, along the slabs, back out and past the bins. Each recorded leg asserts movement and arrival within 0.16 m of its target. Initial fixture placement is recorded separately and is not claimed as walking.

The capture helper installs public-only interception before navigation and disables private mode. Day 6 is a public fixture for unobstructed movement; no new story, lesson or interaction is implied by the labels. Phone framing shows the objects as the player approaches; it does not fit the whole weather station into every frame.

## Evidence and staging

All images are full-frame native captures. The Showcase includes every attempt, encoded as pixel-identical lossless WebP; source PNG hashes and output hashes are in its evidence manifest. Original PNGs and reports are also copied to the main checkout's `game3d/shots/works-fidelity/` before worktree retirement. The two original construction source files are preserved under `round1-source/`.

- `baseline-20261007`: 6 original q1 views.
- `round1`: 6 first-pass q1 views, before sign support was corrected.
- `round2`: GPU deferred before capture; the log is retained and there are no images.
- `round3`: 20 q0 views. Click/tap routes passed, but the diagnostic closeups missed details, especially on phone. They are retained as rejected framing.
- `round4`: 24 q1 views. The 16 ordinary player-camera views form the route acceptance set. The board, screen-footing and bin-front diagnostics show their intended objects. The rear-labelled diagnostics still faced the front and are not evidence of rear contact.
- `round5-detail`: 8 q1 diagnostics. The board, screen feet and bin fronts remain useful; reversing the bin camera put the building in front of the lens, so both rear views were rejected.
- `round6-rear`: 2 q1 rear diagnostics. A southeast view keeps the building to the right and shows all eight wheels, the supported pad and rear drain.

Diagnostic shots suspend player-framing constraints and use a closer camera; the rear inspection also changes direction. They are explicitly labelled and do not represent the ordinary game camera. The ordinary route captures leave the camera unchanged. The accepted support packet is `round4/*-station-board-detail.png`, `round4/*-station-feet-detail.png`, `round4/*-bins-front-detail.png` and `round6-rear/*-bins-rear-detail.png`.

The surrounding buildings, large lawn areas and existing wildlife remain outside this pass. Some captures contain overlapping birds from the existing flock system. This is a scoped frontage improvement, not a claim that the whole Works district meets the reference-image fidelity target.

## Checks

- `npm run check`: PASS, 666 tests; `/tmp/works337-check.log`.
- Focused runtime/tool ESLint and formatting with syntax-equivalence check: PASS.
- Native q0 and q1 click/tap route checks: PASS at both widths, no page errors. Reports are in the Showcase evidence folder.
- Strict desktop fast playthrough: PASS, 112 seconds, no overrides; `/tmp/works337-fast-desktop-2.log`. The first attempt was deferred before browser acquisition and is retained. Strict phone fast playthrough also passed in 73 seconds with no overrides; `/tmp/works337-fast-phone.log`. Existing performance warnings are preserved; this pass makes no matched performance claim.
- Scoped public Showcase check: PASS, 66 unique image IDs, 66 HTTP 200 images, 6 sections, no page errors; `/tmp/works337-showcase.log`.
- Scoped asset upload: 66 exact new keys; all older lock entries unchanged.
- Independent visual/source review: PASS for the scoped additions, 8/10; see `showcase/works-fidelity-20261007/evidence/independent-review.md`. All 26 accepted-packet frames were reviewed. The whole Works environment remains unfinished; bird clustering is tracked separately in #338. Final commit/rebase gate remains required.

Commands from the task worktree:

```sh
BASE=.claude/worktrees/codex-works-fidelity/game3d OUT=game3d/shots/works-fidelity/new-run node game3d/tools/works-fidelity-check.mjs
# QUALITY=0 selects low quality; DETAIL_ONLY=1 selects inspection shots only.
NODE_OPTIONS='--import /tmp/codex-land-public-loader.mjs' npm run check
NODE_OPTIONS='--import /tmp/codex-public-browser-loader.mjs' BASE=.claude/worktrees/codex-works-fidelity/game3d node game3d/tools/fast.mjs 1366 860
# Repeat fast.mjs with 390 844 for phone.
```

Facts: `docs/game/places.md`, Old works frontage paragraph.
