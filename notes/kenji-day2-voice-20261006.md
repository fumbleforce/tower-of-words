# Kenji day-two voice repair — 2026-10-06

Issue #288 reports the office invitation and izakaya greeting using the wrong voice. The audit covers 17 Kenji lines per protagonist: 20 unique audio keys (14 shared and three name variants per protagonist).

All 20 existing MP3s were reconstructed byte-for-byte from their recorded selected takes, including the mixed Japanese/English splice. The configured and recorded reference is the approved `kenji-design`; this is inconsistent take identity, not a wrong actor mapping or stale export.

Six English takes were replaced using the existing local Qwen3-TTS 1.7B Base clone and exact reference SHA256 `cf12db4c27389086646782430270d8b81364ce78c88795f489ec1d801a166eed`. No text, clip keys, language rules, casting, reference audio, learning spans or pitch thresholds changed. Fourteen other day-two clips remain byte-identical, including all Japanese and mixed lines.

| Key | Take | Export similarity before → after | Raw median Hz |
| --- | --- | --- | --- |
| `ln-6eq1lk` | `s4001` | 0.800 → 0.896 | 207.4 |
| `ln-r98ztf-carina` | `s2121` | 0.752 → 0.926 | 170.4 |
| `ln-1le032r` | `s1801` | 0.839 → 0.925 | 212.2 |
| `ln-15wgpbm` | `s2021` | 0.724 → 0.956 | 179.5 |
| `ln-cce3tm` | `s2021` | 0.801 → 0.903 | 212.2 |
| `ln-1v75la1` | `s1701` | 0.821 → 0.879 | 123.3 |

Similarity is WavLM cosine against the approved reference, not a perceptual quality score. The repaired office invitation and outside greeting also agree with three established Kenji dialogue clips (export cosine 0.933–0.968). The selected takes all pass the unchanged reading, duration and male pitch guards. Whisper writes the homophones “T” for “tea” and “Karina” for “Carina”; those retain the original spoken text and pass existing reading checks.

`tools/voice/force.json` records these metric-selected passing takes; they are not described as picked by ear. This session cannot receive audio input, so listening was not performed or claimed. The local comparison page has every actual before/after MP3 for listening: `game3d/shots/kenji-day2-voice/comparison.html`.

All 52 attempts, including rejected high-pitch takes, same-reference timbre-only trials and Auto-language trials, remain in `~/ai/game3d-kenji-day2-fix/raw`. Final selected takes use the original full-reference English mode. The work folder also preserves metrics, exact texts, source provenance and report; fallback list is empty.

Reproduce the export audit with `GAME3D_VOICE_WORK=~/ai/game3d-kenji-day2-fix ~/ai/tts-bench/.venv/bin/python tools/voice/kenji_day2_audit.py --label after`. The runtime playback harness exercises real key resolution and audio playing/ended events for both protagonists; full day-two fast routes are checked at phone and desktop sizes.

Actual browser playback passed all ten samples (five per protagonist), with nonzero volume, playing and ended events, correct resolved keys and no private requests. Full day-two routes passed at 390×844 as Carina and 1366×860 as Eric in 75 seconds each, with zero movement overlaps or spins. The fast runner disables audible playback, so the separate media test supplies that evidence. Existing scene performance warnings remain; concurrent runs do not establish frame-time performance. CPU validation is recorded in the final handoff.
