# Dorm building: proposed plan (review dorm-floor-1)

A proposal, not yet a fact. When Jørgen picks a plan on [dorm-floor-1](../reviews/dorm-floor-1/review.json), the "Dorm building" section below moves into docs/game/places.md (and the other edits listed at the end go in with it), in the same commit as the build. Until then docs/game/places.md stays as built, so the facts check doesn't change. Work issue: #85.

Plan images (up is island east, the way the game camera looks at the block; x and z below are the dorm courtyard's own frame from game3d/js/scenes/dorm-court/plan.js, x to the right on screen, z toward the camera):

- art/candidates/dorm-floor-1/01-ground-floor.webp: the way in, both options.
- art/candidates/dorm-floor-1/02-floor2-open-air.webp: 2F, option A.
- art/candidates/dorm-floor-1/03-floor2-interior.webp: 2F, option B.
- The drawing script is art/candidates/dorm-floor-1/draw.py.

## What fixed the plan

- Eric's flat as built (scenes/dorms/layout.js): 2.3 units wide with its walls, 3.95 deep, the front door on the open corridor, the window at the back facing dorm_1e's wall, the flat on his right lived in (202), the one on his left out (205), one more each side at the frame's edges. The dorms chunk sits at court x -0.49, almost straight above the hall doors (x 0.5).
- He arrives along the corridor from the right (docs/game/places.md, Eric's dorm room), so the stairs are on the right, at the block's south end.
- The court already shows a stair window on the return's west face (scenes/dorm-court/block.js), where the long block meets the return. The stairs go there.
- The hall's bank of mailboxes is 6 by 4 = 24. Four floors of flats (2F to 5F) with six flats each fill it.
- The old draft used room 203 on the second floor (notes/day1-draft.md, "Dorm A, room 203. Second floor"); docs/game/ never set a number. Numbering from the stairs, the third flat along is his, so 203 fits with nothing moved.
- No lift: a five-storey 1990s block, and Amakawa never replaces anything (setting.md).

## Proposed addition to docs/game/places.md

### Dorm building (inside `dorm_court` and `dorms`)

Eric's block, `dorm_1`: five storeys of plain concrete, the long face on the dorm courtyard, the return at its south end. The ground floor has the entrance hall, the manager's room, the stairs and rooms that are not part of day 1; 2F to 5F have six flats each, off a corridor on the court side. There is no new place: the hall is walked in the courtyard (`dorm_court`), the stairs are the trip, and the 2F corridor is walked in `dorms`.

- Entrance hall (built, in `dorm_court`): the glass front with its open doors, a doormat inside them, the 24 mailboxes on the back wall (rows 5F at the top down to 2F, each with its room number; 203 has a strip of tape reading エリック), the notice board right of the passage, and the passage at the back. Shoes stay on in the common parts: every flat has its own genkan, so there are no shoe lockers and no step.
- Manager's room (管理人室 MANAGER): behind the mailboxes, its window on the passage's left wall, curtain drawn and light off for the night. Nobody is there on day 1.
- Ground-floor corridor: from the passage's far end, right along the inside of the court face, past the manager's room door and the lounge door (lounge dark), to the foot of the stairs.
- Stairs: in the corner where the return meets the long block, two flights to a floor with a half landing, the stair window on the flights, a 2F sign on the wall at each landing. No lift.
- 2F: six flats along the corridor, numbered from the stairs. Rooms skip 4, as many Japanese buildings do: 201, 202, 203, 205, 206, 207. From the stairs: 201 (dark), 202 (home, TV on), 203 (Eric's), 205 (out, dark), 206 (desk lamp on), 207, then a fire escape at the far end. Each door has its number plate and a light over it; 203's name slot is empty. Every flat's window is at the back, and dorm_1e's wall stands 1.3 out behind 201 to 206 (it ends partway along 207).
- 3F to 5F repeat 2F (301 to 507); only 2F is walked.

Option A (open-air corridor): the corridor is open to the court behind a low parapet, as in the dorms scene today. From the courtyard the block's face shows these corridors (parapet bands, doors, meter boxes, lit kitchen windows) instead of balconies, and 203's door can be seen almost straight above the hall doors.

Option B (interior corridor): the corridor is indoors, a wall with a small window at each flat on the court side and strip lights on the ceiling. From the courtyard the face is a plain wall with a row of small windows on each floor; 203's door can't be seen from outside. The dorms scene's corridor gets its wall and ceiling lights.

#### Things

In `dorm_court`:

| Id | Label | What it is |
|---|---|---|
| `dorm_entry` | Dorm entrance | The hall's glass doors (as built). |
| `stairs` | To the stairs | The passage at the back of the hall, to the stairs. |
| `mailboxes` | Mailboxes | The mailbox bank; 203 has his name on tape. Optional: only if the story agent gives it a line. |

In `dorms`:

| Id | Label | What it is |
|---|---|---|
| `door_203` | Room 203 | His front door on the corridor. |
| `window`, `boxes`, `bed` | as built | |

#### Spots

`dorm_court`: `plaza_entry`, `dorm_entry`, `hall` (just inside the doors), `passage` (the passage mouth).
`dorms`: `landing` (the top of the stairs on 2F), `door_203` (in the corridor at his door), `room_entry`, `window_front`.

#### Zones

`dorm_court`: `hall` (inside the doors), `passage` (the passage mouth).
`dorms`: `door_203` (the corridor in front of his door).

#### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` (`dorm_court`) | Arrive | Goal line: "Go in through the dorm entrance. Your room is 203." Marker on the hall doors. |
| `hall` (`dorm_court`) | Step inside the doors | Goal line: "Room 203 is on 2F. The stairs are through the back." Marker on the passage. |
| `go_up` (`dorm_court`) | Reach or use the passage | The trip up to `dorms`. |
| `landing` (`dorms`) | Arrive on 2F | Goal line: "Room 203." Marker on his door. |
| `go_in` (`dorms`) | Reach or use his door | The goal clears; he goes in over the genkan to `room_entry` and the day ends as now (`home`). |

### Getting between places (replaces the `dorm_court` → `dorms` line)

- `dorm_court` → `dorms`, walk then stairs: Eric walks in through the hall doors and across the hall himself. At the passage the camera comes in close, then crossfades to him coming up the last flight onto the 2F landing; the camera pulls back along the corridor and lets go. He walks left past 201 and 202 to his door, 203, and in.

### Timing

Gate to hall doors about 5 units, hall to passage about 3 (about 5 seconds at walking speed 1.5); the trip about 5 seconds; landing to 203's door about 7 units (about 5 seconds). Under 20 seconds from the gate to his genkan.

### Cameras

- C1, courtyard: the court camera as built (looks east, follows Eric) keeps following him into the hall; the hall's front is cut low already.
- C2, passage: the same camera closes in on him at the passage mouth before the crossfade.
- C3, 2F corridor: looks east down onto the corridor from over the court, roof and near parapet (or wall, in B) cut low as in the room view; it frames the landing to 203 and follows Eric left.
- C4, room: the room camera as built; it widens to the whole flat as he steps in.

## Other edits this needs when built

- docs/game/places.md, Dorm courtyard: the hall becomes walkable (today walking into the doors starts the trip); in A the block's court face shows corridors, not balconies (and in B a plain wall with small windows). Things, spots, zones and small moments as above.
- docs/game/places.md, Eric's dorm room: he arrives on the landing instead of at his door, and walks the corridor; the view widens to take in the landing (to court x 7, dorms x +7.5).
- docs/game/places.md, Where the places sit: `dorms` walk and view bounds grow to the landing; `dorm_court` gains the hall and passage in its walk.
- docs/game/cast.md, Eric's home: "room 203 on 2F".
- game3d/js/scenes/island-layout.js, `dorm_1`: the built flat sets the block's depth. Its back wall is at island x 88.29 and the corridor's parapet at 83.59, where the footprint has 87.94 and 84.14. Either widen the footprint to match (the gap to dorm_1e becomes 1.15) or leave it and let the flat overhang, which nobody can see. Proposed: widen the back only, keep the court face.
- Story (story agent): the goal lines above, and a line for the mailboxes if wanted.

## Open point

As the island layout has it, dorm_1e runs along almost the whole block, so 201 to 206 all look at its wall; nothing in the view makes 203 worse than its neighbours. Keeping "the worst room" (cast.md) as a view would mean a shorter dorm_1e, which is a map change and not part of this plan.

## Not in this plan

The lounge, the manager, the other floors and every other flat are not walkable and have no content. Nothing here is for after day 1.
