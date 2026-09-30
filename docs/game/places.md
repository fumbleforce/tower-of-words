# Places

Day 1 has eight places: the monorail (`train`), Honsha station’s security room with the gate (`gate`), the station forecourt and head-office entrance (`forecourt`), the fountain plaza east of it (`plaza`, a side trip in the morning), the lift (`lift`), IT support on B2 (`office`), and on the walk home after work the dorm courtyard (`dorm_court`) and Eric's dorm room (`dorms`), where the day ends. For each: its things and their labels, spots, seats, zones, who is there in each period, and its small moments; also places decided but not built, and how you get between places. Forecourt route added on 2026-09-30, the plaza, the dorm courtyard and the walk home the same day.

Elsewhere: the island as a whole is in [setting.md](setting.md); the people in [cast.md](cast.md); what happens in a place as part of a storyline is in [stories/](stories/); how places look (palette, light, style) in [art-and-sound.md](art-and-sound.md). The hooks a story can call in each place (doors, the gate, the copier) are in game3d/story/FORMAT.md.

The tables are checked by `node tools/facts/check.mjs`: things and their labels, spots, seats, zones, who has a body in each place and the story's schedule for them, and the small-moment nodes. Coordinates: x runs left to right on screen, z from the back (negative) toward the camera; a unit is about a metre and a half.

## Places decided but not built

The company city has dorms, a canteen, shops, a bar and a university ([setting.md](setting.md)); only the places in the list below are planned, and only the `##` sections further down are built. One line per planned place: name, id, what it is.

The picked full-island layout is [island-map-4](../../reviews/island-map-4/review.json). Only the day-1 route is to be built, one chunk at a time, using the game's existing palette rather than the map's saturated colours. The plaza and dorm courtyard chunks replaced the earlier single outdoor `path` proposal. No other place is planned yet.

## Getting between places

There are no cuts to black (Jørgen, 2026-09-28: "elegant, continuous transitions"). Each move is one trip the player watches. One line per trip: from, to, how, then what the player sees; a trip to or from a planned place is planned too. The bible draws these as the places diagram (http://127.0.0.1:8771/bible/#place-map).

- `train` → `gate`, walk: Eric steps off onto the platform, follows the covered walkway and enters Honsha station's security room through its glass doors.
- `gate` → `forecourt`, walk: Eric walks north out of the security room's back exit. The camera stays close and keeps its angle, then crossfades to him stepping out of the station's north door onto the court.
- `forecourt` → `lift`, walk: east along the station's north side and across to the head office door, through the lobby past the reception, and into the lift.
- `lift` → `office`, lift: the camera stays inside the car for the whole ride. The floor display counts from 1; someone has pressed 5, where the two from Sales get out; then down to B2. The doors open on the B2 lift landing.
- `office` → `lift`, walk: after work, Eric walks from B2 into the same lift, the camera easing in on the car as in the morning; the near wall drops and the lights outside go down. He rides alone.
- `lift` → `forecourt`, lift then walk: the floor display counts B2, B1, 1; the same shot of the car crossfades to head office's floor 1, the lights come up, the doors open and he walks out into the lobby, the wall rising behind him; the tower comes back over the lobby as he walks out of the door.
- `forecourt` → `plaza`, walk: Eric walks east off the court along the lane between the hedge and the planting. The camera closes in on him at the lane's end and crossfades to the same close framing of him stepping onto the plaza's lane from the west, then lets go.
- `plaza` → `forecourt`, walk: the same walk the other way, west along the lane back onto the court beside the planting.
- `plaza` → `dorm_court`, walk: after work only. Eric walks east off the plaza along the lane; the camera closes in on him at the lane's end and crossfades to the same close framing of him stepping into the dorm courtyard from the west, then lets go.
- `dorm_court` → `dorms`, walk: Eric walks in through the dorm's hall doors, past the mailboxes and into the passage at the back as the camera comes in close, then crossfades to him stepping in through his own front door to `room_entry`.

The dialogue slots for each trip are in game3d/story/transitions.js (format: FORMAT.md, Transitions).

## Where the places sit on the island

Every place has a spot in one island frame, fitted to [island-map-4](../../reviews/island-map-4/review.json) (2026-09-30). The frame: x runs east, z south, in game units; north is the map's up once its ground is flattened; the origin is the head office door as the map draws it. The table gives the island point of each place's own (0, 0), its clockwise turn on the map in degrees, its scale (the train is built at people scale 1, everything else at 1.18) and its level (0 ground, -2 underground, 1 upstairs or raised). The walks between outdoor places crossfade, so neighbouring places don't have to touch.

The buildings, paths, green and coast around the route, and the fit to the map, are data in game3d/js/scenes/island-layout.js. The island map shows all of it (`?map=1`, key M; `?mapcompare=1` over the reference); the differences are listed in notes/map-gaps.md.

| Place | x | z | Turn | Scale | Level | Pinned by |
|---|---|---|---|---|---|---|
| `gate` | -15.14 | 0 | 0 | 1 | 0 | The room centred on the station building. |
| `forecourt` | -14.64 | -7.15 | 0 | 1 | 0 | The gate room: its exit is the station door. |
| `office` | 7.45 | -4.99 | 0 | 1 | -2 | Its lift under the forecourt's lift. |
| `plaza` | 36.35 | 12.5 | 0 | 1 | 0 | Its fountain on the map's fountain. |
| `dorm_court` | 74 | 30 | 90 | 1 | 0 | The open entrance court on the west side of the dorm blocks; its camera looks east at Eric's block. |
| `dorms` | 79.4 | 31.75 | 90 | 1 | 1 | In Eric's block, above the passage; its window faces the next block's west end, 1.3 out. |
| `train` | -20.84 | -13.12 | 112 | 1.18 | 1 | The car in the middle of the platform shed, its walkway end toward the station. |

## Monorail (`train`)

One car of the monorail, crossing the bay from the mainland to Honsha station. The camera looks at it from the platform side, with the near wall cut away for the play camera only. The car is about 8 long and 2.4 wide, with benches along both sides, full-height sliding doors at the near-side corners (they stay full height in the cutaway too, so they never change size while Eric walks out or the car pulls away; Jørgen: "the doors are still half size when trying to leave the train wagon, then magically transform to full height as the train leaves"; they finish shutting before the car moves) and closed neighbour cars (Jørgen, on the title shot: "the doors are hobbit sized, and the carriage behind looks like it is some sort of pavilion"). Sea on both sides out of the windows. When it stops, the station sign and the platform are outside the doors. The train was built earlier (legacy/side/train/) and may be changed where needed.

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

The lobby is played in the early morning, before nine.

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

The first outdoor chunk of the picked island-map-4 layout (Jørgen, 2026-09-29). The camera looks north, as in the security room. The station's north wall runs along the bottom left, cut low like the indoor near walls, with its open doors; the blue platform roof runs along the west edge. The court is about five metres of stone paving with a worn line along the walk; bicycle racks and a bench on its west side, a planted bed with two trees on the east, and two lit bollards. A hedge on the court's east edge marks the lane on toward the plaza. The palette and the warm, low morning sun are the security room's.

Head office stands east of the station, where the island layout puts it (Jørgen, 2026-09-30, on the old one: "a standalone elevator with literally nothing over it"). It is the island's tallest building: twelve storeys of blue-grey curtain wall with floor bands and pale fins, a parapet and roof plant, turned about 23° like the map's town grid. The entrance is in the south face near the south-west corner, under a cantilevered canopy with 本社 HEAD OFFICE on its fascia; the low stone name sign stands beside it. Inside is the lobby: the reception counter with Kuro behind it to the left of the door (受付 RECEPTION on its front), the lift core at the back with the B2 car (B2 - 5F), a second car's closed doors (6F - 10F) and the stair door (階段 STAIRS), the floor directory beside them (only "5F Sales" and "B2 IT Support" can be read), two sofas round a low table, plants and an umbrella stand. The lift core stands square to the camera, so the ride is filmed straight on. There is no second security gate. While Eric is in the lobby or the lift, everything above the ground floor, the glass front and the canopy fade out, so the lobby and the ride can be seen; they come back as he walks out of the door.

Eric walks out of the station, crosses the court under player control, and walks into the lift. He can also walk east along the lane to the fountain plaza and back at any time before the lift. Beyond the court the town goes on as plain background: the road south of the station, grass by the platform, a few low-poly blocks with window rows, and further out the island layout's buildings (the tower's wing, the offices north, the canteen) on the island's ground and sea.

At the end of the B2 conversation the camera releases its close-up before Mio leaves, so Eric can see and reach the lift. After work he comes up in the same lift and walks home east along the lane. The forecourt and the plaza then take the dorm courtyard's dusk light, and the head-office door and lift have no marker.

### Things

| Id | Label | What it is |
|---|---|---|
| `station_exit` | Station | The station's island-side doorway, behind Eric as he enters the court. |
| `office_entrance` | Head office | The head office's entrance under its canopy. |
| `lift` | Lift to B2 | The B2 car in the lobby's lift core. |
| `plaza_lane` | To the plaza | The east end of the lane between the hedge and the planting. |

### Spots

`station_exit`, `office_entrance`, `lift_front`, `plaza_lane`

### Seats

None.

### Zones

`lift_front`, `plaza_lane` (the lane's east end: walking into it starts the walk to the plaza)

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
| `kuro`, `ohayo_kuro`, `yoroshiku_kuro` | Talk to Kuro, or greet her | いらっしゃいませ and a point toward the lift; a polite answer; a puzzled one to よろしく. Her station lines for now; lines written for the lobby are asked of Codex. |

## Fountain plaza (`plaza`)

The second outdoor chunk of island-map-4, east of the forecourt, in the forecourt's palette, light and camera (looking north). A stone lane crosses the frame west to east along the near edge of a round plaza: in from the forecourt on the left, on toward the dorms on the right. North of the lane, the fountain (a low, open stone basin with visible water, a smaller bowl on a column and two narrow spills) stands in a ring of lighter paving, with a bench either side facing it and two lit bollards where the ring meets the lane. Coins lie under the basin water despite the small bilingual no-coins sign on its rim. Low kerbs, drain grates and a few repaired paving slabs break up the lane edges; a small bin stands beside the east bench. Corner beds with trees close the plaza off to either side, and the canteen, with the map's blue roof muted to the platform roof's blue-grey and three umbrellas over its terrace, stands behind. South of the lane runs a grass verge with low shrub beds (kept low so they never hide Eric), a pavement, then the shop row: seven single-storey units seen as roofs, muted awnings over their lane side and three rooftop signs (パン, くすり, カフェ). Their interiors are not part of day 1. Plain blocks stand around, among them the head office tower back to the west and the first dorm block to the east, where the lane goes on.

In the morning the plaza is a side trip with no story beat: the goal points back to the head-office lift. After work it is on the walk home, and the east end of the lane goes on to the dorm courtyard.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_lane` | To head office | The lane's west end, back to the forecourt. |
| `fountain` | Fountain | The fountain in the middle of the plaza. |
| `dorm_lane` | To the dorms | The lane's east end, toward the dorms. |

### Spots

`office_entry`, `fountain_edge`, `dorm_exit`

### Seats

None.

### Zones

`office_lane` (the lane's west end), `dorm_exit` (the lane's east end)

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

`lift_out`, `mori_greet`, `lobby`, `office_door`, `my_seat`, `emi_seat`, `copier_front`, `coffee_front`, `corridor_w`, `corridor_e`, `machine_front`, `kenji_desk`

### Seats

`my_seat` (Eric's, south row, middle), `emi_seat` and `mio_seat` (the same chair: south row, left)

### Zones

`office`, `copy_room`, `kitchen`, `toilets`, `machine_room`, `corridor`

### Who's there when

The story moves the clock ([systems.md](systems.md)): morning when Eric arrives, lunch at 12:10, afternoon at 14:00, evening at 18:05.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | In the machine room in the morning and at lunch; at her desk in the afternoon; Eric's desk in the evening, until she leaves by the lift. | morning `racks`, lunch `racks`, afternoon `emi_seat`, evening `my_desk` |
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
| `matte_clock` | 待って to the clock | The second hand stops; Mori looks up. |
| `tomatte_fan` | 止まって to the fan | It stops; Kenji: あれ？ |
| `noop` | – | An empty node for choices and triggers that do nothing. |

## Dorm courtyard (`dorm_court`)

The entrance court of Eric's dorm, on the west side of the dorm cluster in the south-east of island-map-4 (Jørgen, 2026-09-30: "less saturated, uses our existing style. Focus on the area we need, not the whole island at once. Break the outdoor locations into chunks you navigate between"). The camera looks east at the blocks, the way the map has them. Eric comes in on the lane from the plaza at the left edge, past a few trees on grass. At the back stands his block: plain concrete, five storeys, running past both edges of the frame, with a balcony for every room (dividers, a few air-conditioner units, washing on a few laundry poles) and some rooms lit. On the right it turns and comes forward along the court's side. In front of it is the one-storey entrance hall, its glass front cut low like the indoor near walls, with open doors. Inside, a bank of 24 steel mailboxes and a notice board hang on the back wall, with the passage to the rooms beside them. A low stone by the door reads 社員寮 STAFF DORM. West of the hall is the coin laundry's lit shopfront (コインランドリー COIN LAUNDRY, washers behind the glass). East is the sento's low front, with a dark tiled eave, a navy ゆ BATH noren over its lit door and its tall chimney rising past the dorm's roof. Both are frontages only. Bikes: four in an open rack on the near west side, four more under a shelter with a pale see-through roof on the near east side. There are planters either side of the hall doors, a long bed with two trees on the east edge, two lit bollards, and a hedge along the footpath at the front. The other blocks of the cluster (five to seven storeys), the shops toward the plaza and the ground around come from the island layout. Evening: a dim blue dusk, the last of the sun low and orange, lit windows and the warm light from the hall, the laundry and the sento.

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

The worst room in the dorm ([cast.md](cast.md)), built from the room view in [dorm-route-1](../../reviews/dorm-route-1/review.json) (2026-09-30). The camera looks north. At the back is the room itself, about 3 by 4 metres: a single bed along the left wall (grey frame, navy cover), a grey steel desk and chair on the right, and his two shipped boxes, taped shut, by the desk. A clear aisle runs from the doorway to the one window, straight ahead, which looks onto a bare concrete wall about two metres outside. In front of the room is the entry strip: the front door with a small genkan, a kitchenette on the left (sink, one hob ring, a small fridge under the counter, a kettle) and the unit bath on the right behind its closed door. The room's front wall, the strip's near wall and the bath's walls are cut low for the camera. The light is a dim cool evening, with the warm light of the ceiling lamp over the middle of the room; the fitting itself is on the ceiling the camera looks through, so it isn't drawn.

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
