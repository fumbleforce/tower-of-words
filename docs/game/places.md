# Places

Day 1 has eight places: the monorail (`train`), Honsha station’s security room with the gate (`gate`), the station forecourt and head-office entrance (`forecourt`), the fountain plaza east of it (`plaza`, a side trip in the morning), the lift (`lift`), IT support on B2 (`office`), and on the walk home after work the dorm courtyard (`dorm_court`) and Eric's dorm room (`dorms`), where the day ends. For each: its things and their labels, spots, seats, zones, who is there in each period, and its small moments; also places decided but not built, and how you get between places. Forecourt route added on 2026-09-30, the plaza, the dorm courtyard and the walk home the same day.

Elsewhere: the island as a whole is in [setting.md](setting.md); the people in [cast.md](cast.md); what happens in a place as part of a storyline is in [stories/](stories/); how places look (palette, light, style) in [art-and-sound.md](art-and-sound.md). The hooks a story can call in each place (doors, the gate, the copier) are in game3d/story/FORMAT.md.

The tables are checked by `node tools/facts/check.mjs`: things and their labels, spots, seats, zones, who has a body in each place and the story's schedule for them, and the small-moment nodes. Coordinates: x runs left to right on screen, z from the back (negative) toward the camera; a unit is about a metre and a half.

## Places decided but not built

The company city has dorms, a canteen, shops, a bar and a university ([setting.md](setting.md)); only the places in the list below are planned, and only the `##` sections further down are built. One line per planned place: name, id, what it is.

The picked full-island layout is [island-map-4](../../reviews/island-map-4/review.json). Only the day-1 route is to be built, one chunk at a time, using the game's existing palette rather than the map's saturated colours. The plaza and dorm courtyard chunks replaced the earlier single outdoor `path` proposal. No other place is planned yet.

## Getting between places

There are no cuts to black (Jørgen, 2026-09-28: "elegant, continuous transitions"). Each move is one trip the player watches. A trip is finished before anyone in the new place speaks: the crossfade has cleared and a camera pulling back from the arrival has settled. One line per trip: from, to, how, then what the player sees; a trip to or from a planned place is planned too. The bible draws these as the places diagram (http://127.0.0.1:8771/bible/#place-map).

- `train` → `gate`, walk: Eric steps off onto the platform, follows the covered walkway and enters Honsha station's security room through its glass doors.
- `gate` → `forecourt`, walk: Eric walks north out of the security room's back exit. The camera stays close and keeps its angle, then crossfades to him stepping out of the station's north door onto the court; on a phone the camera then turns to look east-north-east up the court at head office.
- `forecourt` → `lift`, walk: east across the court and north to the head office door, through the lobby past the reception, and into the lift.
- `lift` → `office`, lift: the car comes up from B1 to meet him (the display over the lobby's lift doors counts, a ding), and its doors open on the two from Sales already aboard. The camera stays inside the car for the whole ride. Once the car leaves floor 1 the lobby goes dark and out of view, so only the car in its shaft and the people in it are seen. The floor display counts from 1; someone has pressed 5, where the doors open on a lit landing of that floor and the two from Sales walk out; then down to B2. The doors open on the B2 lift landing.
- `office` → `lift`, walk: after work, Eric walks from B2 into the same lift, the camera easing in on the car as in the morning; the near wall drops and the lights outside go down. He rides alone; once the car leaves B2 the office goes dark and out of view.
- `lift` → `forecourt`, lift then walk: the floor display counts B2, B1, 1; the same shot of the car crossfades to head office's floor 1, the lights come up, the doors open and he walks out into the lobby, the wall rising behind him; the tower comes back over the lobby as he walks out of the door.
- `forecourt` → `plaza`, walk: Eric walks east off the court along the lane by the tower's south face. The camera closes in on him at the lane's end and crossfades to the same close framing of him on the plaza's lane just west of the circle, walking in along the fountain's axis with the fountain ahead as the camera lets go.
- `plaza` → `forecourt`, walk: the same walk the other way, west along the lane back toward the head office door.
- `plaza` → `dorm_court`, walk: after work only. Eric walks east off the plaza along the lane; the camera closes in on him at the lane's end and crossfades to the same close framing of him walking on along the same brick lane, which runs past the dorm courtyard's front as the street. He turns in through the court's gate and walks up toward the hall doors, then the camera lets go.
- `dorm_court` → `dorms`, walk then stairs: Eric has walked in through the hall doors and across the hall himself. At the passage the camera comes in close as he walks into it, then crossfades to him coming up the last flight onto the 2F landing; the camera pulls back along the corridor as he turns into it and lets go. He walks the corridor to his door himself (Eric's dorm room).

The dialogue slots for each trip are in game3d/story/transitions.js (format: FORMAT.md, Transitions).

## Where the places sit on the island

Every place has a spot in one island frame, fitted to [island-map-4](../../reviews/island-map-4/review.json) (2026-09-30). The frame: x runs east, z south, in game units, along the town's street grid, which the map draws turned about 23° clockwise from its up (Jørgen, 2026-09-30: "lol look at the lift, it sits at an angle inside the building, intersecting the wall"), so every building on the grid is square to the cameras; north means the grid's north; the origin is the head office door as the map draws it. The table gives the island point of each place's own (0, 0), its clockwise turn on the map in degrees, its scale (the train is built at people scale 1, everything else at 1.18) and its level (0 ground, -2 underground, 1 upstairs or raised). The walks between outdoor places crossfade, so neighbouring places don't have to touch.

The buildings, paths, green and coast around the route, and the fit to the map, are data in game3d/js/scenes/island-layout.js. The island map shows all of it (`?map=1`, key M; `?mapcompare=1` over the reference); the differences are listed in notes/map-gaps.md.

| Place | x | z | Turn | Scale | Level | Pinned by |
|---|---|---|---|---|---|---|
| `gate` | -14.45 | 6.5 | 0 | 1 | 0 | The room centred on the station building's footprint. |
| `forecourt` | -13.95 | -0.65 | 0 | 1 | 0 | The gate room: its exit is the station door. |
| `office` | 3.75 | -5.01 | 0 | 1 | -2 | Its lift under the forecourt's lift. |
| `plaza` | 37.29 | -2.48 | 0 | 1 | 0 | Its fountain on the map's fountain, 2.4 south of it on the lane's axis. |
| `dorm_court` | 79.84 | -1.3 | 90 | 1 | 0 | The open entrance court on the west side of the dorm blocks; its camera looks east at Eric's block. |
| `dorms` | 85.49 | -1.79 | 90 | 1 | 1 | Eric's flat on 2F of his block, above the passage; its window faces the next block's west end, 1.2 out. The corridor runs to the stairs in the block's return. |
| `train` | -28.6 | -3.9 | 90 | 1.18 | 1 | The car in the middle of the platform shed, its walkway end toward the station. |

## Monorail (`train`)

One car of the monorail, crossing the bay from the mainland to Honsha station. The camera looks at it from the platform side, with the near wall cut away for the play camera only. The car is about 8 long and 2.4 wide, with benches along both sides, full-height sliding doors at the near-side corners (they stay full height in the cutaway too, so they never change size while Eric walks out or the car pulls away; Jørgen: "the doors are still half size when trying to leave the train wagon, then magically transform to full height as the train leaves"; they finish shutting before the car moves) and closed neighbour cars (Jørgen, on the title shot: "the doors are hobbit sized, and the carriage behind looks like it is some sort of pavilion"). Sea on both sides out of the windows. When it stops, the station sign and the platform are outside the doors. On a phone, while Eric and Mio stand on the platform watching the doors close on Hamada, the shot widens toward them so they stay in frame with the doors and Hamada. The train was built earlier (legacy/side/train/) and may be changed where needed.

### Things

| Id | Label | What it is |
|---|---|---|
| `doors` | Doors | Both door pairs, while they're open. |
| `door_l` | Doors | The left door pair. |
| `door_r` | Doors | The right door pair. |
| `foodbag` | Her lunch bag | Mio's bag of her mother's pickles, on the seat beside her. Can be caught when it slides. |
| `cup` | Coffee | A lidded coffee on the seat beside Mio, hidden (left from when the seat was Rei's). |
| `bags` | Bags | Bags on every seat but one. |
| `rack` | Luggage rack | Suitcases, all with the same Amakawa luggage tag. |
| `straps` | Straps | Hanging straps. |
| `window` | Window | Sea on both sides. |
| `poster` | Poster | A katakana poster with a smiling cartoon monorail. |
| `plant` | Plant | Plastic, and someone waters it anyway. |
| `sign` | Station sign | Outside, once the train has stopped. |
| `platform` | Platform | Outside the doors. |

### Spots

`aisle`, `door_l`, `door_r`, `by_aoi`, `by_kuroda`, `platform`, `walkway`, `plat_l`, `plat_l2`, `plat_hamada`

### Seats

`seat_aoi`, `seat_far_r` (the seat next to Mio), `seat_near_l`, `seat_near_r`, `seat_mio`

### Zones

`door_zone` (either door, while open), `free_seat` (standing at the seat beside Mio)

### Who's there when

The monorail has one period, early morning.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Far bench, right, with her laptop and lunchbox on the seat beside her. | – |
| `aoi` | Far bench, left, on the phone. | – |
| `kuroda` | Far bench, far left, asleep. | – |
| `reader` | Far bench, reading. | – |
| `music` | Near bench, cap and headphones, nodding. | – |
| `bun` | Near bench, left, seen from behind. | – |
| `youth` | Near bench, right, seen from behind. | – |
| `stander` | Hidden following the rejected silhouette. | – |
| `tama` | Far bench, washing. | – |
| `rei` | Hidden (her seat is Mio's now). | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `window` | Talk to the window | Eric: nobody said the island was this far out. |
| `poster`, `straps`, `rack`, `plant`, `seat_bags` | Talk to them | One line each (see Things). |
| `reader`, `ohayo_reader` | Talk to him, or greet him | The book is called "Excel for People Who Hate Excel"; he nods, still reading. |
| `phone_girl`, `ohayo_aoi` | Talk to Aoi, or greet her | She's on the phone about her assignment ("anywhere but the basement"); a nod. |
| `bun`, `youth`, `music`, `stander` | Talk to them after the first time | A line or an emote each; the girl with headphones gets a ♪ and "Her music is too loud. She doesn't hear you." |
| `ohayo_bun`, `ohayo_youth`, `ohayo_music`, `ohayo_stander` | Greet them | Each answers in their own way. |

The man with a bag (`stander`) is hidden following the silhouette rejection, and has no talk or greeting trigger, so `stander` and `ohayo_stander` never play. The six scenery nodes above exist in the script but are disabled by the current marker rules; the passengers are reachable.

Aoi keeps her original encounter; Jørgen rejected its proposed replacement.

Planned passenger revisions, awaiting [train-discoveries-1](../../reviews/train-discoveries-1/review.json): let the woman with the bun enlist Eric to close an overfilled shopping bag; show the young man's pride in his first goal despite his team's loss; let the girl with headphones show her own guitar practice; let the reader show the mismatch between his Excel book and the company's old software; and show Hamada silencing a reminder without waking properly. Each moment starts with one interaction, including on first contact before the seat hint. They are optional, need no menu or quiz, and add no later quest. Proposed passenger speech has English subtitles for the player, including unfamiliar Japanese; Eric still follows familiar words and gestures. Mio's conversation and Tama's existing moments stay as they are. Exact proposed passages and their visual staging live only in the review; no new dialogue, prop or voice is built yet.

## Honsha station security room (`gate`)

Honsha station's security room, in the muted palette ([art-and-sound.md](art-and-sound.md)). About 12.6 wide and 9 deep, glass entrance doors at the front. A security barrier runs across the middle with two card readers either side of a scanner arch with two glass flaps and a small head-count screen. The guard's desk sits in the barrier line on the right; the unstaffed visitor counter with the visitor book and a lost-and-found shelf on the left; benches either side; posters and a notice screen on the back wall, beside the open exit to the forecourt, with a yellow 出口 EXIT sign over it. Between the notice screen and the exit, a pair of ticket machines stands in a steel surround with the lit fare map over them. A yellow tactile guide line runs from the entrance through the gate to the exit, and a yellow ↑ 出口 EXIT arrow is painted on the floor past the gate. Office workers walk in, tap through and leave toward head office on their own (not tappable); their number follows the story (a jammed gate means a queue, waiting by the readers with their phones out). One of them carries a cake box.

The gate stays in this room, as Jørgen picked in [gate-location](../../reviews/gate-location/review.json). Its mechanism and layout stay as built. The former lift bank is now an open exit to the forecourt; the lift is inside the separate head office. The internal `lift`, `lift_front` and `to_lift` ids remain for saved-game compatibility.

### Things

| Id | Label | What it is |
|---|---|---|
| `reader_l` | Card reader | Left card reader. |
| `reader_r` | Card reader | Right card reader. |
| `gate` | Gate | The arch and its flaps. |
| `desk` | Guard desk | The guard's desk. |
| `counter` | Visitor counter | The visitor counter, with the visitor book on it. Nobody works it: Kuro is at the head office reception. |
| `signin` | Visitor book | On the counter. |
| `lostfound` | Lost and found | A shelf by the counter. |
| `screen` | Notice screen | On the back wall. |
| `kiosk` | Coffee machine | A vending machine, front right. |
| `bench_l` | Bench | Left bench. |
| `bench_r` | Bench | Right bench, where Eric waits for nine. |
| `poster_l` | Poster | "PEOPLE. IDEAS. PROGRESS." |
| `poster_r` | Poster | The same. |
| `lift` | Station exit | Open doorway to the forecourt, beyond the security gate. |
| `entrance` | Entrance | The glass doors. |
| `plant` | Plant | A plant. |
| `bowl` | Tama's bowl | By the guard's desk. |

### Spots

`entrance_in`, `bench_l`, `bench_r`, `before_gate`, `after_gate`, `lift_front`, `counter_front`, `desk_front`, `outside`

### Seats

`bench_r`, `bench_l`

### Zones

`arch` (walking into the closed gate), `past_gate`, `lift_front`

### Who's there when

The security room is played in the early morning, before nine.

| Id | Usually | Schedule |
|---|---|---|
| `guard` | Behind his desk, greeting people coming in. | – |
| `tama` | By the guard's desk, eating from her bowl. | – |
| `kuroda` | Comes in late through the entrance at 8:52. | – |
| `aoi` | Hidden. | hidden all day |
| `mio` | Hidden (she ran ahead to a server). | – |
| `worker_a` | Standing past the gate on the left with `worker_b`, chatting. Can be talked to. | – |
| `worker_b` | Standing past the gate on the left with `worker_a`. Can be talked to. | – |
| `commuter_1` | Walks in, taps a reader and goes through. While the gate is jammed, waits in a queue; can be talked to only while standing there. | – |
| `commuter_2` | The same as `commuter_1`. | – |
| `commuter_3` | The same, carrying a cake box. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `ohayo_gate`, `gate_talk` | Greet or talk to the gate | Its recorded voice asks for a card. |
| `poster` | Talk to a poster | "PEOPLE. IDEAS. PROGRESS." |
| `noop` | – | An empty node for choices that do nothing. |

## Station forecourt and head office entrance (`forecourt`)

The first outdoor chunk of the picked island-map-4 layout (Jørgen, 2026-09-29), placed from the island layout (2026-09-30). Everything in it stands on the town's grid, square to the camera. The camera looks north, as in the security room. On a phone it looks east-north-east from the station door instead, up the court to head office's door, canopy and lower floors, and turns to look north over the bike court before he reaches the door. Honsha station stands at the bottom left: a two-storey flat-roofed block over the security room's footprint, with a parapet, plant and condenser units on the roof and 本社駅 HONSHA STATION on a sign along its roof's south edge. Its north wall has the open exit under a small canopy and the staff door beside it; the east and west walls have the security room's tall windows, the south front its glass entrance; a row of windows runs round the upper storey. The side and south windows stand in pale surrounds (a hood, jambs and a sill), so they read as windows from the court. The rooftop plant is pale sheet metal: louvred boxes and a row of condenser units with dark fan grilles. Whenever the station stands between Eric and the camera (on desktop, just outside the north door), its upper storey, roof and north wall fade out, so he is never hidden, and the security room shows as a cut-away: the north wall cut low, the side walls cut low for their first stretch and then full storey height with the tall windows, the south wall full height with the glass entrance, pale caps on every cut top and the room's own colour on the walls' inner faces. Inside is the room as the security room has it: its floor with the dark stone bands, the gate line (glass runs on posts, two card readers with blue pads, the scanner arch with its blue light strips, glass flaps and head-count screen), the guard's desk with his monitor, phone, plant and chair and Tama's bowl, the visitor counter with the book and the lost-property shelf, the drinks machine and its bin, two benches, the welcome stand, the cleaning cart, the nine plants, the mat at the entrance, the ticket machines with the fare map, the guide line and the exit arrow on the floor, a steel sill across the exit and warm light on the floor under the lamps, the ceiling lights, the windows and the exit. The ticket machines fade too while they would hide him. It stands whole again as he walks east. On a phone, looking east, it stays whole beside him, and the platform shed's roof fades instead. The platform shed runs north-south past the station's west side: a long curved blue-grey roof over an island platform on columns, with the monorail's two beams on piers either side. The west beam runs on out of its south end and curves away west-south-west on piers; the east one ends on a buffer. Stairs come down at the shed's south end to a covered walkway that runs east past the station and turns north to its glass front. The court is pale granite in large slabs, from the station's west face to the lobby's east wall and from the station's north face to the tower's south face, with kerbs wherever it meets grass. One designed walk crosses it from door to door, 2.4 wide: north out of the station door, east along the court's middle, north to the head office door (Eric steps out a few paces from the door, clear of its canopy). It is dark granite in running bond inside a pale soldier-course border, with the yellow tactile guide line down its middle and dotted warning pads at both doors and both turns. Along the court's north edge a raised bed with a low stone wall holds a clipped hedge, four zelkovas at an even pitch and shrubs between them, with two benches under the trees and the sorted bins in front. North of the court, between the tower and its lower wing, is the service yard, closed on the court's edge by a steel gate with a STAFF ONLY sign: two roll cages of boxes and a delivery bike by the wing, a step and two bollards at the tower's service door under its hood, and across the far end a roofed refuse store with mesh doors, its back wall running on to the tower's corner. West of the walk's start, two zelkovas in square tree pits with a bench between them, and where the walk turns east a way-finding sign on a post faces the station door: 本社 Head office → and 噴水広場 Plaza · Dorms →. Lamps with lantern heads stand on two staggered lines either side of the walk. A clipped pine in a square granite planter stands either side of the head office door, and the low name stone east of them. South of the court, east of the station, the bike court is paved in herringbone brick behind a hedge with one opening between bollards: two rows of racks with painted bays, bikes of different colours, most with baskets, one with a child seat, one fallen over into the aisle, and a bench on the station's east wall. East of it, a raised garden with a cherry, a maple, a ginkgo, shrubs and grasses, and layered planting along its wall and its far edge. The palette and the warm, low morning sun are the security room's. No roads or cars.

Head office stands north-east of the station across the court, where the island layout puts it (Jørgen, 2026-09-30, on the old one: "a standalone elevator with literally nothing over it"). It is the island's tallest building: twelve storeys of blue-grey curtain wall with floor bands and pale fins, a parapet and roof plant; on the ground floor a stone pier stands under every fin, with the lobby's glass front (lit warm from inside, brighter after dark) and the back office's windows between them, and AMAKAWA in steel letters over the canopy, on the grid like the station and the court, whose paving runs up to its walls. The entrance is in the south face near the south-west corner, under a cantilevered canopy with 本社 HEAD OFFICE on its fascia; the low stone name sign stands beside it. Inside is the lobby: the reception counter with Kuro behind it to the left of the door (受付 RECEPTION on its front), the lift core at the back with the B2 car (B2 - 5F, a floor display over its doors), a second car's closed doors (6F - 10F) and the stair door (階段 STAIRS), the floor directory beside them (only "5F Sales" and "B2 IT Support" can be read), two sofas round a low table on a rug, plants and an umbrella stand. The court's walk carries on inside as a dark stone runner with pale edges from the door mat to the lifts, and the yellow guide line runs from the door to the front of the reception counter. The lift core stands against the lobby's back wall, facing the door, so the ride is filmed straight on; every wall, the core and the furniture share the camera's axes. There is no second security gate. While Eric is in the lobby or the lift, the lobby's glass front, the canopy and the three storeys over the lobby fade out; the rest of the tower stands, so the lobby shows as a room cut into the foot of the tower. The cut's faces, where the tower stands on round it, are glazed like an inner facade with a pale slab edge at every floor; the core's top shows pale caps on its walls, a solid top over the shafts and the lift's lid over the B2 car, and a pale cap closes the strip of ground floor between the lobby's east wall and the cut. Everything comes back as he walks out of the door.

The lane to the fountain plaza leaves the court's north-east corner and runs east along the tower's south face, 3 wide (4.5 m), in grey brick in running bond between pale borders. A pale border closes the lane's brick where it leaves the court. On its south side a planted verge: a bed of ground cover with a low hedge along the lane's kerb, opened for two bench bays (the sorted bins beside the first), lantern lamps at every other gap, and behind the hedge the avenue's own kerbed bed, zelkovas every 4 far enough back that they never hide Eric, underplanted with ground cover and a pair of clipped azaleas between each two trees; once the tower ends a planted strip with the same trees at the same pitch runs along the north side too. A finger sign points on to the Fountain Plaza and the Dorms, and a pair of stone gateposts with lanterns and a band of pale stone across the lane mark where head office's grounds end; the lane and its trees run on out of view past them. The avenue's bed is planted in layers (low domes in front, mixed clusters and grasses, big clipped mounds at the back), and its back edge steps in and out from tree to tree, so the lawn meets it along planting, not a kerb. Either side, inside head office's grounds, a garden: drifts of layered planting of different depths on the lawn, a few specimen trees standing free (a big cherry south of the lane, a black pine north of it), maples and a ginkgo in the drifts, rocks set in threes, a clipped pine at the east end in line with the gateposts, and a clipped hedge that steps in and out behind. Between the first two avenue trees a gap in the lane's hedge opens onto stepping stones that lead into the south garden to a raked gravel court with a bench looking into the garden and a stone lantern that lights up after dark; he can walk the stones and the court. Behind both gardens a looser belt of taller trees (zelkova, ginkgo, cherry) closes the view and runs on past the gateposts toward the plaza. Eric walks out of the station, crosses the court under player control, and walks into the lift. He can also walk east along the lane to the fountain plaza and back at any time before the lift. Further out the island layout's buildings (the tower's wing, the offices north, the canteen) stand on the island's ground and sea. Around the lobby the ground floor is rooms: a back office east of the lobby with two rows of desks and cabinets behind windows in the ground floor's south and east walls.

At the end of the B2 conversation the camera releases its close-up before Mio leaves, so Eric can see and reach the lift. After work he comes up in the same lift and walks home east along the lane. The forecourt and the plaza then take the dorm courtyard's dusk light, and the head-office door and lift have no marker. After work Tama (`tama`, not a tap target here) is asleep at the east end of the garden bench, with room for Eric at the west end; she can walk along the seat, settle on his lap and hop back to her end. The fallen bike and its neighbour in the west rack can be stood up, wheeled into their places and tip over; where they stand or lie stays for the evening. A small station-wall light illuminates the rack after work, and the phone camera looks north in the bike court so the station wall does not hide it.

### Things

| Id | Label | What it is |
|---|---|---|
| `station_exit` | Station | The station's island-side doorway, behind Eric as he enters the court. |
| `office_entrance` | Head office | The head office's entrance under its canopy. Using it walks Eric in through the doors to the lift, which starts the ride. |
| `lift` | Lift to B2 | The B2 car in the lobby's lift core. |
| `plaza_lane` | To the plaza | The east end of the lane along the tower's south face. |
| `garden_bench` | Garden bench | The bench on the gravel court in the south garden, Tama asleep at one end. After work only. |
| `fallen_bicycle` | Bicycle | Whichever bike in the bike court's west row is lying in the aisle. After work only, while one is down. |

### Spots

`station_exit`, `office_entrance`, `lift_front`, `plaza_lane`

### Seats

`garden_bench` (its west end, facing south into the garden)

### Zones

`lift_front`, `plaza_lane` (the lane's east end along the tower's south face: walking into it starts the walk to the plaza)

### Who's there when

Kuro works the head office reception all day. The two from Sales appear inside the lift during the ride.

| Id | Usually | Schedule |
|---|---|---|
| `kuro` | Behind the reception counter in the head office lobby, facing the door. | – |
| `mio` | Hidden (she ran ahead to a server). | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `garden_bench`, `fallen_bicycle` | Optional interactions after work | [The walk home](stories/evening-walk.md) records these discoveries. |
| `outside` | Arrive from the station, or up from B2 after work | The goal points to the head-office lift; after work, east along the lane to the dorms. |
| `head_office` | Use the head-office entrance | Eric walks in to the lift; the goal points to the B2 lift. |
| `to_b2` | Reach or use the lift | Eric boards the existing watched lift ride. |
| `to_plaza` | Reach or use the east lane | Eric walks on to the fountain plaza. |
| `kuro`, `ohayo_kuro`, `yoroshiku_kuro` | Talk to Kuro, or greet her | A polite morning welcome and a point toward the lifts; after work, お疲れさまです and a bow. She returns おはよう in the morning and よろしく politely at either time. |

## Fountain plaza (`plaza`)

The second outdoor chunk of island-map-4, east of the forecourt, built at the map's scale from the island layout (2026-09-30) with the forecourt's outdoor kit, palette and light (rebuilt the same day). The camera looks north and follows Eric. The round plaza is about 23 across (35 m), paved in rings of stone: a warm apron round the fountain, a dark band, pale granite, a dark ring line, a greyer outer field and a dark border ring. Two axes cross at the fountain: the lane east-west, the canteen's door north-south (paths laid out 2026-09-30 after Jørgen's "the entering and exiting paths are not aligned, you got that funky extra path around it for some reason, and the fountain plaza extends onto the restaurant(?)'s tiles"). The fountain: a wide open stone basin about 8.6 across with a blue-grey floor under clear water, coins scattered over the floor near the rim, and a two-tier centrepiece with a small jet on top whose bowls spill in thin curtains. The water moves: glints drift over it, the curtains fall and rings of ripples spread from where they land. A bilingual sign set into the rim's outer face, a little east of the front, reads コインを入れないで PLEASE DON'T THROW COINS. Six pigeons by the south-west rim peck, bob their heads as they walk about, turn and make small hops; when Eric comes within about two steps they all flutter up and fly off out of view, and a while after he has moved away they glide back in and land where they were. The lane from head office, grey brick between pale borders like the forecourt's lane, runs straight in from the west on the fountain's axis and meets the circle square on; it leaves the circle on the same axis on the east side and runs on east toward the dorms. The lane's ends run in under the circle's dark border ring, which crosses each mouth as a threshold. Along both sides of both lanes a planted verge: a kerbed bed of ground cover with a low hedge, and behind it on the grass a zelkova avenue every 4 (set back so nothing hides Eric on the lane); post lamps on each lane's south edge at every other gap between the trees. All round the plaza a kerbed ring bed with a clipped hedge at its back and a ring of cherries every 22.5°, open only for the two lanes and the canteen link, with two maples flanking the link and drifts of cosmos and grasses along the south arc. The furniture is symmetric about both axes: a pair of benches in each quarter just inside the border ring faces the fountain, a tree behind each bench and a lamp between them, the sorted bins beside the north-west and south-west pairs, a bike parked by the north-east pair and a dropped photo by the north-west one (a find, [systems.md](systems.md), Finds). On the canteen's axis at the south of the circle, where the ring has low shrubs instead of a tree, a notice board with a small hood and notices pinned on both faces faces the fountain. Reading it holds its posts up close as papers pinned on the board (mundane notices, their words in game3d/story/finds.js). A pair of lamps stands in the ring bed either side of each opening and either side of the notice board. Eight lights are set flush in the dark band round the basin. North of the plaza stands the canteen: two storeys, a glazed ground floor with the doors on the fountain's axis under a canopy sign (しょくどう CANTEEN) and teal-and-white striped awnings over the other bays, a blue-grey roof with a parapet and plant. In front of it the terrace, in large pale slabs, with five tables under teal and pale umbrellas; a seat-height wall runs along its whole south side, open only on the door's axis, where a short link in the lanes' brick and borders crosses a strip of lawn and the ring bed to the circle; raised beds with a pine close its ends. South of the plaza a lawn with two small groups of trees, then a footpath and a rack of bikes along the backs of the shop street: two rows of two-storey shops facing each other under one slim arcade roof, running east. On the north row's arcade side are the island's combined konbini, 100-yen shop and drugstore (コンビニ KONBINI · 100 YEN · DRUGSTORE) and the bakery (パン BAKERY); their interiors are not part of day 1. On the lawns round the plaza, groups of mixed trees with shrubs on low mounds; the town beyond (office_e1 to the west, the clinic with its green cross north of the canteen, block_e1 to the north-east) comes from the island layout, every building on the same grid. After work the lamps come on with pools of light on the lanes and the plaza's edge, the flush lights round the basin light the middle of the circle, the basin floor glows faintly from under the water so the coins keep their shine, and the canteen, the shops and the town's windows are lit. The terrace is closing: the chairs stand upside down on the tables, except at the table nearest the link, where one still stands at its south side and a canteen worker (`canteen_worker`, unnamed, in a white top and the canteen's teal apron) carries its neighbour over, then wipes down the next table east. Chairs Eric and the worker stack stay stacked for the evening. The tables and the chairs standing round them block only their own floor, so Eric can walk right up to the last chair. No cars.

In the morning the plaza is a side trip with no story beat: the goal points back to the head-office lift. After work it is on the walk home, and the east end of the lane goes on to the dorm courtyard.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_lane` | To head office | The lane west of the plaza, back to the forecourt. |
| `fountain` | Fountain | The fountain in the middle of the plaza. |
| `dorm_lane` | To the dorms | The lane east of the plaza, toward the dorms. |
| `canteen_table` | Canteen table | The terrace table nearest the link, with the last chair standing. After work only. |
| `noticeboard` | Notice board | The notice board at the south of the circle. Read: its posts up close. |

### Spots

`office_entry`, `fountain_edge`, `dorm_exit`

### Seats

None.

### Zones

`office_lane` (the lane west of the circle), `dorm_exit` (the lane east of the circle)

### Who's there when

Nobody lives here yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Hidden (she ran ahead to a server). | – |
| `canteen_worker` | After work only: carries the last chair over, then wipes down the next table east. Can be talked to whenever not walking; helping with the chair is the canteen table's. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `canteen_table` | Optional terrace interaction after work | [The walk home](stories/evening-walk.md) records the encounter. |
| `arrive` | Arrive from the forecourt | The goal points back west to the head-office lift; after work, east to the dorms. |
| `fountain` | Talk to the fountain | A sign on the rim asks people not to throw coins; the bottom is covered in coins. |
| `dorms_later` | Use or walk into the lane's east end, before work is over | The dorms are further down this lane, for after work. |
| `to_dorms` | Use or walk into the lane's east end, after work | Eric walks on to the dorm courtyard. |
| `to_forecourt` | Use or walk into the lane's west end | Eric walks back to the forecourt. |

## The lift (`lift`)

A small lit car, the same inside head office at the forecourt (floor 1) and on B2. The display counts floors: B2, B1, 1 to 5 in the ride. No things of its own; the ride's lines are in the [`emi-budget`](stories/emi-budget.md) storyline.

## IT support, B2 (`office`)

The second basement of head office: IT support. One compact floor, close to square with no empty gaps, planned from the B2 pixel mockup (art/pixel/island/b2/mockup2-full-1x.png; Jørgen: "not bad"), not from 3-office.png's plan, which was "kind of nonsensical". Top row, left to right: the lift landing with the stairwell behind it and a vending machine; the main office (企画室) with one island of six steel desks and the section chief's desk across its head; the machine room (機械室) with the server racks, behind a door with a card reader. A corridor runs across the middle, with the fire exit at its right end. Bottom row: the copy room (コピー室), the kitchenette (給湯室, its door facing the office door, with a tray of seven cups, three of them dusty), then the men's and women's toilets. Door plates B2 and 企画室７. Near walls are cut away for the play camera.

### Things

| Id | Label | What it is |
|---|---|---|
| `lift` | Lift | The lift on the landing. |
| `vending` | Vending machine | By the lift. Drinks at ¥120 to ¥130 ([systems.md](systems.md), Gifts). |
| `bench` | Bench | On the landing. |
| `stairs` | Stairs | Up. Small paw prints in the dust. |
| `office_door` | Office door | Into the main office. |
| `inout_board` | In/out board | Four names in Japanese and one new magnet: ERIC. |
| `clock` | Clock | Wall clock. |
| `whiteboard` | Whiteboard | Back wall. |
| `calendar` | Calendar | Back wall. |
| `water_cooler` | Water cooler | Office corner. |
| `cabinets` | Cabinets | Filing cabinets. |
| `box_crowns` | Box | The 2019 party box on the cabinets. |
| `fan` | Fan | A desk fan. |
| `boxes` | Boxes | Cardboard boxes. |
| `my_desk` | Your desk | South row, middle. Name card エリック, with ERIC written under it in pen. |
| `my_chair` | Your chair | Starts in the machine room with Tama asleep on it. |
| `chief_desk` | Mr. Mori's desk | The section chief's desk at the head of the island. |
| `nameplate` | Nameplate | Face down on Mori's desk. |
| `covered` | A covered desk | North row, middle: a dust sheet over the monitor, and no dust on the name card. |
| `covered_monitor` | Covered monitor | South row, right. |
| `machine_door` | Machine room | The machine room door, with a card reader. |
| `racks` | Server racks | Inside the machine room, from the nineties. |
| `fire_exit` | Fire exit | End of the corridor. |
| `noticeboard` | Noticeboard | Corridor. |
| `extinguisher` | Extinguisher | Corridor. |
| `hydrant` | Hydrant | Corridor. |
| `copier` | Copier | The B2 copier. Eats paper. |
| `fax` | Fax | Copy room. |
| `paper_shelf` | Paper shelf | Copy room. |
| `worktable` | Worktable | Copy room. |
| `coffee_machine` | Coffee machine | Kitchenette. |
| `kettle` | Kettle | The electric thermos pot in the kitchenette. |
| `cups` | Cups | The tray of seven cups. |
| `fridge` | Fridge | Kitchenette. |
| `microwave` | Microwave | Kitchenette. |
| `kitchen_table` | Table | Kitchenette table. |
| `toilet_m` | Men's toilet | |
| `toilet_f` | Women's toilet | |
| `plant` | Plant | A plant. |

### Spots

`lift_out`, `mori_greet`, `lobby`, `office_door`, `my_seat`, `emi_seat`, `copier_front`, `coffee_front`, `corridor_w`, `corridor_e`, `machine_front`, `mio_by_desk`, `kenji_desk`

### Seats

`my_seat` (Eric's, south row, middle), `emi_seat` and `mio_seat` (the same chair: south row, left)

### Zones

`office`, `copy_room`, `kitchen`, `toilets`, `machine_room`, `corridor`

### Who's there when

The story moves the clock ([systems.md](systems.md)): morning when Eric arrives, lunch at 12:10, afternoon at 14:00, evening at 18:05.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | In the machine room in the morning and at lunch; sitting at her desk in the afternoon; standing beside Eric's desk in the evening, until she leaves by the lift. | morning `racks`, lunch `racks`, afternoon sits `mio_seat`, evening `mio_by_desk` |
| `mori` | Waits at the lift landing to greet Eric, then at his desk; the kitchenette table at lunch; gone home in the evening. | lunch `kitchen_table`, afternoon `chief_desk`, evening hidden |
| `kenji` | His desk, north row, left; gone home in the evening. | evening hidden |
| `emi` | Upstairs all day; comes down at 17:40 for a few minutes. | hidden all day |
| `tama` | Asleep on Eric's chair in the machine room, then wherever the chair goes. | – |
| `aoi` | Hidden. | hidden all day |
| `rei` | Hidden. | hidden all day |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `desk_look` | Talk to your desk | The name card in katakana, ERIC in pen under it. |
| `inout_board` | Talk to it | Four names and one new magnet: ERIC. |
| `covered` | Talk to it | No dust on the name card in front of it. |
| `irete_kettle` | 入れて to the kettle | It pours Eric a cup of tea. |
| `ugoite_coffee` | 動いて to the coffee machine (once) | It gurgles, then goes quiet. |
| `matte_clock` | 待って to the clock | The second hand stops; Mori looks up and quietly asks 「あれ、止まりました？」 (“Oh, did it stop?”). |
| `tomatte_fan` | 止まって to the fan | It stops; Kenji: あれ？ |
| `noop` | – | An empty node for choices and triggers that do nothing. |

## Eric's dorm building

Eric's block, `dorm_1` in the island layout, from the plan Jørgen picked on [dorm-floor-1](../../reviews/dorm-floor-1/review.json) (option a, the open-air corridor, 2026-09-30): five storeys of plain concrete, the long face on the dorm courtyard, the return at its south end. The ground floor has the entrance hall, the manager's room, the stairs and rooms that are not part of day 1; 2F to 5F have six flats each, off an open corridor on the court side. The hall is walked in the courtyard (`dorm_court`), the stairs are the trip, and the 2F corridor is walked in `dorms`. No lift.

- Entrance hall: the glass front with its open doors, a doormat inside them, the 24 mailboxes on the back wall (rows 5F at the top down to 2F, each with its room number; 203 has a strip of tape reading エリック), the manager's window, the passage to the stairs and the notice board right of it. Shoes stay on in the common parts: every flat has its own genkan, so there are no shoe lockers and no step.
- Manager's room (管理人室 MANAGER, on a plate over the window): behind the mailboxes, its window facing the hall beside the passage's mouth, curtain drawn and light off for the night. Nobody is there on day 1.
- Stairs: in the return, where it meets the long block, two flights a floor with a half landing, behind the stair window on the return's face; the corridor on each floor runs into them. The 2F landing has the store's steel door, a 2F sign and a fire hose cabinet. No lift.
- 2F: six flats along the corridor, numbered from the stairs, skipping 4 as many Japanese buildings do: 201 (dark), 202 (home, TV on), 203 (Eric's), 205 (out, dark), 206 (desk lamp on), 207. Each door has its number plate over it and a light beside it, a meter box and a grilled kitchen window; 202's and 206's kitchen windows are lit. The corridor is open to the court behind a low parapet; below it are the roofs of the hall, the laundry and the sento. Every flat's window is at the back, and dorm_1e's wall stands about 1.2 out behind them.
- 3F to 5F repeat 2F (301 to 507); only 2F is walked.
- Gate to Eric's genkan is under 20 seconds: about 5 seconds' walk to the passage, the trip up about 5, the corridor to his door about 5, the walk in about 3.

## Dorm courtyard (`dorm_court`)

The entrance court of Eric's dorm, on the west side of the dorm cluster in the south-east of island-map-4 (Jørgen, 2026-09-30: "less saturated, uses our existing style. Focus on the area we need, not the whole island at once. Break the outdoor locations into chunks you navigate between"). The camera looks east at the blocks, the way the map has them. At the back stands his block: plain concrete, five storeys, running past both edges of the frame, with an open corridor along it on every floor from 2F up: the slab and a low concrete parapet, and behind it the flats' steel front doors, each with a light, a meter box and a grilled kitchen window, some lit (the building is described under Eric's dorm building). 203's door, Eric's, is almost straight above the hall doors. On the right the block turns and comes forward along the court's side; on the return's face, by the corner, a tall lit stair window on every floor. In front of the block is the one-storey entrance hall, its glass front cut low like the indoor near walls, with open doors, and Eric can walk in: a doormat inside the doors, the bank of 24 steel mailboxes with their room numbers on the back wall, then the manager's window, then the passage to the stairs, and the notice board right of the passage. Behind the hall, under the 2F corridor, a flat roof with a parapet, an air-conditioner unit and a vent. A low stone by the door reads 社員寮 STAFF DORM. West of the hall is the coin laundry's lit shopfront (コインランドリー COIN LAUNDRY, washers behind the glass) under a shallow steel canopy, with a flat roof behind a parapet and three air-conditioner units and a vent on it. East is the sento: a low front under a gabled roof of grey tiles, a navy ゆ BATH noren over its lit door, and behind it the boiler room's flat roof with the tall chimney rising past the dorm's roof. Both are frontages only. Two drinks machines, one red and one blue, stand lit in front of the laundry's blank west end. The court is laid on the shared outdoor kit, on two axes. The way in runs north-south on the hall doors' axis: the lane from the plaza (grey brick between pale borders, as in the plaza) runs past the front as the street, and turns in through a gateway in the front bed, a stone pier with a lantern either side, then across the walk and up to the doors between two low beds. The court's walk of dark granite with a pale border runs east-west from the garden at the west end, past the machines, the laundry, the hall and the sento (a leg up to its door), to the bike shelter; pale square pavers fill the rest. The bike shelter stands on the east side against the block's return: a frosted roof on steel posts running out past the return's front, a lit strip under it, a rack of six places with five bikes, all under the roof, and a blue bike sign. The court is closed on the west and the south by raised beds with a low wall. The front bed is pale raked gravel with planted groups on moss: at the gate a clipped podocarpus column and a sweep of clipped azaleas either side; west of it a lit stone lantern with hakone grass, and a maple over clipped balls and a white sasanqua; east of it a walled bay with clipped balls and grass, then maples, clipped balls, a white sasanqua and a cherry on out of the frame. A bench backs onto it, with the sorted bins next to it; the dorm's garbage cage stands in the south-east corner, and there are air-conditioner units at the foot of the return. The garden west of the laundry has zelkovas, maples and shrubs, a hedge against the block and a tall lamp where the walk ends. Another tall lamp stands by the drinks machines, with two low bollard lights along the front bed. Across the street is a verge with a low hedge and a row of zelkovas, as along the lane in the plaza, and a small two-storey building. The other blocks of the cluster (five to nine storeys) and the ground around come from the island layout, on the same grid as Eric's block. Evening: dusk after the sun has dropped behind the blocks, with a cool sky and a last warm light from the west. The block's lit windows, the lamps and lanterns, the hall, the laundry, the drinks machines and the sento door light the court.

Eric arrives along the lane from the plaza on the walk home, through the gate, and walks in through the hall doors himself. Walking into the passage at the back of the hall, or using it, starts the trip up the stairs to 2F. The courtyard also loads directly with `?place=dorm_court`. A man in the sento hums every so often, louder and panned toward its door as Eric gets near.

### Things

| Id | Label | What it is |
|---|---|---|
| `bath` | Bath | The sento's lit doorway under the ゆ noren; Listen runs `bathSong` (`state: 'answer'`), returning after the second voice finishes. |
| `dorm_entry` | Dorm entrance | The hall's glass doors; using them walks Eric in. Its pin goes once he is inside. |
| `stairs` | To the stairs | The passage at the back of the hall, to the stairs. |
| `mailboxes` | Mailbox 203 | Eric's mailbox in the bank: 203 and his name on tape (エリック ERIC), a flap that opens (the `mailbox203` hook) on one folded bakery flyer (パン BAKERY). Take mail: the box opens and Eric takes the flyer (a find, [systems.md](systems.md), Finds); the box stays empty after, and its pin goes. Its pin shows once the story uses it. |

### Spots

`plaza_entry` (just inside the gate), `dorm_entry` (outside the doors), `hall` (just inside the doors), `passage` (the passage's mouth), `bath` (a step short of the curtain)

### Seats

None.

### Zones

`hall` (inside the doors), `passage` (the passage's mouth)

### Who's there when

Played in the evening, after work. Nobody else is here.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `bath`, `mailboxes` | Optional interactions on the walk home | [The walk home](stories/evening-walk.md) records both discoveries. |
| `arrive` | Arrive | Goal line: "Go in through the dorm entrance. Your room is 203." Its pin on the hall doors. |
| `hall` | Step inside the doors, or use them | Goal line: "Room 203 is on 2F. The stairs are through the back." Its pin on the passage. |
| `go_up` | Reach or use the passage | The trip up to `dorms`. |

## Eric's dorm room (`dorms`)

Eric's floor, 2F of the dorm building (above), and his flat, 203. The worst room in the dorm ([cast.md](cast.md)), built from the room view in [dorm-route-1](../../reviews/dorm-route-1/review.json) (2026-09-30) and furnished as a real company-dorm 1K on 2026-09-30 (issue #75). The camera looks north, down into the flat with its ceiling cut away; the flats either side are cut open at the same height, so the floor reads as a row of rooms of the same plan (reworked 2026-09-30 after the re-score in notes/environment-critique.md). They sit a shade darker than his, capped pale where the walls are cut: on the right someone is home (a kotatsu with a cup noodle and mikan, the TV on in the corner, washing on a rack, curtains drawn), on the left they're out (dark, the bed made, the monitor off at a desk under the window, suits on a rail); at the frame's edges one more flat each side, one with a desk lamp on. Past them the building is cut solid. At the back is the room itself, about 3 by 4 metres, on six tatami mats with navy borders. In the back-left corner a grey steel desk against the wall, its arm lamp switched on over a closed laptop, the company handbook and a mug, a nearly empty shelf above and the chair pulled out. The single bed runs along the left wall (white steel frame, the navy duvet turned back, his work bag dropped on it), with a company calendar on the wall over it. In the back-right corner the oshiire: sliding paper doors below, a small cupboard above, one door pushed back on the folded company futon. Between the closet and the boxes a rug with a folding table, his konbini bento, a bag and a bottle of tea on it and a muted red cushion beside it. His boxes from home stand along the right wall: two taped and stacked, one open with the flaps up and books and a sweater inside, a small one by the doorway, and his coat on a hook above them. The one window, straight ahead with dusty blue curtains drawn back and a white air conditioner over it, looks onto the next block's bare concrete end wall about two metres outside, lit by a lamp on that wall; straight across, a floor down and seen through his window from the play camera, the frosted window of a bathroom in the flat opposite, lit, with the shapes of shampoo bottles, a cup of toothbrushes and the shower head behind the glass and its fan grille beside it. A clear aisle runs from the doorway to the window. In front of the room is the entry strip, on grey plank vinyl: the kitchenette on the left (sink, one ring, a steel splashback with the range hood fixed to it and its duct boxed in up the wall, a strip light under the hood, a small fridge under the counter, a kettle, a mug and a dish rack), the unit bath on the right behind its door (tub, basin, toilet), and the genkan a step down inside the front door, with pale grey tiles under its own small light, the shoe cupboard, his work shoes on the tiles and the company slippers at the step. The room's frosted sliding door stands open along its wall. Outside the front door is the open corridor, with a low parapet and the neighbours' steel doors either side (number plates, corridor lights, meter boxes, grilled kitchen windows, lit where someone's home; an umbrella and sandals at the right-hand door, a pot plant and a parcel waiting at the left-hand one). It runs right past 202 and 201 to the landing at the top of the stairs, where the flight Eric comes up rises from the half landing along the stair window, the flight down to 1F beside it. From the corridor his own front is full height with its door shut and 203 over it, like the neighbours'; as he goes in it drops to the cut-low front the room is seen through. The strip's walls and the parapet are cut low for the camera, and past the parapet are the roofs of the hall, the laundry and the sento below. The light is a dim cool evening, with the warm light of the ceiling light (on the ceiling the camera looks through, so it isn't drawn), the desk lamp's pool, the light under the kitchen hood and the cool corridor light at the door.

Eric arrives from the dorm courtyard (Getting between places) on the landing. The corridor camera looks down on it from over the court: on a desktop the whole way from the landing to his door, on a phone following him. He walks left past 201 and 202 to 203. Reaching or using his door, he goes in: the front drops, the door swings open, he steps over the genkan to `room_entry` and the camera widens to the whole flat. The window, the boxes and the bed have their pins once he is inside. It also loads directly with `?place=dorms`, on the landing. Nobody else is here.

### Things

| Id | Label | What it is |
|---|---|---|
| `window` | Window | The one window, onto the concrete wall. |
| `boxes` | Boxes | His two boxes, sent ahead, by the desk. |
| `bed` | Bed | The single bed. |
| `door_203` | Room 203 | His front door on the corridor. |

### Spots

`landing` (at the top of the stairs), `door_203` (in the corridor at his door), `room_entry`, `window_front`

### Seats

None.

### Zones

`door_203` (the corridor in front of his door)

### Who's there when

Played in the evening, after work.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `landing` | Arrive on 2F | Goal line: "Room 203." Its pin on his door. |
| `go_in` | Reach or use his door | The goal clears and he goes in over the genkan to `room_entry` (the `enterRoom` hook). |
| `home` | In the room, on the walk home | A moment in the room, then the day saves and ends ([`mio-notices`](stories/mio-notices.md)). |
| `window`, `boxes`, `bed` | Talk to them | Eric comments on the blocked sky, finding his clean shirts and being too tired to get up again. |
