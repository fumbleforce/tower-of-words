# Map gaps: the built day-1 places against island-map-4

Where the built places disagree with the picked island map (reviews/island-map-4), as of 2026-09-30, after the frame was turned onto the town grid (claude-agent:grid-frame; numbers from map-shots.mjs's gaps.json). One line per gap. Coordinates are island units (1 unit = 1.5 m; x east and z south along the town's street grid, which the map draws turned 23° clockwise from its up; origin the head office door as the map draws it), from game3d/js/scenes/island-layout.js; "off" is the distance between the built thing and the same thing on the map.

To see them: `?map=1` then M (or `?mapcompare=1`), "Compare with island-map-4" (the straight-down picture, art/island/island-map-4-topdown.png, turned onto the grid), "As drawn" for the original picture. PNGs: `BASE=<worktree>/game3d node game3d/tools/map-shots.mjs` (writes game3d/shots/map/<time>/ and gaps.json). Upgrade tasks quote the lines they close.

## Frame and scale

- F1. The scale is pinned by the station: the gate room (12.6 wide) is as long as the station the map draws. At that scale the map puts the head office door 13.9 east and 5.9 north of the station's middle, the fountain 37.6 from the door, and the dorm entrance 47.9 beyond the fountain.
- F2. Closed 2026-09-30 (grid-frame): the frame's axes run along the map's town grid (REF.turn 23°), so every building in the layout is a rectangle on it, square to the cameras (Jørgen, 2026-09-30: "lol look at the lift, it sits at an angle inside the building, intersecting the wall"). The map's own drawing is loose: traced footprints run 0° to 25° off the grid (the tower is drawn square to the picture, the shops and offices 5 to 20° off it), and the dorm blocks east of Eric's are drawn 25 to 40° off; all of them are put on the grid, centres kept, sides on the nearest axis.
- F3. Open, smaller: the crossfaded walks skip ground the map has: forecourt to plaza 9.7 units (the corner south past the trees east of the tower), plaza to dorm courtyard 31.5 (north past the canteen's east side and east to the court, route_home).
- F4. Buildings are traced from the straight-down picture's footprints (art/candidates/island-map-4-topdown/buildings.json), so a unit or two out; the map's own proportions are loose (its football pitch comes out 35 units, about 53 m).

## Station forecourt and head office (`forecourt`)

- H1. Closed 2026-09-30 (map upgrade task C): the lift stands in the lobby of a real head office (scenes/head-office.js), its lid in the dark of the core's shafts where the core's top shows the cut; no background-coloured roof is left.
- H2. Closed 2026-09-30 (tasks C, grid-frame): the tower is built from the layout's head_office (16.4 by 9.6, 12 storeys, on the grid; 0.4 off the map), and the skyline draws head_office_wing west of it across the service lane.
- H3. Mostly closed (4.6 off): head office is north-east of the station across the court. The tower is 0.4 off; the door is 4.6 off, because the map draws the door about 4.5 south of the traced south face and the door is built in that face.
- H4. Closed 2026-09-30 (tasks D, grid-frame): the court is one paved rectangle between the station's north door and the tower's south face, the bike court south of it east of the station (layout court and bike_court).
- H5. The station exit faces north because the gate room stays as built (gate-location); the map brief has it facing east toward the head office. Open question in the upgrade plan.
- H6. Closed 2026-09-30 (task D): the station is a two-storey flat-roofed block over the whole gate room (scenes/station-exterior.js), with parapet, roof plant, the exit canopy, the staff door, the room's side windows and glass front; above the cut-low height it fades only while it stands between Eric and the camera (on a phone the camera looks east-north-east past it).
- H7. Accepted: the station is built on the gate room's footprint, 12.6 by 9, deeper than the map's 12.4 by 6.5, centred on the traced footprint, because the room can't change.
- H8. Closed 2026-09-30 (tasks D, grid-frame): the shed runs north-south on the grid on the traced footprint's centre line (0.0 off), 7.2 wide under the traced 8, with an island platform on columns; the west beam runs on south and curves west-south-west on piers along the layout's beam, the east beam ends on a buffer.
- H9. Closed 2026-09-30 (tasks D, grid-frame): stairs at the platform's south end come down to a covered walkway that runs east past the station's south side and turns north to its glass front.
- H10. Closed 2026-09-30 (task D): no road; grass and the walkway south of the station.
- H11. Closed 2026-09-30 (task D): two rows of ten racks (fifteen bikes) in the bike court, a short rack of three by the station's north-west corner.
- H12. Closed 2026-09-30 (tasks C and D): the forecourt's background is the layout's neighbours (buildSkyline) on the layout's ground.
- H13. Closed 2026-09-30 (task C): Kuro works the head office lobby reception; places.md and cast.md follow.

## IT support, B2 (`office`)

- B1. Open. B2 is 14 by 12.8 and hangs under its lift: at island x -3.25..10.75, z -11.4..1.4, it lies mostly under the tower (x -4.9..11.5, z -13.85..-4.25) and reaches about 5.6 south of it, under the court.

## Fountain plaza (`plaza`)

- P1. Closed 2026-09-30 (map upgrade task E): the round plaza is about 23 across and the basin about 8.6, the fountain on the map's (0.0 off).
- P2. Closed 2026-09-30 (task E): the canteen is two storeys north of the plaza with a blue-grey roof, plant and a six-umbrella terrace, 0.9 off the traced footprint.
- P3. Closed 2026-09-30 (tasks E, grid-frame): two rows of two-storey shops face each other under one arcade, running east on the grid, the north row's backs to the lane; 1.5 off the traced north row.
- P4. Closed 2026-09-30 (tasks E, grid-frame): the lane runs straight along the plaza's south edge and turns north at right angles at both ends (route_home), a square of lane paving at each corner.
- P5. Closed 2026-09-30 (tasks B, E): the plaza's backdrop comes from the layout (buildSkyline), so it shows the same tower as the forecourt.
- P6. Closed 2026-09-30 (tasks B, E): the backdrop east of the plaza is the layout's small blocks (m_e1, m_e2, r8, r9); the verge ends at the lane's east corner before them.
- P7. Closed 2026-09-30 (task E): the clinic with its green cross stands north of the canteen, from the layout.

## Dorm courtyard (`dorm_court`)

- D1. Closed 2026-09-30 (map upgrade task F): the court is the open ground west of dorm_1, at (79.84, -1.3), its camera looking east; the dorm entrance is on the map's.
- D2. Mostly closed 2026-09-30 (tasks F, grid-frame): Eric's block is five storeys, runs past both frame edges and returns on the court's south side (an L), on the grid; 4.4 off the traced block, which the map draws turned about 38° (F2).
- D3. Closed 2026-09-30 (tasks B, F, grid-frame): the rest of the cluster (dorm_1e parallel to Eric's block, 1.3 outside his window, dorm_2 to dorm_6, housing_n, dorm_entry, dorm_gallery, dorm_annex), the shops and the ground come from the layout (buildSkyline), all on the grid.
- D4. Open. The coin laundry and sento flank the hall in the game; the layout puts their shared frontage south of the dorm court (sento_laundry, from the brief; too small to read on the map).

## Eric's room (`dorms`)

- R1. Closed 2026-09-30 (task F): the room is placed in Eric's block above the passage and turns with the court; its window looks onto dorm_1e's west face, 1.3 out, as built.

## Not checked

- The monorail interior and the gate room are placed but not compared (no map detail inside them). The lift has no place of its own; it lives inside the forecourt and B2.
