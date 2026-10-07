# Selected character size as the default

Work #322. Jørgen selected `carina13-390-85` in [character-scale-1](../reviews/character-scale-1/review.json), with “yeah looks good”, on 2026-10-07. The runtime default is now 0.85; `charscale=100`, `85` and `67` remain temporary comparison URLs. The default also applies when loading existing saves because character scale was never persisted.

## Scale and contact contract

The existing shared multiplier acts during Meshy/chibi model construction, before stride and seat measurements. Both protagonists, the separately loaded Mio, named Meshy cast, approved office crowds, optional generated chibis and procedural fallback bodies already use those constructors. Relative heights remain intact. Pool outfit construction uses the same Meshy constructor and retains each actor's world root.

World roots, place scale, walking/running speeds, navigation, furniture and animals retain their existing units. Native checks report walking speed 1.43 at all four inspected places. Keeping the existing navigation envelopes is conservative for smaller people; it avoids changing route clearance or scripted distances. Person markers follow the current head; fallback markers include their own root scale. Native phone/desktop gait checks include both protagonists, Mio and visible approved office commuters.

The full CPU suite exposed one real contact regression: the canteen worker's hand missed the tray's final grip by 9.3 cm. Delivery now derives its final approach from the larger of the scripted-root radius and live `bodies(game)` collision radius, plus the existing service surface's rear edge, leaving 1 cm clearance. The test exercises both 85% and 100% bodies, checks that the capsule stays behind the surface and tightens the hand contact bound from 8 cm to 2.5 cm. It does not change the tray, counter, meal or arm proportions.

The smaller Meshy arms also exposed fixed-world carry and reach targets. Their carry height and forward distance now use the same body multiplier; the procedural worker keeps its own rigid-arm carry pose. Pickup/placement grips stay on the existing tray rim, 5 cm inside the previous corners. The cash target moves 3 cm sideways and 4 cm towards the diner while remaining on the service surface. Collection uses the existing payment approach, and the water approach moves 6 cm sideways and 9 cm closer; collision/navigation still decides the actual stopping point. The existing dispenser lever is 7 cm lower on its front face. The tray, furniture, cup, spoon and skeleton sizes stay unchanged.

Final native canteen runs exercise payment, staff delivery, collection/carry, seating, eating, tray return, filling, dispensing, sipping and cup return. Default 85% Eric desktop and Carina phone pass all 25 measured contacts with over 4,900 worker capsule samples each; explicit 100% Carina also passes the full sequence. Native wrist-to-target bounds remain 8 cm (the hand geometry extends beyond the wrist), neutral mouth/lip bounds remain 3 cm, and neutral head movement remains under 2 cm. The new side-camera captures expose the palms and tray rim; some delayed captures show the settled pose immediately after contact and are captioned accordingly. These checks do not claim a new canteen art direction or a redesign of its existing action camera.

## Carina seating measurement (#323)

The earlier trial reported a 4.1 cm gap even at 100%. Its probe reused `sitHip`, measured before the holder moved horizontally into its seated position. That selected a different part of the thighs after the shift. The corrected probe reads the current hips bone in the root's coordinates. Actual 100% and default 85% Carina canteen contact both measure about 9.44 mm into the cushion. No seating runtime correction was needed. Both the failed original measurement and corrected native comparisons are retained.

## Evidence and attempts

All original captures are under `game3d/shots/character-scale/`, `game3d/shots/gait/` and `game3d/shots/canteen-meals/`; full routes use unique `game3d/shots/fast/` runs. The Showcase preserves every attempt, including failed diagnostic frames.

- `default1-eric-1366`: exact 100% versus no-query 85% comparison at the dorm, bicycle street and canteen; 1.416 to 1.2036 standing-height calibration, unchanged camera and cushion contact.
- `default1-carina-390`: old probe reproduces the 100% false seat-gap failure.
- `default2-carina-390`: corrected hips probe passes both sizes, 1.3216 to 1.12336 height calibration.
- `contacts1-*`: initial contact probe sampled before a rendered skeleton update; Eric falsely exceeded 3 cm, and the first custom close cameras were unsuitable for some places. These are diagnostic attempts, not accepted contact evidence.
- `contacts2-*`: sampling after a frame gives contact near -9.5 mm at office/train/canteen/pool. Cameras still showed overhead or obstructed angles in several places.
- `contacts3-*`: explicit diagnostic cameras show actual seated bodies on those four pieces of furniture, Carina desktop and Eric phone. These cameras do not replace the game camera or claim new scene staging.
- Four `scale-default1` gait runs cover Eric and Carina walking/running across desktop and phone. No sustained gait failures. Typical foot/ground-speed medians remain close to 1.
- Full day-one magic routes pass in 72 seconds on Eric desktop and Carina phone with no warning overrides; no sustained gait errors. Stored performance baselines produce warnings, so this is not a hardware-phone benchmark.
- `grip-baseline*`: separate investigation of the reported crowd bags. Actual 100% approved crowd bags have their tops 0.24–0.30 units above the wrist. The shared bag mount offsets its origin above the hand despite shallower handle geometry. This predates the size change and is tracked separately by the coordinator; no bag fix is included here.

- `scale85-delivery1-*`: original native contacts failed at collection and water; retained unchanged.
- `scale85-delivery2-*`: water corrections pass, but carry and Carina payment/return still failed.
- `scale85-delivery3-*`: Eric passed after carry correction; Carina exposed the remaining payment and rim-reach limitations.
- `scale85-delivery4-390` and `scale100-delivery4-390`: final Carina 85% and 100% contacts pass.
- `scale85-final5-*`: final default85 desktop/phone pass, with original action framing plus separate diagnostic side views.
- Final day-one routes pass in 73 seconds on Eric desktop and 72 seconds on Carina phone, no warning overrides. Full captures are retained in the 12:56 and 12:57 fast runs.

The initial CPU run passed 658/659 tests; its canteen contact failure led to the physical approach correction. Final broad CPU passed 660/660 tests and all gates except one new diagnostic-helper lint finding (`localStorage` needed `globalThis`). That was corrected and the final lint pass covers 1,435 files. The independent reviewer requested a clear actual return-contact frame and the live crowd envelope in the staff trace. `scale85-return6-*` retained the first occluded diagnostic side; `scale85-return8-*` freezes the real action at its contact wait before release and shows the hand at the tray rim from the correct side (Eric 5.89 cm and Carina 6.94 cm wrist-target gaps). This only pauses the diagnostic action; it does not replace game staging.

At 85%, the worker's scripted-root radius is 0.276828 while its `bodies(game)` envelope is 0.2832. The final approach now uses the larger radius, moving the previous endpoint back 6.4 mm to maintain a full 1 cm clearance for both contracts. The native trace records both values and asserts against their maximum throughout the route. `scale85-radius7-1366` and `scale100-radius7-390` pass all 8 delivery contacts and 1,462/1,430 samples, with staff final hand gaps 2.18/2.50 cm. The two-size unit handoff bound remains 2.5 cm. Independent review passed the source and measured contacts, with a scoped visual assessment of 8/10. The coordinator then individually inspected all 25 acceptance frames, including both new held-return views, and reviewed the final live-radius correction; neither follow-up had a blocking finding. This closes the reviewer’s two evidence limitations without claiming whole-scene art approval, every story transition or hardware-phone performance. This change does not claim every story handoff or all pre-existing crowd props have been restaged.
