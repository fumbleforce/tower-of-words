# Separate voices for shared greetings

Seven existing Japanese greetings now have explicit speaker keys. Their text is unchanged. The voice inventory previously let identical overheard text from different speakers share one key; the collector now rejects that collision before it can replace a speaker's entry.

| Runtime key | Speaker | Selected take |
| --- | --- | --- |
| bun-ohayo | bun | s606 |
| guard-greeting-ohayo | guard | s606 |
| commuter-ohayo | commuter | s505 |
| kuro-otsukare | kuro | s404 |
| guard-dozo | guard | s404 |
| guard-konnichiwa | guard | s404 |
| aoi-konbanwa | aoi | s404 |

The approved character voice references were reused. The isolated local job generated three natural takes per line (seeds 404, 505 and 606), with no fallback. All 21 raw takes, settings, reading/pitch reports and selection logs remain in `~/ai/game3d-voice/greeting-collisions-20261007/`. That generation job also reported then-unfinished continuing-week clips; those unrelated missing lines were not part of this seven-line export.

The new guard take was generated under the temporary key `guard-ohayo`, then exported into the game as `guard-greeting-ohayo`. The existing approved `game3d/audio/guard-ohayo.mp3` was preserved; its asset-lock record did not change. This distinction is intentional and the original generation records retain their original names.

Each new MP3 matches its asset-lock hash. The eight voice-key unit checks cover rejection of a cross-speaker collision, explicit speaker keys and valid deduplication of one speaker. The final selected-voice inventory reports 1,266 lines with clips.

`game3d/tools/greeting-voice-check.mjs` takes the seven exact authored say nodes through a production Runner. Native clicks activate each line and advance the dialogue; its media records verify the explicit MP3 URL, decoding, time advancement and natural completion at desktop and phone sizes. This verifies runtime transport, not perceived timbre, performance quality or a new listening approval. Browser records live in `game3d/shots/greeting-voices/`; opening-day route reports remain in their timestamped `game3d/shots/fast/` folders.

Validation completed on this branch: all seven greetings played, decoded, advanced and ended at 1366×860 (Eric) and 390×844 (Carina), with native dialogue advancement, no page errors and no protected requests. Opening-day runs also passed at both sizes with no overrides, zero movement overlaps and zero spins. Their reported elapsed times were 71 and 99 seconds including startup/queue time. Existing world draw-call/triangle baseline warnings remain in the reports; this audio change does not alter world geometry or those budgets. The first playback harness attempt clicked the continuation hint rather than its real `#talkHit` target; that harness failure is preserved in the evidence logs, and the corrected native pair passed.
