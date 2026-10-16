# Voice and music methods

How we make voices, songs and background music, and what we learned doing it. Copied from GUIDE.md on 2026-09-29 (the guide diet). Which voices and tracks are approved is in docs/game/art-and-sound.md; the rules in force (local first, Mio's male-drift guard) are in GUIDE.md, Voices and audio.

## How a sound is made

Every new sound (background music, a song, an ambience bed or a sound effect) is made from a preset by tools/audio/make.py, the way every picture is made from a recipe. Voices have their own route (the voice-clips skill).

```
tools/audio/make.py <kind> <preset> --round <round> --takes N --owner <session>/<agent> [--dry-run]
tools/audio/make.py post --round <round>
tools/audio/make.py promote <round>/<take> <name>
```

- A preset, tools/audio/presets/<kind>/<id>.json, holds the generator, the prompt, the length, the loop (shortest, longest and fade, or none), the loudness target and where the sound plays. A song's preset also says who sings it, where and when. A change is a new version; an old version is never rewritten, and the check fails one that is.
- Which generator makes what (the table in tools/audio/generators.py; make.py refuses anything else):
  - Background music: Lyria 2 or local YuE2, whichever suits the use. Lyria 2 costs money: make.py runs it only with `--paid`, and tools/rep.mjs logs the cost.
  - Songs: local YuE2, as prototypes until the licence is settled. YuE2 is non-commercial (CC BY-NC 4.0, notes/licenses.md), so a paid release can't ship YuE2 output, and make.py doesn't promote songs.
  - Ambience: Stable Audio 3 Medium on the local GPU, or offline synthesis.
  - Sound effects: offline synthesis first, then Stable Audio 3, or a CC0 pack sound with its pack, link and licence in the preset.
- `--dry-run` prints exactly what would be sent and what it costs. Each take keeps its raw FLAC and a sidecar in ~/ai/audio-raw/<round>/, a record in the committed art/candidates/<round>/takes.json, and a line in the local log art/production/audio-log.jsonl.
- Every take goes through the same post step: a vocal check (Demucs) and a CLAP screen, the loop cut and its seam check, and levelling to the preset's loudness. It writes review MP3s to art/candidates/<round>/, the game files to art/production/audio/<round>/, and reviews/<round>/review.json with every take, failed ones included. The numbers are a screen. No agent picks, and every card says it wasn't listened to by an agent.
- `promote` installs a take Jørgen picked, through live.mjs promote with the review, and writes its loop region to loops.json or its levels to levels.json. Every live sound file has its own unit in tools/assets/live.json that names its preset or source and its licence.
- A new script that generates audio outside tools/audio fails npm run check (tools/audio/ratchet.py).

## Voices
- Accents (2026-09-28, Eric): Qwen3 VoiceDesign ignores accent descriptions. What works: a Norwegian Piper voice reads the line in rough Norwegian spelling, Qwen3 Base clones that clip reading the real English line, then CosyVoice3 voice conversion puts the chosen timbre (eric-2) on it. Reference: tools/voice-refs/eric-nordic-v2.wav (not yet approved by ear). Jørgen on v2: too strong ("unbearable... the game just won't be taken seriously, but it is quite funny"); then on the lighter versions: "not any better, just drop it, English accent instead". Eric uses voice design eric-2 with no accent (tools/voice-refs/eric-voice.wav).
- Replicate voices tested best (MiniMax Speech 2.6 HD plus Qwen3-TTS clones), but local Qwen3-TTS is now the default (see Local first). IndexTTS is unusable.

## Music
- Music: one loop per mood, crossfading into itself. Which generators may make it: How a sound is made.
- Music verdict (2026-09-25): YuE2 round-1 loops had great fidelity but came out with vocals and sounded like theme songs; Lyria loops are bland but work as background. The YuE2 opening theme is great but a little too sharp.
- Music round 2 verdict (2026-09-25): Lyria wins background music by far. YuE2 loops, even vocal-free, are simple and repeat within the track and lose variety; the best YuE2 was round 1 with the voice removed by Demucs, still not as good. Stable Audio 3 is terrible. Opening theme = "Mastered: softer" (legacy/game/audio/music/opening.mp3). Don't process vocals further: heavier EQ made them crackly and low quality. The softer-tags regeneration was not interesting.
- Karaoke and voice lessons (2026-09-26, legacy/island/godot/assets/audio/README.md):
  - YuE2's own score for sparse lyrics runs about 190 s, so write the score first and shorten only instrumental bars. Never cut a bar that has a sung note.
  - The score YuE2 writes before singing, about one note per mora, is a better source of karaoke timing than Whisper, which was 5 s off on singing.
  - When checking a TTS or sung line, compare Whisper's text with the written line as well as its kana: pykakasi misreads 人, 今日 and 君.
  - Licences: YuE2 is CC BY-NC 4.0 (non-commercial, which also covers the opening theme) and Stable Audio 3 is under the Stability AI Community License. Fine for the prototype; check before selling anything.
- Instrumental YuE2 (what works): tags and lyrics alone don't stop the singing ([Instrumental] sections still got vocals, about -8 dB vocal energy). The fix is the instrumental AR add-on Mothersuperior/YuE2-instrumental-cot-full-loras (ar_lora_inst_v3abc_comfyui.safetensors) on the CLIP output of LoraLoader, strength 1, with the bf16 checkpoint, mode full, and lyrics set to only `[instrumental]` or bare section tags one per line (`[intro]` `[verse]` ... `[outro]`). Vocal energy dropped to -65 to -77 dB (Lyria: about -32). Optional NAR add-on nar_lora_joint_v9_comfyui on MODEL. For calmer BGM: tags "background music, low energy, sparse, minimal", and optionally mute the Ins melody in the ABC score so only chords remain (tools/music_inst.py mute_melody). About 60–90 s per 90 s take. Stable Audio 3 Medium (native in ComfyUI, 8 steps, ~40 s) is the other local instrumental option. make.py checks vocals (tools/audio/vocal_check.py, Demucs) and cuts loops (tools/audio/make_loop.py).
- Music round 6 verdict (2026-10-10, Review music-round-6, YuE2 instrumentals in the opening's style): evening-1 (city pop, 104 BPM) picked, "pretty cool"; it is now the `night` loop (cut with tools/audio/make_loop.py, 132 s). Notes for the next round, in his words:
  - title-1: "start is is not great, and is too repetetive, bit too fast paced"
  - day-1: "also super repetive"
  - office-2: rejected, "some double notes on top of each other, too intense"
  - shops-1: rejected, "clown show"
