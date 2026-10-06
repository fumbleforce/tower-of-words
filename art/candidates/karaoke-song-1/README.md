# Call on the way home — candidate record

Root-authorized two-take local YuE2 experiment, X-0681 / #300. All attempts appear in `reviews/karaoke-song-1`. No runtime installation or approved singing voice.

`generate.py a` and `generate.py b` preserve immutable exact requests, full raw FLAC and both ABC scores under `~/ai/island-audio/karaoke-song-1/`. Loadable score/audio workflows are also in `tools/workflows/` and `~/ai/workflows/`. Both synthesized scores retained every vocal bar; requested 20–40 seconds became complete 52.44 / 54.20 second exports. MP3s are full-length LAME quality 2 encodes, with no cuts, time stretch or pitch alteration.

A's first line differs in Whisper and its last phrase misses ようか in two independent full/tail recognitions. B's final phrase is recognized completely but 明日の is heard instead of 明日も in both passes. The full B transcript also contains a chunk-boundary hallucination; the isolated chorus does not. ASR cannot decide whether these are sung defects or recognition errors. Both raw recordings have zero clipped samples. Runtime audio input was unavailable to parent and worker, so there is **no listening, musical-quality, natural-phrasing or timbre pass**. These limitations are visible beside each playable candidate.

`check-audio.py` reproduces CPU Whisper/sample checks using the existing tts-bench environment. `GL=soft BASE_URL=<worktree URL> node art/candidates/karaoke-song-1/check.mjs` verifies both actual HTML players load, advance playback, report full durations and fit desktop/phone without horizontal overflow. Muted browser playback is transport verification, not listening.

B synthesis completed successfully and its FLAC hash was saved before the cleanup wrapper attempted to parse ComfyUI's empty HTTP success body as JSON. Its original report/error is preserved. The wrapper now reads the response without JSON parsing; no additional take was generated. Models were unloaded and the exclusive GPU lock released before further browser/voice work.
