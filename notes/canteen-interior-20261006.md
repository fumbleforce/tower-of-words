# Canteen ground-floor verification

The implementation and place facts live in [places.md](../docs/game/places.md#canteen-canteen). Work: #279. Source review: `model_review`; corrected its seated-save finding before final verification. Its final visual verdict is 8/10 at both sizes for the existing-kit interior, including service/evening views; root independently accepted both day/evening pairs. The canteen uses the existing room/material and ambient-person helpers; no new dialogue, voice or generated assets.

## Checks

- Full CPU gate passed before rebase. The commit gate validates the exact staged tree after rebase onto exterior commit `b25d70f6`.
- Full day-1 fast routes: desktop 1366×860 PASS in 81 seconds (12,636 movement steps), phone 390×844 PASS in 82 seconds (12,714 steps); zero overlaps and spins, no test overrides.
- `game3d/tools/canteen-check.mjs`: 12/12 checks at each size. Starts at the plaza's normal arrival position and uses the normal navigator, then native pointer/touch door and seat interactions; it never assigns the player's position. Both real chairs were quick-saved, loaded through the title's Continue/save picker, checked for their actual chair pose and safe stand-up, then left by clicking the floor. Service approaches, evening lighting, facade-door return and daylight restoration on re-entry passed. Zero page errors.
- Renderer: ANGLE, NVIDIA GeForce RTX 3080, Vulkan 1.4.341. These are hardware render checks; concurrent full-route timings are not a performance comparison.
- Public-only bible check: 253 routes and 4,979 distinct links, images and audio; all resolve. Six Showcase images uploaded through the asset sync API and HEAD-verified; the lock changes only those six entries.
- Four unit tests cover the actual furnished nav, facade-door alignment, reversible lighting, days 1–5 travel, both valid saved chairs and a stale-chair fallback through the real save helper.
- The inherited dorm triangle warning remains. Concurrent phone full-route samples also warned on train triangles and dorm-court frame time; no budgets were raised or content hidden.

Final native reports and captures are preserved in `game3d/shots/canteen-interior/`, with `preserved-hashes.json`; source logs are copied there. The six Showcase PNGs are backed by the asset lock under `bible/shots/showcase/canteen-interior-1/`.

The canteen's day/night transition in the focused test uses the existing period API to exercise one reused room. Normal entry, seating, save/load and exit use actual player UI. Days 2–5 registration is covered by the story/route tests; the native full-day route is day 1. Food ordering, a kitchen visit and upper floors are not implemented.
