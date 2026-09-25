# ComfyUI workflows

Open ComfyUI at http://127.0.0.1:8188 (start it with `~/ai/start-comfy.sh`). Load a workflow with Workflow → Open, or drag the .json / .png onto the page.

## Images (Anima family)
- `anima-portrait.json`: RDBT portrait (896×1152). Change the prompt in the first text box.
- `anima-scene.json`: RDBT widescreen scene (1216×832).
- `anima-with-lora.json`: Nova + the Anima RL add-on, showing how to chain add-ons.
- `sdxl.json`: an SDXL model (WAI-Mature), for comparison.
- `anima-img2img.json`: RDBT image-to-image. Load your picture in **Load Image**, write the full prompt, and set **denoise** on the sampler: about 0.5 keeps the layout (used for the basement office), 0.88 keeps pose and clothes but lets the hair change (used for Yuzuki).
- `anima-img2img-masked.json`: the same, but only the white part of a mask image is repainted (used to keep Kiyoko's face and redraw her clothes at denoise 0.9). Load the mask in the second **Load Image** node (white = repaint, black = keep).
- `example-*.png`: drag in to get the exact settings that made them. Every PNG ComfyUI saves carries its workflow.
- `anima-outpaint.json`: RDBT outpaint for portraits cut by the frame edge (tools/reframe.py). Load a padded image and a mask (white = paint), Differential Diffusion on the model, masked latent, denoise 0.7. The padded image already has a rough crown drawn where hair was cut, so the model refines a shape instead of inventing one.

## Video (image-to-video)
- `video-wan22-portrait.json`: Wan 2.2 TI2V 5B, 704×896, 57 frames at 24 fps (~2.4 s). About 2 min on the 3080.
- `video-wan22-scene.json`: Wan 2.2 TI2V 5B, 1280×704, 81 frames (~3.4 s). About 5 min.
- `video-causal-forcing-fast.json`: Causal Forcing (4 steps), 480×608, 49 frames at 16 fps (~3 s). About 1 min, lower resolution.

To use: in the **Load Image** node, pick or upload your start image (it shows INPUT_IMAGE.png until you do). Then edit the first text box: describe only the MOTION and the camera, not the whole picture again. Width and height should match your image's shape (multiples of 32); length is frames (4n+1). Output: the video goes to ~/ai/ComfyUI/output/video/.

Tips: keep "static camera" for sprites; subtle motion works better than big actions; the model can add a wink or an expression change you didn't ask for, so reroll the seed.
- `location-bg-rdbt.json`: RDBT location background with no people, 1216×832 (the game's background shape). Prompts for the monorail, gate, copy room and Sales are in tools/locations1.py.

## Video round 2 (proto2/video2)
- `video2-<source>-14b-lx.json`: Wan 2.2 I2V 14B fp8 (high and low noise experts) with the lightx2v 4-step LoRA. 4 steps, CFG 1, shift 5, 81 frames at 16 fps (5 s). About 3.5 min on the 3080; the 14 GB models stream from RAM. The best all-round choice in round 2.
- `video2-<source>-dasiwa.json`: DaSiWa Wan 2.2 I2V 14B Lightspeed v11 (Civitai), speed-up baked in, no LoRA. Same settings and time. Best camera moves.
- `video2-<source>-14b-anime.json`: the 14B setup plus the Civitai "Anime Style" LoRA (trigger "An1meStyl3, AnimeStyle") and, for portraits, the "live 2d dynamic wallpaper" LoRA on the low-noise expert.
- `video2-<source>-5b-timed.json`: Wan 2.2 5B with a second-by-second motion prompt, 30 steps, CFG 6, 121 frames at 24 fps. 6 min for portraits, 11 min for 1280×704.
- `puppet-face-inpaint.json`: RDBT face-only inpainting (latent noise mask) used for Mio's blink frames.

Prompt pattern that made the difference: describe the shot and camera first, then "Second 0 to 1: ... Second 1 to 2: ...", and say what must stay fixed (face, clothes; for vehicles: "rigid body, the cars do not bend"). Check that the motion direction matches the picture (the round-1 monorail prompt sent the train toward the city while it faces the viewer).

## Music
- `yue2-instrumental-lora-api.json`: YuE2 3B (bf16) with the instrumental add-on on the CLIP slot and the v9 sound add-on on MODEL. The style box takes tags; the lyrics box takes only `[instrumental]` or section tags, one per line. Output goes to ~/ai/ComfyUI/output/music2/.
- `stable-audio-3-bgm-api.json`: Stable Audio 3 Medium, 90 s instrumental, 8 steps. Write the prompt as one sentence ending in "BPM: 75. Length: 90 seconds".
