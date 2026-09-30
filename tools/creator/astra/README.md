# Astra creator base comparison

Independent Mio and Eric candidates for work #130. These files do not change the live creator. The comparison viewer is maintained separately in `viewer/`; Jørgen chooses the result in `creator-astra-1`.

The body, clothes and hair are newly authored geometry. The original walk GLB supplies the untouched skeleton. The existing Blender face-extraction helper supplies the original painted eyes (Mio's pale tan version) and Eric's brows, composited over a single skin colour into an opaque atlas. Head normals are smooth; body, hair and clothing retain their modeled planes. Bind-pose triangulation and the four strongest normalized bone influences are baked before export; review renders import the resulting GLB. A viewer must preserve the exported normals, rather than force flat shading over the head.

The torso shares vertices with the shoulders and hips. The neck extends into the closed skull. Ears, thumbs and feet are closed overlapping volumes. The hoodie has connected sleeves, a lined hood bowl and solidified underarm inserts weighted to the skin surface. Cuffs and hems have closed rims. Cargo pockets and sneaker details are closed geometry. The skeleton, bone hierarchy and rest transforms are not changed.

## Reproduce

Run from this checkout's root, with Blender 5.2 at `~/.local/bin/blender` and the repository's `~/ai/flat-venv` Python environment. Inputs are the game's original Mio/Eric walk GLBs, face texture/palette data and approved `relaxed-idle-<body>.json` clips. No paid generation service is used.

```
bash tools/creator/astra/evidence.sh attempt-new
~/ai/flat-venv/bin/python tools/creator/astra/sheets.py attempt-new
python3 tools/creator/blender/check_rig.py game3d/assets/mio/walk.glb art/parts/astra/attempt-new/mio.glb
python3 tools/creator/blender/check_rig.py game3d/assets/eric/walk.glb art/parts/astra/attempt-new/eric.glb
```

The batch takes the shared GPU lock, even though review images use Cycles CPU, and exits if another job owns it. Each Blender process is bounded to four minutes. It releases only its own lock. Use a fresh attempt directory; previous pictures stay intact. The submitted candidate is frozen in `art/parts/astra/attempt-09/`; `art/parts/astra/{mio,eric}.glb` are identical convenience copies. `batch.sh` makes a smaller first-look set. `idle.py` packages the approved clip's native TRS tracks in a temporary GLB for Blender, without retargeting.

`render.py` uses the same light setup and camera definitions as `tools/creator/blender/views.py`. The full batch includes front, three-quarter, side, back, face, neck, hood inside, cuffs, hand and feet, plus exact walk samples at 0, 0.3, 0.6 and 0.9 seconds, comparison walk frames 8 and 20, and approved idle samples at 1 and 3 seconds. The hood-inside view hides the hair. Every attempt stores its source snapshot, blend files, build logs, atlas captures and renders locally. `sheets.py` includes every model render in chronological contact sheets and creates larger standing, detail and motion sheets.

## Attempts

- 01: first geometry. Mio's reference-ray face fit made a dent; body broke through waist/thighs; bare ankles had a gap.
- 02: convex authored face, corrected garment depth, straight ankle joins, lower fringe and smaller ear profile.
- 03: bun attachment, raised cargo pockets, closed sneaker bars and full motion/detail evidence. Back-neck gap and motion-dependent clavicle/pocket intersections were identified.
- 04: upper-garment clearance, pocket-patch weights and forefoot Toe weighting.
- 05: neck extended into skull, fuller cargo legs and projecting side pockets, broader Mio cyan hair panels and two Eric crown tips. The unchanged approved idle still lifts the toes relative to bind pose; no animation correction is included.
- 06: a continuous cyan side panel, jacket clearance over the trouser waistband and pocket welts following the jacket surface.
- 07: upper jacket weights sampled from the underlying skin surface. Shoulder probe at Blender frame 8.2.
- 08: fixed bind-pose triangles, a rounded shoulder transition, and exact-time probes rendered from the exported GLBs.
- 09: a solidified underarm fabric gusset with the underlying skin weights, and explicit four-influence normalization.

Only final review GLBs and review-linked pictures are published through the asset sync tool. Blend files, intermediate GLBs, source snapshots and logs remain local. The reproducible scripts are committed; binaries are not.
