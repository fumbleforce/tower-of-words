# Base bodies (creator)

Jørgen's brief (reviews/creator-parts): make proper base models to dress up, with no gaps. Undress Mio and Eric to
skin first, then put hair, clothes and facial hair on as separate layers. Removing a layer must never leave a
hole (Eric's stubble was part of his head, so cutting it out left a hole).

## Why the first cut left gaps

The Meshy models are one surface: hair, face, hoodie and skin are all the same shell, and there is no scalp under
the hair, no body under the clothes, no chin under the stubble. tools/creator cut that shell into triangle lists
per slot, so taking a slot away left an open hole where it had been.

## Current candidate pipeline

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
