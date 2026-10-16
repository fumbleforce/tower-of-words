---
name: animate-still
description: Animates one still picture of a character (a wave, a dance, a loop) on the local GPU, either as pose-driven video (Wan 2.2 VACE with a skeleton driver) or as a 2D puppet rig in Three.js, with frame checks before anything goes to Jørgen. Use it whenever a still has to move. For a private picture, also load animate-private.
---

# Animate a still

What works, with the settings: reference.md beside this file. Read it first. This skill is the order of the steps.

## Pick the route

- **Big body motion** (dancing, hips travelling, arms leaving their pose): pose-driven video, Wan 2.2 Fun VACE plus a skeleton driver. The default.
- **Small motion that must stay exactly on model** (breathing, a sway, a blink, a game idle loop): the 2D puppet rig.
- Plain image-to-video only for scenery, vehicles and camera moves; it keeps a character's pose.
- First+last-frame clips only with keys whose body really moved; measure the hips first.

## Before rendering

1. Write Jørgen's request in his words, then a staging note with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md): the static camera, what moves, where each hand and prop goes. Props stay inside the frame for the whole move.
2. A private picture also follows animate-private.
3. Take the GPU lock (notes/tools/gpu.md). Start ComfyUI with `--reserve-vram 3`, never restart it while someone else's job is queued, and free the VRAM when done.

## Pose-driven video (VACE)

1. DWPose on the source (rtmlib on the CPU, `~/ai/dwpose-venv`) for her keypoints and bone lengths.
2. Write the dance as curves on her skeleton: frame 0 exactly her pose, ease in over about 10 frames, the beat (e.g. a 20-frame hip cycle at 16 fps), ease out so the last frame equals frame 0. Render it as an OpenPose-coloured skeleton video at the output size, and look at a contact sheet of the driver first.
3. Wan 2.2 Fun VACE with the settings in reference.md. One change per attempt (driver, seed, negative), each logged in `prompts.json`.
4. Copy the reference scripts (`driver.py`, `bvh.py`, `gen.py`, `measure.py`, `sheet.py`) from the pose-driven reference round (animate-private lists it).

## Puppet rig (Three.js)

1. Silhouette with birefnet. Cut layers by hand from zoomed grids: each limb one polygon including the joint strip, the head with its hair, the body one mesh. Skin and cloth edges land in the right layer.
2. Inpaint only what moving parts uncover (background plate, body behind the arms, a strip under the frame edge, a blink), each as a recipe, `start` with a `mask` (art/PROMPTS.md, How a picture is made).
3. Rig: joint-side weights, IK for a hand resting on something, the prop lagging its forearm. Sine curves on the beat with lags between channels; no springs or squash on the body. Play on twos by default with a smooth toggle.
4. Reference implementation (`cut.py`, `assemble.py`, `rig.js`, `render.mjs`) in the puppet reference round. Render headless with software GL.

## Check before reporting

- Frame sheets across the clip with ffmpeg, by eye, and 1:1 crops of every frame of one loop for the hips, hands, prop, armpits, chest and face.
- DWPose on the output: hip travel in px against what the driver asks.
- Say plainly what moved and what broke. Report paths only; never open anything on his screen.
