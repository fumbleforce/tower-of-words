# 3D characters: one route

Every 3D person in the game is made one way: a chibi picture in ChatGPT, then Meshy, then `tools/characters/build.py`. A recipe records each model; the build makes its game files from it.

## 1. The picture

Jørgen's workflow, his words as the spec:

> generate the chibi picture in chatgpt. I needed 3 rounds to get it right, and need to remove accessories that get garbled by meshy.
>
> "she should be looking to the left instead, same orientation as her body. Keep all features thick and sturdy, no fine strands or thin spikes. No text, no props, no extra subjects, no photorealism. she is looking the same orintation as her body. Flat matte texture of model"
>
> 1. make a 3d chibi anime character in the style of the attached image
> 2. Simplify male character a LOT to match the detail level of the other chibi, with open eyes
> 3. Simpler head model, grey closed jacket, no glasses
>
> then in meshy I used the image to 3d model, smart topography, 1050 poly count, a pose, then textured it in a second pass if it looked right. From there it can be automatically rigged (just need to lower the height due to the big head), and add animations.

Step 3 names what to simplify and every prop to remove (lanyard, bag, badge, phone, glasses, hair sticks), so Meshy never sees them. Style reference: tools/characters/ref/mio-chibi-34.png (angled: mio-chibi-angled.png). The script for these chats is art/candidates/staff-meshy-1/gen.py.

## 2. The recipe

`tools/characters/recipes/<id>.json` (committed) holds one body: `id` (the folder name in game3d/assets/characters/), `folder` (its repo path, game3d/assets/eric for Eric's body), `round`, `review`, `source` (the picture, a path in the main checkout), `meshy` (the task ids, written as each task is sent), `steps` in order, each `{"step": name, ...settings}`, and `unknown`. A setting nobody recorded stays `null`, with its reason in the step's own `unknown` text, or at the top level under `unknown` keyed by field path. A body with no Review has `review: null` and a note that starts "approved before reviews". A chibi body names its removed Review in `review_removed`. Every folder under game3d/assets/characters/ and game3d/assets/eric/ needs exactly one recipe. `python3 tools/characters/check_recipes.py` checks that, and npm run check runs it. Older rounds use scripts that build.py does not run (cheek_fix.py, the chibi tools), so build.py refuses those recipes before it runs any step. crowd-casual-1.json is a full example.

## 3. The build

```
python3 tools/characters/build.py <id> [--spend] [--until <step>]
python3 tools/characters/build.py --steps
```

Outputs go to the main checkout's `art/candidates/<round>/<id>/`: `src/` (the picture), `meshy/` (Meshy's files and task records), `build/` (ours). `build/game/` is laid out like game3d/assets/characters/. All three are git-ignored, so the recipe is the only record.

The steps, one module each in tools/characters/steps/ (each file's docstring lists its settings):

| Step | What it does |
|---|---|
| meshy-shape | Image to 3D: smart topology, 1,050 polygons, A-pose, no texture (5 credits) |
| face-uv | Our UV layout, with the face as one island at 3 times the density, so Meshy paints the face whole |
| meshy-texture | Meshy retexture on that layout, styled from the picture (10 credits a roll), then the texture-marks check |
| meshy-rig | Meshy's auto-rig at 1.1 m, with its walk and run (5 credits) |
| meshy-anim | One library clip, by default Chair_Sit_Idle_F as `sit` (3 credits) |
| head-scale, recolour | Head pieces scaled about the neck; one piece's colour changed. Only when a Review asks |
| hand-scale | Checks that cast3d.js HANDS has the scale a Review asked for |
| reweight | Bone-heat skin weights on Meshy's skeleton, when a Review flags the weights |
| rerig | Our skeleton with donor clips, when a Review flags Meshy's rig |
| package | walk/run/sit without the embedded texture, base.webp, and its 1024 and 512 copies |
| region-mask | Hair, top and bottom regions, so crowd bodies can be tinted. Faces stay untinted |
| idle | The approved relaxed-3 idle baked onto this body's rig (server on 8771) |
| checks | Idle stance in the game's loader: feet planted, on the floor, knees forward, smooth blends |
| sheets | Turnaround, face and under-chin renders, and their contact sheets |

Blender runs under the GPU lock (notes/tools/gpu.md). A Meshy step whose file is already in `meshy/` costs nothing. Without `--spend`, the build stops instead of paying. Each request is saved before polling, so a rerun resumes the task instead of paying twice.

An older round rebuilds from its cached files. The recipe's `import` copies them into `meshy/` (key: the file in meshy/, value: its path in the main checkout). crowd-casual-1 rebuilds this way with no Meshy call. The UV file, walk, run, sit, base.webp and both phone copies come out byte for byte as the live ones. The idle matches value for value; only three.js's random clip uuid differs.

## Rules

- **Texture marks are re-rolled, never painted.** After every texture roll, steps/marks.py counts dark blobs on the skin under the jaw (what Jørgen saw on Kuro and Emi). A texture with marks gets another roll, up to 3 re-rolls. If the last roll still has marks, the build keeps it and flags it on the model's Review (reviews/<review>/review.json gets the under-chin sheet with the flag). Set `marks` per model when the chin sits outside 0.45 to 0.69 of the height.
- **New models use Meshy's own rig.** reweight and rerig run only when a Review flags a rig or weight problem.
- Models are built cleanly with plain materials. Never patch a scan mesh or texture in code. A model only gets the edits its Review asked for, and the game shows it as made, apart from colour tweaks.
- A model Jørgen supplies (`"supplied": true`) only gets steps that leave his face, eyes and body alone: rig, clips, weights, packaging, mask, idle, checks and sheets. build.py refuses the rest.
- Accessories stay off the model; props are separate objects in the game.

## Into the game

Show the sheets and a live viewer on a Review (post-review-item skill). Once he picks one, promote `build/game/<id>/` and its idle with `node tools/assets/live.mjs promote ... --round <round> --review <id>`, then `python3 tools/assets/sync.py push`. Add the id where the game loads it (game3d/js/cast3d.js for the cast, js/crowd/roles.js for crowd bodies), and record it in docs/game/art-and-sound.md, People in the world.
