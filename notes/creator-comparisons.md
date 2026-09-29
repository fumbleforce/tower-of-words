# Live creator comparisons

C-0026 and C-0027, 2026-09-29. Reviews: [angular bases](http://127.0.0.1:8771/bible/#review/creator-base-3) and [live idle](http://127.0.0.1:8771/bible/#review/creator-idle-neutral-2).

The base viewer compares the actual game Mio/Eric adapters against a bare base at the same standing height. It offers v14 smooth, the identical v14 mesh with flat shading, and v15 with two head rounding bands removed. Office lights and tone mapping come from the office builder; a plain floor replaces room geometry and post effects are off. The previous bright viewer lighting remains selectable. Standing, bind and walking poses, shared orbit and zoom are available.

v15 has 374 welded vertices and 744 triangles per body (v14: 398/792). It exports face normals and explicit flat shading. Body geometry, weights, skeleton and eye texture are carried over. Both exports pass topology/normal/weight validation. CPU sampling with host-rest correction reports finite neutral/walk poses and no proper triangle crossings at the five sampled times per clip. This is a sample, not exhaustive intersection proof; inherited walking floor contact and layer fitting remain unfinished.

The idle viewer plays the full original clip beside the four-second neutral loop. The currently held 0.4-second creator pose is also available. Both sides share identical source parts and host-rest correction is off. Mio/Eric selection, pause, orbit, zoom and idle/walk transitions are synchronized. Neither candidate replaces a game asset.

The first focused browser run checked both viewers at desktop and phone sizes, both bodies, all base variants, base poses and lighting, advancing animation time, pause and walk transitions, with no page errors. Screenshot inspection caught an inherited parent transform during base model switches; normalization now updates the parent matrix before measuring. First captures remain in the round's [archive](../reviews/creator-base-3/attempts.html). Phone base controls moved below the models after inspecting the first layout.

Candidate JSON, textures and captures remain local assets under art/parts/; the generator and review/viewer source are versioned. Generate v15 with tools/creator/base/build_clean_base.py for eric/mio. The existing art/parts source library and neutral animation are required, as for the main creator.

The follow-up capture confirms identical normalization scale for v14 smooth, v14 flat and v15 for each body (Mio 1.1439853254, Eric 1.0784809375). Final captures use the `-final.png` suffix. Claude's visual skim is requested in X-0131.
