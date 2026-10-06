# Crowd pilot 4: anime eye treatment

Exact feedback on round 3 (2026-10-06): “the meshes are okay but the eyes are super creepy, too large for normal size, not large enough for anime eyes, creepy middle ground.” The prior internal 8/10 scores did not predict the user's response. This pass addresses the round, concentric, glossy eyes; it does not treat opposite size extremes as the requested fix.

Two alternatives per existing model: `calm` uses broad angular lids and dark iris fill, closer to Kuro; `open` uses a taller opening with strong upper-lid shape and large dark iris, closer to Aoi. Both are deliberately anime, with one small highlight and no concentric rings. Eye centres remain fixed. The body, face silhouette, mouth, brows, hair, skin outside eye strokes, mesh, rig, weights and all clips are unchanged.

## Staging
This is a model-design comparison, not an authored story scene. Existing candidate A/B remain upright on a neutral floor. Camera at head height, equal close-up magnification beside Kenji/Kuro/Aoi/Emi; front and ±0.6-radian turns show both face planes. Behind-camera geometry is irrelevant and unnamed in prompts. Eyelines face model forward. Neutral hemisphere plus upper-left key light is identical across variants. Walking must continue for multiple cycles at desktop and phone size, including treadmill and loop; texture edits must not alter the motion files. All attempts are retained. No candidate replaces gameplay before the user picks it.

## Method
Approved local RDBT Anima, installed LLLite inpainting-v2, masked img2img from precisely staged UV-projection eye guides. One generated candidate per treatment/model initially (four renders). Exact guide, mask, positive/negative prompt, seed and API graph are saved. Generated eye patches are projected through actual mesh UVs; all texels outside the projection support are verified unchanged and final textures are lossless. GLB/idle hashes prove rig and animation preservation.
