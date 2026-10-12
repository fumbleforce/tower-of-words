# Southeast garden · #546

The southeast residential grounds now have a continuous public loop from the dorm row, through the existing pergola, along an open lawn, to a sea-facing rest court and back to the row square. Five low stone blocks offer an optional climbing line beside the lawn. Two benches, flower troughs, bins, drainage and lamps support ordinary use. The original terrace and its sea walk remain connected.

`COAST_GARDEN` in `island-dorms.js` supplies the map and navigation footprints. `east-coast/coast-garden.js` builds the landscape once through the dorm cluster, so its near and neighbouring views share their geometry. The garden uses existing paving, wall, planting, furniture and flowering-planter kit pieces. It adds no texture files. The lawn clears the dorm foundation strip and preserves the commons entrance, northern row/courts entrances, onsen path and original lookout and shrine.

## Evidence and attempts

Local ignored evidence lives in `game3d/shots/island-southeast/` on the main checkout. The source tools reproduce matching native desktop follow-camera (1366×860) and phone overview (390×844) views, morning and evening, with private mode off and public request guards.

- `before/`: 28 baseline screenshots covering approach, pergola, shore path, rest-court site, building join, terrace and horizon. Dense pine belts hide the south grounds and terrace; the garden has no southern path or rest court.
- `round1/`: initial startup attempt stopped before screenshots because the three new spots lacked catalog declarations. The catalog and declaration snapshot were corrected.
- `round1-attempt2/`: 28 screenshots, personally inspected. The new paths, lawn, seating and sea views work in desktop views. Phone shore and building-join views expose roof occlusion. These attempts are retained.
- `round2/`: 28 screenshots, personally inspected. The animated coastal sea and phone shore/building joins pass personal inspection. The phone approach remains behind a roof and the terrace pine still compresses the desktop camera to 1.29 m, fading the actor.
- `round3/`: 28 screenshots, personally inspected. The approach looks along the row from its clear eastern end. The terrace bed moves 0.65 m north and its pine is reduced from scale 1.25 to 0.9; the navigation block follows it. The existing district camera-lift option now keeps a 4.83 m camera arm and shows the actor. No shared camera code changes. All views retain clear actors and continuous paths; independent scoring follows.
- The coastal benches already face the sea: facing 0 is island +z/south. Actual `planting.glb` backrest vertices above y0.5 lie at local z−0.316..−0.229, while the seat projects toward +z. They remain in that correct orientation. Seated proof follows with route checks.

## Checks

The environment milestone is `ee36d8721`. Its full staged-snapshot CPU check and native title boot pass. Both whole-day fast tests pass without overrides: phone 73 s and desktop 84 s, with zero movement overlaps or spins.

`routes-final/` passes at both native formats: all 14 walking targets, real bench sit/stand, a held running jump onto the 0.42 m stone, and stable landing. It travels out and back through east lane, sports and commons using their existing trips. All six return landings are on free navigation ground. Sports retains gym and pool entries. Original lookout and shrine path endpoints are exact. No page or public-scope errors occur. The seated images show the sitter facing south toward the sea, with clear foot space between the bench and trough.

Failed jump timing attempts remain in `routes-attempt1/`, `routes-attempt2/` and `routes-jump-attempt3/`. The first reached the stone too late; the second cleared it and coasted beyond; the third stopped before its face. `routes-jump-attempt4/` is the first successful focused native landing at both sizes. The full final route subsequently reproduces it. These are test input adjustments; movement physics and the stones did not change.

`day2-continuity/` passes at both sizes with the existing after-shift flag fixture: Mr. Hamada becomes available at the original telescope, lookout and shrine routes remain connected, and the existing day-2 sports closure remains in force. These are focused continuity checks, separate from a full day-2 story run.

The independent critic and coordinator each inspected all 28 `round3/` images; every screen scores at least 8/10. The critic's initial bench-direction concern is resolved by actual model-coordinate evidence and the native seated proof.

The first isolated performance attempt was cancelled cleanly when the visual rejection arrived; no numbers from it are claimed. The coordinator will measure final combined geometry against the existing budgets. East-coast perches will be refreshed against that same integrated apartment-roof and landscape candidate, so the survey uses final geometry. All text logs are retained under `logs/` alongside the evidence; screenshots remain local and ignored.
