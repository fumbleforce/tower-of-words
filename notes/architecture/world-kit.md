# World kit: what we have, what is built twice, and how to share it

2026-10-09, issue #367. A read-only audit of game3d/js on main at e0dbbfe4, with a proposal. No game code was changed. Line numbers are for that commit and will drift. Codex leads architecture review in this repo, so every stage below that moves code names that review.

Jørgen asked for this: "I'd also like to have an asset library in the bible, i have the impression we have a lot of custom stuff that could be reused rather than recreated every time. The project in general needs to be well architected, DRY and well organized to allow for future expansion and game systems that interact well, graphics that are consistent across the map and feels hand-placed and unique even with some shared assets."

His impression is right. The outdoor places already share a good kit, and most of the copying happens around it: in interiors, in one-off scenes, and in three separate lines of visual experiments. The asset library he has today lists 16 hand-picked props and nothing of the outdoor kit.

## 1. What exists today

The world is almost entirely built in code. On main the only GLBs are the characters and the monorail (train/models.js:154, made by tools/train/monorail.py). The planting lane is adding the first world GLB (tools/grounds/planting.py, game3d/assets/outdoor/planting.glb, loaded by a new scenes/outdoor/plant-models.js).

### The shared kits

| Kit | File | Lines | Importers | What is in it |
|---|---|---:|---:|---|
| Parts collector | scenes/outdoor/parts.js | 144 | 54 | `Parts` (merges geometry by material, colour in vertices), `rng`, `hash2`, `along`, `pools` |
| Street furniture | scenes/outdoor/furniture.js | 262 | 59 | `lamps` :66, `bench` :118, `bins` :134, `bollard` :149, `fingerSign` :156, `stoneLantern` :194, `handrail` :224, `bikeRack` :247, `lightSet` :37 |
| Planting | scenes/outdoor/planting.js | 271 | 47 | five tree species :52-161, `mound`, `cluster`, `hedge` :181, `grass`, `bed` :213, `treePit`, `gravel`, `planter` :253 |
| Kerbs and walls | scenes/outdoor/edges.js | 118 | 27 | `kerb` :43, `kerbRect` :69, `lowWall` :77, `wallRect` :82 |
| Paving | scenes/outdoor/paving.js | 244 | 31 | `paver()` :70 with fields, borders and tactile strips |
| Building blocks | scenes/outdoor/block.js, block-style.js, block-face.js | 449 | 18 | `officeBlockSteps` :61, `glassFront`, `punched` windows, `copedParapet`, `roofPlant`, `frontDoor` :147, `deepCanopy`, `entrance` |
| Nooks | scenes/outdoor/nooks.js, nook-kits.js, nook-yards.js | 564 | 8 | vending, shrine, bench bay, lookout kits placed from plan data |
| Roofs | scenes/dorm-court/roofs.js | ~100 | 5 | `flatRoof` :20, `slope` :61, `tiledRoof` :82 |
| Signs | scenes/plaza-buildings.js `signBoard` :39 | 19 | ~12 | the common shop and room sign |
| Light and time of day | scenes/town.js | ~250 | 36 | `outdoorLight` :233, `eveningLight` :194, `sunFollow` :217, the morning and evening grades |
| Interior props | props.js | 540 | 111 | `mat()` cache :58 (about 200 calls), `rbox`, `textTexture` :84, `wall`, `door`, `desk`, `shelf`, `plant`, `pinboard`, `clock` |
| Detailed interior props | look/detail.js | 665 | 6 | the detailed twins of the props.js builders, chosen by `LOOK.detail` |
| Room shells | scenes/rooms/shell.js, rooms/enclosure.js | ~140 | 10 and 4 | wall shells and `roomLights` :47 |
| Interior box kit | scenes/dorms/kit.js | small | ~20 | the `Kit` box and cylinder helpers used by every small interior |
| Geometry primitives | train/kit.js | 548 | 18 | `Geo`, `loft`, `box`, `cyl`, `ball`, `strand`, plus its own `rng` :8 |
| Surface shaders | look/procedural.js, look/exterior.js | 381 | 4 | `patchMaterial` :258 with 21 surface kinds (concrete, bark, grass, cladding, metal...) |
| Light bake | look/bake.js | 236 | 1 | vertex-colour occlusion and warm light, once at load |

Most outdoor pieces are parameterised the same way: `piece(p, x, z, facing, opts)` writing into a `Parts` collector, with a `seed` where shape varies. That is a good base. The bench even records its seats in `p.seats`, which is the kind of link between a piece and a game system the rest should have.

Three things are named or placed in a way that hides what they are. `train/kit.js` is the general geometry kit and is imported by cast.js, avatar.js, props.js and creatures/, none of them trains. `scenes/outdoor/parts.js:4` imports `lightPool` from places/life.js, so the lowest-level kit depends on a place module. And `scenes/town.js` holds the shared outdoor lighting under a name that says nothing about light.

### Experiments that sit beside the kit

- scenes/diorama/ (about 1,400 lines) is the street style, the only outdoor look since #321 (Review street-style-default-1), so far built for the forecourt only. It has its own trees, hedges, meadow, leaf canopy, world-space materials and reflections; the kit is where it becomes reusable (notes/outdoor-plan.md).
- game3d/js/showcase/ (trim.js 411, decals.js 564, room.js, main.js) is the standalone trim-sheet test page, game3d/showcase.html. The game does not import it.
- scenes/works/verges.js, verge-foliage.js and verge-plan.js (about 320 lines) are a second foliage style used only at the works and its yard.

## 2. Things built more than once

Rough line counts are what would go if each family were merged into one parameterised piece. They add up to roughly 1,500 lines in live code, plus up to 2,800 more if the diorama and showcase experiments are retired after their good parts are harvested.

### Materials and reflections (#366 covers part of this)

- **Five hand-made reflection maps, all canvas-drawn.** `sportsGlass()` scenes/sports/gym-facade.js:6-60 and `hutPane()` scenes/harbour/loading-details.js:97-149 are the same algorithm: six gradient faces into a CubeTexture, then the same `envmap_physical_pars` patch that shifts the reflection with height. Only colours and sizes differ. `streetReflections()` scenes/diorama/reflections.js:5-48 is a third cube map, `skyEnv()` train/models.js:65-102 an equirect sky with a sun glow, and `windowPane()` reflections.js:52-134 an interior atlas. One cached sky environment plus one local-glass material would remove about 170 lines.
- **Glass that lights at dusk** is written four times: plaza-buildings.js:29 `litGlass`, plaza/furniture.js:68, sports/pool.js:312, station-exterior.js:163. The same window glass colour `#8c9dad` with the same roughness appears in station-exterior.js:163, head-office.js:99 and outdoor/block.js:41. Transparent pane settings (opacity 0.12 to 0.45, `depthWrite: false`) repeat about eight times, and lobby.js:239 and :614 are one material written twice.
- **Metal** has no shared definition. The harbour has a `METAL` preset (loading-details.js:5), five scenes pass `{ surf: 'metal' }`, and about 20 places set `metalness` by hand (office.js:920 and four more lines, places/lift.js:164-260, train/car.js:512 and :866, door-leaf.js:18 and :32, plaza/fountain.js:158).
- **Noise and bump shader code** is redefined in diorama/materials.js:30-34 and :95-104 and in diorama/canopy.js:72-80 and :96-105, although look/procedural.js already has the same functions. Diorama's brick, bark, grass and concrete repeat surface kinds procedural.js already has.
- **Material caches**: four copies of the colour-plus-options Map cache (props.js:57, train/doors.js:17, train/car.js:84, places/lift.js:106, the last one separate on purpose for clip planes). About 180 `new THREE.MeshStandardMaterial/MeshBasicMaterial` calls bypass `mat()`. Many do it on purpose, because the evening or a fade changes that material, and that reason is only ever a comment. A named `mat.own()` would make it visible.
- **Seeded random**: about 15 copies of the same few generators, e.g. train/kit.js:8, outdoor/parts.js:11, outdoor/pigeons.js:19, showcase/trim.js:31, showcase/decals.js:30, plaza/fountain.js:20, places/life.js:55, places/train.js:738, campus/landscape-plan.js:161, campus/quarter-plan.js:110, look/detail.js:380 and :532, props.js:119 and :443, creatures/cat-rig.js:85, plus three string hashes (look/bake.js:22, head-office/frame.js:116, skyline.js:76).

### Street furniture (about 400 lines)

- **Vending machines**, five builds: outdoor/nook-kits.js:20, dorm-court/fittings.js:114 (same size and colours rebuilt by hand), east-coast/terrace-details.js:56, office.js:124, and the related fare machines in station-fittings.js:151. The machine front is drawn twice by different code for the same picture: `drinksFace` in nook-kits.js:41 and in vending-face.js:4. About 80 lines.
- **Fences and rails**, eight or more: works/props.js:28 `fence`, sports/courts.js:30 `meshFence`, east-coast/onsen.js:63 bamboo fence, outdoor/coast.js:265, harbour/ships.js:87, nook-kits.js:167, dorms/roof.js:295, works/props.js:82, while `outdoor/furniture.js` `handrail` has one caller. One `fence(p, a, b, { style: 'mesh' | 'bars' | 'slats' | 'bamboo' })` would remove 50 to 60 lines.
- **Signs**: `signBoard` is shared, but station-fittings.js:30 `sign` and forecourt/details.js:13 `sign` do what it does, and station-exterior.js:98, shotengai/street.js:89, plaza/north-clinic.js:114 and places/day5/props.js:8 are further sign builders. About 30 lines.
- **Notice boards and pinboards**: props.js:480 and rooms/machines.js:93 share the name `pinboard` with different arguments, plus dorms/doors.js:135, plaza/furniture.js:107, ferry-terminal/details.js:14 and office.js:214 and :259. About 40 lines.
- **Benches**: props.js:162 (one caller, station-hall.js:124), ferry-terminal/room.js:9, rooms/gym-hall.js:157 next to the outdoor `bench`. About 30 lines. Lamps: props.js:187 `lampPost` (one caller) repeats `lamps({ kind: 'lantern' })`, plaza/east-fronts.js:216 builds a wall lamp inline. About 40 lines.
- **Bikes and racks**: three bicycle models (forecourt/details.js:53, dorm-court/cluster-yards.js:47, nook-yards.js:134) and three rack styles. Two umbrella canopies (plaza/furniture.js:179, outdoor/seafront.js:86). Chairs in six places. About 80 lines together.
- **Dead code**: forecourt/details.js `planter` :30, `streetLamp` :143 and `tree` :177, outdoor/edges.js `ramp` :91, town.js `paving` :136. About 80 lines.

### Planting and ground (about 220 lines, more if the works style folds in)

- A tree in a mulch ring is written three times (plaza/east-lane.js:60, forecourt/quarter-planting.js:17, outdoor/lane.js:70). `shrubBed` exists twice, nearly identical (plaza/east-lane.js:256, dorm-court/cluster-yards.js:29). The works has its own leaf-card trees and bushes (works/verges.js:77 and :114).
- The street style (scenes/diorama/) is a third tree and hedge implementation (diorama/planting.js, planting-shapes.js, foliage.js, canopy.js, meadow.js, root-bed.js, about 650 lines).
- Paving has three generators: the main `paver()`, town.js `pavingRects` :103 (one caller), and props.js `tileFloor` for interiors. Flat ground comes from both skyline.js:295 and town.js `groundPatches` :28.
- Small helpers copied between neighbouring places: `walk()` is byte-identical in plaza/east-lane.js:66 and dorm-court/cluster.js:55, and `const edge = ...` appears in four files.

### Building parts (about 600 lines)

- **Glazed double door with canopy and lamp**, about nine copies: block.js:179, block-style.js:147 (`frontDoor` and `deepCanopy`, the best one), plaza/east-fronts.js:210-324, sports/gym.js:171, sports/pool.js:273, sports/grounds.js:176, forecourt/north.js:190, shotengai/street.js:67, plaza-buildings.js:103. Only works/buildings.js:358 reuses `frontDoor`. About 150 lines.
- **Window with frame, sill and mullion**, about twelve copies: block-style.js:60, block.js:131, works/buildings.js:47, dorm-court/block.js:109, shotengai/facades.js:8, plaza-buildings.js:82 and :263, plaza/east-fronts.js:178, town.js:57, dorms/building.js:241, rooms/commons-detail.js:7, dorm-court/hall.js:145. look/detail.js:74 and showcase/room.js:283 are an exact pair. skyline.js:178 is the distant version and should stay separate. About 150 lines.
- **Flat roof with parapet, coping and plant**, about six copies: dorm-court/roofs.js:20, shop-roofs.js:46-119, block-style.js:52 and :101, block.js:148, plaza-buildings.js:95, dorm-court/block.js:~203. Condensers, tanks and stair huts are built three times. About 120 lines.
- **Striped awning**, three copies (plaza-buildings.js:107 and :254, plaza/east-fronts.js:265). About 40 lines.
- **Building masses with storeys and windows** come from four generators that overlap: `officeBlockSteps`, east-fronts `frontsSteps` :50, plaza-buildings `shopStreetSteps`, town.js `blocks` :49. Stairs come from four builders, none shared (dorms/stairs.js:56, office.js:408, block-style.js:73 and :184, sports/pool.js:115). `onFace` is redefined in plaza/east-fronts.js:41 and head-office/tower.js:22, and `merged` in town.js:19 and plaza-buildings.js:19.

## 3. Systems that should talk to each other but don't

**Walkable ground and kerbs.** Each outdoor place sets `nav.extra` from a list of walk rectangles in its plan (sports/plan.js:56, east-lane/plan.js:99, campus/plan.js:13 and others), while its kerbs are hand-written `kerb()` lines with their own numbers. They already disagree: in sports the paving ends 0.2 from where walking ends (sports/grounds.js:40 against sports/plan.js:63). East-lane kerbs copy a verge depth by hand (plaza/east-lane.js:115 against outdoor/lane.js:46), campus kerbs use literal x values (campus/grounds.js:43, :62-72) and the plaza has its own predicate (plaza.js:83-98). Two places already do it right: outdoor/coast.js:296-320 derives kerbs from the walk rectangles, and forecourt/lane.js:41-58 lays kerbs and blocks the walk grid in one call. The grounds lane is building exactly this as one system (movement/walk-ground.js, scenes/outdoor/walk-edges.js), for the forecourt and campus first.

**Pieces and the walk grid.** A bench, planter or vending machine does not say what ground it takes up. Each place blocks it again by hand with `nav.block`. The nook kits are the exception: `buildNooks` returns the rectangles to keep Eric off and the named spots (nooks.js header). Every kit piece should return the same.

**Pieces and interaction.** Tap targets (`things` in places/*.js, e.g. places/plaza.js:37-110) point at geometry through anchors that each scene hands back separately. Seats are collected by the outdoor bench (`p.seats`), but chairs, stools and indoor benches don't report theirs. A piece that has a seat, a door or a board should report that spot, so a place can make it usable without measuring it again.

**Time of day.** Places switch from morning to evening once, and each place writes its own `onPeriod` (28 of them, e.g. places/works.js:136-142). Lit windows at night use at least six mechanisms: the hidden `block:lit` mesh (block.js:35, switched on by hand in eight places), skyline's own `onPeriod` (skyline.js:381), emissive glass raised at evening (plaza-buildings.js:29, east-fronts.js:169), glass set from the period (sports/pool.js:330), private period checks (station-exterior.js:338, head-office.js:191, pool-lights.js:47), and lamp glow through `lightSet`. About 25 files set `emissiveIntensity` directly. Only the shop street can go back to daylight (station-garden/daylight.js, used by shotengai.js). `door-cards.js` is yet another rule table for day and period.

**Lighting.** town.js holds the shared outdoor light, but seven places build their own hemisphere and sun (dorm-court.js:127, dorms.js:50, office.js:607, lobby.js:337 as a copy of `outdoorLight` with other numbers, places/train.js:80, train/screen-scenes.js:38, viewer/stage.js:21). The monorail's metal reflects a sky drawn for the train's sun direction (train/models.js:64), which no other place uses, and the farview lane is about to add a real sky and fog. If reflections, sky and sun don't come from one per-period description, metal and glass will reflect a sky the player can't see.

**Two finishing passes.** look/ patches materials by surface kind after a place is built. The street style runs a second, separate pass that clones materials and marks them `noLook` (diorama/materials.js:9-12). Two systems now decide what a surface looks like.

## 4. Proposed structure

### Folders and boundaries

One folder, `game3d/js/kit/`, holds every reusable world piece. It sits below places/ and scenes/: kit code never imports from places/ or scenes/, and a scene composes pieces but never defines a reusable one. look/ stays the surface-shader layer and is used by the kit.

```text
game3d/js/kit/
  core/       rng.js (one seeded random and point hash), parts.js (the Parts collector),
              geo.js (the primitives now in train/kit.js), mat.js (the material cache, from props.js),
              models.js (one loader for Blender GLB sets: load once, fall back to code, settable in tests)
  materials/  env.js (one sky environment per period, fed by the sky), metal.js (#366), glass.js
              (local reflection, tint, evening glow), presets.js (stone, timber, paint, rubber)
  street/     bench, lamp, bollard, bins, sign, fence, vending, bike, umbrella, notice board
  planting/   trees, hedges, bushes, beds, tree pits, planters, and the plant models
  ground/     paving, kerbs and walls, edges drawn from walk-ground, steps and ramps
  building/   faces, windows, doors and canopies, roofs and parapets, roof plant, awnings, stairs, masses
  interior/   desks, chairs, shelves, cabinets, room shells (props.js and look/detail.js move here)
  light/      outdoor and room light, period grades, the glow registry (from town.js and rooms/shell.js)
  index.js    the registry: every piece's declaration, read by the asset library
```

Names are plain nouns for what the thing is (`bench`, `fence`, `window`), one family per file, and no file over the 400-line budget. Existing paths keep a one-line re-export while callers move, as the refactor stages did (ARCHITECTURE.md).

### Declaring a piece once, with variation

Each piece is declared once, with its variants and how much it may vary, and is placed with a position, a facing and an optional seed.

```js
// kit/street/bench.js
export const bench = piece({
  id: 'street/bench',
  use: "bench(p, { at: [x, z], face, variant: 'park' })",
  variants: {
    park: { len: 1.6, back: true, frame: 'cast-iron' },
    plain: { len: 1.6, back: false },
    station: { len: 2.0, back: true, frame: 'steel' },
  },
  vary: { tone: 0.06, wear: [0, 0.4], len: [-0.1, 0.1] },
  build(p, o) { /* geometry into p, using o.tone, o.wear and o.len */ },
  footprint: (o) => [[-o.len / 2, o.len / 2, -0.3, 0.3]],
  spots: (o) => ({ seats: seatsAlong(o.len) }),
});
```

- The seed defaults to a hash of the position, so two benches in a row come out slightly different and the same bench looks the same on every visit. A designer can pin a seed or a variant when one spot needs a particular look.
- `vary` keeps variation inside limits that were chosen once: a little colour shift, a little wear, a small scale range, and a small turn for things like trees and bins. Wear goes through look/'s surface patches, so it stays in the world style.
- The call returns `{ blocks, spots, glow }`: the ground it takes up for the walk grid, the spots a place can use for seats, doors or tap targets, and anything that lights up at night. That one return is how pieces talk to navigation, interaction and time of day.

The hand-placed feel belongs to the places. Each place keeps its plan file (the existing *-plan.js pattern) and chooses a palette, a few variants and some one-off dressing: a bike left against this fence, a sign with this shop's name. Shared pieces carry the craft once, and each place adds its own detail on top.

### Detail levels and fidelity

Jørgen, 2026-10-09: "it becomes quite clear in the asset library which models have gotten love and attention, and which ones have not. we should include some metadata on the fidelity level here, maybe even retain multiple levels depending on use-case, performance settings etc, if the higher quality version is harder to render."

- Detail levels. Every kit piece builds at three levels: phone, standard and high (game3d/js/kit/core/detail.js, which says what each one drops or adds). The phone level keeps the shape and colours and drops the small fittings and round segments. High adds rounder edges and the small things you only see up close. A place picks the level once with `levelFor({ phone, tier, tight, far })`. It passes in what it already knows: perf/phone.js `phoneLighter()`, the quality tier from perf/view.js, and whether it is over its place budget (game3d/tools/perf/place-budgets.json). It asks one level lower for pieces far from the walks. The Asset library shows each variant's triangles and draws at each level (tools/assets/kit-costs.mjs builds them in Node).
- Fidelity. Every piece you can see has a fidelity level: placeholder, basic, finished or hero (detail.js `FIDELITY` gives a line on each). A kit piece declares its level. The older pieces got a first estimate on 2026-10-09 in tools/assets/kit.json `fidelity`, judged from their thumbnails, street style or faceted, Blender or code, and age. Whoever reworks a piece corrects its entry. The library shows who last worked on each piece and when, from git blame over the piece's own lines with formatting passes skipped. It can filter and sort by fidelity and lists the most used pieces with the least love. Helpers, materials, data and light rigs have no level, because they aren't pieces you see.

### How a place composes

A place's plan lists what stands where, by piece id and variant. Its builder walks that list into one `Parts` collector, hands every returned `blocks` to walk-ground and the walk grid, every `spots` to the place's targets and seats, and every `glow` to the light registry. On a period change the place calls one `applyPeriod(period)`, which sets the grade and sun, the sky environment, lamps, lit windows and glass. That replaces the 28 hand-written `onPeriod` bodies and lets every place go back to daylight.

### The Asset library page in the bible

The gallery already has most of the machinery: scan.py writes tools/assets/assets.json, source-data.mjs finds which files call a builder (`sceneCalls`), render3d.mjs makes thumbnails with the game's own code, and viewer.js shows a turntable. What it lacks is the kit itself. scan.py lists 16 builders by hand (scan.py:541-550) and viewer.js `kit()` (viewer.js:141) only handles builders that return a Group, so nothing from the outdoor kit appears.

- scan.py reads the pieces from the kit's registry instead of a hand list: id, family, file and line, variants and the `use` line.
- "Used in" comes from source-data.mjs, extended to every exported piece and resolved through imports rather than bare function names (today `bench` from props.js and `bench` from outdoor/furniture.js are counted together).
- render3d.mjs renders one thumbnail per variant, plus a strip of three seeds so the variation is visible. viewer.js gains a Parts path: build into a collector, call `build(root)`, then frame it.
- The bible gets an "Asset library" page in its own module, bible/assets.js, in the same way bible/work.js is wired into bible/app.js (app.js:1016). Routes `#assets` and `#asset/<id>`. Each card shows the thumbnail, the variants, where it is used, the file with its line, and the `use` line to copy. Filters by family (street, planting, ground, building, interior, materials, models) and by place. The existing tools/assets/ page stays the place for portraits, voices and art.

### The rule for builders

Before building any world piece, look in the Asset library (or kit/index.js). If something close exists, use it or add a variant or an option to it. If nothing fits, add a new piece to kit/ with its declaration, not a local function in a scene. A scene file only places pieces and adds dressing that belongs to that one spot. This rule goes in GUIDE (Engineering) and the builder agent definition, worded by whoever lands stage 1. A small check can back it up later: warn when a file under scenes/ or places/ defines a function named like a kit piece (bench, lamp, fence, vending, window, door, roof, hedge, tree).

## 5. Migration, smallest valuable step first

Lanes in flight: claude-agent:grounds (walk-ground, kerbs, forecourt and campus ground), claude-agent:planting (plant GLB, tree species, hedges, the outdoor bench, diorama planting, `pFoliage` and `pBark`), claude-agent:farview (sky, fog and the far island behind `?far=1`), claude-agent:monorail (train/models.js, car.js, doors.js, world.js), and the queued #366 (one metal and reflection material from train/models.js). No stage touches their files before they release them.

**Stage 1. The Asset library page, from what exists today.** No game code changes. scan.py discovers the exported builders in scenes/outdoor/{furniture,planting,edges,paving,nook-kits,block-style}.js, dorm-court/roofs.js, plaza-buildings.js (`signBoard`), props.js and look/detail.js, instead of the hand list. source-data.mjs resolves "used in" through imports. viewer.js learns the Parts path, and render3d.mjs renders them. bible/assets.js adds the page. The builder rule goes into GUIDE and the builder agent. This only touches tools/assets/, bible/ and docs, so it collides with nothing in flight. It gives Jørgen the page he asked for, and gives every builder a place to look before they copy. It also makes the duplicates in section 2 visible side by side, which helps the merges later. Review: a Claude reviewer is enough. Codex only needs to see the GUIDE rule.

**Stage 2. Core helpers.** Create kit/core: one `rng` and hash, `Parts` moved from scenes/outdoor/parts.js, the primitives moved from train/kit.js, the `mat` cache and a named `mat.own()`, and one GLB model-set loader that train/models.js and plant-models.js both use. Old paths re-export. Move `lightPool` down so the kit stops importing places/life.js. Wait until monorail and planting have released, because both loaders change. **Codex review**: module boundaries, the cycle baseline and the budgets file.
Done on 2026-10-09 (claude-agent:kit): kit/core has rng, parts, mat (with `mat.own`), pool (lightPool moved down), models (the loader), piece, build, detail and palette. The first street-style families are in kit/building (window, door with canopy), kit/street (fence, lamp, bin, bollard, bike rack, sign) and kit/planting (planter, tree pit). Still to do: the train/kit.js primitives, moving plant-models.js and train/models.js onto models.js, and the places switching to the pieces in their place passes.

**Stage 3. Materials (#366).** kit/materials/env.js takes the sky description farview settles on and builds one environment per period. metal.js is lifted from train/models.js (the vertex-alpha metal class, wear and rust). glass.js merges `sportsGlass`, `hutPane`, `litGlass` and the transparent pane presets. Then apply them to outdoor metal (AC units, railings, lamp posts, signs) and the scattered glass. Phone cost check before and after. **Codex review** for the shader patches and the clone handling.

**Stage 4. Ground and planting into the kit.** After grounds and planting land: move planting.js and plant-models.js into kit/planting/, and edges.js, paving.js and walk-edges.js into kit/ground/. Pieces start returning `blocks`, so walk-ground gets beds, planters and benches from the pieces themselves. Fold in the mulch-ring tree and `shrubBed` copies, and delete the dead code listed in section 2. Grounds stage 2, the other outdoor places, then runs on this. **Codex review** for the walk-grid contract, as with X-0980.

**Stage 5. Piece declarations and the big merges**, one family per change, each with before-and-after shots from the same camera and a critic check that nothing changed by accident: vending and its single front, fence, sign and notice board, bench and lamp, bikes. Then building parts: one window, one door with canopy, one flat roof with parapet and roof plant, one awning, then stairs. These carry most of the 1,000 lines. The four building-mass generators come last, since they touch every street. Codex review only where a family changes a shared contract (building faces and masses do).

**Stage 6. Time of day.** kit/light: the period grades from town.js, room light from rooms/shell.js, a glow registry fed by pieces, and one `applyPeriod` that also restores daylight. Replace the six lit-window mechanisms and the 28 `onPeriod` bodies place by place. **Codex review**: this touches places/lifecycle.js and the save-relevant period handling.

**Stage 7. Retire or harvest the experiments.** The street style (scenes/diorama/) is the look the kit is built from (Jørgen chose it, #321); decide with Jørgen what the trim-sheet page (game3d/js/showcase/) should leave behind. Whatever he liked becomes a variant or a material in the kit. The rest goes to legacy/. The works foliage style is either folded into planting as a variant or kept as a deliberate second look and declared as one. This is up to 2,800 lines.

Each stage is useful on its own. After stage 1, every later merge shows up on the library page: several cards that look alike become one card with more "used in" rows.
