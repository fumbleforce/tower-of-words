# Video findings

- Model: Wan 2.2 I2V 14B fp8 with the lightx2v 4-step LoRA (4 steps, CFG 1, shift 5, euler/simple, high-noise expert for steps 0 to 2 then low-noise, 81 frames at 16 fps). The 5B is unusable. At CFG 1 the negative prompt does nothing.
- Prompt: shot and camera first, then "Second 0 to 1: ... Second 1 to 2: ...", then what stays fixed ("rigid body, cars do not bend"). Motion matches the picture and goes the way the scene needs. Monorail trains have a cab at both ends and a visible end; never prompt a single front.
- ComfyUI takes all free VRAM: start it with `--reserve-vram 3` for video, take the GPU lock, unload after.

## Animating a character still

- Plain image-to-video keeps the source pose ("looks like she is just combing her hair"). Image-edit keyframes moved the arms but not the hips; measure each key's hips against the source.
- Pose-driven Wan 2.2 Fun VACE (14B fp8, core `WanVaceToVideo`) works: control video = the source as frame 0 (mask 0) plus a DWPose skeleton for frames 1 to 80 (mask 1), the source also as reference image, 832×576, 81 frames at 16 fps, t2v lightx2v v1.1 LoRAs on both experts, 6 steps (3 high + 3 low), shift 5, CFG 1, about 350 s. Props leave the frame if the driver lifts the hand holding them; the expression drifts.
- Build the driver on her own skeleton and bone lengths, frame 0 exactly her pose, eased in and out so it loops. Curves beat the available mocap.
- The 2D puppet stays exactly on model but never turns in depth. Cut each limb as one polygon with its joint, never fade redrawn poses over the body ("visibly changing armpit styles, and breast size"), no springs or squash on the body, check seams where skin meets clothes.
