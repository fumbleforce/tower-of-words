# Day 2 must be replaced, not patched

Written 2026-09-25, after the day-1 revision. Day 2 has not been rewritten yet; this note says what has to change so it doesn't repeat day 1. GUIDE: "Day 2 must not repeat day 1 (the old day-2 copier and Rei scenes get replaced, not overlapped)."

## What the current `content/day2.js` does that day 1 now does
| Old day-2 scene | Overlap with the new day 1 |
|---|---|
| `day2_morning`: Emi messages "make ten copies of the handout", Mio messages "the B1 copier is broken again", the player pins time/place/thing | Day 1 is built around exactly this job: ten copies, the broken B1 copier, a meeting. |
| `day2_copyroom`: Aoi can't make the copier work; the player casts 動いて on it | Day 1's copy room is the first spell, on the same machine, with the te-form. Casting to "get the copier working" a second day in a row is the same beat. |
| `day2_meeting`: Rei attacks Planning 7's proposal in the meeting | Day 1 already has Emi's 11:00 meeting and Rei stalling it. Day 2's meeting would retell it. |
| `day2_evening`: Rei's message 「明日、ちょっと話がある。」 and "You never gave her your contact" | Day 1 now ends with Rei's 「今日の、あれ。何？」 when she felt the spell. Day 2 has to pick that thread up, not open a second one. |
| `day2_morning` scene `dorm` | Fine, but the dorm is now established on day 1 (room 203, the wall). Day 2's morning should use that room, not describe it fresh. |

Also: day 2 introduces the canteen (Kaori), rooftop (Goro) and bar (Jun). That's intended by GUIDE, so those scenes can stay in spirit, but their lines assume the player had lunch on day 1 (e.g. Kaori and Mio "again"). Check each.

## What the replacement should do instead
- Pick up day 1's consequences: Rei's message (if she felt it), the salesman who saw (flag `salesWitness`), Mio's 「……今は。」 (flag `mioSaw`), Ishibashi if the player was casual (`casualGuard`), the ninety spare copies (`copies100`), crooked copies (`crooked`).
- A new place and a new kind of problem for the spell. The copier can return later with a different fault (toner, double-sided, someone else's job stuck in memory) and a new form, but not on day 2.
- Introduce one new form at most (candidates from day1-design.md: 〜ないで for preventing).
- Canteen, rooftop and bar as the day's new places, one mechanic at a time.
- No deadlines or clock fail states, same as day 1.

## Mechanics to carry over from day 1
Voice marks per day (day 1 has 5), hidden noise, per-person suspicion flags, the per-kanji text rendering and the player profile from the level check. The old day-2 script still uses a single `suspicion` number and `witnesses: 'auto'` with Aoi; those should move to the new model.

Until the rewrite, day 2 can still be reached from day 1's summary, and it will feel repetitive.
