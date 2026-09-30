# Map gaps: the built day-1 places against island-map-4

Where the built places disagree with the picked island map (reviews/island-map-4), as of 2026-09-30, build 38755d9. One line per gap. Coordinates are island units (1 unit = 1.5 m; x east, z south, origin the head office door as the map draws it), from game3d/js/scenes/island-layout.js; "off" is the distance between the built thing and the same thing on the map.

To see them: `?map=1` then M (or `?mapcompare=1`), "Compare with island-map-4", "As drawn" for the original picture. PNGs: `BASE=<worktree>/game3d node game3d/tools/map-shots.mjs` (writes game3d/shots/map/<time>/ and gaps.json). Upgrade tasks quote the lines they close.

## Frame and scale

- F1. The scale is pinned by the station: the gate room (12.6 wide) is as long as the station the map draws. At that scale the map puts the head office door 15 east of the station's middle, the fountain 37.6 east-south-east of the door, and the dorm entrance 47.9 east-south-east of the fountain. The plan's first guesses (notes/map-upgrade-plan.md section 1) were 10 east and 7 north, about 50, and about 85.
- F2. The map's town grid is drawn turned about 23° (the tower's south face and the shop street run east-south-east); the dorm blocks turn 30 to 50°. Every built place is square to north.
- F3. The crossfaded walks skip ground the map has: forecourt to plaza skips 41.7 units (office_e1, the trees east of the tower, the canteen's south side), plaza to dorm courtyard 35.2 (block_e1, the east shops).
- F4. Traced by eye from roof outlines, so layout buildings can be a unit or two out; the map's own proportions are loose (its football pitch comes out 35 units, about 53 m).

## Station forecourt and head office (`forecourt`)

- H1. No head office building around the lift: the "building" is a 3.8 by 1.9 roofless box, 2.2 high, holding the lift. The flat roof beside the shaft is unlit and exactly the background colour (#5d636c), and so is the lift's lid, so from the play camera the lift stands in a hole with nothing over it.
- H2. The tower is a 4.8 by 3.6 box, 9 high, 2.4 behind the lobby and mostly out of frame. The map's tower is about 15 by 8.5, 12 storeys, turned 23°, with a 4-storey wing north-west of it (head_office_wing).
- H3. The head office sits north of the station in the game and east of it on the map: the built door is 15.5 off (at -13.0, -8.5 against 0, 0) and the built tower 20.9 off.
- H4. The court is where the map has the platform shed: the forecourt's walk rectangle lies inside the shed's footprint, north of the station.
- H5. The station exit faces north because the gate room stays as built (gate-location); the map brief has it facing east toward the head office. Open question in the upgrade plan.
- H6. The station outside is only a 0.45-high wall from forecourt x -7 to 1.2. The gate room reaches x 5.8, so the east half of the station is drawn as grass, and the room's second back-wall door has nothing outside it. The map's station is a separate two-storey flat-roofed block with a parapet and canopy.
- H7. The map draws the station about 12 by 3, turned 23°; the gate room is 12.6 by 9 and can't change, so the station's massing has to be deeper than drawn.
- H8. The platform roof is a free-standing half-cylinder 13 long, over the court's west edge. The map's shed is about 43 long, turned 22° (north-north-east), with the platforms under it and the beam on piers into its south end; the built roof's middle is 2.8 off the map's, but there is no beam, no piers and no platform under it.
- H9. The train's covered walkway ends at (-27.9, -5.3), west of the station; the gate room's glass entrance is on its south face (-15.1, 4.5). Nothing joins them.
- H10. A road runs south of the station (forecourt town(), TOWN.road). The map has no roads or cars there; the shop street's west end and the promenade start south-east of the station.
- H11. The court has two bikes and one rack; the map shows rows of bikes on both sides of the court.
- H12. Background blocks are seven arbitrary boxes (forecourt town()). The map's neighbours: office_e1 east of the tower on the lane, the tower's wing, office_w1 and the offices north.
- H13. Kuro (the receptionist) moves from the gate room to the head office lobby reception (Jørgen, 2026-09-30: "Then kuro should be there rather than at security"). Not built yet; places.md gate and forecourt tables and cast.md change with it.

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
