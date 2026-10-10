---
name: animate-still
description: Animates one still picture of a character (a wave, a dance, a loop) on the local GPU, either as pose-driven video (Wan 2.2 VACE with a skeleton driver) or as a 2D puppet rig in Three.js, with frame checks before anything goes to Jørgen. Use it whenever a still has to move. For a private picture, also load animate-private.
---

# Animate a still

What works and what doesn't, with the settings and Jørgen's verdicts, is in art/PROMPTS.md, Video, "Animating a character still". Read it first. This skill is the order of the steps.

## Pick the route

- **Big body motion** (dancing, hips travelling, arms leaving their pose): pose-driven video, Wan 2.2 Fun VACE plus a skeleton driver. This is the default.
- **Small motion that must stay exactly on model** (breathing, a sway, a blink, a game idle loop): the 2D puppet rig.
- Don't use plain image-to-video for character motion. It keeps the source pose. It's fine for scenery, vehicles and camera moves.
- First+last-frame clips only with keys whose body really moved. Measure the hips before using one.

## Before rendering

1. Write down Jørgen's request in his words, then a staging note with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md): the static camera, what moves, where each hand and each prop goes. Check that props stay inside the frame for the whole move.
2. A private picture follows the animate-private skill as well (where the round goes, coverage in every frame, body checks, review).
3. GPU: take the lock (GUIDE: GPU lock). Start ComfyUI with `--reserve-vram 3`, or Jørgen's desktop loses its GPU. Never restart ComfyUI while someone else's job is queued. Free the VRAM when done.

## Pose-driven video (VACE)

1. Run DWPose on the source (rtmlib on the CPU, `~/ai/dwpose-venv`) to get her keypoints and bone lengths.
2. Write the dance as curves on her skeleton: frame 0 is exactly her pose, ease in over about 10 frames, the beat (e.g. a 20-frame hip cycle at 16 fps), and ease back out so the last frame equals frame 0. Render it as an OpenPose-coloured skeleton video at the output size. Mocap only if the take really does the move. Look at a contact sheet of the driver before rendering.
3. Wan 2.2 Fun VACE with the settings in PROMPTS.md. Change one thing per attempt (driver, seed, negative) and log each in `prompts.json`.
4. Reference scripts from the first run (copy, don't rewrite): `driver.py`, `bvh.py`, `gen.py`, `measure.py`, `sheet.py` in the pose-driven reference round (animate-private lists it).

## Puppet rig (Three.js)

1. Silhouette with birefnet. Cut the layers by hand from zoomed grids: each limb as one polygon including the joint strip, the head with its hair, the body as one mesh. Check that skin and cloth edges land in the right layer: no skin left on the shirt, no shirt on the arm.
2. Inpaint only what moving parts uncover (a clean background plate, the body behind the arms, a strip under the frame edge, a blink). Never fade redrawn poses over the body; her body is only ever the source's own pixels.
3. Rig: joint-side weights, IK for a hand that rests on something, the prop lagging its forearm. Plain sine curves on the beat with lags between channels. No springs or squash on the body. Play on twos by default with a smooth toggle.
4. Reference implementation: `cut.py`, `inpaint.py`, `assemble.py`, `rig.js`, `render.mjs` in the puppet reference round (animate-private lists it). Render headless with software GL.

## Check before reporting

- Frame sheets across the whole clip with ffmpeg, looked at by eye. For the parts that matter (hips, the hand on the hip, the prop, the armpits and chest, the face), make 1:1 crops of every frame of one loop. A missing piece of a limb or a body that changes size shows up only there.
- Measure the motion: DWPose on the output (hip travel in px against what the driver asks for).
- Say plainly what moved and what broke. Don't grade it yourself.
- Report paths and URLs only; never open anything on his screen.
