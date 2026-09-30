---
name: voice-clips
description: Generates, checks and exports the game's voice clips (game3d/audio/<key>.mp3) with the local Qwen3-TTS clones, from the manifest the story produces. Use it after story lines change, when fast.mjs reports NO CLIP, or when a line needs re-voicing.
---

# Voice clips

Voice rules are in GUIDE.md (Voices and audio: Local first, the Mio pitch guard, per-character loudness). The voices each person uses are in docs/game/art-and-sound.md.

## The pipeline

One command does it: `sh tools/voice/run.sh`. It

1. rewrites game3d/audio/manifest.json from the story (`node game3d/tools/voice-manifest.mjs`; keys `eric-<word>`, `word-<word>`, `ln-<hash>`, `oh-<hash>`) and finds the lines with no clip for their current text (tools/voice/clips.json records the text of every exported clip);
2. takes the GPU lock as `$LOCK_ME` (default game3d-voices), waiting while someone else holds it (GUIDE: GPU lock), and releases it when done or interrupted;
3. makes three takes per line with Qwen3-TTS 1.7B Base clones (gen_takes.py, batched per speaker, checks the lock before every batch) and checks them (check_takes.py: tools/island_audio/check.py's Whisper reading check, pitch guard and WavLM similarity), with up to two retry rounds of new seeds for lines with no passing take;
4. exports the best passing take to game3d/audio/<key>.mp3 with per-speaker loudness (export.py), voices any line still failing with edge-tts and records it in tools/voice/edge.json (edge.py; GUIDE: edge-tts only as a fallback, so say which lines it voiced);
5. re-times known words in overheard clips if a new clip is overheard (spans.py, game3d/audio/spans.json), then runs `voice-manifest.mjs --check`, whose result is the exit code.

`sh tools/voice/run.sh --dry` lists the lines that need a clip without touching the GPU; `--no-manifest` skips step 1. Before a run, check nvidia-smi and free ComfyUI's VRAM if it is running. After it, run the fast-qa skill and commit the new mp3s with game3d/audio/index.json and tools/voice/clips.json (and edge.json if it changed).

- Who speaks with which clone reference, loudness per speaker, TTS text fixes: tools/voice/cfg.py (references in tools/voice-refs/). A new speaker id in the story needs a line in `speakers()` there; gen_takes.py stops and names it otherwise.
- A take picked by ear: put `"<key>": "<take>"` in tools/voice/force.json. Other English wording for a line that keeps failing: tools/voice/alt_text.json, then `~/ai/tts/qwen/venv/bin/python tools/voice/gen_takes.py 404,505,606 <key> --alt` under the lock.
- To redo a clip whose text didn't change, delete its key from tools/voice/clips.json.
- Takes, metrics, reports and run logs live in `$GAME3D_VOICE_WORK` (default ~/ai/game3d-voice/), outside git. Python venvs: ~/ai/tts/qwen/venv (takes), ~/ai/tts-bench/.venv (checks, export, spans), ~/ai/voice-pipeline/edge-venv (edge-tts); override with QWEN_PY, BENCH_PY, EDGE_PY.
- The clone reference wavs in tools/voice-refs/ are not all in git yet; on another machine, copy that folder over first. In a worktree, `tools/worktree.sh setup` doesn't link tools/island_audio/ or the .txt transcripts in tools/voice-refs/; symlink them from the main checkout before a run, or gen_takes.py stops, no take passes and every line falls through to edge-tts.

New or changed voices (a new cast voice, a different timbre) are a Review item for Jørgen's ears (post-review-item), not a pipeline run.
