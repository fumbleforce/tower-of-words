# Lighting and time of day: one system

Issue #370. Jørgen, 2026-10-09: "yes we need one system for lighting and time for sure, start now". The audit behind it is notes/architecture/world-kit.md (section 3, "Time of day" and "Lighting"; section 4, stage 6).

## The problem

Each place lit itself. Seven places built their own sky light and sun, lit windows came on in six different ways, and 28 places had a hand-written `onPeriod` that turned the evening on. Almost none could turn it off again: only the shop street could go back to daylight. A period change while Eric stood in a place changed the lamps but not the colour grade, because the grade was read only when he entered.

## How it works now

Three small files in game3d/js/kit/light/, below places/ and scenes/ (kit code imports neither).

**The period table** (looks.js). The day clock's periods are early, morning, lunch, afternoon and evening (sim.js). Each falls in a phase: the first four are `day`, evening is `dusk`. A phase has a look: the sky and ground light, the sun's colour, strength and direction, the fill light, the colour grade, and whether things glow. A look can have values for a later day on top (day 2's lifted dusk). There are two sets so far: OUTDOOR (all the outdoor chunks) and DORM (Eric's building). Every light value for a period lives here and nowhere else. Adding a night later is one line in the phase map and one look per set.

**The rig** (rig.js). Each place has one rig. It builds the place's sky light, sun and fill, and `apply(period, day)` sets all of them from the table, moves the sun, sets the background if the look has one, switches the glows and returns the grade. It works the same in both directions, so the clock can go forward and back. A place can patch its grade per phase (the street trial does), take its hand-dressed daylight as its own look, and say which phase a period is for it (the dorm on day 1 is always dusk, as Eric is only there after work).

**The glows** (glow.js). Anything that lights up after dark registers once, while it is in its daytime state: a material with its night colour, emissive and strength; a mesh that shows only at night (lit window panes); a lamp's light pool with its night strength. The builders hand these back as a `glows` list (the lamp set, the nooks, the seafront, the shop signs, the skyline, the station and head office). Switching back to day puts every value back exactly as built. A material registered twice keeps its true daytime values.

**Places declare; they don't light.** A place sets `light: rig` and adds its glows. On entry the lifecycle calls `lightPlace(place, period, day)` before the post chain is built; when the clock moves (the story's `period` hook) the same call runs and the grade and the people's evening lift update live. `onPeriod` stays for what else a period changes (who is out after work, the fallen bike), not for light.

## The sky and haze (#365)

Every outdoor place has a sky and distance haze (game3d/js/look/sky.js; `?far=0` switches it off). Its colours are in the period table: each outdoor look has a `sky` (looks.js SKY), and a look can carry a period's own values under `periods` (the early morning's sky), which `lookFor(looks, phase, day, period)` puts on top. The rig hands the sky over in its state (`rig.state.sky`, with the sun's direction), so on a place with a rig the sky, the haze, the sun and the lights all change in the same `apply()`. A place not yet on a rig has look/sky.js look its period up in the same table. look/sky.js only paints. The far ring's lit windows (skyline.js `litF`) and the far model's lit windows still switch with the look's `glow` in look/sky.js.

## Stage 1 (this change)

- The table, the rig, the glow registry and their unit tests (game3d/test/unit/light-system.test.mjs: every period has a phase, glows go on and back exactly, a rig stepped through the day and back gives the same light, day overrides, listeners).
- The forecourt (outdoors, with the head office tower and its lobby, the station, the lamps, the nooks, the seafront and the skyline) and Eric's dorm building (indoors, with windows) are on the rig. Their old light code is gone: the forecourt's `onPeriod` light body and `lightsOn`, the head office's `onPeriod`, the dorm's `dormDaylight`.
- Both look the same as before in each period, and now go back to daylight. Before and after pictures from the same cameras, and the step-forward-and-back check: game3d/tools/light-shots.mjs with game3d/tools/light-views.json; the Showcase entry lighting-20261009.

Builders that other places still use keep their old `evening()` and `onPeriod` beside the new `glows`, so nothing else changed.

## Next

Move the other places onto the rig, a few at a time, each with before and after pictures: the plaza, the shop street, the east lane and the dorm court first (the walk home), then the rest. Each removes one `onPeriod` light body and one more lit-window mechanism (block.js's hidden lit mesh, emissive glass raised at evening, the private period checks, door-cards.js's own table). Then the interiors that still build their own lights (the office, the station lobby, the train). When the last place is moved, eveningLight and outdoorLight in scenes/town.js go.
