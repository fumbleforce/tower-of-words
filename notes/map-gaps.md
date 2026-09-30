# Map gaps: the built day-1 places against island-map-4

Where the built places disagree with the picked island map (reviews/island-map-4), as of 2026-09-30, build d2c8515 (after upgrade tasks A to F; numbers from map-shots.mjs's gaps.json). One line per gap. Coordinates are island units (1 unit = 1.5 m; x east, z south, origin the head office door as the map draws it), from game3d/js/scenes/island-layout.js; "off" is the distance between the built thing and the same thing on the map.

To see them: `?map=1` then M (or `?mapcompare=1`), "Compare with island-map-4", "As drawn" for the original picture. PNGs: `BASE=<worktree>/game3d node game3d/tools/map-shots.mjs` (writes game3d/shots/map/<time>/ and gaps.json). Upgrade tasks quote the lines they close.

## Frame and scale

- F1. The scale is pinned by the station: the gate room (12.6 wide) is as long as the station the map draws. At that scale the map puts the head office door 15 east of the station's middle, the fountain 37.6 east-south-east of the door, and the dorm entrance 47.9 east-south-east of the fountain. The plan's first guesses (notes/map-upgrade-plan.md section 1) were 10 east and 7 north, about 50, and about 85.
- F2. Partly closed (tasks C, E): the map's town grid is drawn turned about 23° (the tower's south face and the shop street run east-south-east), and the built tower and shop street follow it. Still open: the station (H7) and Eric's dorm block (D2) are square to their chunks, where the map turns the dorm blocks 30 to 50°.
- F3. Open, smaller: the crossfaded walks skip ground the map has: forecourt to plaza skips 36.5 units (was 41.7; office_e1, the trees east of the tower, the canteen's south side), plaza to dorm courtyard 24.4 (was 35.2; block_e1, the east shops).
- F4. Traced by eye from roof outlines, so layout buildings can be a unit or two out; the map's own proportions are loose (its football pitch comes out 35 units, about 53 m).

## Station forecourt and head office (`forecourt`)

- H1. Closed 2026-09-30 (map upgrade task C): the lift stands in the lobby of a real head office (scenes/head-office.js), its lid in the lift core's top colour; no background-coloured roof is left.
- H2. Closed 2026-09-30 (task C): the tower is built from the layout's head_office (14.8 by 8.6, 12 storeys, turned 23°; 0.1 off the map), and the skyline draws head_office_wing from the layout.
- H3. Mostly closed 2026-09-30 (task C; 4.6 off on the latest run): head office is east of the station. The tower is 0.1 off; the door is 4.6 off, because the map draws the door about 4.5 south of the traced south face and the door is built in that face.
- H4. Closed 2026-09-30 (map upgrade task D): the court is the paving between the station and the head office door, its bike court east of the station where the layout's court is (built x 5.8..12.8, z 2.65..10.6 local; the layout's court 5.8..14.6, 2.2..11.2); the shed stands west of it.
- H5. The station exit faces north because the gate room stays as built (gate-location); the map brief has it facing east toward the head office. Open question in the upgrade plan.
- H6. Closed 2026-09-30 (task D): the station is a two-storey flat-roofed block over the whole gate room (scenes/station-exterior.js), with parapet, roof plant, the exit canopy, the staff door, the room's side windows and glass front; above the cut-low height it fades only while Eric is just outside its north door.
- H7. Accepted (task D): the station is built on the gate room's footprint, 12.6 by 9 and square to north, deeper than the map's 12 by 3 turned 23°, because the room can't change.
- H8. Closed 2026-09-30 (task D): the shed is built on the layout's centre line, 43 long and turned 22°, with an island platform on columns and two beams on piers, the beam arriving from the west at its south end. It is 1.3 west of the traced line and 7.2 wide instead of 9, so its roof clears the station's north-west corner (the traced outline overlaps the station).
- H9. Closed 2026-09-30 (task D): stairs at the platform's south end come down to a covered walkway that runs along the station's south side to its glass front.
- H10. Closed 2026-09-30 (task D): no road; grass and the walkway south of the station.
- H11. Closed 2026-09-30 (task D): two rows of ten racks (fifteen bikes) in the bike court, a short rack of three by the station's north-west corner.
- H12. Closed 2026-09-30 (tasks C and D): the forecourt's background is the layout's neighbours (buildSkyline) on the layout's ground; the old boxes and slab are gone.
- H13. Closed 2026-09-30 (task C): Kuro works the head office lobby reception; places.md and cast.md follow. Open: her lines are still the station ones until Codex rewrites them (C-0157).

## IT support, B2 (`office`)

- B1. Open. B2 is 14 by 12.8 and hangs under its lift: at island x -14.6..-0.6, z -13.4..-0.6, it lies under the court and the shed, west of where the map's tower stands (x -2.7..15.3). When the head office moves (H3), B2 moves with its lift; the tower is about 8.5 deep, so B2 still reaches about 4 units past it, under the court.

## Fountain plaza (`plaza`)

- P1. Closed 2026-09-30 (map upgrade task E): the round plaza is about 23 across and the basin about 8.6, the fountain on the map's (0.0 off).
- P2. Closed 2026-09-30 (task E): the canteen is two storeys north of the plaza with a blue-grey roof, plant and a six-umbrella terrace, 0.1 off the map's (built 39.6, -9.3).
- P3. Mostly closed 2026-09-30 (task E): two rows of two-storey shops face each other under one arcade, running east-south-east, the north row's backs to the lane. The shop street is 3.5 south of the map's (built 36.8, 33.9; map 36.8, 30.4).
- P4. Closed 2026-09-30 (task E): the lane runs along the plaza's south edge and bends east-south-east (route_home).
- P5. Closed 2026-09-30 (tasks B, E): the plaza's backdrop comes from the layout (buildSkyline), so it shows the same tower as the forecourt.
- P6. Closed 2026-09-30 (tasks B, E): the backdrop east of the plaza is the layout's block_e1; no dorm block stands at the plaza's edge.
- P7. Closed 2026-09-30 (task E): the clinic with its green cross stands north of the canteen, from the layout.

## Dorm courtyard (`dorm_court`)

- D1. Closed 2026-09-30 (map upgrade task F): the court is the open ground west of dorm_1, at (74, 30), its camera looking east; the dorm entrance is 0.1 off the map's.
- D2. Mostly closed 2026-09-30 (task F): Eric's block is five storeys, runs past both frame edges and returns forward on the court's east side (an L). Still square to the chunk where the map turns the blocks 30 to 50°, and 4.4 off dorm_1 (built 80.2, 30.4; map 84.0, 28.1).
- D3. Closed 2026-09-30 (tasks B, F): the rest of the cluster (dorm_2 to dorm_6, housing_n), the shops and the ground come from the layout (buildSkyline).
- D4. Open. The coin laundry and sento flank the hall in the game; the layout puts their shared frontage at the dorm approach south-west of the court (sento_laundry, from the brief; too small to read on the map).

## Eric's room (`dorms`)

- R1. Closed 2026-09-30 (task F): the room is placed in Eric's block above the passage and turns with the court; its window looks onto the next block's west end (dorm_1e in the layout), 1.3 out, as built.

## Not checked

- The monorail interior and the gate room are placed but not compared (no map detail inside them). The lift has no place of its own; it lives inside the forecourt and B2.
