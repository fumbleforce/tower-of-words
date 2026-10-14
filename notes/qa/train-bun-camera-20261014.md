# Train shopping-bag camera

Supporting visual correction #586, for the opening acceptance check on #436. This changes the desktop close-up angle. The train geometry, dialogue, timing and phone camera stay as they are.

## Staging

The woman with the bun thanks Eric after they close her shopping bag. Both stand or sit on the carriage floor. She sits at x -0.75, z 0.96. The bag is at x -0.31, z 0.60, and Eric finishes beside it at about x -0.33, z 0.24.

The desktop camera looks down the aisle from the car's left end, at 58 degrees above the floor. Its existing 20-degree lens and close-up distance remain. The held frame targets (-0.75, 0.45, 0.96), with the camera near (-4.50, 8.82, 4.60). The additional horizontal angle is -0.8 radians. Both the angle and the existing target and distance ease in and out.

The near bench and its end poles are in the foreground. Eric, the bag and the seated woman are in the middle. The opposite bench and its passengers are behind them. Eric faces the bag and then the woman. She looks toward him. Warm daylight enters through the windows. The near wall keeps its existing cutaway. The physical check is whether a grab pole crosses Eric's face or torso while the line is held.

The original wide view returns after the conversation, as the goal asks Eric to find his seat. Nearby poles remain ordinary world geometry in that walking view. The phone keeps the existing view along the carriage. Continue derives the authored angle from the saved close-up target, with no new save field.

## Attempts and checks

All native attempts are retained under `game3d/shots/swimming-feedback/train-camera/` in the main checkout. Attempts 1 and 2 used real Start and the visible woman-with-a-bun pin at 2560 by 1440 and 390 by 844. Attempt 1 used -0.38 radians and still put a pole along Eric's shoulder. Its capture script later failed by clicking underneath the dialogue input overlay. Attempt 2 used -0.8 radians and completed the authored interaction and release at both sizes. Its telemetry ends before the release, so its screenshot sequence alone records that phase.

The focused unit check builds the actual carriage poles, checks Eric's held sightlines, exercises smooth rotation and ordinary-angle recovery, reconstructs the saved shot, and verifies the unchanged phone direction. Full-day and authored-route checks belong to the parent's combined integration with #584.
