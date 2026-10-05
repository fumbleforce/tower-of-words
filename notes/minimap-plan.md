# Minimap, island map and fast travel: plan

A plan and a mock-up for issue #261. Nothing here is built yet. The decisions are on Review [minimap-plan-1](../reviews/minimap-plan-1/review.json); the defaults below are what gets built unless Jørgen picks otherwise there.

Jørgen, 2026-10-05: "I want a minimap I can click, giving me a full interactive map, and fast travel to locations".

## What exists today

- No minimap in the HUD. The HUD is the goal box top left and the chips top right ([controls-and-ui.md](../docs/game/controls-and-ui.md), The HUD), plus the goal arrow on the screen edge.
- game3d/js/map/ is a dev tool, loaded only with `?map=1`. It builds every place and draws it from straight above with WebGL, to compare the layout with island-map-4. That is far too heavy for a phone and stays a dev tool. Its M key moves to Shift+M when the real map lands.
- The island's shape is data already: game3d/js/scenes/island-layout.js has the coast, green, sand, paths and every building's footprint for the south half, and `PLACES` has every place's English and Japanese name. The mock-ups were drawn straight from it.
- Places and the ways between them: game3d/js/places/definitions.js. Day 1 has `NEXT` (the story's forced moves: train, gate, forecourt, lift to B2, dorm court to room) and `TRIPS` (the walks between outdoor places); days 2 and 3 have their own `TRIPS` and `OPEN_PLACES` in game3d/story/day2/ and day3/. `canTravel(from, to, day)` says whether a way exists at all.
- When a way is open is up to the story. Each exit is a `zone:` or `talk:` trigger in the place's story file, and some have conditions: on day 1 the plaza's east exit goes to the dorm courtyard only with `going_home`, otherwise to the east lane. B2 is left only by the lift after work.
- A trip (places/lifecycle.js `travel`): the leaving move here, the next place built in the background (`prepare`), a snapshot of the last frame, `enter`, the crossfade (places/crossfade.js, 1.3 s), the arriving move (`tripInFrom`), then the place's start scene. No black screens (places.md, Getting between places). Only one trip has lines of its own: the lift ride from the forecourt to B2 on day 1 (story/transitions.js).
- The clock has five periods and no minutes. On day 1 only the story moves it; on a free day only the player does, at the desk in room 203 (systems.md, The clock). Walking between places costs no time.
- A scene is running when `game.busy` is set (scripted walks, trips, lines), a line or a prompt is up, or a place's start is still pending.
- Nothing records which places Eric has been to across days. The end-of-day photos are kept per session only.
- Private plugins (island/private/plugins/) add nodes and pins to public places. They never add a place.

## What the player gets

### The minimap

- A small north-up map in the top right, under the chip row: 88 px on the phone, 180 px on desktop at UI scale 1, growing with the interface size. It shows the streets and buildings round Eric, his arrow, the place pins as dots, and the goal as a teal dot (held on the minimap's edge when it is further away).
- Hidden on the train (like the clock), and while the HUD is hidden (H).
- A tap or click on it opens the full map. M opens and closes it on desktop.

### The full map

- Phone: the map fills the screen. A bar at the top says "Map" and the day and period, with a 44 px close button. The goal line sits under it. Drag to pan, pinch to zoom, and it opens centred on Eric.
- Desktop: the map on the left, a side panel on the right with the picked place and a list of every place grouped as Here, Fast travel, Not been yet and Not open today. Drag to pan, wheel to zoom, M or Esc closes. Arrow keys move through the list, Enter travels.
- On the map: a label pin for each outdoor place, Eric's arrow, the goal's flag, and a pin state for each place: here (teal), been here (solid), not been yet (dashed ring) and not open (grey with a lock). An interior (the karaoke box, the pool deck, the gym, the common room, Eric's room, B2) has no pin of its own; it is listed under its outdoor place in the sheet.
- Pins are at least 44 px to tap on the phone, the label included. Where two would overlap at the current zoom, the nearer one to Eric keeps its label.
- Tapping a pin opens the sheet (phone) or fills the panel (desktop): the name, "Been here · about 1 min on foot", its interiors, and Go there. A place that can't be reached says why in one line: "Not been here yet. Walk up the north street from the east lane.", "By the lift from the forecourt.", "Open after work.", "Not open today."
- The map opens whenever the HUD is up, also during a conversation. Go there is then greyed with "Finish the conversation first.", so the tap is never ignored silently.
- Mock-ups: reviews/minimap-plan-1/ (phone-map, desktop-map, phone-hud, desktop-hud; regenerate with `node reviews/minimap-plan-1/mock.mjs` and rsvg-convert).

### Fast travel

Go there takes Eric to the place in a few seconds. A place can be travelled to only when all of these hold:

1. Nothing is running: no scene, no scripted walk, no trip, no line, prompt or choice on screen, and the place's start scene has run.
2. Eric can walk out of here now. At least one way out of this place is open under the story's conditions. So no fast travel from the train, from the security room before the gate, or from B2 during work.
3. The place is in today's public story: the day's set of places (day 1's `NEXT` and `TRIPS`, a later day's `OPEN_PLACES`). Places the public story has never used are drawn as plain buildings with no label. A place that was open on an earlier day but isn't today is shown greyed, "Not open today".
4. There is a walk there right now: a route over today's ways in which every leg is one the story lets Eric walk at this moment, worked out from each place's public story triggers and the current flags. The dorm courtyard on day 1 is reachable only after work, because the plaza's exit only goes there with `going_home`. Triggers a private plugin adds never count as a way.
5. No leg of the route is a scene. The lift ride to B2 carries lines, so B2 is never a fast-travel stop; the map says "By the lift from the forecourt."
6. (Decision 4, default yes) Eric has been there before.

He arrives the way he would on foot from the last leg of the route: the same arriving move, the same spot, the same zones, and then the place's start scene runs as after any walk. A beat that fires on arrival plays as it would on foot, and the save is made as at any place change.

The clock: no cost by default (decision 3). Walking costs no time today, so a charge for fast travel would make it dearer than walking. The sheet still shows the walking time ("about 2 min on foot"), worked out from the route.

The transition (decision 2, default: a quick crossfade): the leaving walk is skipped; the current frame is snapshotted, the destination is entered on the last leg's arriving walk, the usual crossfade clears, and he walks in. About 2 to 3 seconds, no black, and it looks like every other walk between outdoor places. Building starts when the place is picked in the sheet, before Go there is pressed, so most of the time the place is ready by the confirm.

## How it's built

New modules, each under the 400-line ceiling (ARCHITECTURE.md):

| Module | Does |
|---|---|
| game3d/js/travel/ways.js | The ways out of a place that are open now: its public story triggers resolved with the current flags, filtered by `canTravel`. Pure: (story, flags, day) in, targets out. |
| game3d/js/travel/route.js | The shortest route over the open ways, its legs, and its walking minutes from the pins' distances. Pure. |
| game3d/js/travel/rules.js | Every place's state now (here, go, walk there, by scene, not open, hidden) with its one-line reason, from rules 1 to 6. Pure apart from reading `game`. |
| game3d/js/travel/go.js | Fast travel: checks the rules again, then calls `travel(dest, { fast: true, via })`. |
| game3d/js/ui/map/base.js | Draws the layout (coast, green, paths, buildings) once into an offscreen canvas per zoom step. The line helpers in js/map/layers.js move to a shared module both maps use. |
| game3d/js/ui/map/view.js | The full map: canvas, pin buttons, the sheet or the panel, gestures, keys, focus. Loaded on first open (dynamic import). |
| game3d/js/ui/minimap.js | The HUD minimap: a crop of the base canvas round Eric, the pins and the goal. |
| game3d/css/map.css | Both layouts, in the HUD's slate and Mio's teal. |

Changes to existing code: places/lifecycle.js `travel` takes `{ fast, via }` (skip the leaving move; arrive with `tripInFrom[via]`). sim.js and the saves keep `visited`, added in `enter`; an older save is seeded with the places its day has certainly passed through plus the saved place. Lifecycle notes a place's public triggers before `installPlacePlugin` runs, so ways.js can ignore the plugin's. main.js binds M and the minimap (the integrator's files).

Data, facts first: the pin point for each place and the parent of each interior get a column in places.md's "Where the places sit on the island" table and fields on CHUNKS (island-chunks.js), checked by `node tools/facts/check.mjs`. Names come from `PLACE_NAMES`. No new list of places.

Facts docs to update in the build commits: controls-and-ui.md (the minimap, the map, M), systems.md (fast travel's rules, visited places), places.md (the pins, fast travel under Getting between places).

Tests:

- Unit (game3d/test/unit/travel.test.mjs, in `npm run check`): the rules on fixed cases. Day 1 morning at the forecourt: the plaza and the east lane go, the dorm courtyard is closed. Day 1 in B2 at work: nothing goes. Busy: nothing goes. Day 3: the harbour is "Not open today". A plugin trigger opens no way. Not visited: walk there. The route never crosses the lift.
- A route check: for each day, at the flag states of the route runner's checkpoints, every place marked go has a route whose every leg is a way the story would let him walk, and every leg's last place has a `tripInFrom` for it.
- A browser check, game3d/tools/map-travel-check.mjs, at 390x844 and 1366x860 in fast mode: open the map by tapping the minimap and with M, check pin sizes, close with Esc and the close button, fast-travel to three places, check he arrives in frame with the start scene run and no page errors, and check Go there is greyed during a conversation. Screenshots go to the critic.
- The whole-day fast test keeps passing (no minimap on the train).

## Phone performance

- No extra WebGL. The map is 2D canvas plus a few DOM buttons; nothing builds a place to draw it.
- The base layer is drawn once per zoom step and kept: 64 buildings, about 75 paths and the coast, a few milliseconds on a phone. At the phone's device pixel ratio the canvas is about 1170 × 2500 pixels, around 12 MB, freed when the map closes.
- While the full map covers the screen the game is paused and the 3D view isn't drawn at all (the pause menu still renders every frame; the map won't), so a map left open costs almost nothing.
- The minimap is a 2D crop of the same base: redrawn when Eric moves more than half a unit or turns, at most 10 times a second, and not at all while hidden. Its code is a few KB; the full map's code loads on first open.
- Fast travel builds the destination with the same `prepare` as any trip; an outdoor chunk takes a few seconds on a phone, and starting it on the pick hides most of that. `game.prepared` keeps every place built, so a player hopping across the island holds more places than a walker. The browser check measures the JS heap after six hops on the phone profile; if it grows past what a mid-range phone keeps, places that aren't here or next door are dropped on phones (needs a dispose path, its own task).

## Decisions

On Review minimap-plan-1, each with a default:

1. Map style: a clean UI map drawn from the layout data (default) or the illustrated island map.
2. Transition: a quick crossfade into the arriving walk (default) or a short walk montage through the places on the way.
3. Time cost: none (default), a fixed short cost, or a cost by distance.
4. Fast travel only to places he has been to: yes (default) or any open place.
5. Where the minimap sits: top right under the chips (default), bottom left, or no minimap on the phone (a map button only).
6. Minimap orientation: north up (default) or turning with the camera.

## Order of work

1. travel/ways.js, route.js, rules.js and their unit tests, with `visited` in the save.
2. The full map (view, base, CSS) with the rules shown on it, no travel yet. Critic pass at phone and desktop.
3. Fast travel (go.js, the lifecycle change) and map-travel-check.mjs.
4. The minimap.
5. Facts docs, cold-player run, then a Showcase entry.
