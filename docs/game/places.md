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
- `lift` → `office`, lift: the camera stays inside the car for the whole ride. The floor display counts from 1; someone has pressed 5, where the two from Sales get out; then down to B2. The doors open on the B2 lift landing.
- `office` → `lift`, walk: after work, Eric walks from B2 into the same lift, the camera easing in on the car as in the morning; the near wall drops and the lights outside go down. He rides alone.
- `lift` → `forecourt`, lift then walk: the floor display counts B2, B1, 1; the same shot of the car crossfades to head office's floor 1, the lights come up, the doors open and he walks out into the lobby, the wall rising behind him; the tower comes back over the lobby as he walks out of the door.
- `forecourt` → `plaza`, walk: Eric walks east off the court along the lane by the tower's south face. The camera closes in on him at the lane's end and crossfades to the same close framing of him on the plaza's lane just west of the circle, walking in along the fountain's axis with the fountain ahead as the camera lets go.
- `plaza` → `forecourt`, walk: the same walk the other way, west along the lane back toward the head office door.
- `plaza` → `dorm_court`, walk: after work only. Eric walks east off the plaza along the lane; the camera closes in on him at the lane's end and crossfades to the same close framing of him stepping into the dorm courtyard from the west, then lets go.
- `dorm_court` → `dorms`, walk: Eric walks in through the dorm's hall doors, past the mailboxes and into the passage at the back as the camera comes in close, then crossfades to him stepping in through his own front door to `room_entry`.

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
| `dorms` | 85.49 | -1.79 | 90 | 1 | 1 | In Eric's block, above the passage; its window faces the next block's west end, 1.3 out. |
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

Honsha station's security room, in the muted palette ([art-and-sound.md](art-and-sound.md)). About 12.6 wide and 9 deep, glass entrance doors at the front. A security barrier runs across the middle with two card readers either side of a scanner arch with two glass flaps and a small head-count screen. The guard's desk sits in the barrier line on the right; the unstaffed visitor counter with the visitor book and a lost-and-found shelf on the left; benches either side; posters and a notice screen on the back wall, beside the open exit to the forecourt. Office workers walk in, tap through and leave toward head office on their own (not tappable); their number follows the story (a jammed gate means a queue, waiting by the readers with their phones out). One of them carries a cake box.

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

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `ohayo_gate`, `gate_talk` | Greet or talk to the gate | Its recorded voice asks for a card. |
| `poster` | Talk to a poster | "PEOPLE. IDEAS. PROGRESS." |
| `noop` | – | An empty node for choices that do nothing. |

## Station forecourt and head office entrance (`forecourt`)

The first outdoor chunk of the picked island-map-4 layout (Jørgen, 2026-09-29), placed from the island layout (2026-09-30). Everything in it stands on the town's grid, square to the camera. The camera looks north, as in the security room. On a phone it looks east-north-east from the station door instead, up the court to head office's door, canopy and lower floors, and turns to look north over the bike court before he reaches the door. Honsha station stands at the bottom left: a two-storey flat-roofed block over the security room's footprint, with a parapet, plant and condenser units on the roof and 本社駅 HONSHA STATION on a sign along its roof's south edge. Its north wall has the open exit under a small canopy and the staff door beside it; the east and west walls have the security room's tall windows, the south front its glass entrance; a row of windows runs round the upper storey. The side and south windows stand in pale surrounds (a hood, jambs and a sill), so they read as windows from the court. Whenever the station stands between Eric and the camera (on desktop, just outside the north door), the station above the cut-low wall height fades out, so he is never hidden: the cut walls have pale caps, and the security room shows through with its gate line (glass runs, two card readers with blue pads, the scanner arch with its blue light strips and glass flaps), the guard's desk and chair, the visitor counter, the lost-property shelf, the coffee kiosk, two benches and the plants along the back wall; it stands whole again as he walks east. On a phone, looking east, it stays whole beside him, and the platform shed's roof fades instead. The platform shed runs north-south past the station's west side: a long curved blue-grey roof over an island platform on columns, with the monorail's two beams on piers either side. The west beam runs on out of its south end and curves away west-south-west on piers; the east one ends on a buffer. Stairs come down at the shed's south end to a covered walkway that runs east past the station and turns north to its glass front. The court is pale granite in large slabs, from the station's west face to the lobby's east wall and from the station's north face to the tower's south face, with kerbs wherever it meets grass. One designed walk crosses it from door to door, 2.4 wide: north out of the station door, east along the court's middle, north to the head office door (Eric steps out a few paces from the door, clear of its canopy). It is dark granite in running bond inside a pale soldier-course border, with the yellow tactile guide line down its middle and dotted warning pads at both doors and both turns. Along the court's north edge a raised bed with a low stone wall holds a clipped hedge, four zelkovas at an even pitch and shrubs between them, with two benches under the trees and the sorted bins in front; the service lane runs north between the tower and its lower wing. West of the walk's start, two zelkovas in square tree pits with a bench between them. Lamps with lantern heads stand on two staggered lines either side of the walk. A clipped pine in a square granite planter stands either side of the head office door, and the low name stone east of them. South of the court, east of the station, the bike court is paved in herringbone brick behind a hedge with one opening between bollards: two rows of racks with painted bays, bikes of different colours, most with baskets, one with a child seat, one fallen over into the aisle, and a bench on the station's east wall. East of it, a raised garden with a cherry, a maple, a ginkgo, shrubs and grasses. The palette and the warm, low morning sun are the security room's. No roads or cars.

Head office stands north-east of the station across the court, where the island layout puts it (Jørgen, 2026-09-30, on the old one: "a standalone elevator with literally nothing over it"). It is the island's tallest building: twelve storeys of blue-grey curtain wall with floor bands and pale fins, a parapet and roof plant; on the ground floor a stone pier stands under every fin, with the lobby's glass front (lit warm from inside, brighter after dark) and the back office's windows between them, and AMAKAWA in steel letters over the canopy, on the grid like the station and the court, whose paving runs up to its walls. The entrance is in the south face near the south-west corner, under a cantilevered canopy with 本社 HEAD OFFICE on its fascia; the low stone name sign stands beside it. Inside is the lobby: the reception counter with Kuro behind it to the left of the door (受付 RECEPTION on its front), the lift core at the back with the B2 car (B2 - 5F), a second car's closed doors (6F - 10F) and the stair door (階段 STAIRS), the floor directory beside them (only "5F Sales" and "B2 IT Support" can be read), two sofas round a low table, plants and an umbrella stand. The lift core stands against the lobby's back wall, facing the door, so the ride is filmed straight on; every wall, the core and the furniture share the camera's axes. When the floors above fade, the core's top shows where the building is cut: pale caps on its walls and a solid top over the shafts, the lift's lid over the B2 car in the same colour; the rest of the ground floor is closed by a pale cut ceiling, so only the lobby is open. There is no second security gate. While Eric is in the lobby or the lift, everything above the ground floor, the glass front and the canopy fade out, so the lobby and the ride can be seen; they come back as he walks out of the door.

The lane to the fountain plaza leaves the court's north-east corner and runs east along the tower's south face, 3 wide (4.5 m), in grey brick in running bond between pale borders. On its south side a planted verge: a bed of ground cover with a low hedge along the lane's kerb, opened for two bench bays (the sorted bins beside the first), lantern lamps at every other gap, and behind it on the grass an avenue of zelkovas every 4 in rings of mulch, far enough back that they never hide Eric; once the tower ends a planted strip with the same trees at the same pitch runs along the north side too. A finger sign points on to the Fountain Plaza and the Dorms, and a pair of stone gateposts with lanterns and a band of pale stone across the lane mark where head office's grounds end; the lane and its trees run on out of view past them. The lawns either side hold groups of mixed trees (zelkova, cherry, maple, ginkgo, a pine) with shrubs on low mounds. Eric walks out of the station, crosses the court under player control, and walks into the lift. He can also walk east along the lane to the fountain plaza and back at any time before the lift. Further out the island layout's buildings (the tower's wing, the offices north, the canteen) stand on the island's ground and sea. Around the lobby the ground floor is rooms, so it reads when the floors above fade: a back office east of the lobby with two rows of desks and cabinets, windows in the ground floor's south and east walls.

At the end of the B2 conversation the camera releases its close-up before Mio leaves, so Eric can see and reach the lift. After work he comes up in the same lift and walks home east along the lane. The forecourt and the plaza then take the dorm courtyard's dusk light, and the head-office door and lift have no marker.

### Things

| Id | Label | What it is |
|---|---|---|
| `station_exit` | Station | The station's island-side doorway, behind Eric as he enters the court. |
| `office_entrance` | Head office | The head office's entrance under its canopy. |
| `lift` | Lift to B2 | The B2 car in the lobby's lift core. |
| `plaza_lane` | To the plaza | The east end of the lane along the tower's south face. |

### Spots

`station_exit`, `office_entrance`, `lift_front`, `plaza_lane`

### Seats

None.

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
| `outside` | Arrive from the station, or up from B2 after work | The goal points to the head-office lift; after work, east along the lane to the dorms. |
| `head_office` | Use the head-office entrance | The goal points inside to the B2 lift. |
| `to_b2` | Reach or use the lift | Eric boards the existing watched lift ride. |
| `to_plaza` | Reach or use the east lane | Eric walks on to the fountain plaza. |
| `kuro`, `ohayo_kuro`, `yoroshiku_kuro` | Talk to Kuro, or greet her | A polite morning welcome and a point toward the lifts; after work, お疲れさまです and a bow. She returns おはよう in the morning and よろしく politely at either time. |

## Fountain plaza (`plaza`)

The second outdoor chunk of island-map-4, east of the forecourt, built at the map's scale from the island layout (2026-09-30) with the forecourt's outdoor kit, palette and light (rebuilt the same day). The camera looks north and follows Eric. The round plaza is about 23 across (35 m), paved in rings of stone: a warm apron round the fountain, a dark band, pale granite, a dark ring line, a greyer outer field and a dark border ring. Two axes cross at the fountain: the lane east-west, the canteen's door north-south (paths laid out 2026-09-30 after Jørgen's "the entering and exiting paths are not aligned, you got that funky extra path around it for some reason, and the fountain plaza extends onto the restaurant(?)'s tiles"). The fountain: a wide open stone basin about 8.6 across with a blue-grey floor under clear water, coins scattered over the floor near the rim, and a two-tier centrepiece with a small jet on top whose bowls spill in thin curtains. The water moves: glints drift over it, the curtains fall and rings of ripples spread from where they land. A bilingual sign set into the rim's outer face, a little east of the front, reads コインを入れないで PLEASE DON'T THROW COINS. A few pigeons peck by the south-west rim. The lane from head office, grey brick between pale borders like the forecourt's lane, runs straight in from the west on the fountain's axis and meets the circle square on; it leaves the circle on the same axis on the east side and runs on east toward the dorms. The lane's ends run in under the circle's dark border ring, which crosses each mouth as a threshold. Along both sides of both lanes a planted verge: a kerbed bed of ground cover with a low hedge, and behind it on the grass a zelkova avenue every 4 (set back so nothing hides Eric on the lane); post lamps on each lane's south edge at every other gap between the trees. All round the plaza a kerbed ring bed with a clipped hedge at its back and a ring of cherries every 22.5°, open only for the two lanes and the canteen link, with two maples flanking the link and drifts of cosmos and grasses along the south arc; two pairs of benches just inside the border ring on the north-west and north-east face the fountain, a tree behind each bench and a lamp between them, the sorted bins beside the west pair, a bike parked by the north-east pair and a leaflet dropped by the west one. A pair of lamps stands in the ring bed either side of each opening. North of the plaza stands the canteen: two storeys, a glazed ground floor with the doors on the fountain's axis under a canopy sign (しょくどう CANTEEN) and teal-and-white striped awnings over the other bays, a blue-grey roof with a parapet and plant. In front of it the terrace, in large pale slabs, with five tables under teal and pale umbrellas; a seat-height wall runs along its whole south side, open only on the door's axis, where a short link in the lanes' brick and borders crosses a strip of lawn and the ring bed to the circle; raised beds with a pine close its ends. South of the plaza a lawn with two small groups of trees, then a footpath and a rack of bikes along the backs of the shop street: two rows of two-storey shops facing each other under one slim arcade roof, running east. On the north row's arcade side are the island's combined konbini, 100-yen shop and drugstore (コンビニ KONBINI · 100 YEN · DRUGSTORE) and the bakery (パン BAKERY); their interiors are not part of day 1. On the lawns round the plaza, groups of mixed trees with shrubs on low mounds; the town beyond (office_e1 to the west, the clinic with its green cross north of the canteen, block_e1 to the north-east) comes from the island layout, every building on the same grid. After work the lamps come on with pools of light on the lanes and the plaza's edge, the basin floor glows faintly from under the water so the coins keep their shine, and the canteen, the shops and the town's windows are lit. No cars.

In the morning the plaza is a side trip with no story beat: the goal points back to the head-office lift. After work it is on the walk home, and the east end of the lane goes on to the dorm courtyard.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_lane` | To head office | The lane west of the plaza, back to the forecourt. |
| `fountain` | Fountain | The fountain in the middle of the plaza. |
| `dorm_lane` | To the dorms | The lane east of the plaza, toward the dorms. |

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

### Small moments

| Nodes | When | What happens |
|---|---|---|
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

## Dorm courtyard (`dorm_court`)

The entrance court of Eric's dorm, on the west side of the dorm cluster in the south-east of island-map-4 (Jørgen, 2026-09-30: "less saturated, uses our existing style. Focus on the area we need, not the whole island at once. Break the outdoor locations into chunks you navigate between"). The camera looks east at the blocks, the way the map has them. Eric comes in on the lane from the plaza at the left edge. At the back stands his block: plain concrete, five storeys, running past both edges of the frame, with a balcony for every room (dividers, a few air-conditioner units, washing on a few laundry poles) and some rooms lit. On the right it turns and comes forward along the court's side. In front of it is the one-storey entrance hall, its glass front cut low like the indoor near walls, with open doors. Inside, a bank of 24 steel mailboxes and a notice board hang on the back wall, with the passage to the rooms beside them. A low stone by the door reads 社員寮 STAFF DORM. West of the hall is the coin laundry's lit shopfront (コインランドリー COIN LAUNDRY, washers behind the glass). East is the sento's low front, with a dark tiled eave, a navy ゆ BATH noren over its lit door and its tall chimney rising past the dorm's roof. Both are frontages only. Two drinks machines, one red and one blue, stand lit in front of the laundry's blank west end, with a few air-conditioner units on its roof. The court is laid on the shared outdoor kit: one walk of dark granite with a pale border runs from the lane along the court to the bike shelter, with a leg up to the hall doors between two low beds and a leg up to the sento door; pale square pavers fill the rest. The bike shelter stands on the east side against the block's return: a frosted roof on steel posts, a lit strip under it, a rack of six places with five bikes and a blue bike sign. Along the front runs a raised bed with a low wall: short runs of clipped hedge in three heights, a cherry, two maples, azaleas, sasanquas in flower and grasses. A bench backs onto it beside the cherry, with the sorted bins next to it. In the south-east corner are a smaller walled bed and the dorm's garbage cage, and there are air-conditioner units at the foot of the return. A bed of zelkovas and shrubs lies west of the laundry. Two tall lamps stand on the walk's north side, with three low bollard lights along the front bed. Past the bed is the street pavement, in brick with a row of gutter lids. The other blocks of the cluster (five to nine storeys), the shops toward the plaza and the ground around come from the island layout, on the same grid as Eric's block. Evening: dusk after the sun has dropped behind the blocks, with a cool sky and a last warm light from the west. The block's lit windows, the lamps, the hall, the laundry, the drinks machines and the sento door light the court.

Eric arrives along the lane from the plaza on the walk home. Walking into the hall doors, or using them, starts the trip to Eric's room. The courtyard also loads directly with `?place=dorm_court`.

### Things

| Id | Label | What it is |
|---|---|---|
| `dorm_entry` | Dorm entrance | The hall's glass doors. |

### Spots

`plaza_entry`, `dorm_entry`

### Seats

None.

### Zones

`dorm_entry` (in the hall doorway)

### Who's there when

Played in the evening, after work. Nobody else is here.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | The goal points to the dorm entrance. |
| `go_in` | Reach or use the hall doors | Eric walks in to his room (the trip to `dorms`). |

## Eric's dorm room (`dorms`)

The worst room in the dorm ([cast.md](cast.md)), built from the room view in [dorm-route-1](../../reviews/dorm-route-1/review.json) (2026-09-30) and furnished as a real company-dorm 1K on 2026-09-30 (issue #75). The camera looks north, down into the flat with its ceiling cut away; the rest of the floor is cut at the same height, dark, with the neighbours' walls showing as faint lines, so the flat reads as one in a row. At the back is the room itself, about 3 by 4 metres, on six tatami mats with navy borders. In the back-left corner a grey steel desk against the wall, its arm lamp switched on over a closed laptop, the company handbook and a mug, a nearly empty shelf above and the chair pulled out. The single bed runs along the left wall (white steel frame, the navy duvet turned back, his work bag dropped on it), with a company calendar on the wall over it. In the back-right corner the oshiire: sliding paper doors below, a small cupboard above, one door pushed back on the folded company futon. Between the closet and the boxes a rug with a folding table, his konbini bento, a bag and a bottle of tea on it and a muted red cushion beside it. His boxes from home stand along the right wall: two taped and stacked, one open with the flaps up and books and a sweater inside, a small one by the doorway, and his coat on a hook above them. The one window, straight ahead with dusty blue curtains drawn back and a white air conditioner over it, looks onto the next block's bare concrete end wall about two metres outside, lit by a lamp on that wall; straight across sits the small frosted window of a bathroom in the flat opposite, lit. A clear aisle runs from the doorway to the window. In front of the room is the entry strip, on grey plank vinyl: the kitchenette on the left (sink, one ring under a hood with a strip light, a small fridge under the counter, a kettle, a mug and a dish rack), the unit bath on the right behind its door (tub, basin, toilet), and the genkan a step down inside the front door, with the shoe cupboard, his work shoes on the tiles and the company slippers at the step. The room's frosted sliding door stands open along its wall. Outside the front door is the open corridor, with a low parapet and the neighbours' steel doors either side (meter boxes, grilled kitchen windows, one lit; an umbrella at one door, a pot plant at the other). The room's front wall, the strip's walls, the front door and the parapet are cut low for the camera. The light is a dim cool evening, with the warm light of the ceiling light (on the ceiling the camera looks through, so it isn't drawn), the desk lamp's pool, the light under the kitchen hood and the cool corridor light at the door.

Eric arrives from the dorm courtyard (Getting between places); it also loads directly with `?place=dorms`. Nobody else is here.

### Things

| Id | Label | What it is |
|---|---|---|
| `window` | Window | The one window, onto the concrete wall. |
| `boxes` | Boxes | His two boxes, sent ahead, by the desk. |
| `bed` | Bed | The single bed. |

### Spots

`room_entry`, `window_front`

### Seats

None.

### Zones

None.

### Who's there when

Played in the evening, after work.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `home` | Arrive on the walk home | A moment in the room, then the day saves and ends ([`mio-notices`](stories/mio-notices.md)). |
| `window`, `boxes`, `bed` | Talk to them | Eric comments on the blocked sky, finding his clean shirts and being too tired to get up again. |
