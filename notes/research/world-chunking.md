# Chunks, one world, or distance tricks

Jørgen asked on 2026-10-09: "when in third person perspective, it is quite easy to see the weakness in the current environment, as we chunk the environment heavily. Consider performance implications of having one seamless world, vs larger chunks, vs some sort of effect / cheats to make the distance look less crap."

Short answer: keep the chunks and fix what the camera sees past them. The third-person camera is desktop only (GUIDE, Visual design), and on the desktop GPU every place has room to spare. What looks bad is a short list of things: a flat grey sky, ground that stops, and stand-in buildings that were built for a camera looking down. A sky, fog tuned to the time of day and one shared far model of the island would fix most of it for a few draw calls. One seamless world would cost weeks of rework and would still need the same fog and far model.

## What is there today

Each outdoor place is its own three.js scene with its own frame, camera, lights and walk grid (game3d/js/places/lifecycle.js). The next place is prepared in the background while you walk, and a crossfade hides the switch. Prepared places stay in memory and are never evicted (notes/PERF.md, "Fast travel memory").

Around its own walkable area, each place builds three things:

- Bands (scenes/bands.js): about 20 units of the next place's ground past each exit, planted but not walkable.
- A skyline (scenes/skyline.js): buildings within 26 units get walls, windows and parapets, and buildings out to 60 units are plain boxes in one mesh. Past 60 units there are no buildings at all.
- A ground plane: island, sand, grass and paving in one mesh, on a square of sea about 90 units out from the place's centre.

Behind all of that the scene background is one flat colour, `TOWN.roof` (#5d636c, a dark grey), in every outdoor place, except the dorm courtyard after work, which switches to a sky colour. No outdoor place has fog. The camera's far plane is 200 units. The island is about 250 by 180 units, so from most spots the camera could see across nearly all of it.

The skyline also has a rule meant for the old camera that looks down from the south: a building south of the walkable area is cut down to 0.95 times its distance from it, so it never hides the player. Seen from behind Eric's shoulder, those buildings look like stubs.

## What the third-person camera shows

Screenshots at 1366x860, follow camera at its lowest pitch, from each place's start spot, turned four ways. They're in `bible/shots/research/world-chunking/` (the edge shots and the fog/sky before-after; the per-place sheets and raw numbers stayed in the research session's scratchpad):

- `bible/shots/research/world-chunking/works-paving-ends.png`: the works yard's paving runs out into a bare plain and grey sky.
- `bible/shots/research/world-chunking/shotengai-grass-to-grey.png`: past the shop street's west end, flat grass meets a grey sky with no horizon, and the blocks are stubs.
- `bible/shots/research/world-chunking/harbour-flat-field.png`: an empty flat field with box buildings beyond it.
- `bible/shots/research/world-chunking/sports-street-end.png`: the street ends in flat grass and plain boxes.
- `bible/shots/research/world-chunking/shotengai-arcade-dark-sky.png`: the dark grey sky above the arcade.
- `desk/sheet-<place>.jpg`: all five views for every outdoor place.

In short: the grey "sky" gives it away first, then the ground plane's hard end, then the plain stand-in buildings.

## Measurements

Build 1009-0922 (e2f34132), measured 2026-10-09 with GL on the RTX 3080. Draw calls and triangles carry over to a phone, but frame times and load times on this machine do not. Desktop is the auto tier (high) with the follow camera. Phone is 390x844 at the auto tier (medium) with the overview camera, which is what phones run. Load is from navigation until the place reports ready, on an unthrottled CPU. The phone load budget (6 s at CPU 4x) is measured by game3d/tools/perf/hitch.mjs, and the plaza took 3.2 to 3.4 s there (notes/PERF.md).

| Place | Desktop calls (4 directions) | Desktop tris | Phone calls | Phone tris | Meshes in scene | Tris in scene | Load (ms) |
|---|--:|--:|--:|--:|--:|--:|--:|
| forecourt | 215–522 | 511k–695k | 197 | 364k | 633 | 583k | 2,100 |
| campus | 88–144 | 221k–246k | 57 | 130k | 70 | 112k | 1,100 |
| plaza | 144–349 | 432k–711k | 78 | 250k | 599 | 539k | 1,900 |
| shotengai | 122–414 | 232k–485k | 90 | 190k | 822 | 439k | 1,900 |
| east_lane | 153–270 | 316k–530k | 69 | 171k | 489 | 379k | 1,600 |
| east_coast | 116–259 | 133k–374k | 70 | 93k | 572 | 319k | 1,700 |
| dorm_court | 120–213 | 119k–281k | 84 | 106k | 296 | 230k | 1,400 |
| sports | 124–235 | 186k–319k | 68 | 117k | 551 | 255k | 1,900 |
| office_quarter | 118–217 | 165k–322k | 56 | 96k | 334 | 228k | 1,400 |
| harbour | 120–209 | 218k–318k | 59 | 116k | 367 | 287k | 1,800 |
| works | 79–151 | 138k–310k | 48 | 81k | 190 | 276k | 1,200 |

"Calls" and "tris" count every pass in one frame (shadows, AO, outline, main). On the desktop's high tier the shadow and AO passes roughly double the main pass. Geometry in GPU memory is about 47 to 65 MB per outdoor place (works 47, sports 47, harbour 51, shotengai 65). The fast-travel check in PERF.md had the JS heap going from 22 to 60 MB with nine places prepared.

What the numbers say:

- On a phone, every outdoor place but the forecourt is well inside 250 calls and 300k triangles. The forecourt's 364k triangles are already over.
- On the desktop, the follow camera swings by a factor of two or three depending on where it faces. The worst views (forecourt 522 calls, shotengai 414, plaza 349) look along the main street into the densest content. A 3080 doesn't notice, but a laptop with integrated graphics might.
- Each place on its own holds 200k to 580k triangles of geometry, and about 4,800 meshes across the eleven. Some of that is counted twice because neighbouring bands overlap.

## Option 1: one seamless world

This means one scene in one frame, cut into streaming cells, with level of detail, instancing and culling, so you can walk anywhere without a crossfade.

Cost on the GPU: everything the eleven places build adds up to roughly 3 to 3.5 million triangles and about 4,800 meshes before batching. With nothing in place to hold it back, a third-person view across the island could pull in a good share of that. To stay at today's phone numbers (60 to 200 calls), a seamless world would need everything shipped open worlds use: cells loaded and dropped by distance, two or three detail levels per building (three.js `LOD` swaps meshes at set distances), merged far cells, and a far model for whatever is beyond the loaded cells. GTA V and Spider-Man work this way. Insomniac said at GDC 2024 that Spider-Man 2's city was too big to make the distant LODs by hand, so they generate them now. BotW keeps a separate set of "distance view" objects loaded while the player is far away, and Digital Foundry noted visible LOD pop-in when gliding in TotK.

Memory: at about 50 MB of geometry per place, all eleven held at once would be about 500 MB before any sharing. iOS Safari limits a page's canvas and WebGL memory to roughly 224 to 384 MB depending on the version, so a phone could only ever hold a few cells. Streaming would be required, not optional.

Cost in code: this is the large part. Every place has its own scene, lights, shadow box, camera rules, walk grid, crowd, creatures, finds and story hooks keyed to the place name, and several are turned or scaled into the island frame. The day scripts, transitions.js, the fast test and the perf baselines are built on places. The sun's shadow map covers one place, so a seamless world would need cascaded shadows. Genshin uses up to eight cascades and built a mobile render pipeline of its own to get there. Estimate: several weeks, touching most of game3d/js/places/ and scenes/, while another builder is working on ground edges and planting now.

What it gets you: no crossfade and no seams. You would still need fog and a far model, because the camera can see further than any phone can afford to draw at full detail.

## Option 2: larger chunks

Merge neighbouring places into one, for example plaza, east_lane and dorm_court, or office_quarter, harbour and works.

Cost: you can't just add the numbers, because culling hides part of each place, but the trend is clear. The plaza already draws 250k triangles on a phone, and east_lane adds 171k on its own, so a merged plaza and east lane would go over the 300k phone limit without new detail levels. Preparing the plaza already takes 3.2 to 3.4 s at CPU 4x, so a place two or three times bigger would pass the 6 s budget for opening a place unless it streamed in parts. Memory per prepared place would go from about 50 MB to 100 or 150 MB.

What it gets you: fewer crossfades and longer walks without a switch. It does not fix what Jørgen is seeing. The edge moves further out, but the follow camera can see 200 units, and a bigger chunk would still end in grass, grey sky and box buildings, a little further away.

## Option 3: make the distance look good

These tricks are cheap. Shipped games use them along with chunking, and most of them work at any chunk size.

- A sky instead of a flat colour: a gradient dome, or a painted card with the sea, the mainland and clouds, following the time of day like the place grade does now. One draw call.
- Distance fog with a little height fog, coloured toward the sky near the horizon (atmospheric perspective). three.js `Fog` blends linearly from near to far, and `FogExp2` stays clear near the camera and thickens further out. It costs a few shader instructions per pixel and no extra draws. Unreal's height fog adds a start distance so near pixels stay clear, and that works here too. Genshin tunes its fog per area.
- One far model of the whole island: every building in island-layout.js as a plain box with a coloured roof, all the land, the coast and the monorail line, in one vertex-coloured mesh built once and shared by every place. That is the skyline's far ring stretched from 60 units to the whole island and cached. GTA V's Vinewood Hills is one draw call of about 2,500 triangles. Ours would be about 20k to 40k triangles in one or two calls. The fog covers how simple it is.
- Drop the "cut it down" rule when the follow camera is on, or build the far model at true heights. The stubs only make sense for the camera looking down.
- Camera framing: the follow camera's lowest pitch looks straight at the horizon. A slightly higher floor on the pitch, or a far plane that ends where the fog is fully opaque, means the camera never sees past what the fog hides.
- Things that don't fit this game: Animal Crossing's rolling log bends the world so the ground curves away and the sky shows. It suits a small cosy island, but it would show on long straight streets. HD-2D's tilt-shift blur sells a diorama from a fixed high camera. post.js already has a light tilt-shift, but from behind the shoulder it blurs the horizon band and doesn't hide anything. Impostor cards (Fortnite-style octahedral bakes) are worth it for trees and complex props, not for plain blocks.

Measured cost: I added a gradient sky and a linear fog (35 to 130 units) to the running game, without changing any code, and kept the camera where it was. Draw calls went from 81 to 83 in works, 151 to 156 in shotengai, 125 to 127 in harbour and 174 to 177 in sports, with triangles almost unchanged. Before and after, same camera: `bible/shots/research/world-chunking/fog-sky-before-after.jpg` (left is now, right has fog and sky). The colours were picked by hand and don't follow the morning grade yet. Even so, the sea gets a horizon and the street ends fade into haze instead of stopping at a grey wall.

## Recommendation

Keep the chunks. In this order:

1. Sky and fog in every outdoor place. The colours come from the same per-period grade that post.js applies, and the fog starts past the bands (about 30 to 40 units) and is fully opaque before the far plane. This applies to the follow camera only, or to every tier if it looks right in the overview too. Expected cost: plus 1 draw call, no triangles, a small per-pixel fog cost that a phone handles easily.
2. A shared far model of the island: one mesh built from island-layout.js at true heights, cached across places, shown past each place's own near content. It replaces the skyline's far ring and the sea square. Expected cost: plus 1 or 2 calls and 20k to 40k triangles. On a phone it can be the low version without windows, which the skyline's far ring already does at q0. Memory: one geometry for the whole session, a few MB.
3. In the follow camera, keep the skyline's near buildings at full height, and cap the pitch and far plane to match the fog.
4. Revisit larger chunks only if Jørgen asks for fewer crossfades. Nothing here rules them out later, and they would need the same sky, fog and far model.

What changes in code: scenes/skyline.js (the far ring becomes the shared far model, the height rule depends on the camera mode), a small new module for sky and fog (for example game3d/js/look/sky.js) called from each outdoor scene that sets the grey background today (scenes/works.js, office-quarter.js, sports.js, harbour.js, shotengai.js, east-lane.js, east-coast.js, plaza.js, campus.js, forecourt.js and dorm-court.js), post.js or the place grade for the colours, and camera/follow.js for the pitch floor and far plane. Materials with custom shaders from look/ need to keep three's fog chunks, and the fog has to be checked on those. The ground-edge and planting work going on now isn't touched, because this only adds what's drawn behind it.

## First test

One URL flag, for example `?far=1`, on three places with the worst edges (works, shotengai, harbour). It switches on the sky, the fog and the shared far model. A script like the one used for this note (a probe script: same place, same start spot, same follow-camera turn) takes a before and after pair at 1366x860, and a phone overview pair to check nothing changed there, and logs calls and triangles for both. Jørgen gets the pairs as a Review item and picks the sky and fog colours per period. If he likes it, the flag goes away and every outdoor place gets it.

## Sources

- BotW map data, the `_DistanceView` objects that stay loaded from far away: https://zeldamods.org/wiki/Content/Map/MainField
- TotK draw distance and LOD pop-in (Digital Foundry, as reported): https://www.nintendolife.com/news/2023/05/video-digital-foundrys-technical-analysis-of-zelda-tears-of-the-kingdom
- Genshin Impact's mobile render pipeline, per-area volumetric fog, up to 8 shadow cascades (miHoYo, Unite Seoul 2020): https://docswell.com/s/UnityJapan/KWRPQ5-210617-unity-dojo20211mihoyozhenzhongyi
- Animal Crossing's rolling log effect and how it is recreated: https://notslot.com/tutorials/2020/04/world-bending-effect
- Persona 5's areas joined by a map screen and loading screens (secondary source): https://cyberpost.co/is-persona-5-an-open-world-game/
- HD-2D's tilt-shift and depth of field for the diorama look: https://en.wikipedia.org/wiki/HD-2D
- GTA V's distant lights and one-draw-call hills: https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study-part-2/
- Spider-Man 2's generated distant city LODs (GDC 2024): https://gdcvault.com/play/1034212/Applied-Mesh-Analysis-Automating-Distant
- Octahedral impostors (GDC 2018, Ryan Brucks) and a three.js port: https://gdconf.com/news/make-like-tree-leave-time-gdc-2018-talk-ue4-foliage-rendering and https://discourse.threejs.org/t/octahedral-impostors-for-three-js/80318
- three.js `LOD`, `BatchedMesh`, `Fog`, `FogExp2`: https://threejs.org/docs/pages/LOD.html, https://threejs.org/docs/pages/BatchedMesh.html, https://threejs.org/docs/pages/Fog.html, https://threejs.org/docs/pages/FogExp2.html
- Unreal's exponential height fog: https://dev.epicgames.com/documentation/en-us/unreal-engine/exponential-height-fog-in-unreal-engine
- Mobile draw-call guidance, about 100 to 200 on low-end phones (PlayCanvas): https://developer.playcanvas.com/user-manual/optimization/guidelines/
- iOS Safari canvas memory limit: https://bugs.webkit.org/show_bug.cgi?id=195325 and https://developer.apple.com/forums/thread/687866

Not found: anything published on how BotW draws its far models, beyond the map data above, and any statement from Atlus on hiding distance in Persona.
