# Places

Day 1 has six places: the monorail (`train`), Honsha station’s security room with the gate (`gate`), the station forecourt and head-office entrance (`forecourt`), the fountain plaza east of it (`plaza`, a side trip), the lift (`lift`) and IT support on B2 (`office`). Eric's dorm room (`dorms`) is built but not on the route yet. For each: its things and their labels, spots, seats, zones, who is there in each period, and its small moments; also places decided but not built, and how you get between places. Forecourt route added on 2026-09-30, the plaza the same day.

Elsewhere: the island as a whole is in [setting.md](setting.md); the people in [cast.md](cast.md); what happens in a place as part of a storyline is in [stories/](stories/); how places look (palette, light, style) in [art-and-sound.md](art-and-sound.md). The hooks a story can call in each place (doors, the gate, the copier) are in game3d/story/FORMAT.md.

The tables are checked by `node tools/facts/check.mjs`: things and their labels, spots, seats, zones, who has a body in each place and the story's schedule for them, and the small-moment nodes. Coordinates: x runs left to right on screen, z from the back (negative) toward the camera; a unit is about a metre and a half.

## Places decided but not built

The company city has dorms, a canteen, shops, a bar and a university ([setting.md](setting.md)); only the places in the list below are planned, and only the `##` sections further down are built. One line per planned place: name, id, what it is.

The picked full-island layout is [island-map-4](../../reviews/island-map-4/review.json). Only the day-1 route is to be built, one chunk at a time, using the game's existing palette rather than the map's saturated colours. The following chunks replace the earlier single outdoor `path` proposal.

- Dorm courtyard (`dorm_court`): the small entrance court on the west side of the map's eastern apartment cluster. Things: the dorm entry, bicycle shelter, mailboxes and planting; proposed spots: `plaza_entry`, `dorm_entry`. Laundry and sento can be background frontages. The courtyard leads through a short shared passage to Eric's room; no apartment district simulation.

## Getting between places

There are no cuts to black (Jørgen, 2026-09-28: "elegant, continuous transitions"). Each move is one trip the player watches. One line per trip: from, to, how, then what the player sees; a trip to or from a planned place is planned too. The bible draws these as the places diagram (http://127.0.0.1:8771/bible/#place-map).

- `train` → `gate`, walk: Eric steps off onto the platform, follows the covered walkway and enters Honsha station's security room through its glass doors.
- `gate` → `forecourt`, walk: Eric walks north out of the security room's back exit. The camera stays close and keeps its angle, then crossfades to him stepping out of the station's north door onto the court.
- `forecourt` → `lift`, walk: a short crossing north-east to the head office door, through its small lobby, and into the lift.
- `lift` → `office`, lift: the camera stays inside the car for the whole ride. The floor display counts from 1; someone has pressed 5, where the two from Sales get out; then down to B2. The doors open on the B2 lift landing.
- `office` → `lift`, walk: planned return from B2 into the existing lift after work, keeping Eric visible through its doors.
- `lift` → `forecourt`, lift then walk: planned return to head office floor 1; Eric walks through its entrance lobby and out into the same forecourt.
- `forecourt` → `plaza`, walk: Eric walks east off the court along the lane between the hedge and the planting. The camera closes in on him at the lane's end and crossfades to the same close framing of him stepping onto the plaza's lane from the west, then lets go.
- `plaza` → `forecourt`, walk: the same walk the other way, west along the lane back onto the court beside the planting.
- `plaza` → `dorm_court`, walk: planned continuation east along the fountain's near edge into the west-facing dorm entrance court. The shop roofs stay south of the route.
- `dorm_court` → `dorms`, walk: planned entry through the sheltered dorm door and short passage into Eric's room, arriving at his front door (`room_entry`). Camera movement and near-wall removal reveal the interior without a black cut.

The dialogue slots for each trip are in game3d/story/transitions.js (format: FORMAT.md, Transitions).

## Monorail (`train`)

One car of the monorail, crossing the bay from the mainland to Honsha station. The camera looks at it from the platform side, with the near wall cut away for the play camera only. The car is about 8 long and 2.4 wide, with benches along both sides, full-height sliding doors at the near-side corners (they stay full height in the cutaway too, so they never change size while Eric walks out or the car pulls away; Jørgen: "the doors are still half size when trying to leave the train wagon, then magically transform to full height as the train leaves"; they finish shutting before the car moves) and closed neighbour cars (Jørgen, on the title shot: "the doors are hobbit sized, and the carriage behind looks like it is some sort of pavilion"). Sea on both sides out of the windows. When it stops, the station sign and the platform are outside the doors. The train was built earlier (legacy/side/train/) and may be changed where needed.

### Things

| Id | Label | What it is |
|---|---|---|
| `doors` | Doors | Both door pairs, while they're open. |
| `door_l` | Doors | The left door pair. |
| `door_r` | Doors | The right door pair. |
| `foodbag` | Her lunch bag | Mio's bag of her mother's pickles, on the free seat beside her. Can be caught when it slides. |
| `cup` | Coffee | A lidded coffee on the free seat, hidden (left from when the seat was Rei's). |
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

`seat_aoi`, `seat_far_r` (the free seat next to Mio), `seat_near_l`, `seat_near_r`, `seat_mio`

### Zones

`door_zone` (either door, while open), `free_seat` (standing at the free seat)

### Who's there when

The monorail has one period, early morning.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Far bench, right, with her laptop, the free seat beside her. | – |
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

Planned passenger revisions, awaiting [train-discoveries-1](../../reviews/train-discoveries-1/review.json): give Aoi a brief awkward exchange when she realises Eric is assigned to the basement she has just dismissed; let the woman with the bun enlist Eric to close an overfilled shopping bag; show the young man's pride in his first goal despite his team's loss; let the girl with headphones show her own guitar practice; let the reader show the mismatch between his Excel book and the company's old software; and show Hamada silencing a reminder without waking properly. Each moment starts with one interaction, including on first contact before the seat hint. They are optional, need no menu or quiz, and add no later quest. Proposed passenger speech has English subtitles for the player, including unfamiliar Japanese; Eric still follows familiar words and gestures. Mio's conversation and Tama's existing moments stay as they are. Exact proposed passages and their visual staging live only in the review; no new dialogue, prop or voice is built yet.

## Honsha station security room (`gate`)

Honsha station's security room, in the muted palette ([art-and-sound.md](art-and-sound.md)). About 12.6 wide and 9 deep, glass entrance doors at the front. A security barrier runs across the middle with two card readers either side of a scanner arch with two glass flaps and a small head-count screen. The guard's desk sits in the barrier line on the right; the visitor counter with the visitor book and a lost-and-found shelf on the left; benches either side; posters and a notice screen on the back wall, beside the open exit to the forecourt. Office workers walk in, tap through and leave toward head office on their own (not tappable); their number follows the story (a jammed gate means a queue, waiting by the readers with their phones out). One of them carries a cake box.

The gate stays in this room, as Jørgen picked in [gate-location](../../reviews/gate-location/review.json). Its mechanism and layout stay as built. The former lift bank is now an open exit to the forecourt; the lift is inside the separate head office. The internal `lift`, `lift_front` and `to_lift` ids remain for saved-game compatibility.

### Things

| Id | Label | What it is |
|---|---|---|
| `reader_l` | Card reader | Left card reader. |
| `reader_r` | Card reader | Right card reader. |
| `gate` | Gate | The arch and its flaps. |
| `desk` | Guard desk | The guard's desk. |
| `counter` | Visitor counter | Kuro's counter. |
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
| `kuro` | Behind the visitor counter. | – |
| `tama` | By the guard's desk, eating from her bowl. | – |
| `kuroda` | Comes in late through the entrance at 8:52. | – |
| `aoi` | Hidden. | hidden all day |
| `mio` | Hidden (she ran ahead to a server). | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `kuro`, `ohayo_kuro`, `yoroshiku_kuro` | Talk to Kuro, or greet her | いらっしゃいませ and a point at the guard; a polite answer; a puzzled one to よろしく. |
| `ohayo_gate`, `gate_talk` | Greet or talk to the gate | Its recorded voice asks for a card. |
| `poster` | Talk to a poster | "PEOPLE. IDEAS. PROGRESS." |
| `noop` | – | An empty node for choices that do nothing. |

## Station forecourt and head office entrance (`forecourt`)

The first outdoor chunk of the picked island-map-4 layout (Jørgen, 2026-09-29). The camera looks north, as in the security room. The station's north wall runs along the bottom, cut low like the indoor near walls, with its open doors; the blue platform roof runs along the west edge. The head office stands up and to the right: a glass-fronted ground floor, its front wall also cut low, with the tower rising behind it. Inside is a small lobby with two wall lamps, a plant and the lift to B2 in the back wall. There is no second security gate. The court between the two doors is about five metres of stone paving with a worn line along the walk. Bicycle racks and a bench stand on the west side, a planted bed with two trees on the east, and two lit bollards along the way. By the head office door stands a low stone sign reading 本社 HEAD OFFICE. A hedge on the east edge marks the lane on toward the plaza. The palette and the warm, low morning sun are the security room's.

Eric walks out of the station, crosses the court under player control, and walks into the lift. He can also walk east along the lane to the fountain plaza and back at any time before the lift. Beyond the court the town goes on as plain background: the road south of the station, grass by the platform, and low-poly building blocks with window rows around head office. The return trip from B2 is still to build.

### Things

| Id | Label | What it is |
|---|---|---|
| `station_exit` | Station | The station's island-side doorway, behind Eric as he enters the court. |
| `office_entrance` | Head office | The separate head-office entrance and short lift lobby. |
| `lift` | Lift to B2 | The lift inside head office. |
| `plaza_lane` | To the plaza | The east end of the lane between the hedge and the planting. |

### Spots

`station_exit`, `office_entrance`, `lift_front`, `plaza_lane`

### Seats

None.

### Zones

`lift_front`, `plaza_lane` (the lane's east end: walking into it starts the walk to the plaza)

### Who's there when

Nobody lives here in this first outdoor chunk. The two from Sales appear inside the lift during the ride.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Hidden (she ran ahead to a server). | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `outside` | Arrive from the station | The goal points to the head-office lift. |
| `head_office` | Use the head-office entrance | The goal points inside to the B2 lift. |
| `to_b2` | Reach or use the lift | Eric boards the existing watched lift ride. |
| `to_plaza` | Reach or use the east lane | Eric walks on to the fountain plaza. |

## Fountain plaza (`plaza`)

The second outdoor chunk of island-map-4, east of the forecourt, in the forecourt's palette, light and camera (looking north). A stone lane crosses the frame west to east along the near edge of a round plaza: in from the forecourt on the left, on toward the dorms on the right. North of the lane, the fountain (a round stone basin with a water-filled bowl on a column) stands in a ring of lighter paving, with a bench either side facing it and two lit bollards where the ring meets the lane. Corner beds with trees close the plaza off to either side, and the canteen, with the map's blue roof muted to the platform roof's blue-grey and three umbrellas over its terrace, stands behind. South of the lane runs a grass verge with low shrub beds (kept low so they never hide Eric), a pavement, then the shop row: seven single-storey units seen as roofs, muted awnings over their lane side and three rooftop signs (パン, くすり, カフェ). Their interiors are not part of day 1. Plain blocks stand around, among them the head office tower back to the west and the first dorm block to the east, where the lane goes on.

On day 1 the plaza is a side trip with no story beat: the goal points back to the head-office lift. The east end of the lane is the planned edge toward the dorm courtyard.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_lane` | To head office | The lane's west end, back to the forecourt. |
| `fountain` | Fountain | The fountain in the middle of the plaza. |
| `dorm_lane` | To the dorms | The lane's east end, toward the dorms (planned). |

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
| `arrive` | Arrive from the forecourt | The goal points back west to the head-office lift. |
| `fountain` | Talk to the fountain | A sign on the rim asks people not to throw coins; the bottom is covered in coins. |
| `dorms_later` | Use or walk into the lane's east end | The dorms are further down this lane, for after work. |
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
| `mio` | In the machine room in the morning and at lunch; at her desk in the afternoon; Eric's desk in the evening. | morning `racks`, lunch `racks`, afternoon `emi_seat`, evening `my_desk` |
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

## Eric's dorm room (`dorms`)

The worst room in the dorm ([cast.md](cast.md)), built from the room view in [dorm-route-1](../../reviews/dorm-route-1/review.json) (2026-09-30). The camera looks north. At the back is the room itself, about 3 by 4 metres: a single bed along the left wall (grey frame, navy cover), a grey steel desk and chair on the right, and his two shipped boxes, taped shut, by the desk. A clear aisle runs from the doorway to the one window, straight ahead, which looks onto a bare concrete wall about two metres outside. In front of the room is the entry strip: the front door with a small genkan, a kitchenette on the left (sink, one hob ring, a small fridge under the counter, a kettle) and the unit bath on the right behind its closed door. The room's front wall, the strip's near wall and the bath's walls are cut low for the camera. The light is a dim cool evening, with the warm light of the ceiling lamp over the middle of the room; the fitting itself is on the ceiling the camera looks through, so it isn't drawn.

It isn't on the day's route yet: the trip in from the dorm courtyard is planned (Getting between places), and until then it is loaded directly with `?place=dorms`. Nobody else is here.

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
| `window`, `boxes`, `bed` | Talk to them | One plain line each from Eric; stand-ins until Codex writes them. |
