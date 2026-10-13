---
name: animate-private
description: The private-mode additions for animating a private picture (a reward scene, an encounter picture, a skimpy portrait): where the round goes, keeping a soft scene covered in every frame, keeping the body on model, checks, verdicts and the private review. Use it together with animate-still whenever the still is private.
---

# Animate a private picture

animate-still has the method (pick the route, the driver, the rig, the frame checks). This skill adds what changes when the picture is private. The private picture rules themselves are in .codex/agents/private-scene-art.toml and island/PRIVATE.md; this skill doesn't repeat them, it says where they bite once the picture moves.

## Where it goes

- One round under the picture's project in island/private/rewards/ (`skimpy/<topic>-<n>/` for a skimpy portrait, the scene's own project for a scene picture), the source in `ref/`, scratch and frames in `raw/`, the clips and an `index.html` in the round. Nothing is committed, and no clip, frame or contact sheet goes in a public folder, the ComfyUI output folder (move it out) or /tmp.
- Animations are private mode only and never shown in discreet mode. The game has no clip playback today: it shows still pictures. Wiring a clip into a scene is a presenter change, so ask Jørgen before starting it.
- Reference rounds with working scripts: `skimpy/racket-loop-1/` (puppet rig), `skimpy/racket-dance-1/` (VACE pose driver), `skimpy/racket-video-1/` (plain image-to-video and keyframes, the route that failed).

## Soft scenes stay covered in every frame

A still is covered by framing, hair, steam or an arm (AGENTS.md, Reward scenes, soft). Motion moves those away: hair swings off the chest, a raised arm or a turning torso uncovers, steam drifts, a loose top rides up.

- With Wan at cfg 1 (the lightx2v speed-ups) the negative prompt does nothing, so the soft negative list doesn't protect a clip. Coverage has to come from the source and the motion: keep what covers in place in the driver (the arm stays across, the hair stays down) or on the puppet (the covering layer moves with the body). If a clip needs the negative, run at cfg > 1, which doubles the time per step.
- Check coverage on 1:1 crops of the covered regions in every frame. One frame that uncovers fails the clip.
- Hard scenes (adults only, AGENTS.md, Reward scenes, hard) have no coverage rule; the body and identity checks below still apply.

## The body stays on model

Jørgen noticed "visibly changing armpit styles, and breast size" in the first puppet. A moving picture shows every drift that one still would hide.

- Puppet: the body is only ever the source's own pixels. No redrawn poses faded over it, no springs or squash on the body.
- Video: compare the chest, waist and hips across frames on 1:1 crops beside frame 0. Size drift is a fault even when each frame alone looks fine. The text-prompt fix doesn't work here either (private-scene-art, body size drifting); change the driver or the reference instead.
- Face: VACE drifted the expression from a grin to an open laugh. If the face must hold, say so in the driver (no mouth keypoints change) and check frames against the approved portrait with `python3 tools/imgqa.py <frames> --character <who>`.
- Clothes: what the picture's clothing beat shows (a top riding up, a strap down) has to stay as it is through the motion.

## Verdicts and review

- Log every attempt (route, settings, seed, time, one factual line on what moved and what broke) in the round's `prompts.json` and `index.html`. tools/verdict.py takes images only: record the verdict on the clip's poster frame (frame 0 is the source, so use a mid-clip frame) and name the clip in the reason.
- Anything Jørgen has to judge goes in a private review in island/private/rewards/reviews/, never only the round's page. Never post a round where nothing passed.
- Claims and releases go in collab/private.md.
- Report in a few plain lines with paths, without describing image contents. Never open anything on his screen.

## GPU

Same lock and queue as every private round (private-scene-art, Rendering), ComfyUI started with VRAM held back for the desktop (animate-still). A video job holds the GPU for minutes: take one clip at a time and give waiting jobs their turn between clips.
