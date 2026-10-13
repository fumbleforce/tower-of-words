# Environment critique: the four outdoor day-1 places

Critic's scores for the build at 0cc7285 (build stamp 0930-1026-0cc7285), 2026-09-30. Scored against notes/PRODUCTION.md (Production bar, pass 8/10) and notes/VISUAL_QA.md, and against Jørgen's words for this pass: "a BEAUTIFUL, professionally made environment that looks well designed", "different areas blend well, like intentionally designed", "paths need to be drawn intentionally and not look like it was just thrown into place haphazardly", "lazily built out".

Shots: game3d/shots/env-critique/{forecourt,plaza,dorm}/, taken with game3d/tools/place-shots.mjs at 1366x860 (`-desk`) and 390x844 (`-phone`), q=1. The `e` in a name means evening. The dorm courtyard and Eric's room only load in the evening, so there are no morning shots of them. In the forecourt and plaza evening shots the clock chip still says "Early morning". That's because the tool switches the period directly, so it isn't scored.

| Place | Score | Verdict |
|---|---|---|
| Forecourt (station exit, court, head office door, lobby) | 4 | Large flat fields of paving meet at hard seams, the paths are colour bands with no edges, the open station hall reads as placeholder blocks, and the lane ends in a tree grid on bare lawn |
| Fountain plaza | 5 | It has a real landmark, but the stone circle is laid over a square slab with no join, the coin sign clips through the basin rim, and the lane is a bare strip |
| Dorm courtyard | 6 | The most lived-in place, but the lighting has a seam across the lawn, the hedge is one long repeated row, the scene is murky and the edges trail into dark voids |
| Eric's room | 4 | A bare box: most of the floor is dead, there's a light pool with no fitting above it, the window shows flat grey, and the room floats in a navy void under a loose wall slab |

None of the four passes. The kit is consistent (one flat-shaded look, surface patterns, soft light), so nothing reads as mixed art. The failures are in composition, paths, transitions and fullness, which is what Jørgen named.

## Forecourt: 4/10

Shots: fc1-arrive, fc2-court, fc3-door, fc4-lobby, fc5-lane, fc6-laneend (desk and phone), fc1e/fc3e/fc5e (evening).

Defects, most visible first:

1. **The station hall is placeholder blocks** (fc1-arrive-desk, lower-left quarter, about 0-720 x 500-860; fc1e the same). The roof is cut away, and the hall holds a bare gate arch, two posts, an unexplained dark brown-black box (about 410-490 x 655-715), a low dark slab (about 490-635 x 770-815) and two runs of glass barrier on a plain tiled floor. Nothing says ticket gates, ticket machines, route map, kiosk or 出口 sign. The blocks are near-black maroon, which is also the one brown in the palette. VISUAL_QA cap: placeholder in view (3). This is the first thing a player sees on leaving the station. Fix: give the station its real kit (a row of 3 to 4 automatic gates with the blue IC pads, a fare map on the back wall, ticket machines against the wall, an 出口 sign over the doorway), or keep its roof on and show only the exit canopy.
2. **The paths are colour bands with no edges** (fc1/fc2-desk, the band from the station doorway at about 240-330 x 380-500 up to the head office door at 1020-1100 x 240-370). The walk from the station door to head office is a slightly lighter band of the same tile. It jogs in an L with no kerb, border or change of pattern, then widens into a lighter rectangle before the door. It looks like a leftover selection. Fix: one deliberate processional path from the station door straight to the head office canopy, in a contrasting stone (a darker granite field with a light soldier-course border 30 cm wide), with tactile yellow guide tiles down its centre (a strong Japan cue) and a planted tree bed or a low company sign plinth where it turns.
3. **Hard seams between grey, beige and green, with no transitions** (fc1-desk: the grey court meets the beige bike court at x 720, and the bike court meets the lawn at about 1230; fc3-desk: grey against beige across 0-1100 at y 555-625; fc5-desk: beige lane against lawn at y 500-660). Each zone is a flat field of one tile, butted against the next in a straight line. The areas don't read as one designed site but as three rectangles placed side by side. Fix: a shared kerb or planting strip between zones (a 40 cm granite kerb with low hedging, trees at a regular pitch along the court edge), one paving family across the forecourt with the zones marked by border bands and pattern changes rather than whole-field colour swaps, and the bike court set behind a low hedge.
4. **The east lane runs over an empty lawn with a grid of trees and ends in nothing** (fc6-laneend-desk and phone). North of the lane, trees stand in a two-by-four grid on flat olive lawn. South of it, trees are scattered at random. At the right the lane stops at x 1250 against a grey-blue rectangle, and a length of fence floats on the lawn at the top (about 710-1060 x 0-20). Three identical planters with identical hedge balls run the lane (C5). A professional pass would line the lane with an avenue of one species (cherry or zelkova) at an even pitch, with a planting bed or low wall along the lawn side and benches in recesses. The lane would end at something visible (a gateway, a sign to the plaza, the plaza's first lamps). The lawn would get paths, mounding and an understorey instead of lollipop trees on flat green.
5. **Lamps and planters sit where they fall** (fc1-desk: lamps at 515,330 and 870,330 between the two planters, one lamp alone at the bike court corner at 750,540. Three small planter boxes of identical hedge balls, and a bench tucked against the station wall at 95-190 x 465-490). No lamp line follows a path or an edge. Fix: lamps at an even pitch along the path edges, planters in pairs framing the head office door, benches under trees facing the court.
6. **The head office facade is one repeated curtain wall, and the bottom band doesn't line up** (fc5-lane-desk: the lower storey at 590-970 x 280-370 is set back in a different shade, and its mullions don't line up with the grid above). The whole face is the same blue glass grid with nothing on the ground floor: no lobby glass showing light, no company name on the building, no plinth, no planting at the base. The canopy and the small 本社 plinth sign are the only detail. Fix: a stone plinth storey with a lit glass lobby, a company name in steel letters above the canopy, and mullions that run through.
7. **The lobby is sparse, and its x-ray shows machinery and a stranger's room** (fc4-lobby-desk and phone). The lift shaft tops are open boxes showing the cars' roofs and machinery (about 590-1000 x 185-265). To the right the cut-away building next door shows rows of white tables on bare floor. The lobby has a reception desk, one sofa pair, three potted plants and bare walls. Fix: cap the lift shafts with the lobby ceiling line or a solid top, dress the lobby (company logo wall behind reception, a floor mat at the door, an umbrella stand, a directory board, a clock), and don't cut open the building next door.
8. **The door threshold glows on the phone** (fc1-phone and fc2-phone, the head office door at about 220-240 x 150-300). A bright vertical white-yellow shaft runs from the door down the steps, like a lit bar standing on end. At the phone's angle it reads as an object, not light.
9. **Bike rows** (fc1-desk, 790-1120 x 520-820): fourteen identical bikes in two rows, the same colour and the same angle. Rows are real in Japan, but they need racks, a roof or at least a painted bay, and varied bikes (colours, baskets, one fallen over or with a child seat).

Evening (fc1e, fc3e, fc5e): the long sun shadows and warm lit windows are the best thing in the forecourt. The street lamps give the same small pool as in the morning, and the lamp heads don't glow, so dusk doesn't get the lamps' help.

## Fountain plaza: 5/10

Shots: pl1-arrive, pl2-west, pl3-fountain, pl4-dormexit (desk and phone), pl1e/pl3e/pl4e (evening).

Defects, most visible first:

1. **The coin sign clips through the basin rim** (pl1-arrive-desk at 648-733 x 272-298; pl4-desk at 210-298 x 272-298, seen close in a crop). The basin's curved rim cuts over the top of the kana, so コインを投げないで reads as "コイン...ないで". VISUAL_QA cap: geometry through geometry (5). Fix: stand the sign on its own post in front of the rim, or set it into the rim's face on the curve.
2. **The stone circle is laid over a square slab with no join** (pl2-west-desk, 0-500 x 100-480; pl4-desk, 960-1170 x 0-490). A square paved area with a dark border sits under the round plaza. Where they overlap, the circle's edge is only a change of colour, and the raised curb that runs round the north side stops in mid-air (pl2 at about 320,90; pl4 at 850,440). This is what "thrown into place" looks like. Fix: one layout. Either the circle is bounded by a continuous kerb and planted ring, with the square corners filled by planting beds, or the square is the plaza and the circle is a paving inlay inside it.
3. **The lane below the plaza is a bare strip** (pl1/pl2/pl4-desk, 0-1366 x 485-655; pl3-desk 0-1366 x 680-860). It's a flat beige band with three drain grates, bounded by the plaza's dark line above and a lawn with three identical planters and lollipop trees below. It repeats the forecourt lane exactly. Fix: a distinct paving (a herringbone brick band between granite kerbs), trees in pits along the lane, and a clear gateway where the lane meets the plaza (bollards, a pair of lamps, a sign to the dorms).
4. **Nothing frames the plaza.** In no shot is there a building, cafe front, kiosk or edge wall. The plaza floats in beige with planters at the rim, so it reads as a disc in a field, not a square in a town. Fix: shop fronts or a colonnade on the north arc (a konbini, a cafe with chairs outside, a notice board), and a few people's traces (a dropped leaflet, a bike leaning on a bench).
5. **The palette is warm beige-tan throughout, and the water and coins read as static** (all plaza shots). The stone is one warm beige that goes mauve-brown in the evening (pl3e, pl4e). There is no falling water, spray or ripple rings from a jet. In the evening the coins turn black and read as dirt in the pool (pl3e, 480-900 x 290-410). Fix: cooler grey granite with a warm accent band, a visible jet and falling sheet of water, and coins that keep a light rim at night.
6. **The furniture is thin and evenly spaced** (pl3-desk): five dark benches and one bin round the fountain, placed at even intervals. No bench has a tree, a lamp or a planter paired with it. Fix: benches in two or three groups, each with a tree for shade and a lamp, facing the fountain and the lane.

Evening (pl3e, pl4e): the lamps glow with good pools, and this is the best-lit place of the four at dusk.

## Dorm courtyard: 6/10

Shots: dc1-arrive, dc2-mid, dc3-door, dc1e, dc3e (desk and phone; evening only).

Defects, most visible first:

1. **The lawn is lit in two halves** (dc1-desk, the grass strip at 0-1366 x 685-750: dark blue-green left of about x 600, lit olive-yellow right of it; phone dc1 at about x 300, y 620-700; dc3-phone at y 680-720). A hard vertical seam cuts across the lawn and the hedge. It reads as a shadow edge from nothing, or as two tiles of different materials.
2. **The hedge is one long repeated row** (dc1-desk, 180-1260 x 740-800): about 25 identical hedge balls in a single straight box, the same row as in the forecourt and plaza. C5. Fix: mixed shrub heights, a tree every few metres, a gap where the path from the plaza comes in.
3. **The scene is murky and the edges trail off into voids** (dc1-desk: the dark lawn patch at the left (0-100 x 280-520) and a flat dark blue slab at the right under the tall block (1140-1366 x 460-680)). The whole court is dim navy-mauve, so the laundromat light and the sento door carry the scene, and the floor between them is a dark field. Fix: a warm overhead light on the entrance canopy, lit windows in the laundromat, a vending machine's glow by the door (a strong Japan cue that also lights the floor), and the edge areas made into something (a bike path, a wall with a gate).
4. **The block to the right is flat orange-brown** (dc1-desk, 1100-1366 x 0-580). Its warm brown walls clash with the cool slate of everything else, and they're the only large brown surface in the day. Fix: the same pale concrete as the dorm block, with the warm colour kept to the lit windows.
5. **A bollard light stands on the bike shelter's roof** (dc1-desk at 958,560; crop shows the lamp drawn on top of the glass roof). Either it stands inside the shelter and shows through the roof, or it clips it. Move it clear of the shelter.
6. **Four bikes stand with no rack** (dc1-desk, 360-560 x 580-680; phone dc1 at 100-260 x 530-610). Next to the sheltered rack, four bikes stand upright on open paving with no stand.
7. **Details that are good and should stay:** the coin laundry front with its sign, the mailboxes in the lit entry, the 社員寮 plinth sign, the ゆ noren on the sento, the laundry hanging on the upper gallery. These are the kind of "what happened here" details the other places lack.

## Eric's room: 4/10

Shots: rm1-entry, rm2-window, rm3-bed (desk and phone), rm1e, rm2e (evening, the same look).

Defects, most visible first:

1. **Most of the floor is dead** (rm1-desk, the floor at about 490-880 x 250-570). Of a room about 3.5 x 5 m, the middle 2.5 x 3 m is bare grey 1 m tile. VISUAL_QA C15 cap (5): more than a quarter of a small room is dead, in blocks bigger than 2 x 2 m. Fix: a rug, a low table (chabudai) with a cushion, the unpacked things from the boxes spilling over (a bag, a jacket over the chair, a futon folded half out), a floor lamp.
2. **A light pool with no fitting above it** (rm1-desk at about 600-760 x 440-600, the warm pool under and around Eric). There's no ceiling light, pendant or desk lamp to make it. D2 and D3. Fix: a round ceiling light shown by its glow on the walls, or a desk lamp on the desk that makes the warm pool.
3. **The room floats in a navy void under a loose wall slab** (rm1-desk: the grey panel at 315-1050 x 0-110 behind the back wall, and navy all round). The slab reads as part of a building with the rest cut away. The window shows flat light grey (590-770 x 90-190), with no night, no lights from the block across and no curtain. Fix: either the corridor and neighbours' doors around the room at dim light, or a clean dark surround with a vignette. Put a night view in the window (the lit windows of the block opposite, a little sky gradient) and curtains.
4. **The furniture is bare boxes** (rm1-desk): the bed is a navy box with one pillow and no duvet fold, the chair is navy blocks, the desk carries only a black rectangle, and the kitchenette is two black squares and a pot. The walls hold one switch and nothing else: no shelf, clock, calendar, coat hook, air-conditioner unit (a strong Japanese dorm cue) or closet door. Fix: a wall AC unit over the window, a closet with sliding doors, a shelf with a few things, a coat hook by the door, a duvet with a fold, and a kettle and rice cooker in the kitchenette.
5. **The floor is office tile, not a dorm floor** (all room shots). Large grey 1 m tiles, lit flat, read as the office lobby. Fix: wood-look flooring or tatami in the room, with a step down to a tiled genkan by the door and shoes on it.
6. **Eric dwarfs the room at the front** (rm1-desk and rm1-phone: his head fills about 580-720 x 545-690, taller than the kitchenette counter). He stands close to the camera in perspective, so his first view of his own room is mostly the back of his hair. Fix: a start spot a step further in, or a camera set further back for the arrival.

## Across the day

- The same three pieces repeat in all four places: the straight planter box of identical hedge balls, the lollipop tree and the flat olive lawn. Each place needs its own planting (the forecourt formal and clipped, the plaza with shade trees, the dorm with messy shrubs and potted plants by doors).
- The places are built as fields of one material with a straight edge between them. What makes an environment look designed is the edge work: kerbs, borders, planting strips, steps and changes of level at every boundary.
- The paths never lead anywhere in the frame. From each doorway you should see where the path goes: the next door, a gateway, a landmark.

# Re-score after the design pass (2026-09-30)

Build 0930-1221-969067b (HEAD 969067b: forecourt fa26043, plaza 065d595, dorm court 969067b, Eric's room ed9e165). Same method and bar as above; the builders' self-scores weren't read. Shots: game3d/shots/env-rescore/{forecourt,plaza,dorm}/ from game3d/tools/place-shots.mjs at 1366x860 and 390x844, q=1, same spots as the first critique plus pl5-canteen (plaza 0,-3.5) and dc4-east (dorm court 3.5,0). Plans from straight above: game3d/shots/env-rescore/plan/{fc,pl,dc,rm}-plan.png (a scratch script that points the place's camera straight down; no game file changed), and the island map from game3d/tools/map-shots.mjs in game3d/shots/env-rescore/map/. The evening clock chip still says "Early morning" in the tool's evening shots; not scored. Jørgen's note on the plaza, passed on by the coordinator during this pass: "the entering and exiting paths are not aligned, you got that funky extra path around it for some reason, and the fountain plaza extends onto the restaurant(?)'s tiles".

| Place | Before | Now | Verdict |
|---|---|---|---|
| Forecourt | 4 | 6 | Now a designed arrival: one granite walk with borders and the guide line, kerbs and beds between zones, lamps on lines, a proper lane. It's held back by the empty station hall, the blank roof slab over the lobby and the flat lawns with tree clumps along the lane. |
| Fountain plaza | 5 | 5 | Every old detail defect is fixed, but the plan is wrong in the way Jørgen named: the lane in and the lane out are on different lines, a U-shaped loop wraps the plaza for no reason, and the paving circle runs onto the canteen terrace. The ring paving is also a large empty field. |
| Dorm courtyard | 6 | 7 | The best of the four: lit by its own machines and doors, full of Japan cues, no lighting seam. What's left is small: a bare street strip, hedge blocks still in a row, bikes standing outside the shelter roof. |
| Eric's room | 4 | 7 | Now a real 1K: tatami, bed, desk and lamp, oshiire, boxes, genkan, kitchenette, unit bath, AC and curtains. Eric's head covers the genkan in the arrival view, and about two thirds of the frame is dark neighbour flats. |

None passes 8 yet. The kit now reads as one town from the forecourt to the plaza (the same brick lane, pale borders, hedge, avenue trees in pits, lamps and benches). The walk from the plaza to the dorms doesn't (see "The route" below).

## Forecourt: 6/10 (was 4)

Fixed from the first critique:
- 2 (paths as colour bands): fixed. One dark granite walk with a pale soldier border and the yellow guide line runs from the station door to the head office canopy (fc1-desk 230-1150 x 330-500, fc3-desk). Wide, but deliberate.
- 3 (hard seams): mostly fixed. Kerbs, raised beds and hedges now sit between zones; the bike court is behind a hedge (fc1-desk 720-1230 x 490-530). One seam is left, see below.
- 5 (lamps where they fall): fixed. The lamps stand in lines along the walk's edges (fc1-desk at 360, 515, 700 and 880), and they glow with pools at dusk (fc1e, fc3e, fc5e).
- 6 (facade): mostly fixed. AMAKAWA over the canopy, pines either side of the door, a lit lobby front at dusk, fins carried down to the ground. The lower storey east of the door is still a different blue with its own grid (fc3-desk 1085-1366 x 320-420).
- 7 (lobby x-ray): fixed. The lift shafts are capped and the building next door is closed.
- 9 (bike rows): fixed. Racks, painted bays, varied bikes, one lying over.
- 4 (lane over an empty lawn): partly fixed. There's a brick lane with pale borders, an avenue at an even pitch, bench bays, a finger sign and gateposts at the end (fc6-desk 1210-1290 x 270-500). South of it the lawn is still a flat olive field with two big clumps of trees on mown discs (fc6-desk 350-690 x 610-830 and 880-1280 x 640-860).
- 1 (station hall placeholder blocks): partly fixed. There are no more unexplained boxes, but the hall is still mostly empty tile (fc1-desk 0-720 x 510-860): one grey arch, which reads more like a security scanner than ticket gates, one desk with two dark blocks on it, one bench and glass rails. No row of gates, fare map, ticket machines or 出口 sign.
- 8 (door glow on the phone): mostly fixed. It's now a narrow lit window strip at the door (fc1-phone 215-245 x 150-230), which reads as light.

What remains, most visible first:
1. **The lobby shot is a third blank roof** (fc4-desk 510-1366 x 70-440; fc4-phone 0-390 x 100-340). The closed ground floor round the lobby is one flat pale slab with nothing on it, over the top and right of the frame. It reads as a greybox cap.
2. **The station hall is empty** (fc1-desk and fc2-desk, lower left). See 1 above. It's the first thing the player walks out of.
3. **The lawns along the lane are flat fields with tree clumps** (fc5-desk 580-1366 x 550-860; fc6-desk). Trees are bunched into round clumps on pale discs; there's no understorey, no path across and no change of level.
4. **The lane's brick meets the court's tile with no border** (fc5-desk at x 585-595, y 380-500, right under Eric). Everywhere else there's a pale border between fields; here there isn't.
5. **The rooftop units on the station are plain dark brown cubes** (fc3-desk 40-300 x 580-860). They're the only brown in the forecourt and have no detail.
6. **From above, a path runs north between the office wing and the head office and ends at the island's edge** (plan/fc-plan 570-610 x 355-620), and the lawns end in a straight line against the navy void.
7. The lobby is still thin: a desk, two sofas and a table, three plants and a directory board, with a large bare floor between them (fc4-desk 630-860 x 390-490).

Top 3 next:
1. Give the station hall a real gate line: three or four automatic ticket gates with IC pads in a row (not one arch), ticket machines and a fare map on the back wall, and an 出口 sign over the door to the forecourt.
2. Dress or hide the slab over the lobby: a roof with plant, a parapet and roof-light rows, or frame the lobby shot so it doesn't show.
3. Turn the lane-side lawns into a planted garden: a path loop, low mounding, shrub beds under the trees and single trees instead of clumps. Add a pale border where the lane meets the court.

## Fountain plaza: 5/10 (no change)

Fixed from the first critique:
- 1 (coin sign through the rim): fixed. The sign is set into the rim's face and reads コインを入れないで (pl1-desk 760-845 x 250-290, pl3-desk).
- 2 (circle over a square slab): the square slab is gone and the circle is paved in rings with a dark border. But see new defect 1: the circle now runs over the terrace instead.
- 3 (bare lane): fixed. The same brick, borders, hedge, avenue in pits and lamps as the forecourt lane (pl1-desk 0-1366 x 485-830).
- 4 (nothing frames it): partly fixed. The canteen with its striped awnings, umbrellas and a terrace wall is on the north side (pl5-desk top edge, plan/pl-plan 255-925 x 0-265), and corner gardens sit at the lane turns. From the player camera the canteen is only a strip at the top of pl5.
- 5 (static water, black coins): fixed. The water has curtains, glints and rings, and the coins shine in the evening (pl3e, pl5e).
- 6 (thin, even furniture): partly fixed. Benches come in pairs, with a bike and a leaflet, but they only stand on the outer rim (pl3-desk at 60,160, 210,20 and 1260,60).

What remains, most visible first (the first three are Jørgen's):
1. **The lane in and the lane out are on different lines** (plan/pl-plan: the west arm from the forecourt at y 565-650, the east arm towards the dorms at y 440-515, about 4.5 m apart). The forecourt lane runs straight into the west arm (map/map.png 525-700 x 480-525), but the player arrives on the south lane and leaves from the south-east corner ("To the dorms" at pl4-desk 920,485), not from the east arm that's drawn leading away.
2. **An extra U-shaped lane wraps the south half of the plaza** (plan/pl-plan 200-1150 x 650-850, and up the east side 1070-1145 x 515-850). It doubles the west-to-east route and cuts two leftover triangles, which the corner gardens then fill (pl2-desk 20-490 x 270-480; pl4-desk 800-1160 x 60-480). This is the "thrown into place" pattern from the first round in a new form.
3. **The paving circle runs onto the canteen terrace's tiles** (plan/pl-plan 480-920 x 225-270; pl5-desk 240-1140 x 30-90; pl5-phone 0-390 x 100-130). The terrace's seat wall stops at both ends (pl5-desk 0-370 and 1040-1140 at y 65-90), and between them the rings lie over the square terrace tiles with two lamps standing on the join.
4. **The ring paving is a large empty field** (pl3-desk: from the basin to the rim is about 8 m of bare rings on every side; pl5-desk the same). Apart from the fountain and some pigeons, the middle of the plaza is empty. C3 allows 9 m outdoors, but the whole disc is used by nothing, and the circle is cut flat by the lane with nothing on the cut (pl1-desk y 485).
5. The avenue along the south lane is five identical trees at one pitch in both pl1 and pl4, the same row as on the forecourt lane.

Top 3 next:
1. One straight line through the plaza: the forecourt lane enters on one axis, crosses the plaza past the fountain and leaves on the same axis towards the dorms. The arrival and the dorm exit sit on that axis.
2. Remove the U loop and give the freed ground to the gardens and lawn. The circle's edge then meets planting, not a second lane.
3. Stop the circle short of the terrace with its own kerb and a step or planted strip, run the terrace's seat wall along the whole front with one gap on the fountain axis, and put things on the ring (a second bench group with shade trees, a notice board, a kiosk or a food cart) so the disc isn't bare.

## Dorm courtyard: 7/10 (was 6)

Fixed from the first critique:
- 1 (lawn lit in two halves): fixed. There's no seam, and the lawn strip is replaced by a raised bed.
- 2 (one long hedge row): mostly fixed. The bed has hedge runs in three heights with a cherry, maples, azaleas and grasses (dc1-desk 0-1366 x 620-770). The hedge pieces are still identical rounded blocks set end to end in short runs.
- 3 (murky, voids at the edges): fixed. The two drinks machines, the coin laundry, the lit entry, the sento door and the shelter strip lights light the court; the left edge is a planted garden with a lamp (dc1-desk 0-215 x 200-490).
- 4 (orange-brown block): fixed. The block on the right is pale concrete with lit windows.
- 5 (bollard on the shelter roof): fixed. The shelter is on the east side, against the return.
- 6 (bikes with no rack): fixed. The bikes are in a rack.
- 7 (good details): all kept, plus AC units on the roofs, a garbage cage and the blue bike sign.

What remains:
1. **The street strip along the bottom is bare** (dc1-desk 0-1366 x 780-860): grey pavers and three drain grates, in a different paving from the brick lane the player walked in the plaza. From above, the front bed runs unbroken along the whole court with no opening to the street (plan/dc-plan 120-1125 x 810-855), so the court is only reached from its west end.
2. **Bikes stand outside the shelter** (dc1-desk crop 1065-1200 x 440-575): the three front bikes are in front of the roof's front edge, and the back one pokes out past the left post.
3. **The walk is a wide, flat, dim band** (dc1-desk 0-1080 x 505-600). It's lit only at the laundry end; the one tall lamp on the court stands by the vending machines, and the middle of the walk towards the shelter has no light of its own.
4. The dorm entry is an open box with the mailboxes and a dark doorway, and no glass door or auto-lock panel (dc1-desk crop 610-920 x 220-430). A Japanese dorm entrance would have a glass door with the lock panel.

Top 3 next:
1. Make the street the same lane the player walked in the plaza (brick, pale borders), and cut a gateway into the front bed on the walk's axis, with the 社員寮 stone beside it.
2. Lengthen the shelter roof over the whole rack, or cut the rack to the roof.
3. Put a second tall lamp or a lit notice board midway along the walk, and give the entry glass doors with an auto-lock panel.

## Eric's room: 7/10 (was 4)

Fixed from the first critique:
- 1 (dead floor): fixed. Six tatami with a desk and chair, a bed, a folding table with a cushion and his dinner, the oshiire and a stack of boxes with one open. The only open floor is the aisle to the window. C15: about 0 to 1 m² dead of about 10 m², under the quarter.
- 2 (light pool with no source): fixed. The desk lamp makes the warm pool on the desk wall, and the hood light makes the kitchen one.
- 3 (navy void, grey window): mostly fixed. The building is cut round the flat, with the neighbours' walls, the corridor and their doors (rm1-desk 0-460 and 940-1366 x 640-860). The window has curtains and an AC unit and looks onto a lit wall with a small lit window.
- 4 (bare box furniture): fixed. Duvet thrown back with his bag on it, AC, curtains, coat hooks, shoe cupboard, shoes in the genkan, kettle and hob.
- 5 (office tile floor): fixed. Tatami, and a tiled genkan.
- 6 (Eric dwarfs the room): partly fixed. He now stands in the genkan, but at the arrival spot his head still covers the genkan and half the kitchenette (rm1-desk 575-730 x 545-730; rm1-phone 105-235 x 520-720).

What remains:
1. **Eric's head covers the genkan and the kitchenette on arrival** (see 6 above). The shoes and the step up, which are the room's story of "just got home", are hidden in the first view.
2. **About two thirds of the frame is dark neighbour flats** (rm1-desk 0-460 x 30-640 and 940-1366 x 30-640): flat navy blocks with thin lines. They read as roof slabs rather than flats. A dimmer lit edge, a hint of a neighbour's things, or a tighter frame would help.
3. **The window view is a flat pale wall** (rm1 crop 600-735 x 95-200): lit, with one small lit square. It reads as intended, but it's the brightest thing in the room and has nothing in it.

Top 3 next:
1. Move the arrival stop half a step into the room (onto the tatami edge) or set the camera back, so the genkan and his shoes show.
2. Darken the neighbours' flats towards the frame edge (a vignette) or frame the room tighter, and keep the corridor strip.
3. Put a little life in the window: a sliver of sky gradient over the wall, a neighbour's lit window with a curtain, or wires across it.

## The route: does it read as one designed town?

- Forecourt to plaza: yes in materials. The forecourt lane (fc6) and the plaza's lanes (pl1, pl2, pl4) use the same brick, pale borders, clipped hedge, trees in pits, lamps and bench bays, and the plan lines the forecourt lane up with the plaza's west arm (map/map.png 525-700 x 480-525). But the crossfade puts him on the plaza's south lane, not on the arm the forecourt lane leads into, so the lane he walked down doesn't continue where he appears.
- Plaza to dorm court: no. The dorm exit is at the plaza's south-east corner, while the arm drawn leading away goes east from further north. The dorm court is 31 units off (map-shots: "walk plaza -> dorm_court skips 31.5 units") and turned 90 degrees on the map. It's reached along a street of grey pavers with drains, not the brick lane. The dark granite walk with a pale border does repeat the forecourt's walk, which is a good link.
- Evening across the three outdoor places is consistent: the same lamp heads and pools, lit windows and dusk sun.
- Kit repeats to watch: the same five identical avenue trees at one pitch appear on both lanes (fc6, pl1, pl4), and the rounded hedge blocks appear in every place.

# Re-score 2 (2026-09-30, after round 2)

Build 0930-1448-20116c8 (HEAD ced9302: forecourt 050f45e, plaza 2dc944d, dorm court ced9302, Eric's room fbd9c53/8e391aa). Same method and bar as above; the builders' self-scores weren't read. Shots: game3d/shots/env-rescore2/{forecourt,plaza,dorm}/ from game3d/tools/place-shots.mjs at 1366x860 (`-desk`) and 390x844 (`-phone`), q=1, morning and evening for the forecourt and plaza (`e` = evening), evening only for the dorm court and room. Plaza spots moved with the new plan: pl1 arrival (-7.8,-0.27), pl2 west arm (-14,-0.27), pl3 fountain (0,4.63), pl4 dorm exit (13.2,-0.27), pl5 canteen link (0,-6), pl6 east (6,-0.27). Plans from straight above in game3d/shots/env-rescore2/plan/ (fc-plan, pl-plan, pl-wide, dc-plan, dc-wide, rm-plan; the same scratch camera script as last time, no game file changed). rm3-bed is a bad spot of mine (Eric isn't in frame) and isn't scored. The evening clock chip in the forecourt and plaza shots still says "Early morning"; not scored.

| Place | Round 1 | Now | Verdict |
|---|---|---|---|
| Forecourt | 6 | 7 | The lobby is now a clean cut-away under a standing tower, and the lane's seam has its border. Held back by the station hall (still one gate arch and a desk), and the lane-side gardens, which are now parallel strips with a bare lawn panel in the middle. |
| Fountain plaza | 5 | 7 | The plan is fixed the way Jørgen asked: one lane axis in and out, no loop, the circle ends at its own planted ring, and the canteen terrace sits apart behind a short stepped link. What's left is that the disc is a big empty field of paving, especially the south half. |
| Dorm courtyard | 7 | 8 | Pass. The street is now the brick lane from the plaza, and the gate with lantern posts is on the hall-door axis, so the plan reads at a glance. Bikes are under the roof. The entry is still an open box with a dark doorway. |
| Eric's room | 7 | 8 | Pass. The genkan and his shoes show on arrival, the neighbours' flats are cut open and furnished instead of navy slabs, and the window looks at a lit bathroom window across the gap. The left neighbour's flat is sparse and dark, and the room is dim overall. |

Two of four pass. The route now reads as one designed town from the forecourt lane to the dorm gate (see "The route" below).

## Forecourt: 7/10 (was 6)

Fixed since round 1:
- 1 (blank roof slab over the lobby): fixed. The lobby is a cut-away in the base of the tower, glass storeys above it and the lift bank capped with a ceiling (fc4-desk 500-1100 x 140-540). The lobby now has reception with a guard, the lift bank with floor signs (B2-5F, 6F-10F, stairs), a directory board, a sofa group, plants, a dark runner and the guide line carried in through the door.
- 4 (no border where the lane meets the court): fixed. A pale soldier course now runs between the court tile and the lane brick (fc5-desk 640-665 x 380-500).
- 3 (flat lawns with tree clumps): partly fixed. See 2 below.

What remains, most visible first:
1. **The station hall is still empty** (fc1-desk 0-720 x 500-860; fc2-desk the same area). One grey arch with two card posts, one desk with a monitor, glass rails, a bench and a row of seats on a big bare tile floor. There's no row of ticket gates, no ticket machines or fare map, no 出口 sign over the doorway, and a dark rectangle at the doorway (fc1-desk 210-335 x 510-555) reads as a hole more than a mat. It's the first thing the player walks out of.
2. **The lane-side gardens are parallel strips** (fc6-desk 210-1366 x 530-860; fc5-desk 645-1366 x 540-860; plan/fc-plan 1020-1400 x 690-900). South of the lane: a hedge bed with identical round shrubs at even spacing, then a kerbed rectangle of bare lawn with nothing in it (fc6-desk 210-1200 x 645-755), then another bed. It's ordered, but it reads as bands laid by a tool rather than a garden. The evening makes the bare panel a flat dark field (fc6e-desk).
3. **A service alley between the office wing and the head office runs north and stops at a hedge** (plan/fc-plan 640-730 x 315-595; fc1-desk 720-860 x 0-250, with three bollards). From the arrival camera it looks like a second route that leads nowhere.
4. The ground floor east of the door is still a darker glass band with its own grid (fc3-desk 930-1366 x 290-420; fc5-desk 650-1020 x 280-380).
5. From above, the west lawn is a big bare field with five trees (plan/fc-plan 105-420 x 235-1160), a path runs south from the station to the water's edge (400-480 x 1065-1240), and the lawn ends in a straight line against the navy void on the left. None of this is in the player camera.

Top 3 next:
1. A real station gate line: a row of three or four automatic gates, ticket machines and a fare map on the back wall, and an 出口 sign over the door; drop or lighten the dark doorway rectangle.
2. Turn the lane-side strips into one garden: break the middle lawn panel with a path, a bench bay or mixed planting, vary the shrubs, and let one or two trees stand in the lawn instead of every tree in the bed.
3. Close the service alley with a gate or a hedge at the court end, or give it a visible purpose (a service door with a sign, bins, a delivery bike).

## Fountain plaza: 7/10 (was 5)

Fixed since round 1 (all three were Jørgen's):
- 1 (lane in and lane out on different lines): fixed. The west arm from the forecourt and the east arm to the dorms are one straight axis through the fountain (plan/pl-plan 0-300 and 1100-1400 at y 635-745; pl-wide 0-1400 x 660-725). The arrival (pl1) and the "To the dorms" exit (pl4-desk 1060,420) both sit on it.
- 2 (the U-shaped loop): fixed. It's gone; the circle meets a continuous planted ring with trees at an even pitch and gaps only for the two arms and the canteen link.
- 3 (circle over the terrace tiles): fixed. The terrace stands apart with its own edge, and a short paved link with pale borders and a step between two lamps joins it to the circle (pl5-desk 600-830 x 120-230; plan/pl-plan 645-755 x 215-290).
- The lane arms keep the shared kit (brick, pale borders, clipped hedge, lamps), and the evening lamps pool along the rim (pl5e, pl4e).

What remains, most visible first:
1. **The disc is a large empty field of paving** (pl3-desk: from the basin to the ring about 0-1366 x 480-860 has nothing on it; pl6-desk 400-1100 x 450-860; pl3-phone the lower half). All the furniture sits on the north rim: four benches, a bike and a leaflet. The south half of the circle has no bench, tree, lamp or stall (plan/pl-plan 300-1100 x 830-1090). At dusk the lamps only light the rim, so the middle goes dark (pl5e-desk).
2. **The lawns outside the ring are trees on mown discs** (pl1-desk 0-230 x 0-350 and 0-110 x 540-750, each tree on a brown disc; plan/pl-plan corners). The clumps are placed without a path to them.
3. **From above, the side buildings stand on the lawn with no way in** (plan/pl-wide 160-350 x 350-450, 1110-1300 x 360-500, 1160-1320 x 810-905). Not in the player camera, but it's the "thrown into place" pattern in the outer ring.
4. On the phone, the arrival frame is almost all paving (pl1-phone), and the lane he walked in on is off the left edge.

Top 3 next:
1. Give the south half of the disc a use: a bench group under two shade trees facing the fountain, a kiosk or food cart, or a notice board on the ring, and a lamp pair on the south side so the evening isn't a dark ring.
2. Replace the tree-on-disc clumps with planting that follows the ring and the lanes (a second, looser ring of trees, shrub beds, low mounds).
3. Give the side buildings short paths from the lanes, or plant them behind hedges so they read as backdrop.

## Dorm courtyard: 8/10 (was 7)

Fixed since round 1:
- 1 (bare street, no opening in the front bed): fixed. The street is the same brick lane as the plaza with pale borders (dc1-desk 0-1366 x 780-860; plan/dc-plan 0-1400 x 985-1205), and the court opens from it through a gate with two lantern posts on the hall-door axis (dc1-desk 545-820 x 640-780). From above the plan is a clean cross: the walk east-west and the gate-to-door axis north-south (plan/dc-plan).
- 2 (bikes outside the shelter): fixed. The rack is under the roof (dc1-desk 1000-1170 x 330-570).
- The front beds are gravel with shrub islands, a stone lantern and a pine each side of the gate, and the roofs have AC units, vents and edges. Lit by its own things: vending machines, laundry, the entry, the sento door, the shelter strip lights and four lantern posts.

What remains:
1. **The entry is still an open box with a dark doorway** (dc1-desk 545-850 x 220-430; crop: mailboxes on the left wall, a dark recess on the right, a black lip at the front). No glass door or auto-lock panel. It's the goal the whole court points at.
2. The walk between the vending machines and the shelter is still a wide flat band (dc1-desk 150-1000 x 510-600); it's lit now, but it's the biggest bare surface in the frame.
3. A building's roof edge cuts into the bottom-right corner of the frame over the street (dc1-desk 1090-1366 x 800-860). From above, the buildings south of the street stand right on the hedge line (plan/dc-wide 850-1060 x 940-1080), and the west garden is a plain dark lawn (plan/dc-wide 40-435 x 490-805).

Top 3 next:
1. Glass double doors with a lit auto-lock panel in the entry, the mailboxes kept on the side wall.
2. Break up the walk band: a change of paving under the vending machines, a potted plant pair at the laundry, or a line of drain covers along it.
3. Pull the south building back from the street, or frame the arrival so its roof isn't in the corner.

## Eric's room: 8/10 (was 7)

Fixed since round 1:
- 1 (Eric's head covers the genkan): fixed. He arrives on the tatami edge and the genkan, his shoes and the step show below him (rm1-desk 540-750 x 630-790; rm1-phone the same).
- 2 (two thirds of the frame is dark neighbour flats): fixed. Both neighbours' flats are cut open and furnished: bed, desk and chair on the left; TV, low table with snacks, cushions, clothes rail and bed on the right (rm1-desk 0-420 and 940-1366 x 30-620). The corridor with their doors runs along the bottom.
- 3 (flat window view): fixed. The window shows a lit bathroom window across the gap with bottles on the sill (rm1-desk 620-735 x 115-180).

What remains:
1. The left neighbour's flat is sparse and dark: a bed, a desk and a stool, with about half its tatami bare (rm1-desk 60-400 x 420-590).
2. The room is dim: the desk lamp and the genkan light are the only sources, and the middle of the tatami is grey-blue (rm1-desk 480-900 x 300-600). It reads as evening, but the room Eric comes home to could be warmer.
3. The corridor wall along the bottom is a big plain face (rm1-desk 0-430 and 930-1366 x 620-860), with only the doors and meter boxes on it.

Top 3 next:
1. Put a few things in the left neighbour's flat (a rug, a laundry rack, a box or two) so it matches the right one.
2. Add a warm ceiling light or brighten the lamp pool a little, so the tatami reads as lived-in rather than cold.
3. A little life on the corridor wall: umbrellas by a door, a delivery box, a nameplate.

## The route: does it read as one designed town?

- Forecourt to plaza: yes. The forecourt lane ends at gateposts with a finger sign to the plaza and the dorms (fc6-desk 950-1300 x 270-500), and the plaza's west arm continues it in the same brick with the same pale borders, hedge and lamps. The player now arrives on that arm's axis.
- Plaza to dorm court: yes, now. He leaves on the same axis he came in on, and the dorm court's street is that brick lane again, with the gate turning off it. The one change of feel is time: the forecourt and plaza are shown in the morning and the court only in the evening, which is the story's day, not a kit mismatch.
- Dorm court to room: the hall door is on the gate axis, and the room opens on his shoes in the genkan. Consistent.
- Kit repeats to watch: the same round shrub ball at even spacing in the forecourt lane beds, the plaza ring and the dorm front beds; the tree-on-a-mown-disc clump on the forecourt and plaza lawns.

# Re-score 3 (2026-09-30, after round 3)

Build 0930-1542-a58c3a2 (HEAD a58c3a2: forecourt a58c3a2, plaza a336abe). Same method and bar as above; the builders' self-scores weren't read. Shots: game3d/shots/env-rescore3/{forecourt,plaza,dorm}/ from game3d/tools/place-shots.mjs at 1366x860 (`-desk`) and 390x844 (`-phone`), q=1, the same spots as Re-score 2, morning and evening (`e`) for the forecourt and plaza, plus pl6e. Plans from straight above in game3d/shots/env-rescore3/plan/ (fc-plan, fce-plan, pl-plan, ple-plan, pl-wide, dc-plan, dc-wide, rm-plan; the same scratch camera script, no game file changed). The evening clock chip still says "Early morning"; not scored.

| Place | Round 2 | Now | Verdict |
|---|---|---|---|
| Forecourt | 7 | 8 | Pass. The station hall now reads as a station exit (fare machine and map on the wall, the guide line from the gate to the court, a 出口 EXIT marker, lit floor, no dark doorway). The lane-side strips are one garden with a court, and the service alley is a gated yard with a purpose. What's left is a thin gate line and bare floor in the hall's west half. |
| Fountain plaza | 7 | 8 | Pass. The south half of the circle now mirrors the north (benches on the rim, trees, a lamp pair and a notice board on the axis), and at dusk flush lights round the basin light the middle, so the disc reads as a furnished, lit square rather than an empty field. The outer lawns still have trees on mown discs. |
| Dorm courtyard | 8 | 8 | Still passes. Every shot matches round 2 except for the build stamp (compare at 12% fuzz: about 70 differing pixels, all in the stamp), so the shared kit changes didn't reach it. |
| Eric's room | 8 | 8 | Still passes; unchanged in the same way. |

All four pass.

## Forecourt: 8/10 (was 7)

Fixed since round 2:
- 1 (the station hall is empty): mostly fixed. A fare machine with a fare map above it stands against the hall's north wall (fc1-desk 115-190 x 435-535). The guide line now runs from the gate through the hall and out onto the court walk (fc1-desk 250-340 x 440-860). A floor marker "↑ 出口 EXIT" points to the doorway (fc1-desk 145-235 x 607-625). The dark doorway rectangle is gone, and downlight pools on the floor light the hall morning and evening (fc1e-desk 0-700 x 510-860).
- 2 (lane-side gardens as parallel strips): fixed. South of the lane is now one garden: layered shrub drifts, specimen trees standing in the lawn, rocks, and a garden court (a timber deck with a bench and a stone lantern) reached from a gap in the lane hedge by stepping stones (fc6-desk 200-1366 x 490-860; fc5-desk 580-1366 x 500-860; plan/fc-plan 1020-1400 x 700-1000). The bare lawn panel is gone.
- 3 (service alley that leads nowhere): fixed. It's closed at the court by a railing gate with a STAFF ONLY plate, and it has a cart of boxes, a parked bike and a refuse store with a mesh gate at the end (fc1-desk 720-880 x 0-245; fc3-desk 320-490 x 30-410).

What remains, most visible first:
1. The station gate is still one arch with two card posts (fc1-desk 235-375 x 615-705), and the hall's west half is bare tile with one bench (fc1-desk 0-230 x 520-860). It reads as a station now, but a thin one.
2. The shrub drifts are piles of the same round shrub mesh packed tight (fc6-desk 240-900 x 540-690), and the bed edges step at right angles like tool outlines (fc6-desk 220-390 x 660-860). In the evening the garden court is unlit, so the deck and bench sink into the dark (fc6e-desk 400-640 x 680-810).
3. The service yard has no light at dusk (fc1e-desk 720-880 x 0-245).
4. Not in the player camera: from above, the west lawn is still a big field with a few trees that ends in a straight line at the navy void, with a path from the station down to the water (plan/fc-plan 105-420 x 235-1160, 400-480 x 1065-1240). The ground floor east of the head office door is still a darker glass band (fc5-desk 620-970 x 280-380).

Top 3 next:
1. A second and third ticket gate in the gate line, and a bench pair or a coin locker bank in the hall's west half.
2. Mix the garden drifts: two or three shrub sizes and one lower ground cover, looser bed edges; one low garden light at the deck.
3. A wall light over the service yard gate.

## Fountain plaza: 8/10 (was 7)

The layout is Jørgen's approved one; this judges it and proposes no change to it.

Fixed since round 2:
- 1 (the disc is a large empty field, the south half has nothing, dark middle at dusk): fixed. The south half mirrors the north: benches on the rim at south-west and south-east (pl3-desk 110-190 x 610-690, 1255-1330 x 610-690), trees in the ring, a lamp pair flanking a notice board on the south axis (pl3-desk 525-935 x 780-860; plan/pl-plan 665-735 x 1065-1085), and the west arm has a bench and bin on both sides (pl1-desk 515-600 x 245-380, 495-580 x 605-790). Eight flush lights set in the ring round the basin light the middle at dusk, and with the rim lamps the evening plaza is two even rings of light (pl3e-desk; plan/ple-plan). The paving between is open, which reads as the square's floor now that its edges are furnished.

What remains, most visible first:
1. The lawns outside the ring still have trees standing on pale mown discs with no path to them (pl1-desk 0-230 x 130-350 and 0-110 x 680-750; pl4e-desk 1170-1260 x 290-350, 1260-1350 x 670-720; plan/pl-plan 190-340 x 1110-1200, 1060-1210 x 1120-1200). They show in the arrival and exit frames.
2. From above, the side buildings still stand on the lawn with no way in (plan/pl-wide 160-350 x 350-450, 1095-1300 x 365-510, 1070-1400 x 805-920). Not in the player camera.
3. On the phone, the arrival frame is still mostly paving and the lane he came in on is off the left edge (pl1-phone).
4. UI, not environment: the "To head office" button sits over the basin in pl4 and pl6 (pl6-desk 12-172 x 428-470; the phone back button on pl3-phone and pl5e-phone).

Top 3 next:
1. Replace the mown discs with planting that follows the ring and the arms (tree groups in shrub beds or low mounds).
2. Short paths from the arms to the side buildings, or hedges in front of them.
3. Start the phone arrival camera a little further west so the arm shows.

## Dorm courtyard and Eric's room: 8/10 each (unchanged)

The spot-check shots (dc1, dc3, dc4, rm1, rm2, desk and phone, and plan/dc-plan, dc-wide, rm-plan) match round 2 apart from the build stamp. The remaining items and top 3 from Re-score 2 still stand.

## Top 3 next across the four

1. Forecourt: a fuller gate line and something in the hall's west half.
2. Plaza: planting instead of the tree-on-mown-disc clumps on the outer lawns (the same pattern the round 2 route note flagged on the forecourt lawns).
3. Evening light at the two new forecourt features (garden court, service yard), so the dusk shots hold up like the plaza's.
