# Head office lobby rebuild: plan (#259)

Jørgen, 2026-10-05: "could we also rework the lobby where kuro sits, it seems extremely small for the main building, it should be an impressive looking reception area rather than the tiny residential reception it is now".

This is the plan step only; nothing in game3d/ changes here. Open choices are in Review item `reviews/lobby-plan-1`. Drawings and concept pictures are in art/candidates/lobby-plan-1/ (plan_svg.py draws the plans, gen.py made the concepts). The environment rules this follows are in GUIDE.md (Visual design) and notes/environment-critique.md.

## What is there now

The lobby is the south-west corner of the head office tower's ground floor, built in game3d/js/scenes/head-office.js and head-office/{frame,lobby,tower}.js, inside the forecourt place. It is 9.9 by 6.2 units with a 2.4 ceiling (people stand about 1.2), so the ceiling is twice a person's height and the room is about as big as a dorm common room. Kuro's counter is 2.0 long, two sofas sit round a table, and the lift core (B2 car, a second car, the stair door) stands 4 units in from the door. Screenshots at 1366x860 and 390x844 are on the review page.

## Decided

- Look (Jørgen, 2026-10-05, "default style to the lobby"): a marble and glass corporate atrium, a warm light-oak desk, cool daylight, in the approved flat-shaded 3D style. Pale marble floor, cool grey granite walks, pale stone walls, slate-blue seating, brushed steel lift doors, green planting. No brown, gold or warm orange light.
- The head office grounds outside get the same look next (paving, planting, signage, lighting). So the entrance side uses the materials the court will use: the court's dark granite walk carries straight in through the door, the stone planters at the door match the ones inside, and every sign (受付, the lift floor signs, the directory, the outdoor name stone and way-finding sign) shares one plate style and font.

## The layout (default: plan A)

All numbers are in the tower's frame (u east from its south-west corner, n north), on the facade's bay grid: 16.4/11 = 1.49 in u and 9.6/6 = 1.6 in n. That makes one grid for the room, with every wall, desk, planter and walk on it. The numbers are a sketch for the builder to confirm.

- Footprint: the atrium takes u 0 to 13.42 (9 bays) by the tower's full depth, 0 to 9.6. That is 129 square units against today's 61, about 2.1 times the floor. The back office stays east of it (u 13.42 to 16.4), seen through a glass partition, so the facts doc's desks behind the south and east windows survive.
- Height: double-height, 4.4 (ground floor plus one storey). The south and west faces of the atrium become two-storey glass between the stone piers, and the tower's first-floor band is left out over the atrium. The fade over the lobby (frame.js NOTCH) stays three storeys tall and widens to the new lobby.
- Entrance: the door stays at u 3.2, so the court's walk, the canopy, the crowd's door point and the map references don't move. The court's dark granite walk runs in as a 1.6-wide band, with a recessed mat inside the door.
- Reception: a 4.6-long light-oak desk with a stone front, centred on the door line at n 5.6, with Kuro behind it facing the door. Behind her, a full-height pale stone feature wall (u 0.2 to 5.96, n 7.4) carries AMAKAWA in steel letters and 受付 RECEPTION. The yellow guide line runs straight from the door to the visitor spot (n 4.8).
- Walks: the door walk goes north to the desk. At junction 1 (n 3.2, a grid line) a cross walk goes east to junction 2 (u 10.44, a bay line), then north to the lift apron. That gives two right-angle junctions, both on grid lines, with no loops.
- Lifts: a bank of four lift doors on the back wall, u 7.45 to 13.42, facing south so the ride is still filmed straight on. The B2 car is the west one (u 8.2), nearest the desk, with a granite apron in front of the bank. The stair door is in the bay between the feature wall and the bank. Service and the riser are behind the feature wall.
- Seating: two round islands south of the cross walk (around u 5 and u 11.7, n 1.4), each a stone planter with a small tree and a ring of low slate-blue benches. There is a bench beside the lift apron, tall planters at both ends of the bank and both ends of the feature wall, and a plant in the south-west corner.
- Nooks (new stable ids for docs/game/places.md): `lobby_model` (a model of the island under glass, west of the door), `lobby_island_w` and `lobby_island_e` (the seating islands), `lobby_lift_bench`, `lobby_umbrella` (the umbrella stand by the door). No story is placed in them now.
- Light: cool daylight from the glass, Kuro's warm pool over the desk kept, and pendants and a light slot over the feature wall as emissive geometry rather than new real-time lights. After work the atrium glass glows as the lobby glass does now.

Plans B (lifts straight ahead of the door, desk in the east half) and C (a free-standing desk on the door line with the lifts behind it) are drawn for the lift choice in the review.

## Dependencies and where each goes

Everything below has to keep working; the builder checks each one. "Derived" means it follows frame.js by itself once the constants change.

| Dependency | Where | In the new layout |
|---|---|---|
| Lobby size LU, LN; GF | head-office/frame.js | LU 13.42, LN 9.6 (less the core); add an atrium height (4.4) beside GF so the tower's floors and the core's base don't move. |
| Court east edge, lane start, gardens | forecourt/plan.js LE = at(LU, 0), then court.js, lane.js, gardens.js | Pin LE to today's value (u 9.9) as its own constant, so widening the lobby doesn't move the court, lane or garden. Must do first. |
| Door, canopy, name stone, court walk turn | frame.js DOOR_U, tower.js, plan.js HO_X; map/reference.js ho_door; crowd/data.js out [12.25, -1.7]; flicker-check.mjs | Unchanged (door stays at u 3.2). |
| Kuro and the counter | lobby.js RECEPTION, head-office.js Kuro at +0.65 | RECEPTION [3.2, 5.6]; receptionFront and kuroAt derived. |
| talk:kuro, say ohayo / yoroshiku, kuro_intro (face, cam on kuro 1.2, point to the lift, bow) | story/forecourt.js:11-13, 54-90 | Same beats: the visitor spot is in front of the desk, and her point to the lift turns toward the bank on her left (image right). |
| label_printer | lobby.js printer, places/forecourt.js | On the desk's west end, beside her screen. |
| office_entrance spot (takes him to the lift), lift thing, zone lift_front (r 0.42 round liftOut), liftOpen/liftClose | places/forecourt.js:28-80, 184, 194; catalog.js:132-148 | Derived from the B2 car's site. liftOut must stay inside lift_front (lifecycle.js:203, day 2+ arrivals). |
| Day 2 and 3 office trips | story/day2/forecourt.js, story/day3/forecourt.js; Kuro absent day 3 (day3/plan.js:26) | Unchanged triggers. |
| Lift site and ride | head-office.js FORECOURT_LIFT_SITE; places/lift.js (clip box, CUT 0.5, wallH, hall indicator at wallH > 1.8, landing carpet, setAway shroud in lift-light.js) | The B2 car moves to u 8.2, n 7.6. The core's front wall keeps a 2.4 portal and the stone above it is a separate piece up to 4.4. Check that the clip box and the shroud cover the taller wall; lift.js is at its line cap (module-budgets.json 1107), so new code goes in a helper. |
| B2 office under the forecourt lift | island-chunks.js:29 office chunk `at` (hand-matched); places.md:94; tools/facts/check.mjs:254-269 | Re-match the office chunk to the new B2 position, and update the table and the facts check. |
| Walk grid | head-office.js nav.extra (door gap, lobby rectangle, FURNITURE, nav.block CORE); forecourt.js WALK z0 = HZ - 6.4; island-chunks.js:24 forecourt walk z -9.8 | New rectangle and furniture list. The walk z limits move to the new back wall (about HZ - 9.8 and -13.4). |
| Occluder `ho:upper` | head-office.js inLobby, frame.js NOTCH, NU | Derived from LU and LN. Widen the notch to the new east wall, and give the cut faces the same glazed inner facade. |
| Camera | places/forecourt.js desktop clamp [5.2, 26, -6.2, 3.5], phone clamp [-1, 30, -8.4, 8], TURN [8.2, 12.6] | Push the clamps' north limit to reach the lift apron (about -11.5), and check the phone turn stays north inside the lobby. Kuro's close-up framing comes from the cam beat. |
| Old saves | forecourt.js snapToWalk (lift car test derived) | Saved spots that now fall in furniture snap to free ground, as today. |
| Tools | chibi-shots.mjs, chibi-proportions.mjs (Eric at Kuro + (1.4, 0, 0.9)), goal-arrow-check, gl-resume-check, lift-door-shots, cam-coverage, reach-check, test/routes/arrival.mjs, office.mjs, day2.mjs | Rerun them all, and move the Eric offset if it lands in the desk. |
| Facts | docs/game/places.md (lobby paragraph :262, trips :36-39, nooks) | Rewritten in the build commit (`Facts: docs/game/places.md`). |

## Performance

- Today's forecourt baselines are 167 draw calls on desktop, 147 on phone and 158 at phone q1, with 20% tolerance (tools/perf/budgets.json, reported by fast.mjs). Target for the new lobby: no more than 8 extra calls and 15k extra triangles over today's lobby, measured before and after with tools/perf/day-calls.mjs.
- All static pieces go through mergeStatic (scenes/merge-static.js): one mesh per material. The lobby uses about eight: marble, granite, stone, oak, steel, slate-blue fabric, dark trim and green. Floor joints and walk bands are boxes in those materials, not textures.
- Every sign (AMAKAWA, 受付, the lift floor signs, the directory) is drawn on one canvas texture, which is one textured call. The glass frontage and partition stay one transparent mesh each, in the occluder set.
- Small things (bench legs, the umbrella stand, desk items) don't cast shadows. Trees in the islands use the existing plant() builder at low seed counts.
- No new real-time lights. Kuro's lightPool stays, and everything else is emissive.

## Build order (for the builder, after the review)

1. Pin LE and the court constants, then check the court is unchanged in place-shots.
2. Shell: frame constants, the atrium walls and glass, the wider notch, the back office partition.
3. Core and lift: the bank, the B2 site, the ride (rideOut, rideHome, day 2 arrival), and the office chunk re-match.
4. Desk, Kuro, feature wall, walks, guide line, then the seating, planting and nooks.
5. Camera clamps, the walk grid, tools, facts doc, perf numbers. Fast test at both sizes, and a critic score from desktop and phone shots, plan view included.
