---
name: voice-clips
description: Generates, checks and exports the game's voice clips (game3d/audio/<key>.mp3) with the local Qwen3-TTS clones, from the manifest the story produces. Use it after story lines change, when fast.mjs reports NO CLIP, or when a line needs re-voicing.
---

# Voice clips

Voice rules: GUIDE.md (Voices and audio). Which voice each person uses: docs/game/art-and-sound.md.

## The pipeline

`sh tools/voice/run.sh` does it all:

1. Rewrites game3d/audio/manifest.json from the story (`node game3d/tools/voice-manifest.mjs`) and finds lines with no clip for their current text (tools/voice/clips.json).
2. Checks the setup (`cfg.py setup`: venvs, clone reference wavs, transcripts, model) and stops naming what's missing; takes the GPU lock as `$LOCK_ME` (default game3d-voices) and asks ComfyUI to unload its models.
3. Makes three takes per line (gen_takes.py) and checks them (check_takes.py: Whisper reading, pitch guard, WavLM similarity, one voice throughout), with up to two retry rounds.
4. Exports the best passing take with per-speaker loudness (export.py), and exits 1 if a line has no passing take. Only `EDGE_FALLBACK=1` voices those with edge-tts (recorded in tools/voice/edge.json; say which lines).
5. Re-times known words in overheard clips (spans.py), then `voice-manifest.mjs --check --voiced` sets the exit code.

A failing step stops the batch and prints the end of its output; the full output is in `$GAME3D_VOICE_WORK/logs/<step>.out` (default ~/ai/game3d-voice/). `--dry` lists the lines needing a clip and checks the setup without the GPU; `--no-manifest` skips step 1.

After it: the fast-qa skill, then commit the new mp3s with game3d/audio/index.json and tools/voice/clips.json (and edge.json if changed). A clip the manifest no longer plays fails `npm run check`; retire it with `node tools/assets/live.mjs retire game3d/audio/<key>.mp3`.

## Controls

- Speakers, clone references, loudness and TTS text fixes: tools/voice/cfg.py (`speakers()`; references in tools/voice-refs/, linked into a worktree by `tools/worktree.sh setup`). A new speaker id needs a line there.
- A take picked by ear: `"<key>": "<take>"` in tools/voice/force.json. Other English wording for a line that keeps failing: tools/voice/alt_text.json, then `~/ai/tts/qwen/venv/bin/python tools/voice/gen_takes.py 404,505,606 <key> --alt` under the lock.
- Redo a clip whose text didn't change: delete its key from tools/voice/clips.json.
- Lines from another worktree's story: `VOICE_MANIFEST=<that worktree>/game3d/audio/manifest.json`, keys to gen_takes.py.
- A new protagonist's voice: `voice.ref` in game3d/data/mc/<id>.json and the speaker in cfg.py (docs/game/systems.md, Protagonists).

## Japanese must sound Japanese

An English-mode clone reading Japanese "teaches the student the wrong pronunciation". So:

- Japanese is generated with `language='Japanese'` from kana or kanji, for every speaker. A clone whose reference speaks English (`cfg.XVEC_JA`) reads Japanese from its timbre only.
- An English line with Japanese words in it is one take, read in English with each Japanese word written in kana (`cfg.kana_reading`; kanji words need a reading in `cfg.JA_READ`). check_takes.py passes it only if every Japanese word is heard and sounds Japanese.
- Clones with an English reference (`cfg.SPLICE`: Eric, Carina) can't say Japanese in an English take: their lines are split at the Japanese (`cfg.parts()`), each part voiced in its language, and joined in one voice (splice.py).
- Every English take keeps one voice start to end (segvoice.py). Word clips (`word-*`, `eric-*`) and Japanese parts pass only with P(ja) >= 0.5 (native.py), and a take with the right Tokyo pitch accent is preferred.
- A tapped word plays Mio's `word-<id>` clip; Eric's `eric-<id>` plays only when he says it.

A new or changed voice is a Review item for Jørgen's ears (post-review-item), not a pipeline run.
