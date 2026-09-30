# Map upgrade plan: the day-1 outdoor route (island-map-4)

Written 2026-09-30 after Jørgen: "I have a feeling they are lazily built out ... a standalone elevator with literally nothing over it ... the map does not seem to conform well to the map reference. I want a Thorough map upgrade."

Sources: reviews/island-map-4 (art/candidates/island-map-4/01-overview.png, brief.md, qa.md), island-map-3 and island-places decisions, gate-location, docs/game/places.md, setting.md, art-and-sound.md, notes/PERF.md, current captures. The in-game map, the overlay against the reference and notes/map-gaps.md come from the map task (A below).

Rules for every task:
- Muted palette only: the security room's slate and concrete greys, blue-grey glazing, the platform-roof blue-grey `#56697d`, TOWN colours in scenes/town.js. Map colours are muted to these (turquoise water → `#50667a`, green gym roof → about `#6f7d72`).
- Flat-shaded, and the look (js/look) applies.
- No cars, no roads. Bikes only.
- Any Japanese sign also carries English, as 本社 HEAD OFFICE does now.

## 0. What is wrong now

- **Head office** (scenes/forecourt.js `headOffice()` l.76-134):
  - The "building" is a 3.8 x 1.9 roofless box, 2.2 high, holding one lift.
  - Behind it there is only a roof slab in MeshBasicMaterial `ROOF` `#5d636c` (l.19-21, l.107-123). That is exactly `scene.background` (l.233), so it reads as a hole.
  - The lift's lid is also painted in the background colour: `setCap` copies `scene.background` (places/lift.js l.727).
  - The "tower" is a 4.8 x 9 x 3.6 box set 2.4 units behind the lobby (l.124-133), mostly out of frame.
  - Result: the standalone lift with nothing over it.
- **Station**:
  - A floor slab with a 0.45-high wall covering only x -7..1.2 (l.51).
  - The security room is 12.6 x 9 (scenes/lobby.js X=6.3, Z=4.5). Its exit at local x=-1 puts the room at forecourt x -6.8..5.8, so the east half of the station is drawn as grass (town() l.205).
  - The room's second back-wall door (lobby.js l.506-509, forecourt x 3.45) has no counterpart outside.
  - No station massing, roof, beam or walkway. The platform roof is a free-standing half-cylinder (l.61-73).
- **Court**: about 5 units. On the map it is a real plaza with rows of bikes.
- **Background**: 7 arbitrary boxes (l.207-215), not taken from the map. The same tower is a different box in every chunk (the plaza's is 4.4 x 3.6 x 9 at (-10.2,-7.4), scenes/plaza.js l.175).
- **Cars**: a road south of the station (town() l.201; `TOWN.road`; places.md forecourt paragraph). Breaks the no-cars rule.
- **Plaza** (scenes/plaza.js):
  - The canteen is a 6.4 x 3 x 2.0 box (l.160-162). The map has a two-storey hall with rooftop plant.
  - The shops are one row of single-storey units facing the fountain lane (l.113-156). The map and brief have two rows of two-storey shops facing each other under a covered arcade, backs to the lane.
  - No merge pass.
- **Dorm court** (scenes/dorm-court.js): one 4-storey slab, 8 wide (l.132-158), plus two plain boxes (l.248-249). The map has a cluster of 5-7 storey blocks around planted inner courts. It is the only chunk that merges (l.288).
- **No shared frame**: every chunk is placed by hand in its own coordinates.
- **Draw calls** (shots/town-detail/after/metrics.json, q0, phone / desktop): forecourt 334 / 387 (over the 250 phone budget), plaza 154 / 183, dorm_court 117 / 128, dorms 147. `optimizePlace` runs for the office only (places/lifecycle.js l.39); budgets.json has no outdoor chunks.

## 1. One shared island frame

- 1 unit = 1.5 m. x runs east, z runs south, every chunk's camera looks north (yaw 0). Island north = the reference image's "up" after ground-plane rectification. Origin = the head office entrance door.
- Superseded 2026-09-30 (grid-frame): the frame is turned onto the town grid, so "north" is the grid's north (island-layout.js REF.turn; notes/map-gaps.md F2).
- Data file `game3d/js/scenes/island-layout.js` (pure data plus helpers): `UNIT`; `CHUNKS` (island origin of each chunk's local (0,0) and its walk rectangle); `BUILDINGS` [{id, kind, rect or poly, storeys, floorH, wall, roof, windows: 'office'|'flat'|'dorm'|'shop', detail}]; `PATHS`, `GREEN`, `COAST`; `toLocal(chunk, x, z)`.
- Fit positions to the reference by a homography on 6 control points in 01-overview.png (1536x1024, approximate): beam landfall (330,585), station centre (410,555), head office tower base centre (545,545), fountain centre (715,612), shop row west and east ends (395,640) and (830,780), dorm court entrance (985,700).
- Starting estimates (±30%; the overlay decides): station door → HO door about 10 east, 7 north; HO door → fountain about 50 east-southeast; fountain → dorm court about 85 east-southeast.
- Chunks are crossfaded (places/edge-walk.js), so they can be far apart. Every chunk's background is cut from the same `BUILDINGS` list, so each shows the same neighbours in the same directions.
- The map task's overlay draws `BUILDINGS`, `PATHS` and each chunk's walk rectangle over the reference. That overlay is the acceptance check for sections 3-6. Every task quotes the notes/map-gaps.md entries it closes and the ones it defers, with the reason.
- Occlusion rule (camera at 46°): anything of height h hides the ground up to 0.97h north of its north face. Nothing south of a walk line may be taller than 0.95 x its distance to that line, unless it is a registered occluder (section 2) that fades.

## 2. Shared kit

**`game3d/js/scenes/skyline.js`**: `buildSkyline(root, chunkId, {near=26, far=60, evening})` builds from `BUILDINGS`.
- Near ring (≤ near): boxes with parapet, roof plant boxes, window rows on faces toward the camera and the chunk. Merged by colour: 4 wall meshes, 1 roof, 1 window, 1 lit-window (emissive, evening only, toggled in `onPeriod`), 1 fins/bands. Shadows only within 12 units (town.js l.158).
- Far ring: plain `BoxGeometry`, windows as 2-triangle quads, `userData.noLook`, no shadows. On phone (q0) the far ring drops its windows.
- Ground replaces each chunk's 40x40 slab: paving and green from `PATHS`/`GREEN`, sea from `COAST`, so the frame edge never shows `scene.background`.
- Budget: ≤ 10 draw calls and ≤ 25k triangles per chunk.

**`game3d/js/scenes/occluders.js`**: `addOccluder(place, meshes, test)` / `updateOccluders(place, pos, dt)`.
- Fades a building's upper mass with `alphaHash` opacity, 0 to 1 over 0.3 s.
- Two tests: footprint ("Eric is inside the lobby, or riding the lift") and screen-shadow (Eric within 0.97h north of the box's north face and inside its x range).
- Occluder meshes are pre-merged per material and named, so `mergeStatic` (merge-static.js l.13) and batch.js leave them alone. The look still applies (alphaHash is not `transparent`, look/index.js l.110).

**places/lift.js**: `setCap` uses `site.capColor ?? scene.background` (l.727), so the lid can be the lift core's top instead of a hole.

## 3. Forecourt (station → court → head office)

**Reference**: the blue platform shed runs north-northeast along the west coast, the beam arriving from the west on piers at its south end. The station/security building is a separate two-storey flat-roofed block with parapet and small entrance canopy at the shed's south end. An open court with rows of bikes, planting and trees. The head office is the tallest building on the island: a roughly square tower of 11-12 storeys, blue-grey glazing, pale vertical fins, rooftop plant; a lower 3-4 storey wing north-west of it. Behind, 4-5 storey offices step north. The lane leaves east along the tower's south side toward the fountain. Station and tower never join; the court is open sky.

**Changes** (local frame; the station door stays at (-1.5, 2.65) so the gate→forecourt crossfade keeps working):

- **Head office**, new `scenes/head-office.js` exporting `buildHeadOffice(root, nav)` and `FORECOURT_LIFT_SITE`:
  - Tower footprint about 11 x 8, south face at about z -4.6, west edge at about x 4 (fit on the overlay).
  - Ground floor 2.4; 9 upper floors of 2.0; about 20 units (30 m) in all, top leaving the desktop frame.
  - Curtain wall: window rows, pale fins, floor bands, merged. Roof parapet and plant boxes. A 3-storey west wing north of the court.
  - Entrance on the south face near the SW corner, facing the station door across the court, under a cantilevered canopy with 本社 HEAD OFFICE on its fascia. The monument stone stays.
  - Lobby around the lift, about 8 x 5: a free-standing lift core at the back-centre with the B2 car's doors (existing lift site, `capColor` = core top) and a second car's closed doors signed "6F-10F"; a stair door; the reception counter, where Kuro now works (Jørgen, 2026-09-30: "Then kuro should be there rather than at security"; she moves out of the gate room, with her body, spots, schedule and small moments, and cast.md/places.md follow); an English floor directory (only "5F Sales" and "B2 IT Support" readable); two sofas, plants, umbrella stand, the two existing wall lamps. No second gate.
  - Everything above the ground floor is one occluder (footprint test): it fades while Eric is in the lobby or the car, so the lobby and the lift ride (lift.js `rideShot`, RIDE_ELEV 50) read, and comes back as he walks out. In the evening this is the "wall rising behind him" places.md promises.
  - Delete the background-coloured roof plates and the old `TOWER_Z` box.
- **Station exterior**, new `scenes/station-exterior.js`:
  - Massing over the gate room's footprint: x -6.8..5.8, z 2.65..11.65. Two storeys (1.9 + 1.9 + 0.3 parapet), small canopy over the north exit, the staff door at x 3.45, tall windows on the east face.
  - Upper storey and roof are an occluder (screen-shadow test): within about 4 units of the station they fade to the current cut-low look; otherwise the station stands whole at the bottom-left, visible when Eric leaves the head office or looks back.
  - The shed moves west of the station (about x -9.6..-7.0), the beam on piers heading west at about y 2.4. A covered walkway from the shed's south end to the station's south front.
- **Court** (forecourt.js `ground()/court()/town()`):
  - Enlarge to about x -6.8..4, z -4.6..2.65 (about 16 x 11 m).
  - Worn walk line door to door; two bike-rack rows with a merged group of 8-10 bikes; two planted beds with trees; lamps; the bench against the station. The east lane starts along the tower's south face, with the hedge.
  - Remove the road and `TOWN.road`; south of the station is a paved walkway and grass.
  - Background from `buildSkyline('forecourt')`.
- **Camera** (places/forecourt.js `fit` l.87-113): desktop becomes follow-with-clamp over the larger court. Update `plazaLane/plazaEdge/plazaIn` and the zone.
- **Save**: `restoreState` snaps an old saved position to the nearest walkable cell.
- **Docs**: rewrite the places.md forecourt paragraph. Ids stay: station_exit, office_entrance, lift, plaza_lane.

## 4. Plaza

**Reference**: a round paved plaza with a central fountain where the lane from head office (west-northwest) meets the lane to the dorms (east-southeast). North: the canteen, a two-storey hall with blue roof, rooftop units and an umbrella terrace facing the fountain. South past the lane: the shotengai, two rows of two-storey shops facing each other under one covered arcade, the north row's backs to the lane. West: trees and 2-3 storey blocks, the tower beyond. East: small buildings on the lane (the clinic), the dorm cluster beyond. Background north: 4-5 storey offices and the gym's arched roof.

**Changes** (scenes/plaza.js, plaza-details.js):
- Canteen about 10 x 5, 2 storeys (4.2), roof `#56697d` with parapet and 3 plant boxes, glazed ground floor, 5-6 umbrellas.
- Shops: move the north row south to about z 4.2 so a 2-storey row (h 2.9) clears the lane; the verge gains a pavement and shrubs; a slim opaque arcade roof (`#9aa4ad`) spans to the south row at about z 7, whose roofs and signs show beyond it. Rooftop kana signs stay bilingual. Update places.md: the awnings face the arcade.
- The lane bends a little around the plaza's near edge; edge points stay where the crossfades need them.
- Background: replace `town()` blocks (l.174-180) with `buildSkyline('plaza')`.
- `mergeStatic(root)` at the end of `buildPlaza`.

## 5. Dorm courtyard and room

**Reference**: a south-east cluster of pale concrete blocks, 5-7 storeys, some L-shaped, around planted inner courts; balcony bands on south faces; the entrance court at the cluster's west side with bike parking; promenade and sea wall along the south.

**Changes** (scenes/dorm-court.js, dorm-court/frontages.js):
- Eric's block: 5 storeys (update places.md), extended past both frame edges (about 18 units), balcony rhythm, laundry poles on a few balconies, an L-return east.
- The other blocks placed from `BUILDINGS` by `buildSkyline('dorm_court')`, replacing `massing()` l.248-256. The sento chimney stays, from the layout.
- Evening lit windows use the skyline's emissive mesh.
- Room (scenes/dorms.js): no change; the layout puts a neighbouring wall about 1.3 units from Eric's window side, so the concrete wall outside is true in the frame.

## 6. Gate and train

No interior change. The station exterior must match the gate room's footprint, doors and windows, and the train's covered walkway.

## 7. Performance (notes/PERF.md: 250 calls a frame, 300k triangles, phone q0)

Target per outdoor chunk: ≤ 200 calls at q0 phone, ≤ 120k triangles.
- Every chunk builder ends with `mergeStatic`. Run `optimizePlace` for forecourt, plaza and dorm_court (lifecycle.js l.39).
- Background only from `buildSkyline`: ≤ 10 calls, far ring without look or shadows.
- Occluders: ≤ 2 per chunk, ≤ 5 materials each, named so they are not re-batched.
- Repeats (bikes, trees, windows) merged, not instanced (InstancedMesh loses the look, look/index.js l.108).
- Textured signs ≤ 6 per chunk; light pools ≤ 8.
- New tower and skyline builders are generators that `yield` per building, so preparation keeps its longest task under 50 ms at CPU 4x (`tools/perf/hitch.mjs`).
- After the upgrade, add forecourt, plaza and dorm_court to game3d/tools/perf/budgets.json with `PERF_BASELINE=1` at both sizes.

## 8. Order of work

Each task in its own worktree, proving itself in a screenshot and on the map overlay.

- **A. Island frame, in-game map and overlay.** The map task: scenes/island-layout.js (or its own frame file, one only), the map screen, the compare view, notes/map-gaps.md. Check: overlay of the layout on 01-overview.png, control points within about 3 units.
- **B. Skyline and occluder kit.** scenes/skyline.js, scenes/occluders.js, the lift.js `capColor` line. Check: `?place=dorm_court` still with `buildSkyline` against stub data, calls/tris numbers. Runs alongside A.
- **C. Head office.** scenes/head-office.js; only the import and call in forecourt.js; Kuro moved from the gate room to the lobby reception (places.md gate and forecourt tables, cast.md). Her lines point at the guard today; ask Codex (collab/to-codex.md) to rewrite them for the lobby. Check at 1366x860 and 390x844: (1) Eric at the station door, tower, canopy and entrance legible, no background-coloured plates; (2) Eric in the lobby, tower faded, core, second lift, reception and directory visible; (3) the lift ride stills; (4) the evening walk out of the lift, the tower returns.
- **D. Station exterior and court.** scenes/station-exterior.js, forecourt.js ground/court/town, places/forecourt.js fit/points/save. Check: (1) the gate→forecourt crossfade frames match; (2) Eric at the HO door with the station whole at bottom-left, shed and beam; (3) no road. C and D share the HO front line and door x above, so they can run in parallel.
- **E. Plaza.** scenes/plaza.js, plaza-details.js, places/plaza.js (points only). Check: desktop/phone shots, 2-storey canteen, arcade shops clear of the lane, Eric never hidden on the lane.
- **F. Dorm court.** scenes/dorm-court.js, dorm-court/frontages.js. Check: evening shots at both sizes, the block past both frame edges, the cluster behind.
- **G. Performance and docs sweep.** budgets.json, lifecycle.js optimizePlace, places.md sections (C-F each edit only their own section; G checks them). Check: fast test at both sizes, `node tools/facts/check.mjs`, ≤ 200 phone calls per chunk, a hitch.mjs table.
- **Final.** The map task re-runs the overlay and updates notes/map-gaps.md. Captures go to the Showcase log.

Open question, not a blocker: the station exit faces north because the gate room stays as it is (gate-location), while the map brief has it facing east. The tower's relation to the station (north-east) still matches.
