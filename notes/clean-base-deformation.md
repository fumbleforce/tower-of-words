# Clean base deformation check

The v14 pair passes the strict intersection gate in both default and corrected-rest modes, with 264 posed meshes checked. Walking floor contact is still wrong and also fails on the original source models. These findings come from the creator's actual rig and retargeting code, without a browser or renderer; they are not a visual approval.

Run `node tools/creator/base/check_deformation.mjs --strict --all-crossings clean-eric-v14 clean-mio-v14` from the repo root. Add `--host-rest` for the candidate correction. The current default IDs are explicitly v14; name the IDs when recording a comparison. JSON output contains asset and implementation SHA-256 hashes, sampled bounds, worst stretched edge with its weights, and crossing triangle indices.

`--strict` requires `--all-crossings` and exits 1 for any detected proper crossing or non-finite geometry; a missing dense flag exits 2 before loading assets. Without strict mode, crossings are diagnostic and only non-finite geometry fails. Floor penetration remains a reported upstream problem, not an exit-code condition. A passing geometry gate is not a visual approval. `--crossings` alone samples just five poses and is useful for diagnosis only; omitting both crossing flags gives the quick bounds/skin check.

Add `--keep-poses` to preserve the sampled triangle exports per animation in a unique `/tmp/creator-deformation-*` directory, reported in the output. These include the skin matrices and bone world matrices for builder diagnosis. Dense mode exports 33 poses per clip; otherwise there are five. `node tools/creator/base/check_deformation.mjs source-eric source-mio` measures the original source meshes as a control.

`--all-crossings` runs intersection checks on all 33 sampled frames. `--host-rest` enables the real creator's opt-in `lib.retargetRest` correction; it does not alter the default behavior.

## Visual review of the frozen v14 captures

Root and an independent critic inspected all six sheets in `art/parts/base/shots/clean-v14-rest`.
Bare bodies remain 7/10; dressed bodies 4/10. Eric’s nape groove is visibly removed. The shoulder transition
improves only modestly: a cap edge still reads like a short sleeve on both bodies. Mio’s bowed arms and angular
waist-to-thigh transition remain visible. Original clothes intersect the upper arms, back, trousers and shoes;
hair exposes scalp patches and Eric’s stubble has neck spikes. Those defects remain visible at the game camera.
The sampled walking silhouettes are coherent, but still sheets cannot prove smooth playback or floor contact.
Neither result reaches the visual approval gate. Review `creator-base-2` asks for direction feedback only.

## Final v14 strict result

Both default and corrected-rest runs exit 0: 33 frames × two clips × two bodies × two modes, with no proper crossings or non-finite geometry. The hashes match between runs. The v14 shoulder clearance change resolves the v13 failure below.

| Body / mode | Maximum walk edge stretch | Maximum neutral edge stretch | Lowest walk surface Y | Neutral marked-sole Y range |
| --- | ---: | ---: | ---: | --- |
| Eric / either | 1.447× | 1.075× | -0.049322 | -0.000001 to 0.000000 |
| Mio / default | 1.491× | 1.298× | -0.048079 | -0.014494 to 0.028553 |
| Mio / host-rest correction | 1.486× | 1.127× | -0.051190 | -0.000001 to 0.000000 |

The output's separate whole-surface and marked-sole minima agree for each of these clips; that agreement is measured, not assumed from the rest soles. Floor contact is not corrected. No minimum separation or clothing allowance has been established.

Default output: `/tmp/clean-base-v14-current-strict.json` (this agent's run). Corrected output: `/tmp/clean-base-v14-host-rest-strict.json` (builder's run, inspected here). Frozen model hashes:

- Eric: `505f4fa81e0ffda25805ead27d02b440210ee51da8f1bd40ecbc0e9a806683d5`
- Mio: `68af60d1e6a67253e1585e3e5cf33045c884b066c15ae8fc04fdac1c54910f88`

## v13 regression caught by the strict gate

`/tmp/clean-base-v13-current-strict.json` exits 1. Eric has four crossing pairs at both 0.200000 and 0.233333 seconds: 52/340, 52/341, 55/340 and 55/341 (left upper-arm root into torso). Eric neutral and both Mio motions pass. The builder has the failing pairs for a focused shoulder correction. Pelvic grading reduces Eric's worst walking edge stretch from 1.640× to 1.447×; Mio is 1.491×. No vertex flight or non-finite matrices were found.

For these runs the whole-surface minimum and marked-sole minimum happen to agree: Eric walk -0.049322, Mio walk -0.048079, Eric neutral -0.000001, Mio neutral -0.014494. The output now names these measurements separately so that this agreement is checked rather than assumed.

The gate also exits 1 on the known-bad Eric v5 control (`/tmp/creator-strict-known-failure.json`) and exits 2 when `--strict` is used without `--all-crossings`.

## v11 result

Default Eric and Mio pass all 132 posed intersection checks (33 frames × two clips × two bodies). Corrected Mio passes another 66 checks on the same verified model bytes. Eric's correction path is a byte-preserving bypass, already verified on the actual creator outputs. The v10 hand clearance change and v11 shoulder adjustment together remove the intersections reported below.

| v11 body / mode | Maximum walk edge stretch | Maximum neutral edge stretch | Lowest walk sole Y | Neutral sole Y range |
| --- | ---: | ---: | ---: | --- |
| Eric / default or corrected | 1.640× | 1.066× | -0.049322 | -0.000001 to 0.000000 |
| Mio / default | 1.492× | 1.319× | -0.048079 | -0.014494 to 0.028553 |
| Mio / host-rest correction | 1.493× | 1.102× | -0.051190 | -0.000001 to 0.000000 |

Output: `/tmp/clean-base-v11-current-dense.json` (this agent's run) and `/tmp/clean-mio-v11-host-rest-dense.json` (builder's run, inspected here). Model hashes:

- Eric: `fc8746dc926d55020bd320e834f29f831aa04a43c1ac0c98b8c3861cdf64eaac`
- Mio: `47d8f3eef312d8f8f4e7a032cbcecd3803f4ef8ea62939a83fbf5362e155ef66`

The remaining numerical issue is walking floor contact. The remaining review work is visual shape, actual clothing fit, and transitions. The rest correction remains opt-in until that review.

## v6 revision

The uncorrected creator path has zero proper crossings across 132 posed meshes: Eric and Mio, walk and neutral, 33 frames each. Walking maximum edge stretch fell to 1.640× for Eric and 1.679× for Mio. The five-frame crossing check also passes with the opt-in host-rest correction. Full dense output: `/tmp/clean-base-v6-dense-motion.json`; corrected output: `/tmp/clean-base-v6-host-rest-actual.json`.

## v8 comparison and v9 clearance diagnosis

The denser corrected check found 15 proper crossing triangle pairs in Mio at walk time 0.6 seconds: the left hand intersects the left thigh. The other 32 sampled walk frames, all neutral frames, and both Eric motions are clear. Examples are triangles 401/538, 401/541, and 410/538. This was missed by the five-frame test. Output: `/tmp/clean-base-v8-host-rest-dense.json`; the builder has these pairs for a focused clearance revision. Do not interpret the rest-angle fix as a complete retargeting or animation-fit approval.

The default v8 path has zero crossings across all 132 sampled posed meshes (`/tmp/clean-base-v8-current-dense.json`). The collision therefore appears with the corrected retargeting, not in the default v8 animation.

The v9 shoulder revision keeps the same hand collision. A diagnostic on its 0.6-second frame moves the bind vertices laterally by an amount tapered through their forearm/hand weights, then applies the actual skin matrices. A +0.010 shift leaves 12 crossing pairs; +0.020 clears that frame. This is an input to a clearance revision, not a complete fix or instruction to move the whole body. The posed geometry and matrix dumps are in `/tmp/creator-deformation-V7swgk/`; `--all-frames --keep-poses` reproduces dense pose dumps without running expensive intersection tests.

The later builder applies that 0.020 outward shift to Mio's forearms and hands, tapered by their skin weights. This changes her bind shape and can read as bowed arms. It is an authored clearance tradeoff for the host-rest animation, not evidence that the unmodified source proportions were preserved. Keep it visible in shape review and reconsider it if the retarget or animation changes.

## Host rest correction candidate

`makeRig` builds host-specific local bind rotations, but `clipsFor` previously replaced them with reference-local quaternion keys. Mio and Eric have different local rest angles. `tools/creator/retarget.js` now provides an opt-in correction: `hostLocalRest × inverse(referenceLocalRest) × animatedLocal`. Hips keys receive the existing source-parent conversion first. The reference body bypasses this correction, so Eric's samples are unchanged.

On v6, corrected Mio neutral soles lie within 1e-6 of zero instead of -0.014494 to +0.028553. The original-source control also becomes flat, supporting the diagnosis independently of the new geometry. Mio walking still reaches -0.051190, slightly deeper than -0.048079 before correction; maximum walking edge stretch is 1.700× instead of 1.679×. No foot contact solver or automatic body lift has been added. The correction remains off by default pending visual inspection.

`node tools/creator/test_retarget.mjs` checks exact reference preservation, root and child rest mapping under different parent rotations, retention of local animated motion, normalization of non-unit input samples, and immutable source values/frames. A fixture executes the actual `clipsFor` function with noncommuting armature/host rotations: a raw hips rest key must map to the host rest after the armature conversion. This catches correction being applied in the wrong order. Tests pass. The actual-creator CPU checks also confirm Eric's bounds, stretch, sole ranges and displacement match with the flag off and on. The exact reference shortcut assumes `buildCharacter` passes the actual `lib.src` object; a cloned reference would go through normalization.

## v5 failure measurements, 2026-09-29

Each model has 398 welded positions and 792 triangles. Each animation uses 33 samples spanning its loop. Units are source-normalized height with creator `height: 1`; the clean bodies are shorter than the complete source models, which include hair.

| Model / motion | Min sole Y | Max sole Y | Edge length relative to bind | Proper crossings at five samples |
| --- | ---: | ---: | --- | --- |
| Eric v5 / walk | -0.049322 | 0.085719 | 0.450–2.256 | 17, 18, 17, 0, 17 |
| Eric v5 / neutral | -0.000001 | 0.000000 | 0.529–1.044 | 10, 10, 10, 10, 10 |
| Mio v5 / walk | -0.048079 | 0.129107 | 0.475–1.789 | 40, 28, 28, 0, 40 |
| Mio v5 / neutral | -0.014494 | 0.028553 | 0.706–1.163 | 0, 0, 0, 0, 0 |

The five crossing samples are 0%, 25%, 50%, 75%, and just before the loop endpoint. Walk lasts 1.066667 seconds; neutral lasts 4 seconds. The 18 authored sole vertices per body do not move during neutral, but Mio's planted feet are tilted relative to the floor. Neither foot has a contact correction in the creator update.

The original source meshes show the same floor problem more strongly: walking sole minima are -0.087469 for Eric and -0.066354 for Mio. Source Eric's neutral soles are within 1e-6 of the floor, while source Mio's are -0.031808 to +0.036734. This puts the floor problem in the existing clip/retarget combination, rather than establishing a new clean-base defect. Fixing the bases by distorting their feet to compensate would conceal that upstream issue. Source snapshots round skin weights to four decimals; their bind recovery error is up to 9.4e-5, far smaller than the observed floor penetration.

Eric's neutral crossings involve upper arms, shoulders and torso. Walking adds more shoulder folds; Mio also intersects its forearms with the hips. At 0.233333 seconds the worst walking stretch is a shoulder seam: Eric's 0.021773-long edge becomes 0.049118, and Mio's 0.026469 edge becomes 0.047348. One endpoint is weighted 90% upper arm / 10% spine, the other 60% spine / 40% lower spine. This locates the defect for a focused seam and weight revision. It does not establish that changing weights alone is sufficient.

All sampled vertex coordinates and bone matrices are finite. The animated bodies stay within overall widths of 0.418 (Eric) and 0.443 (Mio); there are no vertices flying arbitrarily far from the body. Applying skinning in bind pose reproduces vertex positions within 1.7e-8, an internal check that the mesh and skeleton bind spaces agree.

## Method and limits

The harness executes checked-in `recipe.js` and `base/base.js` with only browser import and asset-loading substitutions. It calls the real `buildCharacter`, `makeRig`, `clipsFor`, `baseMesh`, `play` and `update` implementations. Animation node transforms and channels are read from the GLBs, then played and interpolated by the repository's Three.js `AnimationMixer`. Vertex deformation uses Three.js `SkinnedMesh.applyBoneTransform`; there is no separate animation implementation. The reference normalization is reconstructed from the source GLB using the same identity bind matrix as the repository's GLTFLoader. Exported source joint frames are rounded to six decimals, so tiny numerical deviations from loading the source directly are expected.

The existing builder's `--check` is run on temporary posed triangle exports, sequentially with NumPy/BLAS threads limited to one. Its result label says bind space because it ordinarily reads bind exports; here its input is explicitly the posed vertex positions. Temporary files are removed afterward unless `--keep-poses` was requested.

This samples time; it is not continuous collision detection. The triangle test excludes coplanar overlaps and tangent contacts. No clothing or hair is loaded, so layering, surface appearance, normals under rendering, visual appeal, foot sliding against world movement, and animation transitions still need separate checks. The probe does not modify assets or implementation files; the opt-in correction is a separate, explicit code change described above.

`surfaceMinimumY` is the lowest coordinate across every posed mesh vertex (also `bounds.min[1]`). `soleVertexY` follows only vertices that started at rest Y < 1e-5. An ankle, toe edge, or another part can become lower than those marked soles, so use the surface minimum to assess the whole mesh against the floor. Neither field applies a contact correction. Minimum separation between body parts is not measured: a near miss can pass, and a collision-free base does not establish room for a clothing layer. The probe also does not calculate winding numbers to detect fully enclosed geometry.

Historical v5 base hashes:

- Eric v5: `2c1a16077b82b52c6ac537406d622249da2a63f6c88c3bb484a04a9564d82687`
- Mio v5: `e40f460237c85b87bf22983a7a2d6f6731ce83a4b3ce4d9d2082d7fa15cfac11`

The historical v5 run output is `/tmp/clean-base-deformation-crossings.json`. Re-running prints all provenance needed for a later candidate; temporary reports are not committed sources of truth.
