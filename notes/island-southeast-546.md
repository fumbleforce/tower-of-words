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

Full CPU `npm run check` passes after the spot catalog, structural snapshot and coastal-sea/camera changes. The subsequent terrace-bed and approach-pose adjustments pass the focused runtime-consumer and declaration-baseline checks. All 14 desktop walking targets pass within 3.7 cm and bench sit/stand succeeds. The first native jump attempt reaches the stone too late and collides with its face; that attempt is retained in `routes-attempt1/`. A proper running approach is being checked before handoff.

The first isolated performance attempt was cancelled cleanly when the visual rejection arrived; no numbers from it are claimed. Final performance and both whole-day checks remain required. East-coast perches will be refreshed against the integrated apartment-roof and landscape candidate, so the survey uses the final geometry.
