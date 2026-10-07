# Selected pool swimwear integration: 2026-10-07

Issue #296. Appearance choice: [pool-swimwear-1](../reviews/pool-swimwear-1/review.json), Kuro B, Emi, Eric and Carina. This work preserves those faces, meshes, UVs, textures, skin weights and body scales. It adds no casting, rewards, lessons or private content.

The pool uses its existing actor objects and walking roots. Emi and Kuro wear the selected pool bodies at the Saturday evening session; a swimming protagonist changes at the existing locker, showers, then uses the pool steps. Watching keeps everyday clothes. The departure route returns via shower and locker. Saved outfit state composes with the existing water/bench state. Pool exit restores everyday bodies; cached pool bodies retain their mixers and materials for the next visit.

## Retained derivations

All source models remain at `art/parts/pool-swimwear-1/game/`. The derivations, scripts, measurements and diagnostic captures remain at `art/parts/pool-swimwear-runtime-1/`.

| Attempt | Result |
|---|---|
| Original | Selected appearance; Eric/Carina lower-leg deformation and foot penetration required motion repair. |
| `ankle-weights-1` | Rejected smoothing. It worsened the silhouette. |
| `seat-calibration-2` | Seated lower-leg rotations improved foot direction but did not repair the ankle defect. |
| `ankle-and-seat-3` | Rejected combination with smoothed weights. |
| `ankle-bind-4` | Eric right ankle depth aligned with his measured left counterpart; neutral mesh preserved. |
| `ankle-bind-seat-5` | Combined ankle and seated correction; original weights. |
| `ankle-bind-seat-weights-6` | Rejected comparison; no useful improvement from smoothing. |
| `ankle-bind-7` | Eric and Carina measured separately; toe translations, inverse binds and position tracks compensated. |
| `ankle-bind-seat-8` | Original weights, corrected ankle depth and six seated lower-joint quaternion tracks. |
| `ankle-bind-seat-weights-9` | Rejected weight comparison. |
| `grounded-10` | Rejected despite clearance: the whole-body lift left Eric on pointed toes and increased head bob. |
| `stance-11` to `stance-16` | One support-foot/leg-contact approach, with retained exporter corrections for toe-heading singularity, direct source sampling and smooth support release. Candidate 16 still planted some original run flight frames. |
| `stance-17` | Current candidate: support-foot orientation and leg contact adjustment, original pelvis/upper-body tracks and weights, preserved positive source run-flight clearance. Dry mixer correction remains for residual penetration and blends. |

The ankle corrections preserve neutral posed vertices within 9.86×10⁻⁹ m. `verify_preservation.py` audits attributes, topology, textures, weights, non-target joints and animation tracks. `verify_grounded.py` retains the audit of rejected attempt 10. `verify_stance.py` audits candidate 17 against attempt 8: all geometry, weights, bind matrices, Hips and upper-body tracks, idle, sit and textures are identical. Only eight Eric/Carina lower-body quaternion tracks change. Runtime JSON clips are tracked text; the eight GLBs and four textures are scoped binary assets.

At the unchanged pool root scale 1.18, measured standing heights are Eric 1.41924 m, Carina 1.32285 m, Emi 1.28783 m and Kuro 1.33491 m. Original and corrected neutral heights agree within 10⁻⁸ m. Eric's larger seated head/torso silhouette is not a new resize.

## Functional and physical evidence

`game3d/shots/pool-outfits/` retains every native attempt and JSON report.

- `native1`: actual three-swimmer travel and arm motion, strict overlap/spin/gait checks, cleanup on leaving.
- `lifecycle1`: actual locker/shower/change-back route and pre-reload mesh seat contact. The first desktop camera frame cropped hair; it is not the final framing proof.
- `runner1`: retained stale-checkpoint timeout. `runner3`: retained failed Continue pose. The old water overlay survived a later dry checkpoint and lowered the seated bodies through the bench.
- `runner4` and `runner5`: corrected water→bench restoration. Both MCs pass actual Runner title Continue from water and bench. Native assertions check actual deformed underside against the seat and require cleared water overlays.
- `ground1`: original foot penetration. `ground2`: baked pelvis lift exposed remaining blend penetration. `ground3`/`ground4`: clearance passed, but Eric’s toe-tip stance and increased bob were rejected. The complete native video and inspection copies remain.
- `stance16`: improved support, but the late Eric run capture leaves the frame. `stance17`: exact diagnostic tracking fixed that; its strict body-margin assertion failed. `stance18`: the wider constant diagnostic lens retains every sampled body corner within 95% of the viewport, with actual deck movement and strict movement checks. No actors are repositioned or geometry hidden. Source run flight remains airborne at all 177 Eric and 182 Carina sampled flight phases.
- `head-phases-17`: fixed full-body lens at Eric’s measured minimum and maximum head heights for walk and run.
- `lifetime1`: interruption after the actual locker change restores ordinary actor/root/update with no late movement; an unavailable optional GLB keeps the existing pool playable.
- `revisit1`: both protagonists actually travel pool→sports→cached pool. Everyday body/root/update is restored outside; selected bodies and running mixer actions return on the cached visit.

Focused CPU tests use actual Three rigs, transformed parents/roots, material ownership, a procedural fallback body, real dry animation blends, repeated updates without accumulated lift, water/seat exclusions and cached-body reuse. The source review found and resolved premature disposal on cached-place exit. The final source CPU gate passed 642 tests and all repository checks; the focused pool suite has 18 tests. Rebase onto a7152582 changed metadata only and retained all frozen runtime hashes.

## Motion review limits

Ground clearance alone is not acceptance. Dense 721-sample clip comparisons retain head and sole trajectories, including loop wrap. Rejected attempt 10 increased Eric’s head-height range from 0.053/0.062 m to 0.123/0.135 m for walk/run. Candidate 17 preserves the source head samples exactly: Eric 0.05325/0.06163 m; Carina 0.05082/0.05771 m. All measured original run-flight frames remain airborne. Between baked keys the worst uncorrected sole penetration is 1.01 mm, cleared by the pool-only mixer correction.

The actual stance18 run window includes start/stop blends and the arrival blend. Its full head range is Eric 0.13141 m and Carina 0.07569 m; these are not the smaller steady-clip ranges. The whole trajectory and uncut video remain available for motion review. Native sole minimums are above −0.0001 m. The local correction undoes its previous offset before every update and clears before seat, water and outfit transitions. The final focused run measured the complete grounded mixer update at Eric 0.088 ms mean / 0.144 ms p95 and Carina 0.063 ms / 0.098 ms p95. It also checks repeated updates and no cumulative lift.

No neutral body or foot shape was remeshed. [The durable independent review](pool-swimwear-motion-review.md) records the full verdict and exact evidence list. A fresh independent critic inspected all eight stance18 stills, all eight Runner6 stills, four fixed extrema, trajectories and decoded video samples (2 fps, plus Eric’s final segment at 8 fps). The bounded integration scored 8/10 with no observed blocker. No abrupt whole-body lift was identified in those samples. This is sampled temporal evidence, not continuous real-time inspection; the recording holds its final mid-stride pose, so it does not establish a fully settled idle. The wider pool environment and approved body proportions were not rescored.

The public bible checker resolved all new Showcase paths. Its worktree-wide result retained 307 missing historical links/captures outside this change; the coordinator’s main public bible check passed. Final full-day fast checks passed on the rebased source: Eric 1366×860 in 72 seconds and Carina 390×844 in 73 seconds, no overrides, overlaps, spins or long gait errors. Existing per-place performance baseline warnings remain in the reports.
