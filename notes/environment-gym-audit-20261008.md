# Current gym interior audit

The gym's recovered lobby/hall layout remains readable. Its equipment-store approach was obstructed by a ball cart; the separate correction is integrated in `8463ed89`. Window and fixture detail remains queued in [#351](https://github.com/fumbleforce/tower-of-words/issues/351).

Root and independent reviewer `review_rollout` inspected all 14 original baseline PNGs on main `143378d1` on 2026-10-08: seven native views at 1366 × 860 and 390 × 844. Captures use actual scripted walking with the existing camera; arrival includes the fading startup wordmark. Both public-only contexts report no page errors. This was an inspection run, not an interaction or full-day acceptance test.

High windows are shallow applied emissive rectangles; three equipment carts lack enclosing rails, mesh and grounded wheels; the bib shelf is a solid box and shoe cubbies are painted rectangles. Prioritize physical depth and support in these existing fixtures, then restrained counter, bench, chair and whiteboard joinery. Preserve the open floor, furniture footprints, seats and activities. Oblique close-ups are needed alongside native views to validate depth and support.

The original `gym_store` target, (-7.95, -11.5), was inside the cart's navigation blocker. Both sizes stopped 0.473 m away. The corrected target, (-7.95, -10.8), is just inside the doorway before the carts. Actual native approach gaps are now 0.0273 m desktop and 0.0257 m phone; both return to the lobby. Root and the independent reviewer inspected all four correction originals. CPU checks, strict day-one routes at both sizes and landed title checks pass. Furniture and collision geometry are unchanged.

[Baseline, correction and day-test originals](../showcase/gym-store-approach-20261008/entry.json) retain the full evidence. The queued fixture pass must preserve this reachable destination.
