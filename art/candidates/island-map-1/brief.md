> Initial planning brief. The final round offers leafy campus-03 and denser town-06; actual prompts and attempt notes are in attempts.json. University placement in the renders is east of the gym, below the court. Coordinates below describe the initial intent, not measured output geometry.

# Island campus map candidate brief

For `island-map-1`: one proposed layout, shown as an overview and two adjoining district maps. Exterior maps only. Apartment interiors follow Jørgen's layout pick. This brief introduces no plots, cast changes or approved geography.

## Facts and proposals

**Keep:** Amakawa is a company island across the bay, reached by monorail. Everyone lives there; the train is mainland travel, not a daily commute. Honsha station is beside head office. The continuous day-1 route is platform → covered walkway → glass lobby entrance → security barrier → lift → IT support on B2. B2 is head office's second basement, not a separate little IT building. Head office must accommodate Accounts on the twelfth floor and Sales on the fifth. The company city has dorms, a canteen, shops, a bar and a university. Eric's planned dorm room faces a nearby concrete wall.

Sources: `docs/game/setting.md`, `docs/game/places.md`, `docs/game/cast.md`. The requested gymnasium comes from Jørgen's C-0091 brief. Its position and exterior have not been approved.

**Propose for this round:** the coastline, compass orientation, block sizes, facade designs, all facility positions outside the existing station/HQ connection, paths, central meeting square, sports court and service lane. University, residential and shop buildings are exterior planning placeholders. No assigned character homes beyond Eric's existing dorm requirement. `notes/ISLAND.md` is explicitly unapproved; its timetables, machine stories and later unlocks are excluded. Its obsolete commute description does not carry over. `notes/map-design.md` contributes clear routes, activity clusters and landmarks; its retired tile/pixel construction rules do not.

## One layout for all three images

North is up and west is left throughout. Use a low, broad island with a seawall, a modest indented southeast shore and a continuous waterfront footpath. The main pedestrian street runs west–east through the island's middle. Head office is the western landmark; the university court and apartment gardens distinguish the east. Back-of-house vehicle access follows the northern perimeter, leaving the main street for pedestrians and bicycles.

These are normalized plan coordinates, not approved metres: x=0 west, x=100 east; y=0 south, y=100 north. Shore occupies approximately x=7–93, y=10–90. Match these relationships across every image.

| Place / anchor | Centre (x,y) | Shape and connection |
|---|---:|---|
| Honsha station | 18,54 | Long navy platform canopy, one visible concrete monorail guideway entering from the west over water. |
| Head office / IT B2 | 30,65 | Tall slate office slab with horizontal window bands and a pale low entrance wing. Station and lobby share a raised entrance terrace connected directly by a short covered walkway. |
| HQ forecourt | 32,48 | Clear forecourt below the entrance wing; one broad connection east to the central square. Accessible route down from the entrance terrace. |
| Central square | 50,48 | One round shallow fountain and one slender clock pole, with an offset tree group. Crossroads: west HQ, east shops/dorms, north university/gym, south waterfront. |
| Canteen | 50,58 | Low pale building with a blue roof and terrace facing the square. Its full footprint sits inside the overlap between district maps. |
| Gymnasium | 66,66 | Broad, low, folded sage roof; compact outdoor court immediately east; entrance faces the square/university path. |
| University | 78,80 | Three low wings around an open court; its open side faces south toward the gym. |
| Shops | 64,47 | Short row of small shopfronts with restrained teal awnings along the pedestrian street. |
| Bar | 67,38 | One small charcoal storefront below the shop row, facing a little paved pocket off the street. |
| Apartments / dorms | 79,29 | Three pale mid-rise residential blocks around an asymmetric shared garden; front entrances face the garden and street. One rear service wing can provide Eric's close concrete-wall view later. |
| Waterfront | Southern shore | Continuous promenade joining the arrival quarter to the residential garden path. |

Two readable loops: HQ forecourt → central square → southern promenade → HQ; central square → gym → university court → eastern dorm path → shops → central square. Connections arrive at doors, courtyards or genuine street junctions. Keep routes visible between clusters of trees, bikes, benches and planters. Supporting service buildings can sit along the north lane, with restrained roof equipment, but do not invent named departments.

**Shared edge:** west district covers x=0–56; east covers x=44–100. Both cover the same north–south extent at the same scale and orientation. The full central square, fountain, clock pole, canteen and the street crossing appear in both. This overlap proves that they connect; the images need not pretend to be exact texture tiles. Their central square must have the same shape and relative object positions, not two different fountains representing the same site.

## Style and review labels

Use the current flat-shaded simple 3D world: distinct low-poly forms, restrained surface patterns, soft contact shadows and small modelled details. Pale concrete, slate/navy roofs and muted greens; clear cool daytime light with a little warmth on lit faces. The older 2D anime prompt template in `art/PROMPTS.md` does not apply to these 3D world maps. Use the built-in image generator with plain sentences, not Anima tags or weights.

Building silhouettes do the primary wayfinding. In the review, label locations with HTML/SVG overlays or a keyed legend so generated lettering cannot obscure geography. Label the tower **Head office · IT on B2** and station **Honsha**. Add a small north arrow and map-boundary diagram in the review, consistently on all three. Keep generated images free of text and UI.

## Shot staging notes (not part of prompts)

**Shared:** This is a geography decision, not a shot under a script line. The relevant established event is Eric walking from the station platform through the covered link into the lobby. No posed cast or character eyelines are needed. Morning light comes from image upper left, with short soft shadows down-right. Camera views are high overhead, tilted enough to show building faces, north-up with no rotation between shots. Island ground and foundations stay visibly connected to the sea wall. Heights are illustrative: ground about 4 m above water, station/HQ entrance terrace about 9 m, monorail car floors level with the platform, office tower about 50 m, dorms about 18 m, other blocks about 8–12 m. These heights are proposal geometry, not new game facts. The guideway and piers must visibly support any train; the platform/walkway/lobby thresholds must align.

**A — overview (`island-map-1-overview`):** Camera outside, above the southern sea at roughly 700 m, aimed down over the full island, wide frame. Foreground: south waterfront. Middle: dorm garden, shop street, central square, station/HQ link. Back: gym/university and north service lane. Water surrounds the island; the western monorail approach exits the left frame toward off-screen mainland. Mainland is outside the frame, and basement interiors are below ground. Static geography; omit trains at this scale. Check that HQ does not hide the station or covered link and that all eight primary destinations can be identified.

**B — west / arrival district (`island-map-1-west`):** Same view direction, about twice the image scale, camera roughly 400 m high over its southern edge. Foreground: western waterfront and forecourt. Middle: station canopy, covered walkway, HQ entrance. Back: full office tower and service lane. At image right, show the complete shared square and canteen. Eastern dorms/university are beyond the crop and stay out of the prompt. One short train may be stopped alongside the platform, wholly visible and attached to its beam. Check the continuous sheltered walking route and that the train is separate from its guideway.

**C — east / everyday campus (`island-map-1-east`):** Same height, scale, north-up orientation and light as B. Foreground: residential blocks and waterfront path. Middle: shops/bar and shared square. Back: gym/court and university. At image left, repeat the square and canteen exactly as in B. Station/HQ and the mainland lie outside the crop and stay out of the prompt. Static geography, with a few tiny anonymous residents only if they help scale. Check that every block has a visible pedestrian entrance and the dorm service wing faces inward, leaving room for Eric's future wall-facing room.

## Short render prompts

### A — overview

High overhead map of a compact Japanese company island, north at the top, flat-shaded low-poly 3D with subtle surface patterns and soft daytime shadows. At the left shore, a concrete monorail beam on piers meets a long navy station canopy beside a tall slate office tower; a short covered walkway joins the platform to its pale entrance wing. A broad pedestrian street runs right through a central fountain square with a clock pole and a low blue-roofed canteen. To the upper right are a sage-roofed gym, a small sports court and a university courtyard; to the lower right are a short teal-awning shop row, a small charcoal bar and three apartment blocks around a garden. A waterfront path circles the seawall, with a service lane along the upper edge. No text or interface.

### B — west / arrival district

High overhead neighbourhood map, north at the top, flat-shaded low-poly 3D with subtle surface patterns and soft daytime shadows. A concrete monorail beam on piers enters from the left over calm water and ends at a long navy station canopy beside a tall slate office tower with horizontal window bands. A short white train rests beside the platform; the full train and its supporting beam are visible. A covered walkway directly joins the raised platform terrace to the tower's pale glass-fronted entrance wing. Below is a compact forecourt connected to a waterfront path. At the right edge, a broad pedestrian street reaches a round fountain square with a slender clock pole and a blue-roofed canteen immediately above it. No text or interface.

### C — east / everyday campus

High overhead neighbourhood map, north at the top, flat-shaded low-poly 3D with subtle surface patterns and soft daytime shadows. At the left edge is a round fountain square with a slender clock pole and a low blue-roofed canteen immediately above it. A pedestrian street leads right past a short teal-awning shop row and a small charcoal bar. Above the street are a broad sage-roofed gym, an outdoor court and three university wings around a courtyard. Below it, three pale apartment blocks enclose an asymmetric garden, with a narrow rear service wing. Clear paths connect every entrance to the square and continue along the seawall; a vehicle lane stays at the far upper edge. No text or interface.

## One bounded render round

Generate the three views as one candidate set from this layout, preserving the same objects in the overlap. Compare the set against the coordinate table before posting. Record every attempt with its prompt and actual settings on `island-map-1`, including any visibly inconsistent draft. If one image breaks a connection, correct that connection rather than adding a different district or redesigning the island. Do not call independent renders geographically consistent unless the overlap actually matches.

The review decision is whether this layout works, particularly station-to-HQ continuity, the central paths, and the location of the dorms. Keep it a candidate until Jørgen picks; then put approved geography in `docs/game/places.md` and start the separate apartment-interior round. No generation, source image, private content, paid tool or repo edit was used to prepare this brief.
