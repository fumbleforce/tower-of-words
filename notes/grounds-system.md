# Walkable ground and its edges (#362)

Jørgen, 2026-10-09: "the terrain should also make it very clear what areas are walkable and what is not, right now the bordering stone paths and curbs are very insonsistently applied and have big gaps and stops player just by invisible walls. This needs a consistent system not just haphazardly slapping together edges everywher." Also: "the park/ground has these ugly steps and gaps that look really unnatural."

## What was wrong

- Each outdoor place said twice where he can walk: a list of rectangles for the walk grid (`nav.extra`, which tested only his centre) and separate hand-placed kerbs. The two drifted apart. Where a paved path met lawn with no kerb, he hit an invisible wall; some kerbs had gaps for openings that weren't walkable (the lane's bench bays, the paths to the wing) or stood where nothing stopped him.
- Planted beds were slabs raised 6 cm with a dark soil face, and the garden drifts stacked two offset slabs, so the lawn showed steps and dark lines everywhere. Two kerbs ran side by side at the court's east edge with a dark gap between them.

## The rule

He walks on paving and gravel. Lawn and planting are never walkable. Wherever walkable ground meets anything else there is exactly one visible edge, and he is stopped exactly there:

- a building's wall, a raised bed's low wall, a closed gate: those already show it, so nothing more is drawn;
- where a trip to the next place starts, the paving runs on and nothing is drawn;
- everywhere else, a granite kerb (16 cm wide, 10 cm high), laid wholly on the side he can't walk on, so his feet meet it.

Where two walkable areas meet (a path joining a court) there is no kerb. Planted beds sit flush with the lawn, one footprint each, with no raised face.

Beds belong to the structure (Jørgen, 2026-10-09: "areas like this must be avoided, where the plants are contained in these oddly shaped areas, it looks bad"). `game3d/js/scenes/outdoor/bed-layout.js` turns each planned bed into a straight strip, at most 1.5 deep, behind the kerb of the path it borders; plants further out stand loose on the lawn, and a bed with no path beside it is only loose plants. The walk-ground test checks every bed is such a strip or loose.

## How it is built

- `game3d/js/movement/walk-ground.js` (no Three.js): a place lists its walkable rectangles, the buildings it can walk into, the ground it shows but can't reach (backdrop) and its barriers (`building`, `wall`, `gate`, `open`). It works out the outline of the union once: contains(x, z), the edges with what lies beyond each, and the non-walkable ground as rectangles. `applyGround(nav, ground)` blocks those rectangles on the walk grid, which keeps his whole radius off them, as it does off furniture.
- `game3d/js/scenes/outdoor/walk-edges.js` draws a kerb on every edge whose kind is `kerb`, joined at corners, from the same outline.
- Each place has one ground file (forecourt/ground.js, campus/ground.js). The place builders no longer lay their own boundary kerbs.
- A check per place (game3d/test/unit/walk-ground.test.mjs): every line where the walk grid stops him has a drawn kerb or a named barrier, never "seam" (walkable-looking ground he can't enter); every spot, seat approach, entrance and trip zone stays reachable.

## Stages

1. The system, the forecourt and the campus (the two reference views). Stop for Jørgen.
2. After he has seen stage 1: plaza, dorm court, shotengai with the station garden, east lane and coast, office quarter, sports and pool, harbour, works.

Bushes, tree trunks and benches are a separate task (claude-agent:planting).
