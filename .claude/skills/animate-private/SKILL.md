---
name: animate-private
description: The private-mode additions for animating a private picture (a reward scene, an encounter picture, a skimpy portrait): where the round goes, keeping a soft scene covered in every frame, keeping the body on model, checks, verdicts and the private review. Use it together with animate-still whenever the still is private.
---

# Animate a private picture

animate-still has the method. This skill adds what changes when the picture is private. The private picture rules are in .claude/agents/private-scene-art.md and island/PRIVATE.md.

## Where it goes

- One round under the picture's project in island/private/rewards/ (`skimpy/<topic>-<n>/` for a skimpy portrait, the scene's project for a scene picture): the source in `ref/`, scratch and frames in `raw/`, the clips and an `index.html` in the round. Nothing is committed, and no clip, frame or sheet goes in a public folder, the ComfyUI output folder (move it out) or /tmp.
- Animations are private mode only, never in discreet mode. The game shows stills only; wiring a clip into a scene is a presenter change, so ask Jørgen first.
- Reference rounds with working scripts: `skimpy/racket-loop-1/` (puppet rig), `skimpy/racket-dance-1/` (VACE pose driver).

## Soft scenes stay covered in every frame

Motion moves what covers a still (CLAUDE.md, Reward scenes, soft): hair swings, an arm lifts, steam drifts, a top rides up.

- At CFG 1 the negative prompt does nothing, so coverage comes from the source and the motion: keep what covers in place in the driver, or move the covering layer with the body on the puppet. A clip that needs the negative runs at CFG above 1 (twice the time per step).
- Check 1:1 crops of the covered regions in every frame. One frame that uncovers fails the clip.
- Hard scenes (adults only) have no coverage rule; the body and identity checks still apply.

## The body stays on model

- Puppet: the body is only the source's own pixels.
- Video: compare chest, waist and hips on 1:1 crops beside frame 0; size drift is a fault even when each frame looks fine. Fix it in the driver or the reference, not the words.
- Face: if it must hold, keep the mouth keypoints still in the driver and run `python3 tools/imgqa.py <frames> --character <who>`.
- The picture's clothing beat stays as it is through the motion.

## Verdicts and review

- Log every attempt (route, settings, seed, time, one line on what moved and what broke) in the round's `prompts.json` and `index.html`. tools/verdict.py takes images: record the verdict on a mid-clip frame and name the clip in the reason.
- What Jørgen judges goes in a private review in island/private/rewards/reviews/. Never post a round where nothing passed.
- Claims and releases in collab/private.md. Report in a few plain lines with paths, without describing image contents.

## GPU

The same lock and queue as every private round. A video job holds the GPU for minutes: one clip at a time, and let waiting jobs in between clips.
