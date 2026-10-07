# Karaoke A follow-up — independent package review

2026-10-07. Read-only review of `.claude/worktrees/codex-karaoke-correction`; no generation, ASR rerun, upload, source edits or commit. Clean-code guidance applied. Final scoped verdict: **PASS.** The verified follow-up below resolves the export-provenance and default-owner findings. No audio listening, lyric-delivery, musical-quality or adoption approval is given.

## Resolved publication finding

1. **Record the exact exported MP3 provenance.** `art/candidates/karaoke-song-2/README.md:7` claims full LAME quality-2 exports. The per-attempt `evidence/a5/source-hashes.json:1` (and A6/A7 equivalents) identifies raw FLAC and generation/check evidence but does not identify the MP3 being served. Add a small export manifest containing each input FLAC hash, output MP3 hash, exact encoder arguments and resulting duration. The current full MP3 durations do match their raw recordings, but duration alone cannot prove their source or encoder settings. This does not indicate a bad recording; it closes the receipt gap before the candidate media leaves the workspace.

## Other findings (owner label resolved; existing-take guard optional)

2. `art/candidates/karaoke-song-1/generate.py:83`: the original helper's default synthesis inputs, output paths and filenames are preserved. Its default GPU owner label changes from `codex-karaoke-song-a` to `codex-karaoke-song-1-a`. Either retain the former label for the default or describe this as a logging/queue-label change rather than literally unchanged default behavior. No synthesis/output regression found.

3. `art/candidates/karaoke-song-2/generate.py:68`: A5–A7's existing-FLAC fast path returns before rebuilding/comparing the request and graph. The original generator checks request identity first. A future settings edit under an existing take ID could therefore be silently reported as already generated. Moving this check after request construction and rejecting a mismatched existing request would preserve the original safeguard. Current archived requests and graphs are consistent, so this is a future-run hardening item, not evidence invalidation.

## Independently verified

- All **42 stored source hashes** across A2–A7 match the preserved files, including the three raw FLACs in the public candidate archive. The A2–A4 request digests and score seeds also verify.
- A2/A3/A4 are retained score-only failures with 81/82/80 vocal onsets for 91 morae and a threshold of 88. The review explicitly calls this heuristic and does not claim proof that singing would fail. No audio is claimed for those attempts.
- A5–A7 use the original A score as their recorded raw score. Every rendered ABC equals its workflow input. All **22 vocal-bar durations** are unchanged individually, totalling **52.8 score seconds** at 100 BPM; each graph retains a 54.8-second generation cap.
- A5 changes the final held tonic into four pitched notes. A6 adds the documented seven earlier bar subdivisions. A7 uses A6's score and seed 207111 in both music generation and sampling. A5/A6 retain 207101. Lyrics, style, checkpoint and other synthesis settings match selected A.
- `ffprobe` confirms raw and MP3 durations match: A5 **51.60 s**, A6 **50.96 s**, A7 **52.96 s**. These are generated recording durations, correctly distinguished from score duration. The stored sample-check logic counts absolute samples at or above 0.9999; the records support zero/zero/four threshold samples and the displayed peaks.
- Original A's full and tail ASR both end in `かけ`, supporting the description that they missed the final `ようか`.
- A6's full transcript matches the first five intended lines. Its final phrase is misrecognized around `同じ時間` in both passes. The review acknowledges this, uses ASR only as evidence, and asks the user to listen. A5/A7 discrepancies are exposed in full.
- `details.html` presents original A, then **all six attempts A2–A7 in order**, including score-only rejections. It includes four full audio players. The Review JSON links to this history and includes a rejection option; it makes no runtime adoption claim.
- All referenced media are public candidate paths. No runtime game audio files are changed. The review and README explicitly say no recording is installed and listening remains undecided.
- Parent's native browser transport log `/tmp/codex-karaoke2-pagecheck.log` reports all four players' metadata/playback/layout PASS at 1366 and 390. I inspected the test; it checks metadata duration, half a second of muted playback and horizontal overflow. This is transport coverage, not listening or a full audible ending check.
- Python AST parse and `git diff --check` pass. Independent numerical/hash receipt: `/tmp/codex-karaoke2-independent-proof.json`.

Code readability score: **8/10** for this bounded package. The named entry points and reuse of original settings are clear. The existing-request guard above is the meaningful hardening improvement; a later cleanup could split request/score construction from rendering in `repaired_ending` without altering candidate semantics. No broad runtime test is warranted for this review-only package.

## Verified follow-up

Root added per-take `evidence/a5/export.json`, `a6/export.json` and `a7/export.json`. I verified all raw/export hashes against the actual files and checked the recorded full-file libmp3lame quality-2 arguments and encoder version. The should-fix provenance finding is resolved. Root also restored the original default GPU owner label while keeping custom-round labels separate. Finding 2 is resolved. **Final scoped package verdict: PASS.** Finding 3 remains optional future-run hardening; it does not invalidate current evidence. No listening/adoption approval.
