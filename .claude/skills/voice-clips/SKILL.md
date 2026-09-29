---
name: voice-clips
description: Generates, checks and exports the game's voice clips (game3d/audio/<key>.mp3) with the local Qwen3-TTS clones, from the manifest the story produces. Use it after story lines change, when fast.mjs reports NO CLIP, or when a line needs re-voicing.
---

# Voice clips

Voice rules are in GUIDE.md (Voices and audio: Local first, the Mio pitch guard, per-character loudness). The voices each person uses are in docs/game/art-and-sound.md.

## The pipeline

1. Manifest: `node game3d/tools/voice-manifest.mjs` writes game3d/audio/manifest.json from the story files (keys `eric-<word>`, `ln-<hash>`, `oh-<hash>`). `node game3d/tools/voice-manifest.mjs --check` lists lines with no clip (fast.mjs runs this check too).
2. Take the GPU lock (GUIDE: GPU lock). Free ComfyUI's VRAM first if it is running.
3. Generate takes: gen2.py (Qwen3-TTS 1.7B Base clones, batched per speaker, several seeds; checks the GPU lock before every batch).
4. Check takes: `DEV=cuda check2.py takes`, which uses tools/island_audio/check.py (Whisper reading check, pitch guard, WavLM similarity).
5. Export: export2.py picks the best passing take per line and writes game3d/audio/<key>.mp3 with per-speaker loudness; `--dry` lists the lines with no passing take (NOPASS). Retry those with new seeds, up to two rounds.
6. Fallback: edge2.py voices lines no local take passed, with edge-tts, and records them (GUIDE: edge-tts only as a fallback).
7. Release the GPU lock. Run the fast-qa skill; the manifest check must be clean.

all.sh runs steps 3 to 6 in order. The Python is ~/ai/tts-bench/.venv/bin/python.

## Where the scripts are (pending move)

gen2.py, check2.py, export2.py, edge2.py, cfg2.py and all.sh are not in the repo yet. The working copy is in an old session's scratchpad, /tmp/claude-1000/-home-jorgen-repo-japanese/59b28a83-94ef-4467-b091-9bca84b00a6b/scratchpad/g3v2/, which is on tmpfs and is lost on reboot. TODO.md asks to move them into tools/ (tools/voice/ in notes/productivity-review.md, section 6); that is a tools change for after the code freeze. Until then, run them from that folder, and if it is gone, say so and stop: don't rewrite the pipeline from scratch.

New or changed voices (a new cast voice, a different timbre) are a Review item for Jørgen's ears (post-review-item), not a pipeline run.
