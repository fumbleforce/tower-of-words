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
