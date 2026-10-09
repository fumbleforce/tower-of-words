# Crowd bag grip — #333

The hand-held crowd props were mounted above the hand. Generated bodies put the prop origin 0.255 × 1.15 units above the LeftHand wrist joint. Procedural bodies attached the same prop origin at the shoulder arm group. Neither path accounted for the handle's actual geometry. The original native captures show roughly 20–23 cm of unwanted elevation.

The corrected mount places the handle's geometry center in the hand. Generated bodies use the bounds of vertices predominantly weighted to LeftHand, measured in the hand's local coordinates, to locate the palm below the wrist. Procedural bodies use their existing `arm.userData.hand`. The bag stays under the existing arm on procedural bodies, preserving their carry-arm gait damping.

Correcting only the origin exposed another mismatch: generated bodies have shorter ground clearance than the procedural bodies these props were drawn for. The first attempt put a tote through the paving. The fitted mount sizes the unchanged generated prop uniformly within 60% of standing palm clearance, using its furthest bounding corner from the grip. The measured palm includes character scale, so the prop follows the selected 85% scale as well as the legacy 100% scale. Meshes, textures, rig weights, native clips and population selection are unchanged.

## Native evidence

All captures are original full-frame native renders in the plaza. They use production body constructors and production idle/walk/seated pose functions, with the existing plaza bench for seated views. The ambient crowd and player are hidden to expose the diagnostic carrier. Walking closeups are sampled poses, not a claim that a complete route was played. Separate numerical checks advance six seconds / 180 frames of the real gait for each carrier.

Raw PNGs and original reports remain in the worktree's `game3d/shots/crowd-bags/`. The Showcase preserves every attempt as lossless WebP with matching pixels. The first baseline report accidentally stored the rig ID in its frame `id`; the image filenames preserve the correct case/state/view. Later reports correct that metadata field.

- `baseline-100`: untouched source, 36 captures.
- `candidate1-100`, `candidate1-85`: corrected grip without fitting; failed because generated bags could pass through the paving, 72 captures.
- `candidate2-85`: fitted props, first 36 closeups before gait assertions were added.
- `candidate2-100`, `final-85`: accepted default-body attachment, 72 closeups plus gait assertions.
- `generated-85`, `generated-100`: optional generated casual/elder bodies, 36 closeups plus gait assertions. Visual inspection rejected the shirt seated pose at both sizes: the hand is beside the hip and the tote penetrates the bench. These failed views remain in the Showcase.
- `fallback-85`, `fallback-100`: deliberately unavailable approved crowd assets; procedural office fallback, 36 closeups plus gait assertions.

`seatfix-85` and `seatfix-100` add 48 native captures, covering optional generated idle/walk/seated and explicit sit→stand restoration. Only the shirt base changes: it rests the bag upright beside the hip, with the bottom on the requested seat height. Standing restores the saved hand-relative mount, including orientation and scale. Other bodies retain their seated hand grip. This changes the prop placement at pose changes; it does not add a put-down/pick-up animation.

Coverage includes approved A with briefcase/tote, approved B with briefcase, procedural casual groceries/tote and elder groceries, the optional generated equivalents, and the procedural office fallback. B with tote cannot occur in production: B requires an odd variant index, while the tote requires `index % 4 === 2`.

## Validation

The diagnostic installs the public-only network interceptor before navigation and disables private mode. The fallback mode deliberately fulfills only approved-crowd asset requests with a 404; it tests the existing fallback behavior without modifying assets.

For the six candidate-2 runs, each handle is within the visible hand bounds (1 cm tolerance), six seconds of gait advance with measurable hand travel, and the handle remains fixed in the hand's coordinate frame. Each bag stays above the ground through the sampled gait. Those numeric checks did not detect the optional seated bench fault; visual review did. The new seatfix reports assert the supported bottom equals seat height within 2 mm, the bag returns to the hand after sitting, and all original hand/gait checks still pass. Machine-readable results are in `showcase/crowd-bags-20261007/evidence/`.

Commands (run from the task worktree):

```sh
BASE=.claude/worktrees/codex-crowd-bags-333/game3d SCALE=85 OUT=game3d/shots/crowd-bags/new-run node game3d/tools/crowd-bag-check.mjs
# SCALE=100; MODE=generated; MODE=fallback select the other cases.
NODE_OPTIONS='--import /tmp/codex-land-public-loader.mjs' npm run check
```

The fix does not close the original model's fingers or add general cloth/leg collision simulation. The same existing hand poses and prop meshes are used.

The author individually inspected all 144 candidate-2 verification frames and all 48 new seatfix frames. Apart from the rejected optional shirt/bench intersection, the paired front/hand-side views showed attached handles, clear paving, and no obvious bag/bench or bag/leg penetration. The original procedural tote remains larger than the fitted native tote. This is a bounded review of the captured poses, not proof against every possible animation contact.

- Final `npm run check`: PASS, log `/tmp/crowd-bag-final-check.log`.
- Focused formatting/AST-equivalence and ESLint for the two source/tool files: PASS.
- Fast playthrough at 1366×860 and 390×844 with public-only interception and `charscale=85`: PASS, no overrides; logs `/tmp/crowd-bag-fast-desktop.log` and `/tmp/crowd-bag-fast-mobile.log`. These preceded the shirt-only seated follow-up; both use the default crowd. Their performance summaries retain draw-call/triangle and 1% low warnings; no matched baseline performance claim is made.
- Native optional-body follow-up at 85/100: PASS, reports `seatfix-85.json` and `seatfix-100.json`, 24 captures each.
- 336 native full-frame renders preserved as pixel-identical lossless WebP, uploaded under `bible/shots/showcase/crowd-bags-20261007/`. Original PNGs and 12 machine reports retained.
- Scoped public Showcase check: PASS; 336 unique image IDs, 336 HTTP 200 images, all 12 sections rendered, no page errors. Log `/tmp/crowd-bag-showcase-check.log`; native gallery screenshot `/tmp/crowd-bag-showcase.png`.
- Independent root source/native critic: PASS, scoped visual score 8/10. [Full review](crowd-bags-20261007-review.md); no blocking finding remains. Rebased commit gate and boot still required before landing.

Facts: none — fixes the intended existing prop attachment; no gameplay, character or location facts change.

## Reopened: orientation, leg clearance and render timing

The earlier grip correction did not certify leg clearance. The user's follow-up showed a broad briefcase face crossing the leg. The bag's long axis now follows the walking direction, with its broad face beside the outer leg. A carrying pose holds the hand outward, keeps the bag upright around its palm attachment and rests bags beside the carrier when seated. Procedural shoe-bending carries the bag slightly higher. Runtime source and final acceptance remain under review while the expanded matrix completes.

The new diagnostic clips actual posed leg surface triangles against the convex bag body. Native vertices use their bone deformation; procedural thigh, shin and shoe meshes use their real transforms. Triangle clipping catches an edge or face crossing even when none of the leg's vertices falls inside the bag. The only contact tolerance is 10 micrometres to exclude numerical tangency. Existing grip, 5 mm paving clearance and 2 mm seat support thresholds are unchanged. The report's interior depth is a witness point's distance inside the bag volume, not a distance between bone joints or a general collision-resolution displacement.

The paused matrix now covers 180 straight gait frames, 90 turning frames, and 30 frames each of phone idle, shoe bending, sitting and resumed walking. Each carrier also has paired native inspection images for idle, phone, shoe, walk, sit and restored standing. Additional modes cover procedural fallback, optional generated bodies, generated office clothing and the partial-download bridge path: approved crowd and generated suit unavailable while the cardigan proxy remains available.

The separate live helper observes the production renderer without repairing world matrices or the skin palette. It exposed a late-update problem that paused geometry checks cannot reveal: the bag could draw before the skin's carrying pose advanced. Native bag draw callbacks now request the same frame's character step before drawing; the pose publishes the mount matrix and affected skin palette before those meshes render. The focused `game3d/test/unit/crowd-bag-pose.test.mjs` reads raw published matrices immediately after the late update, with no corrective world-matrix call. `game3d/test/unit/crowd-bag-clearance.test.mjs` separately verifies face-crossing, separation, tangency, transformed geometry and actual native skin deformation.

### Attempt provenance correction

`legcheck-baseline-85` was initially labelled as the committed baseline, but its network override did not match the versioned `looks.js?v=...` request. It actually exercised the then-current rotated candidate. That original report is preserved and must not be used as baseline proof. `legcheck-current-85` was also provisional until `legcheck-frozen-current-85` recorded the served source hash and the actual π/2 rotation. The helper now intercepts versioned requests, records module SHA-256 values, and saves source snapshots for subsequent runs.

The corrected `legcheck-true-baseline-85` uses committed source SHA `a1c208d18bfca91951344fb87b9e712a0276c6ad94cf08ddcdca3aba73190423`. It catches native office A/B/tote leg intersections in 94/128/78 of 180 walking frames and procedural carriers in 169 of 180 frames, while the old grip/floor checks pass. This is the baseline regression proof.

`legcheck-final-normal-85` is an intermediate filename from before phone, shoe and live-render coverage were added; it is not final acceptance. Likewise, any `legcheck-accepted-*` run whose report has `passed: false` is a rejected attempt despite the intended output name. The Showcase labels these by their actual result and preserves the full native images. Generated cardigan and shirt phone/gait failures found during the expanded matrix remain visible as failed attempts.

New evidence is grouped under `showcase/crowd-bags-20261007/evidence/carry-correction/`; new lossless images use the isolated asset prefix `bible/shots/showcase/crowd-bags-20261007/carry-correction/`. Existing Showcase image IDs, images and feedback are preserved. Final matrix and live-render receipts will be added after all findings are resolved.

### Mixed skin-weight diagnosis

The geometry-derived palm target (`bag-pose.js` SHA `d4bb7a3f67acc397d3562ff63f766f94cb23a246dec28c48041632ad5bf43ed1`) clears the strongly leg-weighted vertices but still fails on some optional generated clothing. The cardigan witness triangle has one vertex weighted 51.8% to the upper leg, another weighted 80.4% to the hand, and a third shared between hand and upper leg. The blouse and suit have similar connecting triangles. These are actual intersecting mesh surfaces; their mixed weights explain why moving the hand farther outward does not necessarily clear them. The threshold remains unchanged.

The bounded cardigan envelope report confirms the solver reaches its requested palm position: root-space palm x = 0.206672, body minimum x = 0.181080, and maximum strongly leg-weighted x = 0.154321. Adding Hips weights does not enlarge that sampled envelope. The shoulder-to-palm reach is 0.218672, so the target is below the reach clamp. Thus this failure is not a target-normalization or reach-clamp error. See `legcheck-cardigan-envelope-85.json` and the detailed vertex-weight witnesses in `legcheck-envelope-diagnosis-85.json`. This candidate remains rejected pending a visible-surface fix and fresh checks.


### Finger fit and phone-hand follow-up

The bottom-10%-of-hand anchor and relaxed carrying arm during phone use (`looks.js` SHA `dc45d529979d02c10bc5567e736fbafe46153629920086b8feed1b4b4aa11f3d`, `bag-pose.js` SHA `e07ccb96531cbb18188958fe2eeeda1a04e32ca2168e76f63b2d3499f7551c9a`) pass the bounded suit/blouse/cardigan phone and walk snapshots. These 12 images are `finger10-phone-relax-85`. The complete normal-body matrix also passes: 72 native images, six carriers, 270 gait frames and 120 transition frames per carrier.

The full generated-office matrix rejects that source despite all 48 static frames passing. Suit geometry intersects during the first three shoe frames after phone use (up to 6.33 mm). Blouse intersects during 49 gait frames (up to 2.68 mm) and the shoe transition (up to 21.85 mm). Cardigan intersects during 65 gait frames (up to 4.19 mm), its first phone frame and some resumed gait frames. Optional suit-with-tote is clear. Reports and native captures remain under `legcheck-phone-relax-generated-office-85` and `legcheck-phone-relax-normal-85`. These are intermediate results, not final acceptance.

The synthetic pose regression now models the actual three-bone arm/forearm/hand chain. Immediate published-matrix and skin-palette checks retain their original tolerances; maximum observed errors are approximately 3e-8. The prior upload of 788 correction captures was verified against the current asset lock without uploading them again.


The next wrist-orientation correction (`bag-pose.js` SHA prefix `3f6bd4f8`) clears all four generated-office carriers across their 270 gait frames, phone and resumed walking. The remaining failures occur only in the first shoe frames after phone use: suit up to 4.25 mm, blouse 15.58 mm, cardigan 2.68 mm. All 48 static frames pass. This isolates the residual animated elbow bend while the phone pose blends out; `legcheck-steady-wrist-office-85` preserves that rejected intermediate source.


Keeping the loaded forearm relaxed (`0b52ab89`) resolves the generated-office phone-to-shoe transition. That source passes normal 85%, procedural fallback 85/100%, optional generated 85/100%, and generated-office 85/100%. Normal 100% was deferred by the GPU queue before navigation. The true cardigan bridge still intersects during five shoe-transition frames (maximum 3.15 mm at 85%). The shoulder solve lost clearance when the wrist counterrotated, because its hand-local grip offset was treated as part of the rotating arm reach.

The revised shoulder-to-wrist solve (`e67fe09b`) passes the bridge at both scales with the same 25 mm construction margin. The synthetic regression uses a nonzero hand-local grip offset and asserts the final published grip position. Current source reaches x=0.125; the frozen preceding solver fails at x=0.111537 on frame zero, losing 13.46 mm. Raw matrix, skin-palette and relaxed-wrist assertions also pass. The complete frozen-source matrix passes all ten runs: normal, procedural fallback, optional generated, generated-office and true bridge, each at 85% and 100%. It covers 34 carrier/scale combinations, 408 paired-view native images, 9,180 gait/turn frames and 4,080 phone/shoe/sit/resume frames. Every sampled bag/leg intersection count is zero; grip, floor and seated-support thresholds are unchanged. The compact receipt is `evidence/carry-correction/final-matrix.json`, with each full report and source snapshot retained.


The correction gallery preserves 1,922 new full-frame captures as pixel-identical lossless WebP, alongside all 336 original image records unchanged. It includes each live-render attempt, including setup failures and frozen-clock attempts labelled as excluded. Final matrix and live captures appear first; the preview shows the default carrier walking from the hand side. The public-only gallery check resolves all 2,258 images, finds unique IDs, renders all 83 expandable sections and reports no page errors. Complete live observation reports remain local with SHA-256 references in their compact Showcase receipts. This keeps the full raw measurements without adding hundreds of megabytes of repeated bone matrices to Git.

### Resume: arm reach and the apparent wrist flap

The apparent flap between the wrist and hip was a GTAO artifact. Rays through three pixels inside it hit no carrier mesh, and the same camera and pose rendered without it when only AO contribution was disabled. The first quality-switch diagnostics disturbed the camera; those failed setups remain visible and do not count as evidence.

The carrying arm was also wider than its computed clearance target. The old shoulder solve kept any larger outward reach from the animation: the default carrier's grip reached x=0.290 instead of its x=0.191 target. The solve now aims at that target in either direction while preserving the wrist orientation and shoulder-to-wrist length. A regression with an outward arm animation fails the prior solver at x=0.198986 versus the required x=0.125, and passes the revised solver. The frozen bag-pose hash is `5db667893874658f78b83ee3b2e65e653bfa8d73f89d2395704d11c2309645a5`.

GTAO depth thickness changes from 1.5 to 0.5 world units. The radius and all other lighting settings remain unchanged. The 0.15 and 0.3 diagnostic alternatives are retained; 0.5 removes the false silhouette with less change to broad contact shading. Desktop and phone comparisons cover B2 furniture, outdoor greenery, seating and the head-office lobby interior. Earlier frames labelled lobby accidentally showed its exterior; a separate interior follow-up waits for the place's cutaway to finish. Phone comparisons force high graphics quality so the AO adjustment is exercised.

The resumed geometric matrix and live draw checks are recorded in [the matrix receipt](../showcase/crowd-bags-20261007/evidence/carry-correction/resume-final-matrix.json) and [live receipt](../showcase/crowd-bags-20261007/evidence/carry-correction/resume-live-summary.json). Geometry checks retain the original grip, floor, seat and leg tolerances. Most full matrix stills precede the AO change; the accepted AO comparison and refreshed live views show the final rendering. Complete original reports, raw draw measurements, source snapshots and every PNG remain in `game3d/shots/crowd-bags/resume-*`; the Showcase has lossless copies of every attempt. The earlier frozen-source matrix remains historical evidence, not final visual acceptance.

Final CPU check and both fast playthroughs pass after the arm and AO corrections. Performance warnings remain in the retained logs; this change makes no matched performance claim. Cross-team review X-0808 remains required before the work is called done.
