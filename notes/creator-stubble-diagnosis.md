# Eric's detached stubble layer

Diagnosis, 2026-09-29. CPU inspection of `src-eric.json`, clean bases v11–v14, the v11 fit2 export, and the creator loader. No source models, builders or runtime files changed. This concerns candidate creator bases; the approved game models remain governed by [art-and-sound.md](../docs/game/art-and-sound.md#people-in-the-world).

The current “stubble” selection contains collar, neck and side/back hair geometry. Its original surface also differs substantially from the new closed head. A small normal lift cannot make this triangle collection conform to the new face.

## Measured cause

`tools/creator/base/build_clean_base.py:332` selects source triangles labelled `hair` whose **centroid** is within `Head.y - .04` to `Head.y + .18`, whose normal has `z > -.2`, and whose centroid has `abs(x) < .2`. It does not test colour, depth, anatomical region or every vertex. All four inspected base versions select the same 54 triangles.

The upstream slot is also broad: `tools/creator/cut.js:53–59` assigns non-skin head-bone triangles above the collar to `hair` when they miss the face test. Consequently `hair` is not a guarantee of hair material.

Coordinates below use the exported, height-normalized bind space; positive z faces forward. Head joint: `[-.000532, .533230, -.037274]`.

| Evidence | Measurement |
|---|---|
| Selected geometry | 54 triangles, 70 welded vertices, 12 edge-connected islands, 74 boundary edges |
| Full vertex bounds | x `[-.16752, .16744]`, y `[.49530, .73145]`, z `[-.20370, .12345]` |
| Back-of-head inclusion | 17 triangle centroids behind the Head joint's z coordinate |
| High side-hair inclusion | 15 triangle centroids above y `.64` |
| Collar/hood fragments | Triangles **391, 392**, behind the neck; texture-centre RGB `[128,130,146]`, `[124,125,143]`; mean weights 42.35% Head, 29.92% neck, 26.68% shoulders |
| Long neck triangles | **437, 563, 693** reach y `.49530`, `.51025`, `.49600`; these extend well below the new skull despite their accepted centroids |
| Internal upward-facing cap | **1077–1081**, y `.58594–.59375`, z `-.01510–.03263`; normals point almost straight up, not along the visible chin |
| Clear lower-front chin seed | **460, 462**, texture-centre RGB `[160,134,116]`, `[160,134,113]`; distinct from the blue-grey collar fragments |

The collar classification is supported by its grey colour, position and shoulder/neck weights. The five upward-facing triangles are geometrically an internal cap; their intended source-model semantics are less certain. Neither group should become a visible beard patch by being inflated outward.

Against v14, **128 of 162 original stubble corners are inside the body**, up to `.05199` deep; the other 34 are outside, up to `.07177` away. The new Head-weighted skull starts at y `.54323`. `base.js:71–73` only adds `.0025` along the original face normals when no fit is supplied. It neither projects onto the new head nor joins the twelve islands. Double-sided rendering at line 76 makes detached undersides visible too.

With fit2, all 54 triangles instead become rigid Head geometry. That makes the mistakenly included collar follow the head. The fit still has seven penetrating stubble faces and maximum depth `.01105`; forcing this mixed selection outside exposes more of its originally hidden neck/cap geometry.

## Next small candidate change

Make a **separate projected colour patch on the existing base head surface**. Stubble here is source colour, so carrying over its old disconnected 3D surface is unnecessary. Keep the closed body and its eyes unchanged.

1. Add a candidate-only explicit source-triangle manifest. Begin the facial colour mask with the clearly identified chin pair `460,462`; inspect any additional jaw/sideburn triangles before including them. Do not project all 54 triangles. Keep the source model and shared slot library untouched.
2. Reuse the base's existing front-face UV projection to create a transparent stubble mask from those source colours. Clip it to the new chin surface. For the removable overlay, reuse eligible base head triangles and their exact positions, normals, UVs and weights; use a small material depth offset and no duplicate shadow casting. This is a separate toggleable layer with no free neck triangles.
3. In the candidate layer manifest, keep confirmed side/back hair in hair, remove `391,392` from facial hair, and exclude the internal neck/cap faces from the overlay. Simply shortening `body.stubble` is insufficient: `layersOf()` currently puts every excluded triangle back into hair, so the same fragments would remain visible under another name.

Compare the original source, bare candidate, old stubble and projected chin patch in front/side/back views and head motion. Check that the overlay shares base weights, adds no neck geometry, leaves the closed body's topology/hash unchanged, and remains removable. The first patch should establish placement before extending its coverage. This is a bounded next experiment, not a claim that the full original beard mask has already been identified.
