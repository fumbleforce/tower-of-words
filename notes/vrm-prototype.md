# VRoid editor and VRM proof

For #171. [Live preview](../game3d/vrm-test.html), [Review char-vrm-1](../reviews/char-vrm-1/review.json). The preview is separate from the game. No cast model has been replaced or approved.

## What we can use

[VRoid SDK](https://developer.vroid.com/en/sdk/) connects an application to VRoid Hub to load uploaded characters. Its documentation explicitly says it cannot create characters. We do not need Hub authentication or this SDK to load local VRM exports.

[VRoid Studio](https://vroid.com/en/studio) is the character editor: face/body sliders, hair, clothing and textures, with VRM export. Its listed platforms are Windows, macOS and iPad. This workspace is Linux; Wine is installed, but we have not verified Studio operation or exported a character from its editor here. There is no demonstrated Studio automation in this prototype. We can edit exported VRM geometry and textures and load its humanoid rig, expressions and materials through three-vrm. A properly authored Mio still requires the editor or modelling work.

The [Studio guidelines](https://vroid.com/en/studio/guidelines) permit editing exported models in other software, subject to any item-specific terms. They also distinguish private tools from distributed applications that generate or output characters from Studio meshes/textures; the latter need a separate licence. This page is a playback viewer, not an avatar creation/export product.

## Sources and reproduction

The base is `VRM1_Constraint_Twist_Sample.vrm`, copyright 2022 pixiv Inc., downloaded and matched byte-for-byte to the [official three-vrm sample](https://github.com/pixiv/three-vrm/blob/1b4fc0cc7ef39a49d62bb7a66dcfeca8f65316f7/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm). Its [sample licence record](https://github.com/vrm-c/vrm-specification/blob/master/samples/VRM1_Constraint_Twist_Sample/README.md) identifies VRM Public License 1.0. The embedded metadata permits everyone to use the avatar, corporate commercial usage, modification and redistribution, and does not require credit. The original metadata stays in the base file.

| File under `art/parts/vrm-prototype/` | SHA-256 |
|---|---|
| `base.vrm` | `12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2` |
| `recolour.vrm` | `e9bb9d6fa7ffc5c389393f8fa3ec2d229414192be148096fab8d66c7f769ff28` |

Binary candidates remain local. To reproduce them from the repo root:

```sh
mkdir -p art/parts/vrm-prototype
curl --fail -L https://raw.githubusercontent.com/pixiv/three-vrm/1b4fc0cc7ef39a49d62bb7a66dcfeca8f65316f7/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm -o art/parts/vrm-prototype/base.vrm
~/ai/cv-venv/bin/python tools/characters/vrm_mio.py art/parts/vrm-prototype/base.vrm art/parts/vrm-prototype/recolour.vrm
node tools/characters/vrm-shots.mjs art/parts/vrm-prototype/preview
```

The recolour script requires NumPy and Pillow and checks the exact source hash. Its inherited changes recolour hair, eyes and clothing, paint body regions as sleeves/leggings and resize textures. It does not author a hoodie, Mio's hair or her face. The loader adds glasses only to the recolour variants. The flat variant changes normals used by shading, not mesh topology. Vendored three-vrm provenance is in [SOURCE.txt](../game3d/vendor/vrm/SOURCE.txt).

## Evidence and limits

The loader samples the game's existing approved Mio animation clips onto the VRM's normalized humanoid bones. Idle, walk and run are available in the viewer; the smile uses the model's `happy` expression. Drag/pinch or scroll controls the camera. The `game` view uses the game's 56-degree elevation in an isolated scene, not an in-game performance test.

The capture check exercises all three variants at 1366×860 and 390×844, checks model/resource loading and samples lower-leg rotations during walk/run. It also checks that smiling updates face morphs while paused and that a WebGL initialization failure produces a visible error. The 18 resulting captures and report are under `art/parts/vrm-prototype/preview/`. The base has 36,470 triangles and the glasses add 292. The page reports 41 draw calls for the base and 46 with glasses, including floor and shadows. These costs exceed the character targets in [character-pipeline.md](character-pipeline.md); no claim about game or phone frame rate follows from this test.

Known visual gaps remain: the recolour has painted sleeve boundaries, the sample's original shirt/shorts and hairstyle, retained hair highlights, and an upward chin in the retargeted idle. It is a compatibility proof, not a finished Mio candidate. A Studio-authored reduced export and a retarget pass are still needed before gameplay integration, seating, phone poses or a cast kit can be judged.

Claude's saved images are in `claude-shots/`; the inherited loader check in `inherited-check/` shows its broken raised-arm pose. `fixed-quaternion/` records the first repair. All appear in the Review item in order. The inherited source remains locally under `inherited-source/`. The repair gives each rest/world rotation its own quaternion instead of sharing a mutable scratch object, then removes the unused seating and phone adapter from this isolated preview.
