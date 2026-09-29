# Live creator comparisons

C-0026 and C-0027, 2026-09-29. Reviews: [angular bases](http://127.0.0.1:8771/bible/#review/creator-base-3) and [live idle](http://127.0.0.1:8771/bible/#review/creator-idle-neutral-2).

The base viewer compares the actual game Mio/Eric adapters against a bare base at the same standing height. It offers v14 smooth, the identical v14 mesh with flat shading, and v15 with two head rounding bands removed. Office lights and tone mapping come from the office builder; a plain floor replaces room geometry and post effects are off. The previous bright viewer lighting remains selectable. Standing, bind and walking poses, shared orbit and zoom are available.

v15 has 374 welded vertices and 744 triangles per body (v14: 398/792). It exports face normals and explicit flat shading. Body geometry, weights, skeleton and eye texture are carried over. Both exports pass topology/normal/weight validation. CPU sampling with host-rest correction reports finite neutral/walk poses and no proper triangle crossings at the five sampled times per clip. This is a sample, not exhaustive intersection proof; inherited walking floor contact and layer fitting remain unfinished.

The idle viewer plays the full original clip beside the four-second neutral loop. The currently held 0.4-second creator pose is also available. Both sides share identical source parts and host-rest correction is off. Mio/Eric selection, pause, orbit, zoom and idle/walk transitions are synchronized. Neither candidate replaces a game asset.

The first focused browser run checked both viewers at desktop and phone sizes, both bodies, all base variants, base poses and lighting, advancing animation time, pause and walk transitions, with no page errors. Screenshot inspection caught an inherited parent transform during base model switches; normalization now updates the parent matrix before measuring. First captures remain in the round's [archive](../reviews/creator-base-3/attempts.html). Phone base controls moved below the models after inspecting the first layout.

Candidate JSON, textures and captures remain local assets under art/parts/; the generator and review/viewer source are versioned. Generate v15 with tools/creator/base/build_clean_base.py for eric/mio. The existing art/parts source library and neutral animation are required, as for the main creator.

The follow-up capture confirms identical normalization scale for v14 smooth, v14 flat and v15 for each body (Mio 1.1439853254, Eric 1.0784809375). Final captures use the `-final.png` suffix. Claude's visual skim is requested in X-0131.

## Dressed round 4

C-0085: Jørgen picked v15-flat, asked to simplify body bands that read as rolls, and try hair/clothes to reproduce Mio and Eric. Review: [creator-base-4](http://127.0.0.1:8771/bible/#review/creator-base-4).

v16 removes the intermediate hip ring (the bulge between pelvis and waist). Each body is now 362 vertices / 720 triangles. Remaining vertex positions, weights, overall bounds, head and eye textures stay unchanged; v15 files were preserved. Both exports pass closed-shell, degenerate-face, normal and weight validation.

The round-4 live comparison loads the original hair/top/bottom/shoe layers and Eric’s stubble. Layers can be hidden separately; scale is fixed from the fully dressed bounds. Mio’s layers copy the game mesh’s per-face colour, texture-use and tint attributes plus its material shader; the first creator-colour captures remain in the archive. The two models use different idles, so idle silhouette differences are not purely proportions.

The first attempt visibly leaves shoulders/arms outside sleeves, with exposed skin across Mio’s back and ankles. A read-only visual critic capped it at 5/10 for intersections. Code evidence includes earlier authored outward arm offsets that original clothes never received; a shared rig does not establish matching geometry or weights.

One unchanged-fitter run produced separate fit3 layer files for each body, under four minutes each. Both remain not-ready. Mio penetrating faces by layer: hair 0, top 18, bottom 30, shoes 4. Eric: hair 4, top 9, bottom 11, shoes 1, stubble 2. All retain clearance failures; no reversed faces were reported. The fitted images cover more skin but pull hems outward and distort shoes. These are recorded attempts, not game-ready outfits. No further fitting loop was run.

Browser checks loaded both bodies, v15/v16, original/fitted layers and Idle/Walk, with stable scale while toggling layers and no page errors. All captures are preserved in the review archive; JSON and images stay local. Game integration remains unapproved.

## Relaxed idle round 3

C-0086 asks for visible breathing/sway and relaxed arms. [creator-idle-neutral-3](http://127.0.0.1:8771/bible/#review/creator-idle-neutral-3) uses the existing live comparison with `?round=3`; the previous neutral loop plays on the left by default. Earlier viewer URLs retain their earlier candidate.

The new four-second clip aims shoulder-to-hand chains about 12 degrees from vertical, preserving elbow/wrist bind angles. Chest rotation totals four degrees across two spine joints, torso sway is two degrees, and arm swing is 1.2 degrees. Inverse-bind reconstruction preserves the twist correction. The generator's sampled hips/legs/soles have zero drift; endpoints match and rotations remain finite/normalized. Source assets and the previous candidate stay untouched.

One focused browser pass covered both bodies, previous/source/held baselines, advancing playback and idle/walk changes. All seven desktop/phone captures are on the review page and were inspected. Arms visibly sit closer to the body, with a larger head/posture change across breathing endpoints. A separate visual skim found no clear new fit defect; Mio's fingers sit close to the cargo pockets. Breathing strength and naturalness at phone size remain a live motion judgment for Jørgen.
