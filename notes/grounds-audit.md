# Grounds audit: what around the walkable places isn't modelled

Jørgen, 2026-10-05: "the outer grounds should be fully modelled". This note lists, area by area, the ground and buildings the player can see on days 1 to 3 that are not really modelled. It is an audit only; nothing was changed. Build 1005-1923 (f90fe557) to 1005-1935.

Coordinates are island units (x east, z south; 1 unit = 1.5 m) from game3d/js/scenes/island-layout.js, unless a line says "local". Sizes: S is an afternoon, M is one builder task, L is several.

## How the grounds are built today

Each outdoor place models its own walk in detail. Everything else comes from buildSkyline (game3d/js/scenes/skyline.js): flat land, flat grass and flat path strips in one vertex-coloured mesh, and every building it doesn't model is a box with rows of window quads (no ground floor, door, canopy or plinth). The details along the coast and the station's south walks (scenes/outdoor/coast.js) are partly drawn on MAP_LAYER only, so the map shows them and the game camera doesn't.

A few places share their neighbours' builders: the plaza builds the east lane, the back lane, the shop rows and the dorm cluster, and the sports ground builds the office street's east end. Most others don't. So walking toward an exit, the player sees the next place as flat colour and boxes, and it only gets detail after the crossfade.

The play camera is close (29 to 35 units at 40 to 58 degrees, no zoom), so the gaps show at the ends of each walk. From the middle of a place the view is well modelled. The forecourt, the head office's front, the cross street behind the tower, the plaza, the dorm courtyard and the gate room all look finished from every reachable spot.

## By area

### Dorm street foot (east lane, east coast and shop street meet)
- East coast's west end, the dorm row at the dorm street (75.8, 11.9; east_coast local -50.7, 1.4). A large flat grey land slab south of the row and a plain box building cut off at the frame edge. The dorm street and ramen corner aren't built in this place. M.
- Shop street's east mouth (75.8, 18 to 22; shotengai local 2, 11.3). The arcade-end paving stops in flat grass; the izakaya/ramen side shows as a plain box. M.
- East lane's south end at the same corner (78.6, 11.9) shows the same from the other side. Covered by the two fixes above.

### East lane to sports ground (north street)
- East lane's north end (67.8, -38.4; local -1.4, -35.6) and sports' south end (67.9, -37.0; local 9.7, 20.5). On both sides the walk runs into a flat lawn with no planting, and r3/block_e3 show as plain window boxes. M.

### Shop street's west end and the station's south side
- Shop street's west end (-13.2, 32.2 and -7.3, 20.0; shotengai local -12, -77.7). A big flat lawn, flat path strips with no kerbs or lamps, and a lone torii beyond the rows. South of the station's covered walkway (around -14, 21) it's the same: flat beige strips, mown stripes, nothing standing. The walks are drawn on the map layer only. M.

### East coast inner field
- Between the dorm cluster and the tennis courts (100 to 118, -20 to -50). A large empty lawn with dorm_6 and housing_n as plain boxes. You can see it from the east coast walk and the courts walk. M.
- Courts walk west end (102.0, -80.9; east_coast local -24.5, -91.4) and the onsen path's west end from sports (101.7, -58.5; sports local 43.5, -1): flat grass past the paving on both sides. S to M.

### Sports ground
- North of the pool pavilion (57.3, -90.9; sports local -0.9, -33.4). Flat green and a flat grey slab behind the pavilion. S.
- West end, the sports lane past the gym toward the office street (26.1, -52.5; local -32.1, 5). The paving runs into a flat slab and flat grass, and a plain box sits on the corner. The office street is modelled, but only in its own place. M.

### Office street
- South of the street (along z -45 to -50, x -40 to 40). Long strips of flat lawn with a few shrubs, then flat grass. The blocks south of it (b_h, w3 and others) are plain boxes. M.
- West end toward the harbour (-39.9, -52.5; local -44.4, 1.5). A flat beige walk and a dark flat slab running north. Covered by the harbour seam below.

### Harbour and old works (reachable by free walking; no day 1 to 3 story)
- Harbour's north edge at the works lane mouth and research walk (-83.5, -101.2 and -62.0, -98.0). Eric walks on flat beige paving between flat lawns; the works buildings are boxes until you cross. M.
- Harbour's east end at the office street (-30.7, -55.4) and its south walk toward the head office (-40.6, -29.5). Flat slabs and lawns with kerb lines only. M.
- Works' south end at the office street (-47.0, -55.6; works local 35, 48.4). Flat beige paving. Seen from the works, the harbour's supply yard is one flat beige slab with a single shed. M.

### Head office outer grounds (not seen in play today)
- North of the cross street (x -15 to 20, z -45 to -20): flat lawn with scattered trees and flat path strips. The facilities office (office_e1), the print shop (w3) and the bank (b_h) are plain boxes. The tower hides this from the forecourt camera. It shows on the map with Backdrop on. M.
- The west coast walk north of the platform shed (x -45 to -30, z -60 to -25): flat path strips and mown stripes. Visible from the harbour's south walk. M.

### Everywhere: the boxes
- Every building the skyline draws (most of the 64 in the layout) is a box with window quads: no ground floor, entrance, plinth or roof edge. This shows up at every seam above. plaza/east-fronts.js (frontsSteps) already builds proper fronts from a footprint and storeys. Running it on the near-ring blocks within about 30 units of any walk would fix most of them in one go. L (M if limited to the blocks named above).

Things that are fine: there's no void past the walkable area at play distances (camera far plane 200 and land to the island's edge everywhere). The sea plane's square edge and the north half's empty land only show from far above. The train's run-in shows coast and trees close up.

## Suggested order

1. The dorm street foot (east coast west end and shop street east mouth). Day 2 walks past it.
2. East lane to sports (north street), on day 3.
3. The shop street's west end and the station's south side, seen on day 2's shop street visit.
4. The east coast inner field and the courts walk and onsen path ends (days 2 and 3).
5. Fronts for the near-ring boxes at those seams (frontsSteps).
6. The sports west end and the office street's south side.
7. The harbour and works seams (free walking only).
8. The head office's north grounds and the west coast walk north, which only show on the map today.

One fix covers most of 1 to 7: give each place a band about 20 units deep past each exit, built with the neighbour's own ground builders, the way the plaza already builds the east lane and the back lane.

## Shots

In the session scratchpad, /tmp/claude-1000/-home-jorgen-repo-japanese/9f7d25e8-9b3d-45d6-bcce-5ed7c03ee8bb/scratchpad/ga/ (temporary; rerun the scripts there to regenerate):

- start/: each outdoor place at its start, desktop.
- edges/: Eric on the reachable cells furthest out in 8 directions, play camera, `<place>-e<n>-desk.png` and `-phone.png` (1366x860, 390x844). Shots with camera distance 19.3 caught a trip's walk-out and were not used.
- over/: zoomed-out views per place at the play angle; top/: straight down over each place's whole backdrop.
- look/: the head office's north side, the shed street, the station's south side, the west coast north, the east coast field and the north street.
- map/: map-backdrop.png, map.png and plan.png from map-shots.mjs.
- sheet-*.png: contact sheets of the above.
- Scripts: gshots.mjs (place, optional Eric spot, camera override), gedges.mjs (edge spots per place), ga/coords.mjs (local to island coordinates), ga/sheet.py.
