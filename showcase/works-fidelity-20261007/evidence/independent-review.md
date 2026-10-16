# Independent Works #337 review — 2026-10-07

Verdict: no blocking finding in the bounded recycling-bay and weather-station frontage change. The scoped addition is acceptable, subject to the normal final commit/rebase gate. This is not approval of the whole Works environment against the user's reference images.

Reviewer: Codex /root/scale_85_default, independent of the implementation. Read-only source and native-image review using the requesting-code-review workflow and the grounding, composition, readability and reference criteria in notes/VISUAL_QA.md. No runtime edits, private content loads, or broad test reruns were performed for this review.

## Frozen source

Worktree: /home/jorgen/repo/japanese/.claude/worktrees/codex-works-fidelity

SHA-256 at review:

- game3d/js/scenes/works/service-details.js: 2687bee92b2ba84bec9975a572f2f2355a30d984e777996f64fd0d5cd5e7e298
- game3d/js/scenes/works/props.js: 9db12af367edaff0c06c58a5ba9c0ad2d014d7bb88298bebf42aae6333de83e9
- game3d/tools/works-fidelity-check.mjs: 4cfbe3c21bb4f9d20fe3e5f2e76ab61afd7357c85c038f6978f870f4f2e79e43

The complete new module, props diff, native helper, relevant plan/fence coordinates, facts paragraph and evidence note were reviewed. The change replaces the old four bin boxes and adds static detail around existing weather instruments. Story, interaction, gate, instrument and navigation coordinates remain unchanged. Research integration is separate and was not certified here.

## Findings

No blocking code or physical-staging defect was found.

Minor wording issue: the drain is described as “flush.” Its pad top is 0.035 m, channel top 0.042 m and grate top 0.048 m. “Shallow rear drain” is more exact. The small raised strip did not present a visible support or route-clearance defect in the accepted captures; a geometry change is not required by this review.

The revised station sign has two support rails spanning the existing fence posts and four visible clamps. Bin wheels meet the pad mathematically (0.1 m axle minus 0.065 m radius equals the 0.035 m pad top), and the two front feet overlap each body. The screen's four legs meet their concrete footings. The original mast and rain-collector coordinates remain intact. New instrument footings stay within existing blocked footprints, and gravel strips preserve the gate opening.

## Native evidence inspected

All 26 final-packet images were individually opened and inspected. Paths below are relative to game3d/shots/works-fidelity in the worktree:

- round4/{1366,390}-gate-approach.png
- round4/{1366,390}-gate-inside.png
- round4/{1366,390}-instruments.png
- round4/{1366,390}-gate-return.png
- round4/{1366,390}-bins-approach.png
- round4/{1366,390}-bins-south.png
- round4/{1366,390}-bins-middle.png
- round4/{1366,390}-bins-north.png
- round4/{1366,390}-station-board-detail.png
- round4/{1366,390}-station-feet-detail.png
- round4/{1366,390}-bins-front-detail.png
- round4/{1366,390}-bins-rear-detail.png
- round6-rear/{1366,390}-bins-rear-detail.png

The round4 rear-labelled shots face the fronts and are correctly excluded from rear-contact proof. Round6 supplies the actual rear angle: all eight wheels, their pad support and the rear grate are visible without the building masking them. This review does not claim independent visual inspection of all 66 retained historical attempts.

The 16 ordinary round4 player-camera frames show clear approach, gate passage, service slabs, return and travel past the bin row. Phone framing follows the player and does not show the entire enclosure at once. Board, instrument-footing and bin contact shots are diagnostic closeups with altered camera distance; they are useful construction evidence, not normal camera examples.

The two round4 reports contain seven actual mouse/touch legs each, no page errors and quality 1. Independent calculation from recorded endpoints gives maximum arrival error 0.001802 m at 1366 and 0.006682 m at 390. The helper records initial fixture placement separately, projects real floor targets, uses mouse.click/touchscreen.tap and asserts movement as well as arrival. The round6 reports contain only their two diagnostic captures and make no additional movement claim. Public-only interception precedes navigation; the day-6 fixture is not an authored story-playthrough claim.

## Visual verdict and limits

Scoped addition: 8/10 for the two prop clusters' coherence, readable purpose and physical support. The separated waste labels, lifting lips, lid hinges, wheels, feet and continuous pad make the bins read as serviceable containers. Sign supports and instrument footings resolve the relevant construction concerns. No new floating geometry, blocked gate or obvious object intersection was found in the accepted packet.

This is a bounded component verdict, not a full-screen VISUAL_QA pass. The wider Works views remain around the rubric's 6-level description: coherent but sparse and flat. Broad lawns, simple foliage, plain facades/windows and muted materials remain visibly below the user's lush, detailed exterior references. Existing overlapping flock birds appear in some captures and were not repaired by this change. Do not describe the whole district as reference fidelity or close the broader environment objective on this evidence.

No animation-fluidity, hardware-phone performance, new lesson/interaction, or wider island fidelity claim is made. Static frames cannot certify motion artifacts. There was no matched performance comparison for this delta.

## Validation receipts read

- /tmp/works337-check.log: broad check PASS, reported 666 tests.
- /tmp/works337-fast-desktop-2.log: strict 1366×860 PASS in 112 seconds, no overrides.
- /tmp/works337-fast-phone.log: strict 390×844 PASS in 73 seconds, no overrides. Existing performance warnings and two short gait windows are retained in the log; there were no reported overlaps, spins or long gait episodes.
- The implementation note records the first desktop browser-acquisition deferral and prior framing failures. These should remain in the evidence package.
- Final commit/rebase validation is still the implementation/integration owner's gate; the receipts above are not a substitute for it.

Integration follow-up: the minor drain wording was corrected in the module comment and task note after this review. Geometry and helper behavior are unchanged. Original source-freeze.json remains the pre-comment review fingerprint.
