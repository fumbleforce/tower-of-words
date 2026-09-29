# Handoff: state at 2026-09-29 morning (for a fresh start)

Read GUIDE.md first. The game is game3d/ (day 1: train, gate and lobby, lift, B2 office). The local hub is `./start`, then http://127.0.0.1:8771/ (game, bible with the Review queue, the asset gallery, the notes).

## Where things stand

- **Live build:** 0928-2104-64a04d8. 58 local commits aren't pushed, because GitHub secret scanning blocks the push on a false positive: a 32-letter class name in game3d/vendor/transformers/transformers.min.js, commit 2ac4423. The file is gone from HEAD but still in history. Allow it at https://github.com/fumbleforce/tower-of-words/security/secret-scanning/unblock-secret/3JyYwvIygj8PLLOj0LJkQSF1m2h ("false positive"), then push with `game3d/tools/push.sh`.
- **Weekly usage:** about 35% at 08:00 on 29 Sep; the week resets on 2 Oct at 07:00. tools/usage.py estimates it from local logs, calibrated with two /usage readings in tools/usage.json.

## Done and committed (local main)

- **Opening, from notes/ONBOARDING.md:**
  - controls first, then talking, then the first goal
  - the train isn't on rails: the player starts each Mio chunk, and the train pulls in when Eric walks to the doors
  - the lunch-bag catch
  - the restaged kotodama doors moment, with a close-up and freeze
- **Dialogue and UI:**
  - the Stage-light overlay, portraits at one scale cut at the waist, per-line expressions
  - the whole screen clicks to continue, with "Press Space or click this area to continue"
  - play buttons on taught words; words repeated slowly
  - a compact Say menu on Q with icons; one action menu per target
  - a hover and target outline, the goal chip and edge arrow
  - no timers anywhere
  - UI scaling for QHD, settings, pause, 3 save slots, loading, the end-of-day card
- **Movement** (feel agent, cd66389 and earlier):
  - a smooth walker, routed NPC walks, avoidance, approach spots, capsule tap picking
  - calm idles, standOut
  - a movement check in the fast test: 0 overlaps, 0 spins at the last run
- **The walk-in lift** (js/places/lift.js): the ride seen from inside, the dim lobby, the countdown, the Sales pair at 5.
- **Voice input:** Whisper in the browser on computers and Moonshine on phones; a word must be typed or said 3 times before the Say menu lets you click it. It's wired into Settings, the typing prompt and the Say menu.
- **Relationship system** (js/bonds/, js/sim.js):
  - steps 0–5 gated on scenes, with caps
  - remember, fact and relate hooks
  - NPC relations and ambient moments
  - People panel data
  - day-1 moments recorded
  - tests
- **World:**
  - the look pass (post.js, quality tiers)
  - closed train cars for outside shots, flush doors, the server door on its hinge
  - the doubled floor tiles fixed
  - signs with English
- **Characters:**
  - the Meshy Eric and Mio (colour tweaks only), with the phone pose
  - the chibis recoloured to match their portraits, the curled cat
  - Eric's calm idle; the player can be seated (53a55bb)
- **Voices:** all lines in the local Qwen3 voices; Eric is design eric-2, English, no accent.
- **Tools:**
  - the review queue (reviews/, tools/review.py, tools/review_server.py)
  - the asset gallery (tools/assets/)
  - the live bible (bible/, not in git)
  - the QA scripts (game3d/qa/)
  - the fast test (game3d/tools/fast.mjs; uses the GPU when its lock is free)
  - portrait tools (tools/portrait_candidates.py, tools/matte_refine.py)
  - the creator experiment (tools/creator/)

## Known broken or unfinished

1. **Seating Eric on the gate bench (QA 22) is backed out** (306b7d3).
   - The builder's H.sit/H.stand change caused the phone softlock at "Take the lift down to B2" (no goal marker).
   - Without it, HEAD passes: phone in 64 s on the GPU.
   - The last full checks, on cd66389, were phone, desktop social and desktop magic. All passed with 0 overlaps and 0 spins, and the movement check fails on any overlap again.
   - Desktop hasn't been re-run on the newest HEAD.
   - To redo: find why standing Eric up at the bench breaks the past_gate/gate_through step.
2. **Performance:** the perf pass is committed (e1ef56a, game3d/js/perf/batch.js) but not wired in yet.
   - **Wiring needed in main.js:**
     - add `import { optimizePlace } from './perf/batch.js';`
     - in `prepare()`, after `place.name = name;`, add `optimizePlace(place, { game });`
     - after the hoverRay line, add `hoverRay.layers.enable(31);`
     - add js/perf/batch.js to build.json
   - **Measured on the phone profile:**
     - draw calls: train 1,643 → 692, gate 1,296 → 496, office 1,720 → 392
     - fps: 70 → 105, 105 → 176, 69 → 142
     - perf.mjs had been counting two frames, so the earlier figures in PERF.md were about double
   - **Open:**
     - a kitchen tray shows slight z-fighting when merged
     - people's parts could be merged too
     - the OutlinePass adds a pass
     - still over the 250 budget
     - `?nobatch` turns the pass off
   - Details are in notes/PERF.md.
3. **QA round 1** (notes/QA-ROUND-1.md): about 20 of 31 items are fixed. Still open: 24 (props for the empty middle of the lobby and the copy room), 25 (one taught form per word), 31 (perf), and whatever round 2 finds. Nothing has been re-scored since the fixes.
4. **Movement checks at human pace:**
   - human.mjs at 1366 passes on cd66389, with no GAVE UP.
   - At 390, the driver kept hitting the reader next to Mio. That's fixed in 87e4919, but the rerun at 390 hasn't been done.
   - Known issues:
     - step-aside can shift Eric up to about 1.4 m in a crowd
     - QA 9: "Sit down" has no seat marked (story/world)
   - not started: QA 24 (props for the lobby and copy room) and QA 25 (one taught form per word)
     - the lift exit crossing is fixed in 29ae650; recheck it
5. **bench_r's seat point** sits between two cushions (world data).

## Waiting on Jørgen (bible, Review)

- eric-portrait-ancient: is the A-mc gallery set the "ancient" Eric?
- kenji-concept-2: five at-work directions.
- mio-phone: her looking-at-phone portrait.
- style-avenues: eight texture directions, as text.
- voice-input-ui: the mic row, and whether 3 practices is right.
- creator-parts: keep going, clothes only, or stop.
- Also: whether bible/ goes into git; Supabase and the asset storage (deferred); the six remaining walkthroughs (only Mio and Mori are written).

## Lessons from this run (for how to work next time)

- **Test runs were the bottleneck.** Headless Chrome on software GL took 5–10 minutes a run through one browser lock, and agents queued for hours. Tests now use the GPU when its lock is free. Keep 2–3 agents at most, and give each a concrete deliverable and a deadline.
- **Agents left polling loops running.** 41 `until …; sleep` loops were found after hours. Forbid them in every brief, and check `pgrep -fc "zsh -c"` at each heartbeat.
- **Heartbeats must check output,** meaning commits and test results, not just log status.
- **The usage estimate** needs a fresh /usage reading each session.
