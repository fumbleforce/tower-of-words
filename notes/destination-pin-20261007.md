# Destination pin and HUD clearance

Issue #332. The destination arrow could overlap the objective on a wide screen or with enlarged UI. Its edge search used a fixed desktop y coordinate; the scaled top HUD covered that entire horizontal search line, leaving no clear candidate.

The arrow now starts below the rendered top HUD bounds, with half its own height and eight pixels of clearance. The existing nearest-clear-position search, target click, visibility rules and direction calculation stay intact. Resizing, UI size changes and wrapped hints are measured each frame.

Native evidence is in `game3d/shots/destination-pin/` and Showcase `destination-pin-20261007`:

- `baseline1`: 15 stock-camera diagnostics. No overlaps; this did not reproduce the reported top-edge case.
- `baseline2`: 15 diagnostics using the street trial's native overview lens with stock forecourt geometry. Three objective/top-HUD overlaps: 2560 at normal and enlarged UI, and 1366 at enlarged UI.
- `round1`: 20 diagnostics across 2560×1440 and 1366×860 at UI multipliers 1 and 1.4, plus 390×844. Same live browser resized between cases; native F3 performance overlay and an expanded wrapping hint included. Eighteen visible arrows, zero overlaps with the objective, top bar, minimap or performance overlay; direction agrees with projected destination within .003 radians. Two ordinary-desktop cases keep the world goal in view, so no edge arrow is expected. No page errors.

The captures deliberately retain stock environment geometry and diagnostic positioning. This is evidence for HUD clearance, not approval of the older surroundings or crowd. The test hint uses the normal UI method to exercise wrapping; it is not authored story content.

- `directions1`: ten additional diagnostics exposed a checker mismatch: the authored ticket forced a second goal, so the direction assertion compared the displayed office arrow with the station. All HUD intersections were clear; the failed run is retained.
- `directions2`: the checker isolates each existing exit as the goal. Ten office/plaza cases pass with mirrored right-edge labels, the F3 panel and all other HUD bounds clear; direction error stays below .004 radians. Runtime source is unchanged.

`npm run check` passes all gates and 653 tests. The full day route passes at 1366×860 and 390×844 in 72 seconds each, with no overrides. Earlier full-fast starts were cancelled when their legacy harness lacked protected-route interception; the completed reruns use the explicit public-only browser loader. Native checks install public-only interception before navigation.

Independent source and visual review found no blocker and scored the bounded destination/HUD behavior 8/10 after viewing all 20 round1 frames and the three reproduced failures. The report is preserved with the original captures under `game3d/shots/destination-pin/logs/`. All 70 native diagnostic images, including unsuccessful attempts, are in the Showcase entry and uploaded as lossless WebPs.
