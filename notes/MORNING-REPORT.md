# Morning report (2026-09-29)

## First: one click needed

**Nothing new is live yet.** GitHub's secret scanner blocks the push. It flags a "Mistral API key" in the speech library (transformers.min.js), but the match is really a 32-letter class name like `BlenderbotForConditionalGenerati`, so it's a false positive. The file has since been removed and now loads from the CDN, but it's still in one commit, and I don't rewrite history.

**Allow it here:** https://github.com/fumbleforce/tower-of-words/security/secret-scanning/unblock-secret/3JyYwvIygj8PLLOj0LJkQSF1m2h

Then tell me, and the builder pushes build **0929-0419-8a1cf62**: 53 commits, passing both gate routes and phone. Live is still **0928-2104-64a04d8**.

Until then you can play the new build locally: run `./start`, then open http://127.0.0.1:8771/game3d/.

## What changed overnight

- **Opening:** built from the onboarding study (notes/ONBOARDING.md):
  - The game starts with only the controls line. Talking is taught once you've moved, and the first goal comes only after you've talked to someone.
  - The train isn't on rails any more: you start each Mio conversation yourself, and the train pulls in when you walk to the doors.
  - The whole dialogue area is clickable, with "Press Space or click this area to continue", no flicker, and play buttons on taught words.
- **Movement** (from your playtest):
  - Update: 0 overlaps and 0 spins at the final check.
  - No more spinning or twisting.
  - People step round each other, and Eric stops in front of people instead of on them.
  - Taps pick the right person.
  - A movement check in the test fails the build on overlaps. 1–4 small ones are left in train scenes and are being fixed.
- **Lift:** a room you walk into. You see Eric inside for the whole ride; the lobby dims, the display counts down to B2, and the Sales pair get off at 5.
- **Voice input:** say a word into the mic instead of typing it. It runs on your device (Whisper on computers, Moonshine on phones). On our clips it recognised 92% of words. A word needs 3 practices before the Say menu lets you just click it.
- **Relationships system** (reusable for later days):
  - bond steps 0–5 gated on scenes, with daily caps
  - characters remember what Eric did
  - facts, likes and gifts
  - NPC-to-NPC relations and moments
  - People panel data
  - every day-1 moment recorded
- **QA round 1:** fresh critics and a cold player. Nothing reached 8 yet; scores were 3–7 (notes/QA-ROUND-1.md). The blocker (you couldn't walk back to Mio) and about 20 of the 31 items are fixed. Round 2 is due after the push.
- **Your notes, all done:**
  - flush train doors and closed cars
  - a server door that swings on its hinge
  - no more doubled floor tiles
  - "repair request" in place of "ticket"
  - Kenji at 21
  - Hamada kept
  - Mio's phone state
  - hover highlight and Q for Say
  - no timers anywhere
- **New tools:**
  - the Review queue in the bible (http://127.0.0.1:8771/bible/#review)
  - an asset gallery with 856 assets (http://127.0.0.1:8771/tools/assets/)
  - the live bible
  - `./start`
  - the usage estimate

## Waiting for you in Review (6)

1. **eric-portrait-ancient:** is the A-mc set the "ancient" Eric you meant?
2. **kenji-concept-2:** five at-work directions.
3. **mio-phone:** her looking-at-phone portrait.
4. **style-avenues:** eight texture directions, as text. Tick the ones to try.
5. **voice-input-ui:** the mic row, and whether 3 practices is right.
6. **creator-parts:** clothes swaps work, hair swaps are rough. Keep going, clothes only, or stop?

## Not done, and why

- **Performance:** the game draws about 10 times too much per frame for phones (about 3,000 draw calls against a budget of 250). The perf agent is still working on it.
- **QA 24 and 25:** props for the empty middle of the lobby and the copy room, and one taught form per word. These need art or language decisions.
- **Mori in 3D:** parked, as you asked.
- **Usage:** about 18% of the week, well under the 50% stop.

## Play first

The first five minutes of the train, then the lift. Those changed most.
