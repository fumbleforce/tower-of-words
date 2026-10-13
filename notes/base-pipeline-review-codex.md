# Base-body pipeline review

2026-09-29. Review requested in `collab/to-codex.md`, C-0012/C-0013. Findings below refer to the original pipeline from e144f40, before the root agent's later `base.js` changes. Read-only review of `tools/creator/base/build_base.py` and `base.js`; validator changes are described below. No Blender, browser, rendering or game changes were made for this review.

## Findings

1. **Failed clearance searches still move the body inward.** `tools/creator/base/build_base.py:355` tries twenty steps and `:358` unconditionally assigns the last point, even when every `ok(q)` failed. This can shrink a narrow limb through its own interior while providing no clothing clearance. The later face pass at `:369` also moves every affected corner without checking whether the move improves fit or preserves shape. Reproduction: execute the actual AST of the first loop with a vertex at `1.0`, normal `1.0`, and an unsatisfiable clearance predicate. It moves to `0.96` and increments `pushed`. This is a confirmed failure-path behavior, not a claim that every vertex in the current exports took that path. Keep the last valid position, record unresolved fit, and solve the clothing/body mismatch explicitly instead of accumulating inward displacement.

2. **The last smoothing operation invalidates the preceding fit check.** `tools/creator/base/build_base.py:390` applies an unconstrained two-pass smooth after the “safe smooth” pass. The only subsequent geometry checks (`:395`–`:408`) count boundary edges, nonmanifold edges and connected pieces. None checks clothing clearance, intersections or rest-pose anatomy after smoothing. Reproduction condition: a concave clothing fold whose neighboring body vertices average across its surface. That final smoothing move has no acceptance predicate. Validate the final mesh, and preserve the previous point when a constrained smoothing move fails. This is a code-path finding; I have not rendered a new penetration example.

3. **A temporary base-load failure remains cached for the page lifetime.** `tools/creator/base/base.js:14` stores the promise before it resolves, with no rejection cleanup. After a transient JSON or texture failure, asking for that base again returns the same rejected promise. CPU reproduction using the actual `loadBase` function and a fetch that fails only its first call: two attempts both fail, and fetch is called only once. Remove the matching cache entry on rejection so Retry can recover. An explicit HTTP status check would also improve the reported error.

4. **The builder reports checks without enforcing them, before lossy export rounding.** `tools/creator/base/build_base.py:408` prints the results and continues even on failure. At `:557` positions are rounded to five decimals, so the `check` block at `:558` describes the pre-export geometry. A narrow triangle can collapse during that rounding while the embedded check still reports success. The standalone validator's rounding-collapse fixture covers this case. Run validation on the exact saved export, fail the build on an invalid result, and attach that result/hash to the review. Both final rounds currently pass the separate validator; this finding concerns the reliability of the build gate.

## Current exports

The following files pass the existing topology/skin tests and the new optional source-envelope check. Every file has 2,600 triangles and 1,302 welded vertices, one connected component, and zero reported topology, skin-seam, source-bounds or bone-envelope defects.

| Export | SHA-256 |
| --- | --- |
| eric-base9.json | `fe1cd107b20f497cb3e5f1b5214a86d8a15f7463b94924670d090501f2b966d8` |
| eric-base10.json | `252b06fb06aa0a867bfc6710c1a32077c12e222d621de1e0bfe709f7ed8279d5` |
| mio-base9.json | `dc56356803f7194e89f378176cd7a4ee93a958511b9bdc4c08345c3e48dde3ba` |
| mio-base10.json | `46c76fa337243ab8191afda56e5ddecac2d44f8453b0a5126f7d35014f1dc613` |

Source dump hashes: Eric `e471c918c224e9f00e4234ca814b061af3276d83d9100461fe8d82a5a9e87552`; Mio `99235b121b4ddfbf8176ebc9e038cbf4da4b4c5782528a2280d4b0f2f7759ea2`.

These passes do not contradict Jørgen's rejection in C-0017. They establish structural consistency only. The original renderer computed flat normals from duplicated triangle corners (`base.js:33`) and forced flat shading (`:37`); no smooth normal data survived that path. Changing shading alone would not repair thin anatomy, dents or poor silhouette. The new simple-body candidate still needs his visual review.

### Clean v1 candidate check

Both clean v1 candidates pass topology, weights, optional normals and the source-envelope checks. Each has 792 triangles and 398 welded vertices. Maximum normal-length error is approximately `6.2e-7` for Eric and `6.6e-7` for Mio, below the `0.001` tolerance.

| Export | SHA-256 |
| --- | --- |
| clean-eric-v1.json | `8c4adb5d744b05dafeeacc7c5fc9e7f6200d4029d53c5c91cc1408fe7c4cdd7d` |
| clean-mio-v1.json | `981ef21e9f298c6f8d3548b2b6bdd06795b4cf077a2fd1f9bb53a11823a9b9bd` |

Mio initially produced three torso outliers: source `Spine` has no vertices weighted at least 5%, so a point-sized joint envelope incorrectly constrained the candidate's fuller torso. The validator now handles that reference gap using adjacent parent/child joint positions, as described below. No model was narrowed to satisfy the check. These passes do not cover self-intersections or visual quality.

## Validator addition

`validate_base.py` keeps its existing two-argument Python API and CLI behavior. An optional source adds coarse rest-pose checks:

```sh
python3 tools/creator/validate_base.py art/parts/base/eric-base9.json art/parts/base/eric-base10.json --source art/parts/base/src-eric.json
python3 tools/creator/validate_base.py art/parts/base/mio-base9.json art/parts/base/mio-base10.json --source art/parts/base/src-mio.json
python3 -m unittest discover -s tools/creator -p test_validate_base.py -v
```

The source's position bounds and each bone's supported source vertices define padded boxes in the shared bind space. A bone's joint position is included. Source influences of at least 5% contribute support; the candidate must fit at least one influence of at least 20%. Repeated influence slots are summed before either threshold. Checking any substantial influence allows blended joints and rebuilt skulls room to change. When a source bone has no supporting surface vertices, its own and adjacent parent/child joint positions define a fallback box; the report lists those bones in `bone_envelope_joint_fallback_bones`. This remains a local anatomical check rather than granting the whole body bounds.

Default padding is 8% of the source position Y span; `--source-margin` changes it. The source's `height` field is deliberately ignored because it retains the original GLB scale while its positions are normalized. The report records exact source and candidate hashes, effective padding, and separate unique-vertex counts for whole-source and bone-envelope outliers. A single explicit source must match every input's source ID.

An optional `normal` attribute must contain one finite XYZ vector per exported corner, with each vector's length within `0.001` of one. Omitted normals remain valid for legacy exports. The report gives the count of non-unit vectors and maximum length error; it does not infer whether a unit normal points in the intended direction.

All 22 unit tests pass. Fixtures cover a closed stretched mesh that topology alone accepts, a displaced limb still inside whole-body bounds, moderate shape adaptation, original-height versus normalized-height scale, equivalent weight slots, blended joints, unsupported source joints with bounded fallback, malformed or mismatched sources, rounded unit normals, and malformed/zero/scaled normal vectors. Legacy CLI use, the four original source-aware checks and the two clean v1 checks succeed.

Limitations: these are deliberately broad boxes, not anatomy reconstruction. Distortions within them can pass; a bad reference also weakens the check. They do not test smoothness, point-count suitability, silhouette, self-intersection, clothing penetration or deformed animation poses. The earlier a3 exported mesh is not among the current base JSONs, so I used a reproducible stretched-mesh fixture rather than claiming to have rerun that historical asset.
