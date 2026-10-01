# Codex character concepts

For C-0276, C-0279 and C-0287, work issue #151. These are candidates for Claude’s combined `char-style-1` Review. They do not change the game’s installed characters. The entries and attempt history live in `concepts.json`.

Portrait references: `game3d/assets/portraits/mio-neutral.webp` and `eric-neutral.webp`, checked against `docs/game/cast.md`. Mio keeps dark green hair with green beneath, glasses, light tan eyes, a dark hoodie and headphones. Eric keeps dark-blond tied hair, silver rectangular glasses, stubble, a grey hoodie and navy blazer. Her green underside is on her left (image right in the front view).

The approaches are sewn cloth, compact carved puppets, and squash cartoon. Each has a solid body, separate movable limbs, a seven-bone Blender rig, and exported `idle` and `walk` clips. Materials are plain colours. The head proportions and bodies are stylized together. These are rigid part animation studies; they do not establish production deformation, expression rigs or a draw-call budget. The shared motion helper does not constrain the feet to the floor: idle can lift the whole body and a walk can dip a shoe below zero. Grounded locomotion is a follow-up if a style is selected (X-0392).

## Reproduce

Run Blender under the GUIDE render lock. Use a new attempt number; the builder refuses to replace an existing attempt. `STYLE_OUT` selects the parent of the `codex-*` folders.

```sh
STYLE_OUT=/absolute/art/parts/style-concepts ~/.local/bin/blender -b -t 8 --factory-startup -P tools/style-concepts/codex_build.py -- stitch attempt-NN
node tools/style-concepts/codex_scene.mjs /tmp/codex-forecourt.json
~/.local/bin/blender -b -t 8 -P tools/style-concepts/codex_stage.py -- /absolute/codex-stitch/attempt-NN /tmp/codex-forecourt.json desk,phone
python3 tools/style-concepts/codex_sheets.py /absolute/codex-stitch/attempt-NN --label 'Codex A · stitched cloth · attempt-NN'
```

Substitute `carved` or `squash` for the other builders. Shot-staging notes are in `codex_build.py` and `codex_stage.py`. Complete attempts keep their GLBs, Blender scene, source snapshot, settings, individual images, pair and sheet. Cycles CPU uses 24 samples and eight threads. Studio views are 800 × 800. Sheets show views at 520 px or larger.

## Game-scale evidence

The sandbox blocks Chromium startup, so these are **offline Blender renders**, not WebGL screenshots. `codex_scene.mjs` runs the real forecourt builders and `RoomCam`, exports meshes, vertex colours, lighting and desktop/phone camera fits, and checks both staging points are walkable. Eric uses his actual runtime height of 1.416 m; Mio keeps her model’s relative height. Native pixel crops accompany 1366 × 860 and 390 × 844 frames.

Canvas signage, texture maps, UI, surface shaders and post-processing are omitted. Hemisphere lighting is approximated by the Blender world. Each staged attempt records these limits and exact camera matrices in `forecourt-manifest.json`, with a compressed copy of the exported scene. Keep these renders when direct runtime captures become available.

## Checks and handoff

GLBs must contain both animation clips and load back into Blender. Pair, face, side, rear, walk and forecourt views are inspected before handoff. An independent visual pass identified the face seam and open hair ends corrected in later attempts.

The session could read but could not write the shared `.git`, so the requested worktree was created in a local clone under `/tmp`. The main Codex session accepted shared landing and actual WebGL capture in X-0390 through X-0393. It can fetch this local source commit and run `tools/land.sh` against the shared checkout. Its `webgl-*` images and separate sheets remain distinct from these offline `game-*` renders. The GPU driver, local HTTP server and GitHub were unavailable inside the sandbox. The GPU lock was still used for Blender jobs. No Review item is posted by this work.
