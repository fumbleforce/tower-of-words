# Base bodies (creator)

Jørgen's brief (reviews/creator-parts): make proper base models to dress up, with no gaps. Undress Mio and Eric to
skin first, then put hair, clothes and facial hair on as separate layers. Removing a layer must never leave a
hole (Eric's stubble was part of his head, so cutting it out left a hole).

## Live creator (source17)

Jørgen on creator-base-6: "Very good progress on the editor. The face has more visible edges than the original, why? Looks a bit too angular in the face if you look at eric vs original. The new eyes are horrifying, they should be much closer to the existing anime eyes, not these new round ones. The clothes show how poor the bodies look, legs are looking bent inward like they have to pee, and are a bit knobbly. Non baggy clothes really highlight it, not great. Still needs refinement to look stylized and elegantly made rather than moulded crudely like clay. Hair and clothes need more character, like the original ones, and fit the anime theme. New ones are too plain, simple."

`dress.html` is the live creator: Mio's or Eric's body, hair (with a second colour for inner locks and tips), Eric's stubble, eyes, top, bottom and shoes, colours and skin tone, idle (the approved relaxed idle, `../approved-idle.js`) or walk, turning, and the original model beside it. The look is kept in the URL, so a link reopens it; `?v=source16` loads the earlier base for comparison. `?zones=1` colours the body by the zone the clothes use (a debugging aid).

It is also online at https://fumbleforce.github.io/tower-of-words/creator/ (game3d/tools/deploy-pages.sh). `public.json` lists every file it loads outside game3d/; its `data` files (the bodies, the sources, the clips) are in R2 and the lock file. A new file the creator loads goes in that list, then `python3 tools/assets/sync.py push`.

- `repair_source_base.py <body> source15 source16` made the clean base: its own texture where every texel outside the face window is skin (no hair paint on the bare head); a closed neck plug where Eric's neck stopped short of the head; piece names per triangle; the face layout (eye boxes).
- `refine_legs.py <body> source16 source17` straightens the legs: the rings between the top of the thigh and the ankle go onto one straight line (thigh tops a little apart, ankles a little in) and taper evenly from thigh to ankle, so the knees no longer knock and the calves have no lumps. Hips, feet, head and arms stay where they were. Both need `~/ai/flat-venv/bin/python` (numpy, Pillow).
- `base.js` shades a base like its source: Eric's model is smooth shaded, so his base head takes the source's own normals at the same positions and the body is averaged; flat shading had shown every facet of his face. Mio stays flat shaded like her model. Eric's stubble layer is split: the jaw part is the stubble (its own choice), the bits of side hair in it go with his own hair.
- `eyes.js`: every style is the painted eye. The eye is lifted off the face texture into a picture (each front triangle drawn with its own affine map, skin made clear), then drawn back reshaped (wide, narrow, upturned, droopy) or replaced by the other body's painted eye at this face's eye width. Any style can recolour the iris.
- `hair.js`: a style is a scalp cap plus locks laid over the head, like the originals' faceted clumps: each lock runs from a root over the head, may hang, and ends in a point, with a ridge so flat shading gives it a light and a dark side. Fringes stop above the eyes (from the eye box), hanging locks keep clear of the body, tails hang from a band, buns are faceted balls. Messy short, spiky, long straight, bob, twin tails, high ponytail, buns. Made hair folds Mio's ears in.
- `wardrobe.js`: a garment is pieces of the body's surface cut out by functions (hems, scoop necklines that keep the shoulders covered, sleeve ends that cut only the arms, trouser ends, collar and pocket edges), pushed out and keeping the body's skin weights. Regions split a piece exactly on a line for bands, stripes, placket and crease lines; every cut edge gets a lip turned in to the skin, so cuffs and hems are closed. Accessories sit on the body's surface: shirt collar, hood, tie, sailor bow, buttons, belt buckle, drawstrings, neck rib, pleated skirts on rings that follow the thighs (the sides narrower, so a hanging hand stays outside). Tops: hoodie, sailor blouse, shirt and tie, blazer, ringer tee. Bottoms: slim trousers, cargo shorts, pleated skirt. Shoes: sneakers, loafers, boots.
- `dress_shots.mjs` takes close-up screenshots of the creator in given looks, poses and cameras (the review sheets come from it).
- "Mio's" and "Eric's" hair and clothes are their original layers and fit only their own body.

Known limits: longer skirts (a long skirt and a knee-length A-line were tried) tear or let the thigh through in a walking stride, so only the pleated mini is offered; at the far end of a stride the forward thigh still grazes its hem. The base legs are still a few rings each, so a knee bends on few corners. Earlier candidates' JSON and PNG stay local.

## Why the first cut left gaps

The Meshy models are one surface: hair, face, hoodie and skin are all the same shell, and there is no scalp under
the hair, no body under the clothes, no chin under the stubble. tools/creator cut that shell into triangle lists
per slot, so taking a slot away left an open hole where it had been.

## Current candidate pipeline

The rejected dressed comparison is [creator-base-4](http://127.0.0.1:8771/bible/#review/creator-base-4), with a live viewer at `compare.html?round=4`. It follows Jørgen's v15-flat choice with one simpler hip contour and the source hair/clothes. Original positions and the separate fit3 trial both remain unfinished; [round notes](../../../notes/creator-comparisons.md#dressed-round-4) record the visible defects and checks. Earlier candidates below remain reproducible.

`build_clean_base.py` constructs a connected ring mesh on the original 24-bone skeleton. Each v14 body has
398 welded vertices and 792 triangles, smooth normals, authored body dimensions and projected source eyes.
The dimensions are hand-tuned; they are not a recovered unclothed scan. Hair, garments and Eric’s stubble remain
separate source layers. These are review candidates, not replacements for the game assets.

```sh
# Use the Python environment with numpy, Pillow and trimesh available.
python3 tools/creator/base/build_clean_base.py eric v14
python3 tools/creator/base/build_clean_base.py mio v14
node tools/creator/base/check_deformation.mjs --strict --all-crossings clean-eric-v14 clean-mio-v14
node tools/creator/base/check_deformation.mjs --strict --all-crossings --host-rest clean-eric-v14 clean-mio-v14
node tools/creator/base/run.mjs 'tools/creator/base/shots.html?clean=v14&retarget=rest' art/parts/base/shots/clean-v14-rest
node tools/creator/base/check_preview.mjs
python3 tools/creator/base/build_review.py v14 creator-base-2
```

Inspect candidates at `http://127.0.0.1:8771/tools/creator/base/preview.html?v=v14`.
The viewer supports orbit/zoom, individual layers, neutral idle, walk and bind pose. Capture parameters and
input hashes are recorded in `capture.json`; animated WebP durations match the source clips.
Use a fresh review id for each published round; the review builder refuses to overwrite existing decisions.

Both deformation modes pass 264 sampled posed meshes combined. This checks finite coordinates and proper
triangle crossings, not continuous animation, coplanar contact or garment clearance. Source clothing still
intersects these bodies, the bounded fit2 experiment remains explicitly `not-ready`, and walking feet can
penetrate the floor. See [measurements and limits](../../../notes/clean-base-deformation.md).
All prior exported versions and captures are preserved for comparison.

## Earlier voxel pipeline

- `export.html` dumps each source as the creator loads it (shared skeleton, bind pose, height 1, Mio's face fixes,
  cut labels) to `art/parts/base/src-<id>.json`.
- `build_base.py` (Blender, headless) builds a new closed body:
  - head: one surface seen from the head's centre. Where the first thing out from the centre is the face (its own
    skin triangles with the eyes, plus Eric's stubble triangles), the head reaches exactly to it; elsewhere it is a
    round skull that stays a margin inside the hair. The radius is smoothed over the sphere with the face held, so
    forehead and cheeks run into the skull.
  - neck, chest, waist, hips, arms, legs, feet: simple shapes sized from the clothes round each bone.
  - hands: the source's own hand skin, made solid.
  - all of it merged by a voxel remesh (one closed shell), smoothed away from the face and hands, decimated to
    2,600 triangles, flat shaded, and pushed in wherever a layer would not cover it.
  - colour: baked from the source's face and hands, with everything outside the eyes and brows painted skin.
  - skin weights: from the nearest point on the source, so the body bends with the clothes over it.
  Writes `art/parts/base/<id>-base<tag>.json` (triangle soup: pos, uv, si, sw on the 24 shared bones) and `.png`.
- `base.js` loads a base and puts layers on it: the source's own hair (without the stubble), top, bottom, shoes, and
  Eric's stubble as its own layer lifted 2.5 mm off the skin. Layers are drawn double sided.
- `shots.html` + `run.mjs` render the review sheets and walk loops (`?v=<tag>`, `?only=bare|hair|dressed|walk|game`,
  `?poke=1` draws the base red to find skin showing through a layer).

```
node tools/creator/run.mjs tools/creator/base/export.html
blender -b --factory-startup -P tools/creator/base/build_base.py -- eric 9
python3 tools/creator/validate_base.py art/parts/base/eric-base9.json
node tools/creator/base/run.mjs "tools/creator/base/shots.html?v=9" art/parts/base/shots/a7
```

Settings per run go in as JSON after the tag (`-- mio 4 '{"limb": 0.8}'`); the defaults are at the top of
build_base.py.

Round 1 (review creator-base-1): attempts in `art/parts/base/shots/a2`..`a8`, skin-through checks in `poke-b4`, `poke-b8`, `poke-b9`. The kept exports are base9 (a7) and base10 (a8, a7 smoothed). Known problems: bodies are thin and lumpy where they were pushed under the clothes, a ridge where Eric's face meets the skull, small slivers of skin at Eric's jacket shoulders.

## Source overlay

`overlay.html?body=mio&version=v16` (or `body=eric`) superimposes the complete original source and a candidate.
The default v16 is the rejected baseline; enter a later exported version in the field to load
`art/parts/base/clean-<body>-<version>.json`. The optional `fit=fit3` selects the existing rejected clothing trial.
The review is [creator-base-overlay](http://127.0.0.1:8771/bible/#review/creator-base-overlay).

The source uses all original triangles through `loadLibrary` and `layerMesh`, with the creator's existing Mio
preparation. Both figures retain the same source-normalized coordinates and shared bind skeleton, at height 1.
The vertex-bounds panel reports the actual source and base extents and their difference. The full source
includes hair/clothes and the bare base includes hidden scalp/body, so equal bounds are not expected. Matching
extents would not establish facial agreement. The viewer applies no independent fit, offset, scale or geometry change.
Skin-only and dressed views retain the same coordinates.

Front, character-left side, back and top are orthographic; face framing changes only the camera. Source and
candidate opacity are independent. Cyan/magenta, source textures and independent wireframes help inspect
shape differences. Each model renders into its own depth-tested target. At each pixel the two colours are
weighted by opacity
and coverage, with their combined opacity capped at 1. Equal sliders give equal weight where both surfaces
cover the pixel. Transparency cannot reveal a model’s own occluded surfaces. Switch a model off or use wireframe
to inspect those. Bind pose renders when a control changes. Idle and walk use one shared clip and time for both models; Play, Pause and the time slider let you inspect matching poses. The viewer alone does not prove continuous garment clearance.

### Local candidate files

The review’s v16/fit3 links use rejected local exports in `/home/jorgen/repo/japanese/art/parts/base/`.
Those candidate JSON and PNG files are not committed or uploaded. A clean clone does not contain them.
Source assets are in the asset library; pull them using `python3 tools/assets/sync.py pull` before generating.
With the local review server on port 8771 serving the checkout you want to use, run these commands from that
checkout (the exporter writes to the current directory):

```sh
mkdir -p art/parts/base
node tools/creator/run.mjs tools/creator/base/export.html
# Use Python with numpy, Pillow and trimesh installed.
python3 tools/creator/base/build_clean_base.py mio v16
python3 tools/creator/base/build_clean_base.py eric v16
```

This writes `src-{mio,eric}.json`, then `clean-{mio,eric}-v16.json` and their PNG textures. Keep the default
“Original positions” clothing setting; fit3 additionally requires the existing local
`clean-{mio,eric}-v16-fit3-layers.json` trial exports. A future candidate needs its own JSON and the texture
named by its `tex` field in `art/parts/`. Generation recreates the rejected baseline; it does not repair it.

### Source geometry reconstruction

Use `tools/creator/base/export.html?precision=full` with the existing export runner to write `art/parts/base/src-mio-exact.json` and `src-eric-exact.json`. The default export still rounds coordinates and weights; the full-precision files retain the live source buffers for exact face and hand comparisons.

`build_source_base.py mio <new-version> --body-base art/parts/base/clean-mio-v16.json --source-data art/parts/base/src-mio-exact.json --original-clothes --source-weights --bridge-gaps --lining --join-hands` builds a source-derived review candidate. Run it with a Python environment containing numpy and trimesh; repeat with Eric's files. The head core and hands retain their source coordinates, UVs and weights. The hidden clean body is fitted inside the source, with source garment weights transferred to it. The hidden arm rings follow the actual source joints and wrist profile, and their boundaries join the original hand contours after removing only the concealed wrist caps. Original clothes are retained with a small lift and a body-following lining. The generator refuses to overwrite a base version.

These candidates consist of separate overlapping closed pieces. A zero boundary-edge count does not establish one connected manifold or clearance in every pose. `art/parts/base/shots/source-body-fit/attempts.json` retains the local iterations and their QA notes. They have not been approved for the game.

The current review is [creator-base-5](http://127.0.0.1:8771/bible/#review/creator-base-5). The local candidate is `source15`, loaded with `overlay.html?body=mio&version=source15&review=creator-base-5` (or `body=eric`). Its fitted layers are `clean-<id>-source15-fit3-layers.json`. Exact retained-source position, UV and skin-weight comparisons, generation commands, sampled-walk coverage and the remaining neck/hair rendering issues are recorded in `art/parts/base/shots/source-body-fit/source15-proof.json`. All generated JSON and captures stay local until asset approval.
