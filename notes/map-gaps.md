# Map gaps: the built day-1 places against island-map-4

Where the built places disagree with the picked island map (reviews/island-map-4), as of 2026-09-30, build 38755d9. One line per gap. Coordinates are island units (1 unit = 1.5 m; x east, z south, origin the head office door as the map draws it), from game3d/js/scenes/island-layout.js; "off" is the distance between the built thing and the same thing on the map.

To see them: `?map=1` then M (or `?mapcompare=1`), "Compare with island-map-4", "As drawn" for the original picture. PNGs: `BASE=<worktree>/game3d node game3d/tools/map-shots.mjs` (writes game3d/shots/map/<time>/ and gaps.json). Upgrade tasks quote the lines they close.

## Frame and scale

- F1. The scale is pinned by the station: the gate room (12.6 wide) is as long as the station the map draws. At that scale the map puts the head office door 15 east of the station's middle, the fountain 37.6 east-south-east of the door, and the dorm entrance 47.9 east-south-east of the fountain. The plan's first guesses (notes/map-upgrade-plan.md section 1) were 10 east and 7 north, about 50, and about 85.
- F2. The map's town grid is drawn turned about 23° (the tower's south face and the shop street run east-south-east); the dorm blocks turn 30 to 50°. Every built place is square to north.
- F3. The crossfaded walks skip ground the map has: forecourt to plaza skips 41.7 units (office_e1, the trees east of the tower, the canteen's south side), plaza to dorm courtyard 35.2 (block_e1, the east shops).
- F4. Traced by eye from roof outlines, so layout buildings can be a unit or two out; the map's own proportions are loose (its football pitch comes out 35 units, about 53 m).

## Station forecourt and head office (`forecourt`)

- H1. Closed 2026-09-30 (map upgrade task C): the lift stands in the lobby of a real head office (scenes/head-office.js), its lid in the lift core's top colour; no background-coloured roof is left.
- H2. Closed 2026-09-30 (task C): the tower is built from the layout's head_office (14.8 by 8.6, 12 storeys, turned 23°; 0.1 off the map), and the skyline draws head_office_wing from the layout.
- H3. Mostly closed 2026-09-30 (task C): head office is east of the station. The tower is 0.1 off; the door is 4.6 off, because the map draws the door about 4.5 south of the traced south face and the door is built in that face.
- H4. Closed 2026-09-30 (map upgrade task D): the court is the paving between the station and the head office door, its bike court east of the station where the layout's court is (built x 5.8..12.8, z 2.65..10.6 local; the layout's court 5.8..14.6, 2.2..11.2); the shed stands west of it.
- H5. The station exit faces north because the gate room stays as built (gate-location); the map brief has it facing east toward the head office. Open question in the upgrade plan.
- H6. Closed 2026-09-30 (task D): the station is a two-storey flat-roofed block over the whole gate room (scenes/station-exterior.js), with parapet, roof plant, the exit canopy, the staff door, the room's side windows and glass front; above the cut-low height it fades only while Eric is just outside its north door.
- H7. Accepted (task D): the station is built on the gate room's footprint, 12.6 by 9 and square to north, deeper than the map's 12 by 3 turned 23°, because the room can't change.
- H8. Closed 2026-09-30 (task D): the shed is built on the layout's centre line, 43 long and turned 22°, with an island platform on columns and two beams on piers, the beam arriving from the west at its south end. It is 1.3 west of the traced line and 7.2 wide instead of 9, so its roof clears the station's north-west corner (the traced outline overlaps the station).
- H9. Closed 2026-09-30 (task D): stairs at the platform's south end come down to a covered walkway that runs along the station's south side to its glass front.
- H10. Closed 2026-09-30 (task D): no road; grass and the walkway south of the station.
- H11. Closed 2026-09-30 (task D): two rows of ten racks (fifteen bikes) in the bike court, a short rack of three by the station's north-west corner.
- H12. Closed 2026-09-30 (tasks C and D): the forecourt's background is the layout's neighbours (buildSkyline) on the layout's ground; the old boxes and slab are gone.
- H13. Closed 2026-09-30 (task C): Kuro works the head office lobby reception; places.md and cast.md follow. Her lines are still the station ones until Codex rewrites them.

## IT support, B2 (`office`)

- B1. B2 is 14 by 12.8 and hangs under its lift: at island x -14.6..-0.6, z -13.4..-0.6, it lies under the court and the shed, west of where the map's tower stands (x -2.7..15.3). When the head office moves (H3), B2 moves with its lift; the tower is about 8.5 deep, so B2 still reaches about 4 units past it, under the court.

## Fountain plaza (`plaza`)

- P1. The map's round plaza is about 23 across; the whole built chunk (14.6 wide) sits inside it. The map's basin is about 8.6 across, the built one 3.
- P2. The canteen is a 6.4 by 3 box, 2 high, at the chunk's north edge. The map's canteen is two storeys, about 23 by 10, blue roof with plant and a terrace of umbrellas, 13.5 further north (built at 36.4, 3.8; map at 39.6, -9.2).
- P3. The shops are one row of single-storey units just south of the lane, awnings toward the lane. The map has two rows of two-storey shops facing each other under one covered arcade, the north row's backs to the lane, running east-south-east at about 25°. The built row is 14.6 north of the map's north row at the fountain's longitude.
- P4. The built lane runs straight west to east through the chunk, just south of the basin inside the ring. The map's route runs along the plaza's south edge and bends east-south-east (route_home).
- P5. The plaza's backdrop draws its own head office tower at (26.2, 5.1): 20 units from the map's tower and 42 from the forecourt's. Each chunk shows a different tower.
- P6. The plaza's backdrop draws the first dorm block at (47.8, 10.4); on the map that is the plaza's east edge, and the nearest block is block_e1 at (62, 12).
- P7. The plaza has no clinic in its background; the map draws it (green cross, 3 storeys) just north of the canteen.

## Dorm courtyard (`dorm_court`)

- D1. The plan's entrance-court point (985, 700 on the map) lands on dorm_1's footprint, so the chunk overlaps a 6-storey block turned about 30°. The nearest open ground on the map is just west of dorm_1's west end, around (74, 30); the builder picks the court's spot.
- D2. Eric's block is one slab, 8 by 3.8, four storeys, square to north; the chunk's block is 5.5 off dorm_1. The map's cluster is 5 to 7 storeys, blocks turned 30 to 50°, some L-shaped, around planted inner courts.
- D3. The background is two plain boxes; the map has dorm_2 to dorm_6 and housing_n around the court.
- D4. The coin laundry and sento flank the hall in the game; the layout puts their shared frontage at the dorm approach south-west of the court (sento_laundry, from the brief; too small to read on the map).

## Eric's room (`dorms`)

- R1. No transition places the room; the layout puts it in the courtyard's block above the passage. Its window looks north onto a wall 1.25 out, but the nearest building north of it in the layout (dorm_5) is 6.9 away.

## Not checked

- The monorail interior and the gate room are placed but not compared (no map detail inside them). The lift has no place of its own; it lives inside the forecourt and B2.
