# Office to dorm: independent layout proposal

For C-0123. Design only; no layout below is canon or implemented. Claude holds the planned-place and trip sections of places.md (C-0125). The only decided room facts are Eric's belongings arriving ahead of him and his room facing a concrete wall a couple of metres away.

## Geography retained from island-03

I inspected `art/candidates/island-map-3/07-overview.png`. Head office is the tall tower at image left beside the blue station roof. The apartment cluster is at lower right. The fountain lies between them. The covered shopping street runs in front of the fountain and ends beside the apartments. Use these image-relative directions; the image does not establish geographic north.

The shortest visible connection leaves the tower forecourt, follows the near edge of the fountain square behind the shops, then reaches the apartments' upper-left entrance. Keep the tower, fountain and clustered apartments in those relative positions. The shops and other offices need only the facades visible from the walking path. Remove the map's cars. Bicycles belong in racks beside the path, clear of movement.

Recommend option A. It gives a direct walk and a simple room reveal without building a second attraction. Option B is a complete alternative if Jørgen prefers entering through the apartment courtyard. Show each as its own full route/exterior/room set.

## Option A: square edge and entrance passage

### Route and dorm exterior

From the existing lobby, Eric exits the glass entrance onto the head-office forecourt. The camera follows him across the forecourt and along the near side of the fountain square, with the shops to his right and the fountain to his left. At the east end, he turns toward the near apartment block. The dorm entrance is visible before the turn. Proposed walk length is roughly 80 metres, around 45 seconds of ordinary movement before stops; island-map-3 has no fixed scale, so this is a gameplay sizing proposal.

The selected block keeps the map's pale concrete walls, muted teal window panels, flat roof, repeated balconies and covered entrance. The entrance faces the lane. A bicycle canopy and a short mailbox bank identify it as housing. The surface treatment is the approved subtle plaster/concrete pattern, soft contact shadows and small modelled details. Do not make this into a picturesque village or a derelict slum. A few uneven curtain positions and occupied bicycle racks are enough to make it inhabited.

Eric walks through the entrance into a short ground-floor passage, about 8 metres long. His room is the final door. Its window faces the blank end wall of the adjacent apartment block across a 2-metre service gap. Both blocks stand on the same level. The wall is visible as a real neighboring building on the exterior plan, not a wall created only for the interior shot.

### Eric's room

Proposed internal footprint: 3.4 metres wide by 5.6 metres deep, about 19 square metres including the entry and bathroom. Use a local room plan with entry at the south end and the single window at the north end:

- Door: south wall, slightly right of centre, opening inward against the east entry wall. A shallow shoe step and a small shoe shelf sit beside it.
- Bathroom: enclosed southwest corner, 1.5 by 1.8 metres, with its door opening onto the entry strip. The bathroom door stays shut in this first review; no bathroom scene is required.
- Kitchen: 1.2-metre counter along the east entry wall beyond the door swing, with a small sink, single hob and under-counter fridge.
- Bed: against the west wall beyond the bathroom, 1 by 2 metres, pillow at the north end. The central route from the entrance to the window remains clear.
- Desk: 1.2 by 0.6 metres across the northeast corner under the window's right half, chair on its south side. One wall socket and a small desk lamp; no computer or hobby possessions asserted for Eric.
- Window: north wall, roughly 1.4 metres wide, sill at 0.9 metres. Through it, pale concrete with panel joints fills the view. The neighboring wall is 2 metres from the window, high enough that a standing Eric sees no horizon. The light is cool and indirect.
- Belongings: two closed delivery boxes beside the bed's foot and a suitcase against the entry wall. Their placement leaves the door swing and central walking route clear.

The room's deficiency is obvious from the window. Keep ordinary fittings intact. No broken bed, exposed wiring, vermin or invented landlord plot. Finishes: pale grey walls, muted blue curtains, grey floor and a simple steel bed frame. The limited window light and close wall supply the disappointing feeling without dialogue explaining the view.

### Things, spots and trip

Proposed outdoor things: office entrance, fountain, bicycle rack and dorm entrance. Proposed dorm things: mailbox bank, Eric's door, window, bed, desk and delivered boxes. These are selectable objects only if the day-1 scene uses them; this list does not authorize adding conversations or a checklist.

Proposed route spots: `office_out`, `square_edge`, `dorm_approach`, `dorm_entry`. Dorm spots: `entry_inside`, `room_door`, `room_inside`, `window_front`, `bedside`. Names are suggestions until Claude's places diagram IDs are settled.

Watched trip: B2 lift landing → existing lift to floor 1 → lobby → glass entrance → square edge → dorm entrance → short ground-floor passage → Eric's room. Eric remains visible through the door crossings. Near walls fade or cut away as the camera crosses into the dorm, consistent with the current play camera. No fade to black, teleport, or instant move from basement to street.

## Option B: square edge and open courtyard

The outdoor route keeps the same tower, fountain and apartment geography. Eric follows the near side of the fountain square, then continues a few metres farther to the apartments' central opening. The final approach goes through the existing gap between the near blocks into their shared courtyard. Proposed outdoor distance: roughly 95 metres, around 55 seconds before stops.

The dorm exterior is a pair of pale concrete blocks around a small paved courtyard, retaining the connected apartments from island-03. Bicycle canopies sit against its perimeter; a single modest planted bed leaves the middle clear. Eric enters a ground-floor door under the left block's covered gallery. The route to his room is open to the courtyard until the last door, so no enclosed corridor interior is needed.

His room uses the same proposed 3.4 by 5.6 metre footprint and the same complete furnishing arrangement described here: entry and shoe shelf at the south end; enclosed bathroom at southwest; kitchenette on the southeast wall past the door swing; single bed along the west wall with pillow at its north end; desk and chair at northeast; window in the north wall; delivery boxes by the bed foot and suitcase beside the entrance. The window faces a full-height concrete return wall of the adjoining block 2 metres away. That wall has no windows facing his room. The welcoming courtyard lies behind him when he looks out of his only window.

Things: office entrance, fountain, bicycle rack, courtyard entrance, Eric's door, window, bed, desk and delivered boxes. Spots: `office_out`, `square_edge`, `dorm_court`, `room_door`, `room_inside`, `window_front`, `bedside`. The watched trip is B2 → lift → lobby → forecourt → square edge → courtyard → covered gallery → room. This option trades a slightly longer outdoor walk for one fewer interior space. It needs a real courtyard footprint and therefore shows more apartment geometry than A.

## Shot staging for the review

Each option should have three images at readable size: route overview, dorm entrance and room. These are layout/look images, not approved game assets. Use the same flat-shaded 3D style and approved surface treatment for all three. Keep Eric's approved proportions if he appears. No dialogue or mandatory new NPC is proposed.

### Route overview

Beat: show how one can walk from work to the chosen dorm entrance. Script moment is not yet written; this is the after-work trip proposal. Camera outside, elevated above the shopping-street side of the square, looking across the lane toward the fountain. Head-office forecourt at frame left; fountain behind the path in the middle; selected apartment entrance at frame right. The shopping roofs may occupy the lower foreground, but must not conceal the path. Camera about 12 metres above the pavement, wide three-quarter view. The mainland, beach, pool and shrine are outside this crop. If Eric is present, he walks left to right along the connected paving. Late-afternoon light across the square; no time cue that conflicts with the existing office evening at 18:05. Physical check: the route never crosses a building, water or raised planter, and both endpoints are visible.

### Dorm entrance A

Beat: locate the entrance and the neighboring wall that will block Eric's view. Camera on the approach lane at approximately 2 metres high, looking obliquely into the entrance and along the side of the block. Foreground clear paving; midground entrance canopy, mailbox bank and bicycle canopy; background repeated residential windows and the adjacent block's blank end wall. The 2-metre gap is a side service passage, not the main route. Head office is behind the camera. Eric approaches away from the camera and looks toward the doorway. Physical check: full-height entrance, usable landing, door leads into the depicted passage, bicycle racks do not obstruct it.

### Dorm entrance B

Beat: show the courtyard-to-room route. Camera just inside the courtyard entrance, about 2 metres high, looking diagonally toward the ground-floor gallery and Eric's door. Foreground open paving, midground modest planting and gallery, background residential block. Bicycles sit at the edge of the frame. Head office and the fountain are behind the camera. Eric walks toward the gallery; the nearest gallery columns cannot hide his whole body. Physical check: his door belongs to the block whose return wall appears in the room plan, with a real 2-metre gap beyond the window.

### Room, either option

Beat: first look at the room, with the obstructed window immediately legible. Camera just inside the entry toward the southeast corner, around 1.7 metres above the floor, looking toward the north window and west bed. Medium-wide frame: entry corner and closed bathroom side in the near left, bed on the left, open walking strip through the centre, desk and chair on the right, and window at the far end. The entrance door is behind the camera and should not appear ahead. If Eric is included, show him near the centre facing the window, with a clear eyeline to the concrete wall. Daylight enters from the window as soft reflected light; the desk lamp can be off. Physical check: window glass separates the room from the wall, the 2-metre gap reads from sill and wall perspective, one bed with one pillow end, chair usable, boxes outside the walking strip. A close wall must not be replaced by a scenic sea view.

## Checks applied

GUIDE: day-1 only; short continuous trip; every visual remains a review candidate; separate complete options; retained flat-shaded 3D direction and approved surface detail; no cars; no invented dialogue, backstory or later-day systems. Shot-staging: camera, occlusion, thresholds, light and room-wall relationship checked in the plan. Humanizer: plain wording, no slogans or narrative claims. No render, code, docs change or browser test performed.
