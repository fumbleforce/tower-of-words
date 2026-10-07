# Karaoke A follow-up

Issue #320, root claim X-0803. Jørgen selected round-one A as “better tone at least”; this is a bounded lyric-completion follow-up, not runtime audio adoption. The same six lyrics and selected style remain.

All six attempts appear in `reviews/karaoke-song-2/details.html`. A2–A4 were score-only attempts rejected by an explicitly heuristic note-count screen. A5 changes the final held note into four pitched notes. A6 also divides seven earlier held-note bars without changing their durations; A7 varies its synthesis seed. Exact requests, workflow graphs, ABC scores, original/tail ASR and SHA-256 manifests are in `evidence/`. Full raw files remain under `~/ai/island-audio/karaoke-song-2/`.

A6 is the closest automated lyric result: the full transcript matches the first five lines and includes the final question, but both passes misrecognize part of 同じ時間. A5 loses earlier words; A7 has several transcription differences and four samples at the clipping threshold. No listening, phrasing, musical-quality or singing-voice approval is claimed. Nothing is installed. Every MP3 is a full LAME quality-2 export without splicing, stretching or pitch shifting.

`generate.py a2` through `a7` reproduce the candidate requests with the local GPU queue. `check-audio.py a5` through `a7` run CPU-only Whisper and sample checks in the existing tts-bench environment. The original generator accepts an optional round name; its default remains `karaoke-song-1`.
