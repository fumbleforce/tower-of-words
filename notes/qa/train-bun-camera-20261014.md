# Train shopping-bag camera

Supporting visual correction #586, for the opening acceptance check on #436. This changes the desktop close-up angle. The train geometry, dialogue, timing and phone camera stay as they are.

## Staging

The woman with the bun thanks Eric after they close her shopping bag. Eric stands on the carriage floor beside her bench. She sits at x -0.75, z 0.96. The bag is at x -0.31, z 0.60, and Eric finishes beside it at about x -0.33, z 0.24.

The desktop camera looks down the aisle from the car's left end, at 58 degrees above the floor. Its existing 20-degree lens and close-up distance remain. The held frame targets (-0.75, 0.45, 0.96), with the camera near (-4.50, 8.82, 4.60). The additional horizontal angle is -0.8 radians. Both the angle and the existing target and distance ease in and out.

The near bench and its end poles are in the foreground. Eric, the bag and the seated woman are in the middle. The opposite bench and its passengers are behind them. Eric faces the bag and then the woman. She looks toward him. Warm daylight enters through the windows. The near wall keeps its existing cutaway. The physical check is whether a grab pole crosses Eric's face or torso while the line is held.

The original wide view returns after the conversation, as the goal asks Eric to find his seat. Nearby poles remain ordinary world geometry in that walking view. The phone keeps the existing view along the carriage. Continue derives the authored angle from the saved close-up target, with no new save field.

## Attempts and checks

All native attempts are retained under `game3d/shots/swimming-feedback/train-camera/` in the main checkout. Attempts 1 and 2 used real Start and the visible woman-with-a-bun pin at 2560 by 1440 and 390 by 844. Attempt 1 used -0.38 radians and still put a pole along Eric's shoulder. Its capture script later failed by clicking underneath the dialogue input overlay. Attempt 2 used -0.8 radians and completed the authored interaction and release at both sizes. Its telemetry ends before the release, so its screenshot sequence alone records that phase.

The focused unit check builds the actual carriage poles, checks Eric's held sightlines, exercises smooth rotation and ordinary-angle recovery, reconstructs the saved shot, and verifies the unchanged phone direction. Full-day and authored-route checks belong to the parent's combined integration with #584.


Attempt 3 was cancelled in the GPU queue before Chromium launched, so the final harness could install the shared public-only request guard before navigation and force the public build flavor. Attempt 4 completed Start, the authored bag action and release at both sizes, then failed in the capture script after choosing Continue: its predicate read the dialogue element during the page reload, while that element was absent. All 46 pictures from that attempt remain in the evidence folder.

Attempt 5 uses the null-safe predicate and passes at both sizes, including the real Quick save slot under Continue. The saved close-up object matches after restoring. The desktop camera differs by 0.000000427 units, the phone by 0.000000543. Restored head and torso sightlines are clear of carriage poles and remain in frame. The desktop trace has 1,525 samples, including 686 while the line is held; the phone has 762, including 178 held. No held head or torso center ray hits a pole. These samples describe the authored line, with separate transition and ordinary walking frames retained. They do not measure frame rate or establish animation smoothness.

Both final browser jobs exited 0 with no page or request-scope errors and released their slots. The reports and final pictures are `desktop-attempt-5/report.json`, `phone-attempt-5/report.json` and each folder's `06-continued.png`. The root's critic and combined day checks remain the integration gates. Source review cleared runtime commit `f44b91a5b` and the Continue assertions in `50029d199`; `d5c46b1fb` preserves exit 75 for GPU or load deferral. Full CPU and staged CPU checks pass, with 1,354 unit tests.
