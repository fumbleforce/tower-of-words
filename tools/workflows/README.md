# ComfyUI workflows

Open ComfyUI at http://127.0.0.1:8188 (start it with `~/ai/start-comfy.sh`). Load a workflow with Workflow → Open, or drag the .json / .png onto the page.

## Images (Anima family)
- `anima-portrait.json`: RDBT portrait (896×1152). Change the prompt in the first text box.
- `anima-scene.json`: RDBT widescreen scene (1216×832).
- `anima-with-lora.json`: Nova + the Anima RL add-on, showing how to chain add-ons.
- `sdxl.json`: an SDXL model (WAI-Mature), for comparison.
- `example-*.png`: drag in to get the exact settings that made them. Every PNG ComfyUI saves carries its workflow.

## Video (image-to-video)
- `video-wan22-portrait.json`: Wan 2.2 TI2V 5B, 704×896, 57 frames at 24 fps (~2.4 s). About 2 min on the 3080.
- `video-wan22-scene.json`: Wan 2.2 TI2V 5B, 1280×704, 81 frames (~3.4 s). About 5 min.
- `video-causal-forcing-fast.json`: Causal Forcing (4 steps), 480×608, 49 frames at 16 fps (~3 s). About 1 min, lower resolution.

To use: in the **Load Image** node, pick or upload your start image (it shows INPUT_IMAGE.png until you do). Then edit the first text box: describe only the MOTION and the camera, not the whole picture again. Width and height should match your image's shape (multiples of 32); length is frames (4n+1). Output: the video goes to ~/ai/ComfyUI/output/video/.

Tips: keep "static camera" for sprites; subtle motion works better than big actions; the model can add a wink or an expression change you didn't ask for, so reroll the seed.

## Music
- `yue2-instrumental-lora-api.json`: YuE2 3B (bf16) with the instrumental add-on on the CLIP slot and the v9 sound add-on on MODEL. The style box takes tags; the lyrics box takes only `[instrumental]` or section tags, one per line. Output goes to ~/ai/ComfyUI/output/music2/.
- `stable-audio-3-bgm-api.json`: Stable Audio 3 Medium, 90 s instrumental, 8 steps. Write the prompt as one sentence ending in "BPM: 75. Length: 90 seconds".
