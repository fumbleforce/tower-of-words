# Creator models in Blender

Jørgen reset the creator on 2026-09-30 (work #96): "This is a SIMPLE model and you are doing all sorts of weirdness to it ... cant you just delete it and put a skin color on the body? ... are you using blender properly for this?" Rounds 5 to 8 patched the Meshy scan meshes and textures in Python and JS. These scripts build the creator's characters in Blender instead, headless, from simple shapes.

What one build makes, per body (Mio, Eric), all on the original's own rig, untouched, so the game's walk and the approved relaxed idle play on it:

- **Body** (`body.py`): a trunk lofted from rings (10 sides), 8-sided tapered arms and legs, a mitten hand with a thumb, a simple foot, small ears, and a 16-sided head. Sizes are fractions of the height, set per body in `PARAMS`. The front of the head is moved onto the original's face (its skin triangles only, never the hair) and the rest of the skull is kept inside the original's hair shell. Every piece is a closed shell; they overlap where they meet and all wear one flat skin colour, so no join shows. Weights are written as the shapes are made: each vertex follows its chain (spine, arm, leg), blended at the joints, with the hips, shoulders and neck blended into the trunk.
- **Face** (`face.py`): the only picture on the body. The original head is drawn from the front, unlit, skin triangles only; inside boxes round each eye and brow (and Mio's blush) the paint is unmixed from the skin into colour and alpha, everything else is clear. One pair of brows. Mio's fringe had painted over her right eye, so her left eye is mirrored onto it, and her iris is pale tan (Jørgen, 2026-09-30). Check `art/parts/blender/<body>-face-boxes.png` when changing a box.
- **Hair and stubble** (`hair.py`): their own hair keeps the original's shape: its triangles come off the original head into their own mesh, welded, with real thickness (Solidify, closed rims, a darker inside) and one flat colour per face (hair, Eric's darker underside, Mio's teal locks). No texture. Eric's stubble is its own thin shell over the lower face, lifted off the skin with a Shrinkwrap, wearing only the stubble paint from the original chin.
- **Clothes** (`clothes.py`): a hoodie (with zip and a lying-down hood that has an inside) with trousers, a shirt with a folded collar and a pleated skirt, and sneakers with a sole. Each is ring shells sized from the body with room to hang, then a Shrinkwrap (outside, with an offset) so the body can't come through, a Solidify for thickness (hems and cuffs are closed edges with an inside), and the body's weights from the nearest point on the body. The skirt hangs from the hips.

```sh
sh tools/creator/blender/bl.sh face.py eric        # the face (and stubble) pictures
sh tools/creator/blender/bl.sh build.py eric       # body, hair, clothes -> art/parts/blender/eric.blend
sh tools/creator/blender/bl.sh export.py eric      # -> art/parts/blender/eric.glb
python3 tools/creator/blender/check_rig.py game3d/assets/eric/walk.glb art/parts/blender/eric.glb
```

Checking: `iterate.sh <body> <outdir> [pieces]` builds and renders the original and the new model at the same cameras (Cycles on the CPU, so no GPU lock) and makes a side-by-side sheet; `render_new.py` renders any pieces in the rest pose or at a walk frame, with close-ups of the face, neck, hood, cuffs and feet. `render_original.py`, `render_hair_ref.py`, `measure.py` and `inspect_glb.py` look at the originals.

The GLBs and the pictures are generated, local, and listed in `tools/creator/base/public.json` (so `python3 tools/assets/sync.py push` stores them); the live creator is `tools/creator/base/dress.html`, which loads them through `model.js`.
