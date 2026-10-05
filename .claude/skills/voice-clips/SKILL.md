---
name: voice-clips
description: Generates, checks and exports the game's voice clips (game3d/audio/<key>.mp3) with the local Qwen3-TTS clones, from the manifest the story produces. Use it after story lines change, when fast.mjs reports NO CLIP, or when a line needs re-voicing.
---

# Voice clips

Voice rules are in GUIDE.md (Voices and audio: Local first, the Mio pitch guard, per-character loudness). The voices each person uses are in docs/game/art-and-sound.md.

## The pipeline

One command does it: `sh tools/voice/run.sh`. It

1. rewrites game3d/audio/manifest.json from the story (`node game3d/tools/voice-manifest.mjs`; keys `eric-<word>`, `word-<word>`, `ln-<hash>`, `oh-<hash>`, and another protagonist's own clips `carina-<word>` and `<key>-carina`, once that protagonist has a voice: docs/game/systems.md, Protagonists) and finds the lines with no clip for their current text (tools/voice/clips.json records the text of every exported clip);
2. checks the setup before waiting for anything (`cfg.py setup`: the Python venvs, every clone reference wav, the transcript of each speaker in the batch, the Qwen model folder) and stops naming what's missing; then takes the GPU lock as `$LOCK_ME` (default game3d-voices), waiting while someone else holds it (GUIDE: GPU lock), and releases it when done or interrupted;
3. makes three takes per line with Qwen3-TTS 1.7B Base clones (gen_takes.py, batched per speaker, checks the lock before every batch) and checks them (check_takes.py: tools/island_audio/check.py's Whisper reading check, pitch guard and WavLM similarity), with up to two retry rounds of new seeds for lines with no passing take;
4. exports the best passing take to game3d/audio/<key>.mp3 with per-speaker loudness (export.py), and stops with exit 1 if any line still has no passing take. Only with `EDGE_FALLBACK=1` does it voice those lines with edge-tts and record them in tools/voice/edge.json (edge.py; GUIDE: edge-tts only as a fallback, so say which lines it voiced);
5. re-times known words in overheard clips if a new clip is overheard (spans.py, game3d/audio/spans.json), then runs `voice-manifest.mjs --check --voiced` (the protagonists with a voice), whose result is the exit code. A new protagonist's voice: set `voice.ref` in game3d/data/mc/<id>.json and add the speaker to cfg.py; the next run makes their clips (`voice-manifest.mjs --check --mc <id>` lists them).

A step that exits non-zero (gen_takes, check_takes, export, edge, spans: a crash, a missing model, a lost lock) stops the batch with exit 1 and prints the end of its output; its whole output is in `$GAME3D_VOICE_WORK/logs/<step>.out`. `sh tools/voice/run.sh --dry` lists the lines that need a clip and checks the setup without touching the GPU; `--no-manifest` skips step 1. Once it holds the lock, run.sh asks ComfyUI (port `COMFY_PORT`, default 8188) to unload its models, because a holder before it may have left them in VRAM (a batch on 2026-10-06 crashed with out of memory when that happened). After it, run the fast-qa skill and commit the new mp3s with game3d/audio/index.json and tools/voice/clips.json (and edge.json if it changed).

- Who speaks with which clone reference, loudness per speaker, TTS text fixes: tools/voice/cfg.py (references in tools/voice-refs/). A new speaker id in the story needs a line in `speakers()` there; gen_takes.py stops and names it otherwise.
- A take picked by ear: put `"<key>": "<take>"` in tools/voice/force.json. Other English wording for a line that keeps failing: tools/voice/alt_text.json, then `~/ai/tts/qwen/venv/bin/python tools/voice/gen_takes.py 404,505,606 <key> --alt` under the lock.
- To redo a clip whose text didn't change, delete its key from tools/voice/clips.json.
- Lines from another worktree's story (a batch someone asked for): set `VOICE_MANIFEST=<that worktree>/game3d/audio/manifest.json` and pass the keys to gen_takes.py; check and export read the same manifest.
- Takes, metrics, reports and run logs live in `$GAME3D_VOICE_WORK` (default ~/ai/game3d-voice/), outside git. Python venvs: ~/ai/tts/qwen/venv (takes), ~/ai/tts-bench/.venv (checks, export, spans), ~/ai/voice-pipeline/edge-venv (edge-tts); override with QWEN_PY, BENCH_PY, EDGE_PY.
- The clone reference wavs in tools/voice-refs/ are not in git (their .txt transcripts are); on another machine, copy that folder over first. In a worktree, `tools/worktree.sh setup` links the wavs from the main checkout. The setup check in step 2 names any that are missing.

## Japanese must sound Japanese

Jørgen, 2026-09-30: an English-mode clone reading Japanese "teaches the student the wrong pronunciation" (Mio's 待って, Eric's 止まって as "tomato"). So:

- Japanese is always generated with `language='Japanese'`, from kana/kanji text, for every speaker, Eric included. A clone whose reference speaks English (`cfg.XVEC_JA`: Eric) reads Japanese from its timbre only (Qwen's `x_vector_only_mode`, takes tagged `x`): with the English reference as a spoken prompt he said トマテ and ダシュイト (0 of 9 takes passed for 止まって and 出して); timbre-only, 62 of 66 takes read right with P(ja) 0.7 to 1.0 and the same voice (WavLM similarity 0.5 to 0.9, as before).
- An English line with Japanese in it (kana, kanji, or a romaji word in `RO2JA` in cfg.py) is cut at its Japanese by `cfg.parts()`. Each part is its own unit `<key>~<n>` (`cfg.units()`): English parts made in English, Japanese parts in Japanese, same clone. check_takes.py checks each part, export.py picks the English parts' takes nearest the speaker's usual English pitch, then each Japanese part's take nearest those, and splice.py joins them: parts trimmed, Japanese parts levelled to the English parts' speech loudness (±6 dB at most), pauses from the punctuation between them (0.30 s after a full stop, 0.16 s after a comma, 0.07 s mid-sentence), then the whole clip normalised as usual.
- Why splicing (tested 2026-09-30 on 3 lines, 3 seeds each, Whisper's language guess on the Japanese stretch): the whole line in English mode with romaji (the old way) or with kana, or in `Auto` mode, gave English-accented Japanese: in "On the train you said 待って ... 動いて" Whisper (ja) didn't find either word in any of 9 takes (it heard "mad", "maitte"), and えっと scored P(ja) 0.09 to 0.58. Spliced, every Japanese stretch scored P(ja) 0.95 to 1.0 and read right, and the English stayed as readable as before. After the pitch-matched pick, all 19 spliced lines have their Japanese within 2.2 semitones of the English around it and P(ja) 0.8 or more.
- The native check (tools/voice/native.py): Whisper large-v3-turbo's language guess on the audio. Word clips (`word-*`, `eric-*`) and Japanese parts only pass with P(ja) >= 0.5 as well as the kana reading check. Word clips also get a rough pitch-accent check (the first two morae against the Tokyo accent in `native.ACCENT`); a take with the right accent is preferred. `~/ai/tts-bench/.venv/bin/python tools/voice/native.py --words word-,eric-` measures the exported clips.
- A tapped word in dialogue plays Mio's `word-<id>` clip (slow, Japanese); Eric's `eric-<id>` plays only when he says it.

New or changed voices (a new cast voice, a different timbre) are a Review item for Jørgen's ears (post-review-item), not a pipeline run.
