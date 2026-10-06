# Places

Day 1 has eight places: the monorail (`train`), Honsha station’s security room with the gate (`gate`), the station forecourt and head-office entrance (`forecourt`), the fountain plaza east of it (`plaza`, a side trip in the morning), the lift (`lift`), IT support on B2 (`office`), and on the walk home after work the dorm courtyard (`dorm_court`) and Eric's dorm room (`dorms`), where the day ends. For each: its things and their labels, spots, seats, zones, who is there in each period, and its small moments; also places decided but not built, and how you get between places. Forecourt route added on 2026-09-30, the plaza, the dorm courtyard and the walk home the same day.

Elsewhere: the island as a whole is in [setting.md](setting.md); the people in [cast.md](cast.md); what happens in a place as part of a storyline is in [stories/](stories/); how places look (palette, light, style) in [art-and-sound.md](art-and-sound.md). The hooks a story can call in each place (doors, the gate, the copier) are in game3d/story/FORMAT.md.

The tables are checked by `node tools/facts/check.mjs`: things and their labels, spots, seats, zones, who has a body in each place and the story's schedule for them, the crowd's numbers, the small-moment nodes, and the creatures. Coordinates: x runs left to right on screen, z from the back (negative) toward the camera; a unit is about a metre and a half.

No scene starts with Eric in a doorway (Jørgen, 2026-10-04: "I didnt make it fully onto the platform before the scene triggered, trapping me in the door"). A zone that starts a scene sits clear of the doorway beside it; if a scene starts with Eric in one anyway (a tap on a door, someone talking to him there), he first walks out of it to free floor. The doorways are the train's two platform doors and the office corridor's six; the day test fails if a zone fires, or a scene begins, with him in one (game3d/js/movement/doorways.js).

## Places decided but not built

The company city has dorms, a canteen, shops, a bar and a university ([setting.md](setting.md)); only the places in the list below are planned, and only the `##` sections further down are built. One line per planned place: name, id, what it is.

The picked full-island layout is [island-map-4](../../reviews/island-map-4/review.json). Only the day-1 route is to be built, one chunk at a time, using the game's existing palette rather than the map's saturated colours. The plaza and dorm courtyard chunks replaced the earlier single outdoor `path` proposal. The rest of the island's south half is planned for day 2 in [island.md](island.md) (2026-10-02): every place there, its doors, connections and a Japanese hook. Jørgen confirmed the plan on Review island-half-1 (2026-10-02, "Correct"); its districts are built one at a time: the shop street and seafront is the first (`shotengai`, below), the east lane the second (`east_lane`, below), the east coast up to the onsen the third (`east_coast`, below), the sports ground the fourth (`sports`, below), the office street the fifth (`office_quarter`, below), the harbour the sixth (`harbour`, below), the old works the seventh (`works`, below).

## Birds and small animals

Jørgen, 2026-10-02: "we must make the island feel more alive ... and small creatures, birds etc". The outdoor places have birds and a few small animals, listed in each place's "Creatures" table: the group's id, its kind, how many there are on the high graphics tier, and when it is about (`day` is early morning to the afternoon, `evening` is after work, `all` is both). Medium graphics, what a phone picks, shows three quarters of each group and low graphics half, at least one. They are scenery: no story reads them and they never stand in Eric's way. The cats are the one thing to use: Eric can pet them (below).

- Pigeons and sparrows feed as a flock on paving Eric can see. When anyone walks up close (Eric, Mio or someone else), the flock scatters: the birds take off a moment apart, some to a roof, a wall or a hedge nearby and the rest away out of sight. Ten to twenty seconds later the flock lands again on another bit of paving in view. A flock left behind out of sight moves on and lands near him again.
- Crows sit one to a roof, a tree or a wall, look about and caw now and then. About every half minute one moves to a perch nearer Eric. A crow sitting low flies off when someone comes close.
- Gulls circle low over the water nearest Eric (over the place itself where there is none), mostly gliding. The others sit on the water, a quay or a roof, and every so often they swap. The harbour's gulls after work only sit.
- Cats sit up on a wall, a planter or a bench, or at the foot of a wall, looking out over the street. They are Tama's body in their own coats (black, grey tabby, ginger and white): they breathe, sway the tail, flick an ear and blink, and the head follows Eric while he is near. None of them is Tama ([stories/tama.md](stories/tama.md)).
- Any cat Eric can reach can be petted, the way Tama is (Jørgen, 2026-10-04: "I need to be able to pet the other stray cats as well"): it has Tama's paw pin, Pet is on E when it is the nearest target and on a tap, and he walks to free floor beside it, bends down and strokes it. The cat looks up and leans into his hand with a soft purr, then settles (black cats mostly curl up, tabbies wash, ginger ones sit on; sometimes another way), and ten or so seconds later sits up as before. The first time each cat is petted in a day, one narration line says something about it that can't be seen (its fur, its smell). No story, bond or flag comes of it. A cat picks a spot Eric can reach when there is one in range; one sitting too high (over about 0.7 units up), or with no free floor beside it that Eric can walk to, is not a target. Pigeons, sparrows, crows, gulls and insects stay scenery.
- Butterflies loop over lawns and planting. Red dragonflies (akatombo, it is October) hover and then dart a little way.
- When a group's time of day ends it flies off, or slips away where Eric can't see; when its time comes it flies in.
- Where they can be is surveyed from each built place by game3d/tools/creature-perches.mjs, which writes game3d/js/creatures/perches.js. Run it again when a place's geometry changes; `--check` says whether any stored point has moved. Their sounds are in [art-and-sound.md](art-and-sound.md).

## Getting between places

- `plaza` → `canteen`, walk: through the glazed front door on the fountain axis, into the ground-floor dining room.
- `canteen` → `plaza`, walk: out of the same door onto its terrace, facing the fountain.

There are no cuts to black (Jørgen, 2026-09-28: "elegant, continuous transitions"). Each move is one trip the player watches. Fast travel from the map (systems.md, Fast travel) skips the leaving walk: the frame crossfades straight into the arriving walk from the route's last place, as below. A trip is finished before anyone in the new place speaks: the crossfade has cleared and a camera pulling back from the arrival has settled. One line per trip: from, to, how, then what the player sees; a trip to or from a planned place is planned too. The bible draws these as the places diagram (http://127.0.0.1:8771/bible/#place-map).

- `train` → `gate`, walk: Eric steps off onto the platform, follows the covered walkway and enters Honsha station's security room through its glass doors.
- `gate` → `forecourt`, walk: Eric walks north out of the security room's back exit. The camera stays close and keeps its angle, then crossfades to him stepping out of the station's north door onto the court; on a phone the camera then turns to look east-north-east up the court at head office.
- `forecourt` → `lift`, walk: east across the court and north to the head office door, through the lobby past the reception, and into the lift.
- `lift` → `office`, lift: the car comes up from B1 to meet him (the display over the lobby's lift doors counts, a ding), and its doors open on the two from Sales already aboard. The camera stays inside the car for the whole ride. Once the car leaves floor 1 the lobby goes dark and out of view, so only the car in its shaft and the people in it are seen. The floor display counts from 1; someone has pressed 5, where the doors open on a lit landing of that floor and the two from Sales walk out; then down to B2. The doors open on the B2 lift landing.
- `office` → `lift`, walk: after work, Eric walks from B2 into the same lift, the camera easing in on the car as in the morning; the near wall drops and the lights outside go down. He rides alone; once the car leaves B2 the office goes dark and out of view.
- `lift` → `forecourt`, lift then walk: the floor display counts B2, B1, 1; the same shot of the car crossfades to head office's floor 1, the lights come up, the doors open and he walks out into the lobby, the wall rising behind him; the tower comes back over the lobby as he walks out of the door.
- `forecourt` → `plaza`, walk: Eric walks east off the court along the lane by the tower's south face. The camera closes in on him at the lane's end and crossfades to the same close framing of him on the plaza's lane just west of the circle, walking in along the fountain's axis with the fountain ahead as the camera lets go.
- `forecourt` → `shotengai`, walk: south through the bicycle parking and its open south edge onto the shopping street’s west passage; north returns to the same bike aisle. Available on days 1–5. The map uses the same paved connection.
- `shotengai` → `forecourt`, walk: north along the west passage into the bicycle aisle, returning just south of head office.
- `plaza` → `forecourt`, walk: the same walk the other way, west along the lane back toward the head office door.
- `plaza` → `dorm_court`, walk: after work only. Eric walks east off the plaza along the lane; the camera closes in on him at the lane's end and crossfades to the same close framing of him walking on along the same brick lane, which runs past the dorm courtyard's front as the street. He turns in through the court's gate and walks up toward the hall doors, then the camera lets go.
- `plaza` → `shotengai`, walk: Eric walks down the cross walk and turns east along the south walk; the camera closes in on him there and crossfades to the same close framing of him turning off the dorm street into the shop walk at the arcade's east mouth, walking west with the arcade ahead, as the camera lets go.
- `shotengai` → `plaza`, walk: the same walk the other way, out of the shop walk onto the dorm street, crossfading to him coming west along the south walk to the cross walk's foot.
- `plaza` → `east_lane`, walk: before work is over. Eric walks east off the plaza along the lane past the cross walk; the camera closes in on him at the lane's end and crossfades to the same close framing of him walking on east along the lane toward the jog, as the camera lets go.
- `east_lane` → `plaza`, walk: the same walk the other way, west along the lane past the cross walk (or up the cross walk onto the lane), crossfading to him walking west on the plaza's lane east of the cross walk.
- `east_lane` → `shotengai`, walk: Eric walks south down the dorm street toward the shop walk; the camera closes in and crossfades to him turning off the dorm street into the shop walk, as from the plaza.
- `east_lane` → `dorm_court`, walk: after work only. Eric turns into the dorm courtyard's gate off the dorm street; the camera closes in and crossfades to him walking in at the gate, as from the plaza.
- `east_lane` → `east_coast`, walk: Eric turns east off the dorm street into the dorm row; the camera closes in and crossfades to the same close framing of him walking on east along the row, toward the sea terrace, as the camera lets go.
- `east_coast` → `east_lane`, walk: the same walk the other way, west along the dorm row onto the dorm street, crossfading to him stepping out of the row's mouth, walking west.
- `east_lane` → `sports`, walk: Eric walks north up the north street past the back lane; the camera closes in and crossfades to the same close framing of him walking on north up the street toward the sports lane, as the camera lets go.
- `sports` → `east_lane`, walk: the same walk the other way, south down the north street toward the back lane, crossfading to him walking on south past it.
- `sports` → `east_coast`, walk: Eric walks east along the courts walk to its end; the camera closes in and crossfades to the same close framing of him walking on east to the foot of the onsen path, as the camera lets go. With the east lane and the east coast this closes a loop: up the north street, round by the pool and the courts, down the coast and back along the dorm row.
- `east_coast` → `sports`, walk: the same walk the other way, west from the onsen path's foot along the courts walk, crossfading to him walking on west past the courts.
- `sports` → `pool`, walk: Eric goes in at the shower pavilion's door at the pool walk's end; the camera closes in on him at the door and crossfades to the same close framing of him walking out of the men's changing room onto the deck, as the camera lets go. The changing room itself is not shown.
- `sports` → `gym`, walk: Eric goes in at the gym's main doors; the camera closes in on him at the doors and crossfades to the same close framing of him walking in onto the entrance's tiles inside them, as the camera lets go.
- `gym` → `sports`, walk: the same way back, out through the main doors, crossfading to him walking out onto the gym's apron and the sports lane, heading south.
- `gym` → `pool`, walk (once the story uses `gym_changing`): the protagonist walks in at their own changing room's doorway off the lobby (Carina the women's); the camera closes in on them there and crossfades to them walking out of the same changing room onto the deck, as from the sports ground.
- `pool` → `sports`, walk: the same way back, in at the men's changing room's door on the deck, crossfading to him walking out of the pavilion's door onto the pool walk, heading west.
- `east_coast` → `dorm_commons`, walk: Eric goes in at the common room's glazed door at the north end of the inner court; the camera closes in on him at the door and crossfades to the same close framing of him walking in onto the common room's floor, as the camera lets go.
- `dorm_commons` → `east_coast`, walk: the same way back, out through the glazed door, crossfading to him walking out onto the inner court, heading south.
- `shotengai` → `karaoke`, walk: Eric goes in at the karaoke box's glass door off the arcade; the camera closes in on him at the door and crossfades to the same close framing of him walking in onto the front desk's floor, as the camera lets go.
- `karaoke` → `shotengai`, walk: the same way back, out through the glass door, crossfading to him stepping out onto the arcade.
- `karaoke` → `karaoke_booth`, walk then stairs: Eric walks to the foot of the stairs at the back and steps onto the bottom tread; the camera closes in on him there and crossfades to him walking in through the booth's door from the corridor upstairs, as the camera lets go.
- `karaoke_booth` → `karaoke`, walk then stairs: out of the booth's door into the corridor, crossfading to him stepping off the bottom tread of the stairs downstairs.
- `sports` → `office_quarter`, walk: Eric walks west along the sports lane past the gym's front, north round the gym's corner and west into the office street; the camera closes in and crossfades to the same close framing of him walking on west along the street, as the camera lets go.
- `office_quarter` → `sports`, walk: the same corner the other way, east along the street, south round the gym's corner and east along the sports lane, crossfading to him walking on east toward the gym's front.
- `office_quarter` → `harbour`, walk: Eric walks west along the office street past Amakawa Trading toward the harbour walk's mouth; the camera closes in and crossfades to the same close framing of him walking on west along the street past the walk's mouth, toward the supply yard, as the camera lets go.
- `harbour` → `office_quarter`, walk: the same walk the other way, east along the street toward Amakawa Trading, crossfading to him walking on east along the street past its front.
- `harbour` → `works`, walk, by either of two ways: Eric walks north out of the supply yard into the works lane, or north off the office street into the works street; the camera closes in and crossfades to the same close framing of him walking on north up the same lane or street, as the camera lets go. With the way back down the other one this makes a loop.
- `works` → `harbour`, walk, by the way nearest him: south down the works lane, crossfading to him stepping out into the supply yard, or south down the works street, crossfading to him stepping out onto the office street.
- `shotengai` → `dorm_court`, walk: after work only. Eric walks out of the shop walk onto the dorm street; the camera closes in and crossfades to him walking up the street to the dorm courtyard's gate, as from the plaza.
- `dorm_court` → `dorms`, walk then stairs: Eric has walked in through the hall doors and across the hall himself. At the passage the camera comes in close as he walks into it, then crossfades to him coming up the last flight onto the 2F landing; the camera pulls back along the corridor as he turns into it and lets go. He walks the corridor to his door himself (Eric's dorm room); on day 2 he walks on along it and in at his door without stopping, before the room's start.

On day 2 the ways are the day-2 set's (game3d/story/day2/index.js `TRIPS`), the same before and after work, with no day-1 time rules and no dialogue slots. They are the walks above plus these:

- `dorms` → `dorm_court`, walk then stairs: from the 2F landing (he has come out of his flat onto the corridor first, Eric's dorm room) Eric steps onto the flight down; the camera is close on it, then crossfades to him coming out of the passage at the back of the hall and walking to just inside the doors.
- `dorm_court` → `east_lane`, walk: out of the court's gate onto the lane; the camera closes in and crossfades to him walking west onto the dorm street from the gate leg.
- `shotengai` → `east_lane`, walk: out of the shop walk onto the dorm street; the camera closes in and crossfades to him walking north up the dorm street.
- `forecourt` → `gate`, walk: back to the station door and in; the camera closes in at the door and crossfades to him walking in at the security room's north exit, past the open gate.
- `gate` → `train`, walk: out through the glass doors; the camera closes in and crossfades to him coming off the covered walkway onto the platform, walking up it toward the standing car's left-hand doors.

The dialogue slots for each trip are in game3d/story/transitions.js (format: FORMAT.md, Transitions).

## Where the places sit on the island

Every place has a spot in one island frame, fitted to [island-map-4](../../reviews/island-map-4/review.json) (2026-09-30). The frame: x runs east, z south, in game units, along the town's street grid, which the map draws turned about 23° clockwise from its up (Jørgen, 2026-09-30: "lol look at the lift, it sits at an angle inside the building, intersecting the wall"), so every building on the grid is square to the cameras; north means the grid's north; the origin is the head office door as the map draws it. The table gives the island point of each place's own (0, 0), its clockwise turn on the map in degrees, its scale (the train is built at people scale 1, everything else at 1.18) and its level (0 ground, -2 underground, 1 upstairs or raised). The walks between outdoor places crossfade, so neighbouring places don't have to touch.

The buildings, paths, green and coast around the route, and the fit to the map, are data in game3d/js/scenes/island-layout.js. The dev island map shows all of it (`?map=1`, Shift+M; `?mapcompare=1` over the reference); the differences are listed in notes/map-gaps.md.

| Place | x | z | Turn | Scale | Level | Pinned by |
|---|---|---|---|---|---|---|
| `gate` | -14.45 | 6.5 | 0 | 1 | 0 | The room centred on the station building's footprint. |
| `forecourt` | -13.95 | -0.65 | 0 | 1 | 0 | The gate room: its exit is the station door. |
| `office` | 8.75 | -8.45 | 0 | 1 | -2 | Its lift under the forecourt's lift. |
| `canteen` | 33.885 | -20.5 | 0 | 1 | 0 | The ground-floor footprint, front edge centred in the existing canteen. |
| `plaza` | 37.29 | -2.48 | 0 | 1 | 0 | Its fountain on the map's fountain, 2.4 south of it on the lane's axis. |
| `dorm_court` | 79.84 | -1.3 | 90 | 1 | 0 | The open entrance court on the west side of the dorm blocks; its camera looks east at Eric's block. |
| `dorms` | 85.49 | -1.79 | 90 | 1 | 1 | Eric's flat on 2F of his block, above the passage; its window faces the next block's west end, 1.2 out. The corridor runs to the stairs in the block's return. |
| `shotengai` | 64.5 | 20.15 | 270 | 1 | 0 | The middle of the arcade's east mouth, between the two shop rows; its camera looks west down the arcade. |
| `izakaya` | 68.6 | 17.9 | 0 | 1 | 0 | The existing izakaya ground floor, with its south-facing door on the shop walk. |
| `karaoke` | 62.25 | 22.4 | 180 | 1 | 0 | The karaoke box's glass door off the arcade (south row, bay 14), inside. An interior, looked into from the door's side over its cut-down front wall. |
| `karaoke_booth` | 59.4 | 24.6 | 180 | 1 | 1 | One booth upstairs over the front desk, its door from the corridor at the top of the stairs. An interior, looked into over its cut-down front wall. |
| `east_lane` | 69.27 | -2.75 | 0 | 1 | 0 | The middle of the pocket park's gravel square, where its two walks cross. Its camera turns: north-east over most of it, south-east over the south walk. |
| `east_coast` | 126.5 | 10.5 | 0 | 1 | 0 | The middle of the dorms' sea terrace, at the dorm row's east end. Its camera turns: east along the row, north-east up the coast, north at the onsen. |
| `dorm_commons` | 100.9 | 2.1 | 0 | 1 | 0 | The common room's glazed door in dorm_gallery's south face, inside. An interior, looked into from the south over its cut-down front wall. |
| `sports` | 58.2 | -57.5 | 0 | 1 | 0 | The corner where the pool walk meets the courts walk. Its camera turns: a little east of north over the lane and the pool walk, east-north-east at the pavilion, east along the courts walk. |
| `pool` | 58.2 | -57.5 | 0 | 1 | 0 | The sports ground's own frame and world, walked on the deck inside the pool's fence. Its camera looks a little east of north up the pool from the south-west. |
| `gym` | 47.05 | -50.9 | 0 | 1 | 0 | The gym's main doors, inside: the entrance lobby and the sports hall behind its glass wall. An interior, looked into from the south over its cut-down front wall. |
| `office_quarter` | 4.5 | -54 | 0 | 1 | 0 | The office street where the quarter street meets it. Its camera turns: north-north-west along the street, north up the walks, from the south-east in the quarter street's mouth, as the sports lane by the gym. |
| `harbour` | -100 | -88 | 0 | 1 | 0 | The corner of the quay where the ferry landing meets the supply yard. Its camera turns: the office street's look on the street and the harbour walk, a little west of north over the yard, the landing and the piers. |
| `works` | -82 | -104 | 0 | 1 | 0 | The middle of the works lane where it meets the works yard. Its camera turns: from the south-east up the lane, from a little east of south over the yard, from the south-east on the hall apron, from the south-west up the street and the research walk. |
| `train` | -28.6 | -3.9 | 270 | 1.18 | 1 | The car in the middle of the platform shed, heading north (the line comes in from the south), its platform side east toward the station and its walkway end south, toward the shed's stairs. |

The ground past the exits (#260, Jørgen 2026-10-05: "the outer grounds should be fully modelled"): walking toward a way out, the next place's ground is already there, built by that place's own code and kept to a band about 20 units deep past the exit (the table is game3d/js/scenes/bands-plan.js). Where nobody builds a patch, it is planted in the same style: belts of trees over layered planting, and the nearest plain blocks get ground floors and doors. Nothing in a band is walkable. By place:

- East coast: past the dorm row's west end, the dorm street's foot paved and kerbed with its lamps and beds, the ramen corner and r8's front; past the courts walk's west end, the courts walk on west with its hedges and the north residence's door; the field between the dorm cluster and the courts walk planted with belts of trees, and north of the courts; the north residence (a dorm entrance on its south face) and dorm_6 (its door on the coast walk side) built with ground floors.
- Shop street: past the east mouth, the dorm street on north with its lamps, beds and the south walk's east end, r8's front, and the dorm cluster's pines south of the row's garden; past the rows' west end and the promenade's west end, the garden south of the station as the coast's own planting lays it (beds, drifts, pines, the square with its benches), with the coast's south walk, the station walk and the link to the promenade paved.
- East lane: past the north street's top, the sports lane's corner, its verge and lamps, the pool walk's foot and the trees east of the north street; a belt of trees east of the north street's top; dorm_5 and the north residence built with ground floors.
- Sports ground: past the north street's foot, the north street on south to the top leg with its avenue, lamps and r9's front; past the courts walk's east end, the onsen path north and the east coast walk's leg east, with their woods; a belt of trees north of the pool's pavilion and the courts' hall; past the sports lane's west end, the office street's lawns south of it planted as the office quarter plants them; dorm_5 and the north residence built with ground floors.
- Office quarter: belts of trees on the lawns south of the street, between the bank, the print shop and m6.

## On the map

The game's map and the minimap (controls-and-ui.md, The map) show each outdoor place as a pin at an island point in the frame above; an interior has no pin of its own and is listed under the place its door is in. Names are the place names in the save list. The pins are data in game3d/js/travel/pins.js.

| Place | x | z | In |
|---|---|---|---|
| `train` | -28.6 | -3.9 | |
| `gate` | -14.45 | 6.5 | |
| `forecourt` | -6 | -1 | |
| `office` | | | `forecourt` |
| `plaza` | 37.29 | -2.75 | |
| `canteen` | | | `plaza` |
| `dorm_court` | 79.84 | -1.3 | |
| `dorms` | | | `dorm_court` |
| `shotengai` | 30.3 | 20.1 | |
| `izakaya` | | | `shotengai` |
| `karaoke` | | | `shotengai` |
| `karaoke_booth` | | | `karaoke` |
| `east_lane` | 67.5 | -6.5 | |
| `east_coast` | 126.5 | 10.5 | |
| `dorm_commons` | | | `east_coast` |
| `sports` | 58.2 | -57.5 | |
| `pool` | | | `sports` |
| `gym` | | | `sports` |
| `office_quarter` | 4.5 | -54 | |
| `harbour` | -85 | -75 | |
| `works` | -66 | -106 | |

## Monorail (`train`)

One car of the monorail, crossing the bay from the mainland to Honsha station. The camera looks at it from the platform side, with the near wall cut away for the play camera only. The car is about 8 long and 2.4 wide, with benches along both sides, full-height sliding doors at the near-side corners (they stay full height in the cutaway too, so they never change size while Eric walks out or the car pulls away; Jørgen: "the doors are still half size when trying to leave the train wagon, then magically transform to full height as the train leaves"; they finish shutting before the car moves) and closed neighbour cars (Jørgen, on the title shot: "the doors are hobbit sized, and the carriage behind looks like it is some sort of pavilion"). Sea on both sides out of the windows. The island comes in under it as it arrives, about eight seconds from the doors to the stop: the run in starts at speed a little out over the bay, so the sea wall and its armour rocks come in within the first second; the car eases off over the island while the line comes down toward the platform shed, and the lawn south of the station passes under it with its mown bands, planted drifts, pines and garden and the south walk; the brakes go on along the platforms; ahead, the beams end at buffers past the platforms' north end. All of it is the island layout's coast, paths and buildings round the shed (the forecourt's west edge). When it stops, the station sign and the platform are outside the doors; the covered walkway out is past the car's left end, toward the stairs at the shed's south end, and everyone who gets off walks that way. On a phone, while Eric and Mio stand on the platform watching the doors close on Hamada, the shot widens toward them so they stay in frame with the doors and Hamada. The train was built earlier (legacy/side/train/) and may be changed where needed.

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
| `window` | Window | Sea on both sides; gone once the island comes in. |
| `poster` | Poster | A katakana poster with a smiling cartoon monorail. |
| `plant` | Plant | Plastic, and someone waters it anyway. |
| `sign` | Station sign | Outside, once the train has stopped. |
| `platform` | Platform | Outside the doors. |
| `door_test` | Door test panel | Day 2: a portable door tester on the platform by the left-hand doors, a grey case on legs with a lamp on top and a small screen (`--`, `...` while testing, `OK`). Test: the `doorTest` hook. |
| `station_exit` | To the station | Day 2: the covered walkway at the platform's left end, back to the security room. |

### Spots

`aisle`, `door_l`, `door_r`, `by_aoi`, `by_kuroda`, `platform`, `walkway`, `plat_l`, `plat_l2`, `plat_hamada`

### Seats

`seat_aoi`, `seat_far_r` (the seat next to Mio), `seat_near_l`, `seat_near_r`, `seat_mio`

### Zones

`door_zone` (out on the platform in front of either door, while open, with Eric's body clear of the doorway), `free_seat` (standing at the seat beside Mio), `platform_exit` (day 2: the platform's left end at the walkway)

### Who's there when

Day 3: the car still stands out of service at the platform with the tester by its doors (`stationSetup`). On a morning visit while the door report waits for his signature, the guard stands on the platform beside the tester; the witnessed check, his taking the tester clear, the last close and his signature are `stationSignoff` (game3d/js/places/day3/signoff.js). Signed off, the doors stay shut and the tester is gone on every return.

Day 2: the car stands at the platform between runs, empty, its doors open (the `stationSetup` hook, every visit and Continue); the passengers, Tama, the bags and Mio's things are gone, and nothing arrives or departs. Eric comes in from the walkway. Mio waits on the platform beside the left-hand doors only while `!d2_ticket_done` and if `lunch_mio || mio_warm >= 2`, walking up the platform as he arrives; she walks off along the platform to B2 right after the report (`stationSetup` `state: depart`); otherwise she isn't here. The door test runs in one go (`doorTest`): the doors shut, the tester's lamp blinks amber three times while the sensor is tried, the doors open again and the lamp turns green with OK on its screen; the doors stay open. Saying 待って in the optional experiment freezes the doors part shut and a low motor hum runs against them until 動いて lets them open.

The monorail has one period, early morning.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Far bench, right, with her laptop and lunchbox on the seat beside her; nobody else sits on that half of the bench. | – |
| `aoi` | Far bench, left, on the phone. | – |
| `kuroda` | Far bench, far left, asleep. | – |
| `reader` | Near bench, right, seen from behind, reading. | – |
| `music` | Near bench, cap and headphones, nodding. | – |
| `bun` | Near bench, left, seen from behind. | – |
| `stander` | Hidden following the rejected silhouette. | – |
| `tama` | Far bench, washing. | – |
| `rei` | Hidden (her seat is Mio's now). | – |
| `guard` | Day 3 only: on the platform beside the tester on a morning visit before the sign-off; walks back along the platform after it. Label "Guard". | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `window` | Talk to the window | Eric: nobody said the island was this far out. |
| `poster`, `straps`, `rack`, `plant`, `seat_bags` | Talk to them | One line each (see Things). |
| `reader`, `ohayo_reader` | Talk to him, or greet him | The book is called "Excel for People Who Hate Excel"; he nods, still reading. |
| `phone_girl`, `ohayo_aoi` | Talk to Aoi, or greet her | She's on the phone about her assignment ("anywhere but the basement"); a nod. |
| `bun`, `music`, `stander` | Talk to them after the first time | A line or an emote each; the girl with headphones gets a ♪ and "Her music is too loud. She doesn't hear you." |
| `ohayo_bun`, `ohayo_music`, `ohayo_stander` | Greet them | Each answers in their own way. |

The man with a bag (`stander`) is hidden following the silhouette rejection, and has no talk or greeting trigger, so `stander` and `ohayo_stander` never play. The six scenery nodes above exist in the script but are disabled by the current marker rules; the passengers are reachable.

Aoi keeps her original encounter; Jørgen rejected its proposed replacement.

Planned passenger revisions, awaiting [train-discoveries-1](../../reviews/train-discoveries-1/review.json): let the woman with the bun enlist Eric to close an overfilled shopping bag; let the girl with headphones show her own guitar practice; let the reader show the mismatch between his Excel book and the company's old software; and show Hamada silencing a reminder without waking properly. Each moment starts with one interaction, including on first contact before the seat hint. They are optional, need no menu or quiz, and add no later quest. Proposed passenger speech has English subtitles for the player, including unfamiliar Japanese; Eric still follows familiar words and gestures. Mio's conversation and Tama's existing moments stay as they are. Exact proposed passages and their visual staging live only in the review. Their props and sounds are built (the woman with the bun's overfull shopping bag on the floor by her feet; a phone on the seat beside Hamada; the reader's printout; the pictures on them; hooks in game3d/story/FORMAT.md, Train); the story doesn't use them yet.

## Honsha station security room (`gate`)

Honsha station's security room, in the muted palette ([art-and-sound.md](art-and-sound.md)). About 12.6 wide and 9 deep, glass entrance doors at the front. A security barrier runs across the middle with two card readers either side of a scanner arch with two glass flaps and a small head-count screen. The guard's desk sits in the barrier line on the right; the unstaffed visitor counter with the visitor book and a lost-and-found shelf on the left; benches either side; posters on the back wall, beside the open exit to the forecourt, with a yellow 出口 EXIT sign over it. At the west end of the back wall, eight coin lockers stand below the notice display on its two supports. On the guard's side of the back wall, behind his desk, a closed staff door has a 階段 STAIRS plate over it. Between the lockers and the exit, a pair of ticket machines stands in a steel surround with the lit fare map over them. A yellow tactile guide line runs from the entrance through the gate to the exit, and a yellow ↑ 出口 EXIT arrow is painted on the floor past the gate. Office workers walk in, tap through and leave toward head office on their own (not tappable); their number follows the story (a jammed gate means a queue, waiting by the readers with their phones out). One of them carries a cake box.

The gate stays in this room, as Jørgen picked in [gate-location](../../reviews/gate-location/review.json). Its mechanism and layout stay as built. The former lift bank is now an open exit to the forecourt; the lift is inside the separate head office. The internal `lift`, `lift_front` and `to_lift` ids remain for saved-game compatibility.

### Things

| Id | Label | What it is |
|---|---|---|
| `reader_l` | Card reader | Left card reader. |
| `reader_r` | Card reader | Right card reader. |
| `gate` | Gate | The arch and its flaps. |
| `desk` | Guard desk | The guard's desk. |
| `guard_monitor` | Monitor | The guard's monitor on his desk, its screen toward him. Named for the station's ticket (issue #227); nothing uses it yet. |
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
| `platform_way` | To the platform | Day 2: the glass doors, out to the walkway and the platform. |
| `forecourt_way` | Station exit | Day 2: the open exit to the forecourt (the day-1 `lift` marker is off on day 2). |

### Spots

`entrance_in`, `bench_l`, `bench_r`, `before_gate`, `after_gate`, `lift_front`, `counter_front`, `desk_front`, `outside`, `gate_lockers` (in front of the coin lockers), `gate_staff_door` (in front of the staff door)

### Seats

`bench_r`, `bench_l`

### Zones

`arch` (walking into the closed gate), `past_gate`, `lift_front`, `platform_way` and `forecourt_way` (day 2: at the glass doors, and at the exit)

### Who's there when

Day 3: the guard at his desk in the morning and afternoon, on his break on the left bench at lunch, gone home in the evening; Tama at her bowl in the morning and back by it in the evening; Hamada, Aoi and Rei not here. His monitor turns to a visitor for ticket T-0003 (`monitorRepair`, game3d/js/places/day3/monitor.js): turned, its loose plug drops the picture; seated, it holds.

Day 2: the guard is at his desk and Tama by her bowl. The gate stands open, his card works and nobody is coming through (no commuters, no Hamada, no Aoi), so Eric walks between the platform and the forecourt without the card problem.

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
| `commuter_1` | Walks in, taps a reader and goes through. While the gate is jammed, waits in a queue; can be talked to only while standing there. Waits for Eric and the story's people to move rather than walk into them. | – |
| `commuter_2` | The same as `commuter_1`. | – |
| `commuter_3` | The same, carrying a cake box. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `ohayo_gate`, `gate_talk` | Greet or talk to the gate | Its recorded voice asks for a card. |
| `poster` | Talk to a poster | "PEOPLE. IDEAS. PROGRESS." |
| `noop` | – | An empty node for choices that do nothing. |

## Station forecourt and head office entrance (`forecourt`)

The first outdoor chunk of the picked island-map-4 layout (Jørgen, 2026-09-29), placed from the island layout (2026-09-30). Everything in it stands on the town's grid, square to the camera. The camera looks north inside head office, as in the security room. On phones it turns back to north at the lobby entrance and keeps that view at reception, clear of the west wall. On a phone it looks east-north-east from the station door instead, up the court to head office's door, canopy and lower floors, and turns to look north over the bike court before he reaches the door. Honsha station stands at the bottom left: a two-storey flat-roofed block over the security room's footprint, with a parapet, plant and condenser units on the roof and 本社駅 HONSHA STATION on a sign along its roof's south edge. Its north wall has the open exit under a small canopy and the staff door beside it; the east and west walls have the security room's tall windows, the south front its glass entrance; a row of windows runs round the upper storey. The side and south windows stand in pale surrounds (a hood, jambs and a sill), so they read as windows from the court. The rooftop plant is pale sheet metal: louvred boxes and a row of condenser units with dark fan grilles. Whenever the station stands between Eric and the camera (on desktop, just outside the north door), its upper storey, roof and north wall fade out, so he is never hidden, and the security room shows as a cut-away: the north wall cut low, the side walls cut low for their first stretch and then full storey height with the tall windows, the south wall full height with the glass entrance, pale caps on every cut top and the room's own colour on the walls' inner faces. Inside is the room as the security room has it: its floor with the dark stone bands, the gate line (glass runs on posts, two card readers with blue pads, the scanner arch with its blue light strips, glass flaps and head-count screen), the guard's desk with his monitor, phone, plant and chair and Tama's bowl, the visitor counter with the book and the lost-property shelf, the drinks machine and its bin, two benches, the welcome stand, the cleaning cart, the nine plants, the mat at the entrance, the same locker bank and raised notice display, the ticket machines with the fare map, the guide line and the exit arrow on the floor, a steel sill across the exit and warm light on the floor under the lamps, the ceiling lights, the windows and the exit. The ticket machines fade too while they would hide him. It stands whole again as he walks east. On a phone, looking east, it stays whole beside him, and the platform shed's roof fades instead. The platform shed runs north-south past the station's west side: a long curved blue-grey roof over an island platform on columns, with the monorail's two beams on piers either side. The west beam runs on out of its south end and curves away west-south-west on piers; the east one ends on a buffer. Stairs come down at the shed's south end to a covered walkway that runs east past the station and turns north to its glass front. The court is pale granite in large slabs, from the station's west face to the lobby's east wall and from the station's north face to the tower's south face, with kerbs wherever it meets grass. One designed walk crosses it from door to door, 2.4 wide: north out of the station door, east along the court's middle, north to the head office door (Eric steps out a few paces from the door, clear of its canopy). It is dark granite in running bond inside a pale soldier-course border, with the yellow tactile guide line down its middle and dotted warning pads at both doors and both turns. Along the court's north edge a raised bed with a low stone wall holds a clipped hedge, four zelkovas at an even pitch and shrubs between them, with two benches under the trees and the sorted bins in front. North of the court, between the tower and its lower wing, is the service yard, closed on the court's edge by a steel gate with a STAFF ONLY sign: two roll cages of boxes and a delivery bike by the wing, a step and two bollards at the tower's service door under its hood, and across the far end a roofed refuse store with mesh doors, its back wall running on to the tower's corner. West of the walk's start, two zelkovas in square tree pits with a bench between them, and where the walk turns east a way-finding sign on a post faces the station door: 本社 Head office → and 噴水広場 Plaza · Dorms →. Lamps with lantern heads stand on two staggered lines either side of the walk. A clipped pine in a square granite planter stands either side of the head office door, and the low name stone east of them. South of the court, east of the station, the bike court is paved in herringbone brick behind a hedge with one opening between bollards: two rows of racks with painted bays, bikes of different colours, most with baskets, one with a child seat, one fallen over into the aisle, and a bench on the station's east wall. East of it, a raised garden with a cherry, a maple, a ginkgo, shrubs and grasses, and layered planting along its wall and its far edge. The palette and the warm, low morning sun are the security room's. No roads or cars.

Head office stands north-east of the station across the court, where the island layout puts it (Jørgen, 2026-09-30, on the old one: "a standalone elevator with literally nothing over it"). It is the island's tallest building: twelve storeys of blue-grey curtain wall with floor bands and pale fins, a parapet and roof plant; on the ground floor a stone pier stands under every fin, and AMAKAWA in steel letters over the canopy, on the grid like the station and the court, whose paving runs up to its walls. The entrance is in the south face near the south-west corner, under a cantilevered canopy with 本社 HEAD OFFICE on its fascia; the low stone name sign stands beside it. The lobby is a double-height atrium over the west nine bays of the ground floor (Jørgen picked it on 2026-10-05, review lobby-plan-1): two storeys of glass between the piers of the south face (lit warm from inside after dark), a pale marble floor with its joints on the facade's bay lines, and pale stone walls. Straight ahead of the door stands the reception desk, black and sleek (Jørgen: "Desk should be black. and sleek."), with a black stone top and a thin steel line along its front, and Kuro behind it with her screen and label printer. Behind her rises the feature wall, pale stone the atrium's full height, with AMAKAWA in steel letters, 受付 RECEPTION under it and a light slot along its top. The desk is open at its east end, so Eric can walk round it to the door in the feature wall's east end, which opens into the receptionist's office. The court's dark granite walk carries on inside from a recessed mat at the door to the desk, with the yellow guide line from the door to the visitor spot in front of the desk. At the first bay line a cross walk turns east off it, then north up the middle of the lifts to a granite apron in front of them. On the back wall east of the feature wall are the stair door (階段 STAIRS) and a bank of four lifts with brushed steel doors in steel frames and a plate over each. The B2 car is the west one, nearest the desk (B2 - 5F, a floor display over its doors); the other three (1F - 5F, 6F - 10F, 6F - 10F) stay closed. The lift ride is filmed straight on. The floor directory (only "5F Sales" and "B2 IT Support" can be read) is on a slate pylon beside the walk to the lifts. South of the cross walk are two seating islands, each a round stone planter with a small tree in a square of low slate-blue benches. West of the door is a model of the island on a stone plinth under a steel vitrine. A bench runs along the east wall by the apron, the umbrella stand is inside the door, and there are plants in the corners and at the desk's west end. Every sign in the lobby uses one plate style. There is no second security gate. While Eric is in the lobby, the office or the lift, the atrium's glass front, the canopy and the five storeys over the atrium fade out; the rest of the tower stands, so the lobby shows as a room cut into the foot of the tower, and the cut's faces are glazed like an inner facade with a pale slab edge at every floor. Everything comes back as he walks out of the door.

The receptionist's office is a small room behind the feature wall (Jørgen, 2026-10-05: "there should be a door on the right side to a receptioner's office, that the player could in theory visit, so the reception desk is not completely closed off"). It is one storey high, through the open door at the wall's east end. Inside are a slate carpet, a desk against the back wall with a screen, keyboard, papers and a phone, a chair pulled up to it, shelves of binders and boxes along the west wall, a coat hook by the door with a long navy coat and an umbrella on it, a low cabinet with a kettle, two mugs and a tea tin, a plant and a wall clock. While Eric is inside, the feature wall fades so the room shows from above, like every cut room. The service room west of it, behind the same wall, stays closed.

The lane to the fountain plaza leaves the court's north-east corner and runs east along the tower's south face, 3 wide (4.5 m), in grey brick in running bond between pale borders. A pale border closes the lane's brick where it leaves the court. On its south side a planted verge: a bed of ground cover with a low hedge along the lane's kerb, opened for two bench bays (the sorted bins beside the first), lantern lamps at every other gap, and behind the hedge the avenue's own kerbed bed, zelkovas every 4 far enough back that they never hide Eric, underplanted with ground cover and a pair of clipped azaleas between each two trees; once the tower ends a planted strip with the same trees at the same pitch runs along the north side too. A finger sign points on to the Fountain Plaza and the Dorms, and a pair of stone gateposts with lanterns and a band of pale stone across the lane mark where head office's grounds end; the lane and its trees run on out of view past them. The avenue's bed is planted in layers (low domes in front, mixed clusters and grasses, big clipped mounds at the back), and its back edge steps in and out from tree to tree, so the lawn meets it along planting, not a kerb. Either side, inside head office's grounds, a garden: drifts of layered planting of different depths on the lawn, a few specimen trees standing free (a big cherry south of the lane, a black pine north of it), maples and a ginkgo in the drifts, rocks set in threes, a clipped pine at the east end in line with the gateposts, and a clipped hedge that steps in and out behind. Between the first two avenue trees a gap in the lane's hedge opens onto stepping stones that lead into the south garden to a raked gravel court with a bench looking into the garden and a stone lantern that lights up after dark; he can walk the stones and the court. Behind both gardens a looser belt of taller trees (zelkova, ginkgo, cherry) closes the view and runs on past the gateposts toward the plaza. Eric walks out of the station, crosses the court under player control, and walks into the lift. He can also walk east along the lane to the fountain plaza and back at any time before the lift. Beyond the court's north bed, head office's grounds go on as backdrop that day 1 never sends him into. At the court's north-west corner a street leaves it north, up the platform shed's east side: 3 wide, in the lane's brick between pale borders, with a verge and zelkovas on both sides and post lamps. A few steps in, three bollards with yellow-and-black chains between them close it; he can walk up to them. East of that street stands head office's lower wing, five storeys: square piers and glass on the ground floor under a dark fascia, ribbon windows between pale floor bands above. Lawn and a clipped hedge lie between it and the court's bed. Its staff door, under a canopy on two posts, is in its west face at the end of a short path from the street; a service door under a hood opens into the service yard, and the tower's wall across the yard has three windows and a vent. Behind the wing a roofed rack of staff bikes has its own path from the street. Behind the wing and the tower a cross street turns east off the shed street at a square of pale granite and ends at the door of office_e1, a four-storey block built the same way. It has zelkovas and lamps on its north side, and on its south side the tower's back pavement with ginkgos in tree pits, the refuse store's collection doors and the tower's rear door. After work the wing's ground floor, some of its windows and the yard windows are lit. Further out the island layout's buildings (the offices north, the canteen) stand on the island's ground and sea. East of the atrium the ground floor is the back office, with desks and cabinets behind windows in the ground floor's south and east walls.

West of the platform shed, backdrop the court never sees (the island map and the train's arrival do): the sea wall follows a coastline that bends like a shore, a shallow bay north, a point at the lookout, a rounded corner where the coast turns east, then a long curve that comes in along the beach's line and turns up the beach's west side to the promenade's wall, so the lawn ends on that curve and the sand fills it. The wall has a pale coping, a pier at the ends and at a bend every few runs, and two rows of armour rocks of mixed sizes at its foot, foam where the outer rocks meet the water; behind the coping a planted strip, left off where a terrace comes up to the wall. One coast walk on the grid, kerbed, makes a loop with no dead end: from the shed street's north end west along the shed's north end, south past the shed, through a lookout terrace on the point (slabs, a rail and two benches facing the sea), on south to a corner terrace over the rocks where the monorail comes in off the bay (slabs, rails on its two sea sides, benches looking south-west at the line), then east as the south walk under the line to a square of slabs on the station's axis with two benches, where a walk comes down from the station's covered walkway between planted beds and goes on south to the promenade. Halfway along the walk past the shed a paved bay with two benches looks out over the wall. Planting: black pines in threes all along the wall a few steps inland, a pine either side of each terrace, low beds along the walk's sea side, longer grass between the walk and the wall with a mown margin either side of the walk and drifts where it widens; the lawn between the walk and the shed mown in bands along it, a clipped band at the shed's foot and low shrubs in pairs; south of the shed the lawn under the line mown in bands along it, with drifts of layered planting either side of the line and either side of the walk, clipped pines among them, and drifts by the walk west of the line and in the wedge toward the wall. South of the station, the garden on its axis: either side of the station walk a lawn panel mown across in bands with a cherry, a drift along the covered walkway, a row of zelkovas between the garden and the line, and a drift and zelkovas south of the walk.

At the end of the B2 conversation the camera releases its close-up before Mio leaves, so Eric can see and reach the lift. After work he comes up in the same lift and walks home east along the lane. The forecourt and the plaza then take the dorm courtyard's dusk light, and the head-office door and lift have no marker. After work Tama (`tama`, not a tap target here) is asleep at the east end of the garden bench, with room for Eric at the west end; she can walk along the seat, settle on his lap and hop back to her end. The fallen bike and its neighbour in the west rack can be stood up, wheeled into their places and tip over; where they stand or lie stays for the evening. A small station-wall light illuminates the rack after work, and the phone camera looks north in the bike court so the station wall does not hide it.

The bicycle aisle continues south on a 2.5 m paved path into the shopping street’s west passage (#290). The south kerb is open across the path, and the camera follows to the entrance.

### Things

| Id | Label | What it is |
|---|---|---|
| `station_exit` | Station | The station's island-side doorway, behind Eric as he enters the court. |
| `office_entrance` | Head office | The head office's entrance under its canopy. Using it walks Eric in through the doors to the lift, which starts the ride. |
| `lift` | Lift to B2 | The B2 car in the lobby's lift core. |
| `label_printer` | Label printer | Kuro's label printer on the reception desk, west of her screen: a squat grey case, a strip of white label out of its slot. Named for the reception's ticket (issue #227); nothing uses it yet. |
| `shop_lane` | To the shopping street | South through the bicycle aisle, into the west passage. |
| `plaza_lane` | To the plaza | The east end of the lane along the tower's south face. |
| `garden_bench` | Garden bench | The bench on the gravel court in the south garden, Tama asleep at one end. After work only. |
| `fallen_bicycle` | Bicycle | Whichever bike in the bike court's west row is lying in the aisle. After work only, while one is down. |

### Spots

`station_exit`, `office_entrance`, `lift_front`, `plaza_lane`, `shop_lane`, `reception_office_door` (in front of the receptionist's office door, behind the desk's open end), `reception_office` (inside the office), and the nooks below: `forecourt_staff_gate`, `lobby_model`, `lobby_island_w`, `lobby_island_e`, `lobby_lift_bench`, `lobby_umbrella`

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `forecourt_staff_gate` | The recess in front of the staff gate, between the court's north bed and head office's corner. | A bike leaning on the bed's end; a potted shrub and an umbrella stand by the corner. | An encounter: someone slipping out of the staff gate. Or a dropped staff card. |
| `lobby_model` | In the lobby west of the door, in front of the island model. | The island in greens and sand on a blue sea, its towers and the monorail's line, under a steel vitrine on a stone plinth. | Someone pointing out where they live. A pin left on the model. |
| `lobby_island_w` | East of the west seating island, south of the cross walk. | A small tree in a round stone planter, four low slate-blue benches round it. | Someone waiting for a visitor. A forgotten lanyard on a bench. |
| `lobby_island_e` | West of the east seating island, south of the cross walk. | The same island, nearer the lifts. | A quick meeting before the lifts. |
| `lobby_lift_bench` | Beside the bench along the east wall, by the lift apron. | A stone bench with a slate cushion, a plant at its south end. | Someone sitting out a long wait for the lift. |
| `lobby_umbrella` | Just inside the door, east of the walk. | The umbrella stand with three umbrellas. | A borrowed umbrella on a rainy evening. |

### Seats

`garden_bench` (its west end, facing south into the garden)

### Zones

`lift_front`, `station_exit` (day 2: at the station's door, back into the security room), `plaza_lane` (the lane's east end along the tower's south face: walking into it starts the walk to the plaza), `shop_exit` (south end of the bicycle aisle), `reception_office` (inside the receptionist's office; nothing starts there yet)

### Who's there when

Day 4: Hamada returns from the mainland in the morning with shopping bags. Kuro and Tama are offstage.

Day 3: Kuro and Tama are not here on Saturday.

Day 2: no day-1 Kuro encounter replays. The station door, head office's door and the lane stay open in both periods. A way out he arrives standing in (the lift, back up from B2) waits until he has stepped out of it.

Kuro works the head office reception all day. The two from Sales appear inside the lift during the ride.

| Id | Usually | Schedule |
|---|---|---|
| `kuro` | Behind the reception desk in the head office lobby, facing the door. Eric approaches the visitor spot in front of the desk to talk to her. | – |
| `kuroda` | Beside the station entrance on Sunday morning, returning from the mainland. | – |
| `mio` | Hidden (she ran ahead to a server). | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 17 | 0 | 1 | 0 | 15% | 20% | Most cross the court to the head office door: in off the plaza lane, up from the bike court, off the monorail. Some go the other way or across: back out toward the plaza and the konbini, to the monorail, between the bikes and the plaza. |
| morning | 6 | 0 | 0 | 0 | 30% | 20% | A few people every way between the head office door, the plaza lane, the bike court and the monorail. |
| lunch | 14 | 0 | 2 | 0 | 30% | 35% | Out of head office toward the plaza and the canteen and back, some to and from the bikes and the monorail; many in twos. |
| afternoon | 6 | 0 | 0 | 0 | 30% | 20% | A few people between the head office door, the plaza lane, the monorail and the bike court. |
| evening | 17 | 0 | 2 | 0 | 20% | 30% | Out of head office: most east toward the plaza and the dorms, some to their bikes or the monorail. Some come the other way, and some cross between the plaza, the bikes and the monorail. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `to_shotengai` | Walk south out of the bike court or use its travel marker | Walk into the shopping street’s west passage. |
| `garden_bench`, `fallen_bicycle` | Optional interactions after work | [The walk home](stories/evening-walk.md) records these discoveries. |
| `outside` | Arrive from the station, or up from B2 after work | The goal points to the head-office lift; after work, east along the lane to the dorms. |
| `head_office` | Use the head-office entrance | Eric walks in to the lift; the goal points to the B2 lift. |
| `to_b2` | Reach or use the lift | Eric boards the existing watched lift ride. |
| `to_plaza` | Reach or use the east lane | Eric walks on to the fountain plaza. |
| `kuro_intro`, `kuro`, `ohayo_kuro`, `yoroshiku_kuro` | Talk to Kuro, or greet her | The first morning Talk or ohayo asks Eric's floor in English and lightly invites him to greet her again tomorrow, then she points toward the lift. `kuro_reception_seen` saves that exchange as finished; repeats and Continue keep the short welcome. No task, bond point or word lesson. After work, お疲れさまです and a bow; よろしく gets a polite reply at either time. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `pigeons` | pigeon | 6 | `day` | On the forecourt's paving and the lane to the head office. |
| `sparrows` | sparrow | 4 | `day` | Round the benches and the hedges by the garden court. |
| `crows` | crow | 2 | `all` | On the station's and the office blocks' roofs, the trees and the walls. |
| `butterflies` | butterfly | 2 | `day` | Over the garden court and the planting. |

## Fountain plaza (`plaza`)

The second outdoor chunk of island-map-4, east of the forecourt, built at the map's scale from the island layout (2026-09-30) with the forecourt's outdoor kit, palette and light (rebuilt the same day). The camera looks north and follows Eric. The round plaza is about 23 across (35 m), paved in rings of stone: a warm apron round the fountain, a dark band, pale granite, a dark ring line, a greyer outer field and a dark border ring. Two axes cross at the fountain: the lane east-west, the canteen's door north-south (paths laid out 2026-09-30 after Jørgen's "the entering and exiting paths are not aligned, you got that funky extra path around it for some reason, and the fountain plaza extends onto the restaurant(?)'s tiles"). The fountain: a wide open stone basin about 8.6 across with a blue-grey floor under clear water, coins scattered over the floor near the rim, and a two-tier centrepiece with a small jet on top whose bowls spill in thin curtains. The water moves: glints drift over it, the curtains fall and rings of ripples spread from where they land. A bilingual sign set into the rim's outer face, a little east of the front, reads コインを入れないで PLEASE DON'T THROW COINS. Six pigeons by the south-west rim peck, bob their heads as they walk about, turn and make small hops; when Eric comes within about two steps they all flutter up and fly off out of view, and a while after he has moved away they glide back in and land where they were. The lane from head office, grey brick between pale borders like the forecourt's lane, runs straight in from the west on the fountain's axis and meets the circle square on; it leaves the circle on the same axis on the east side and runs on east toward the dorms. The lane's ends run in under the circle's dark border ring, which crosses each mouth as a threshold. Along both sides of both lanes a planted verge: a kerbed bed of ground cover with a low hedge, and behind it on the grass a zelkova avenue every 4 (set back so nothing hides Eric on the lane); post lamps on each lane's south edge at every other gap between the trees. All round the plaza a kerbed ring bed with a clipped hedge at its back and a ring of cherries every 22.5°, open only for the two lanes and the canteen link, with two maples flanking the link and drifts of cosmos and grasses along the south arc. The furniture is symmetric about both axes: a pair of benches in each quarter just inside the border ring faces the fountain, a tree behind each bench and a lamp between them, the sorted bins beside the north-west and south-west pairs, a bike parked by the north-east pair and a dropped photo by the north-west one (a find, [systems.md](systems.md), Finds). On the canteen's axis at the south of the circle, where the ring has low shrubs instead of a tree, a notice board with a small hood and notices pinned on both faces faces the fountain. Reading it holds its posts up close as papers pinned on the board. Short English notes and replies sit under Japanese headings with readings; the neighbours' messages are written in game3d/story/finds.js. A pair of lamps stands in the ring bed either side of each opening and either side of the notice board. Eight lights are set flush in the dark band round the basin. North of the plaza stands the canteen: two storeys, a glazed ground floor with the doors on the fountain's axis under a canopy sign (しょくどう CANTEEN) and teal-and-white striped awnings over the other bays, a blue-grey roof with a parapet and plant. In front of it the terrace, in large pale slabs, with five tables under teal and pale umbrellas; a seat-height wall runs along its whole south side, open only on the door's axis, where a short link in the lanes' brick and borders crosses a strip of lawn and the ring bed to the circle; raised beds with a pine close its ends. South of the plaza a lawn with two small groups of trees, then a footpath and a rack of bikes along the backs of the shop street (described under the shop street below). On the lawns round the plaza, four connected beds of low ground cover, mixed shrubs and grasses follow the outer ring and the lane arms, turning toward the footpath behind the shops at the south. Groups of mixed trees stand within them; a strip of lawn separates the beds from the paving, buildings and lane verges. The town beyond comes from the island layout, every building on the same grid. After work the lamps come on with pools of light on the lanes and the plaza's edge, the flush lights round the basin light the middle of the circle, the basin floor glows faintly from under the water so the coins keep their shine, and the canteen, the shops and the town's windows are lit. The terrace is closing: the chairs stand upside down on the tables, except at the table nearest the link, where one still stands at its south side and a canteen worker (`canteen_worker`, unnamed, in a white top and the canteen's teal apron) carries its neighbour over, then wipes down the next table east. Chairs Eric and the worker stack stay stacked for the evening. The tables and the chairs standing round them block only their own floor, so Eric can walk right up to the last chair. East lane (backdrop, 2026-10-01): the lane does not end at the plaza's east mouth. It runs on east to a jog, turns north at a square of herringbone brick, runs east along the top and turns south again as the dorm street, which passes the dorm courtyard's gate; each turn is a square as wide as the lane, closed by a pale border on its outer sides, and kerbs edge the paving wherever it meets grass. Eric can walk the lane on east past the cross walk, up the cross walk to block_e1's door (#162), and down it to the south walk, where a finger sign on the lawn points east along it: Shop street 商店街 →. Walking on along the south walk takes him to the shop street; walking on east along the lane, before work is over, takes him into the east lane (below), where the rest of this ground is walked. Inside the jog is a pocket park: a kerbed lawn with a clipped hedge round it, opened for two walks of pale slabs that cross at a square of loose pale gravel with one big zelkova, four benches facing it, two lamps, and a cherry or a clipped pine in each lawn quarter. A third street, in the lane's brick, leaves the top leg north between block_e1 and block_e3 on the park's north-south axis, with zelkovas every 4 down its west side and lamps on its east. A walk crosses the lane between two avenue trees from block_e1's door to m_e2's; beside it a paved bay holds a bench looking down the walk, and block_e1 has a rack of five bikes on a paved pad along its front. A south walk runs along the fronts of m_e1 and r8, and the shop street's walk comes out of the arcade's east mouth past the izakaya's door to the dorm street, which ends at a bed. East of the dorm street the plaza shows the dorm courtyard plainly (its paving, the walled and planted front bed open at the gate, the garden's trees, the drinks machines, bench, lamps, bike shelter and garbage cage, one low roof for the laundry, hall and sento, and Eric's block with balconies) and the dorm cluster beyond, described under the dorm courtyard. Eight small blocks stand along it, backdrop only, each a plinth, floor bands, windows on every face and a flat roof with a parapet and plant (the two shops under tiled roofs), with its ground floor saying what it is and a light over its door: block_e1 (two storeys) and block_e3 (three) have a glazed entrance under a canopy; block_e1 is the company's new-staff training centre, its sign standing on the canopy (けんしゅう NEW STAFF TRAINING, in the canteen's style), and its door is locked on day 1; m_e1 (two) a glazed café front between piers with an awning over each bay but the door's; m_e2 (one), the izakaya and the ramen shop a shopfront and a door hung with an indigo noren; r8 (two), the barber, a shopfront and a glass door without one; r9 (two) a plain door and a small window. The named shops (the café, the liquor and rice shop, the barber, and Amakawa Travel on the back lane) carry their signs, described under the east lane below. Short walks lead from the street to the doors of block_e3, r9 and the ramen shop. After work the glass of the blocks lights up, and the lamps along the streets and the park's two corner lamps come on with pools of light. The sun's shadow reaches only the blocks nearest the plaza. No cars.

Behind the canteen, as backdrop that day 1 never sends him into and that shows on the island map: a back lane runs east along the canteen's back, 3 wide in the lanes' brick, from the canteen's loading yard to the north street past block_e1, which it meets square on through that street's verge. The yard lies against the canteen's west face, paved in grey slabs, kerbed and hedged on its lawn sides with a cherry at the corner: a roller shutter in the wall under a floodlight on an arm, a yellow loading box painted in front of it, cages of crates waiting for a delivery, empty crates and a pallet stack, a platform cart, and a slatted bin store with two wheeled bins and the sorted bins. A walk leaves the yard north to the door of m6, a five-storey office block. Along the canteen's back runs a paved apron: the kitchen door under a hood with a lamp and a cart by it, high kitchen windows, an extract duct that climbs the wall and runs over the roof to its cowl, two condensers and a drain along the lane. The lane's north side has a verge with a zelkova avenue, post lamps every 8 on the lane's edge and manhole covers down its middle; the verge opens for three walks. The clinic (クリニック), three storeys in a pale tile with a framed window to each bay over a pale sill and a glass front below, frosted to the waist, stands back from the lane behind a small pale entrance court. A glazed stair rises over the door past the parapet to its green cross in a white box, クリニック down its glass; the door is under a deep canopy with クリニック CLINIC on its front, up two steps from a raised landing with a ramp down its east end, handrails both sides, and a yellow tactile line runs from the lane to the steps. By the door a bench against the glass, a planter along the court's west edge, the hours (診療時間) and its departments (内科・小児科) on the glass, and a sign stone at the lane with the cross and the name; east of the court a bike bay in herringbone brick with three bikes at a rack and a bed of shrubs along its far side. On the roof a stair house, a water tank, a row of condensers and a green cross for the map. block_e2, four storeys of offices, has its door on a short walk from the lane. Between them a walk leads off the lane between two kerbed beds of trees and shrubs to a gravel square with a zelkova in a round stone planter, a bench either side and a lamp, with a row of trees on the lawn behind. West of the canteen stands office_e1, the block the forecourt's cross street ends at, built the same in both places, and on the north street's far side r3 has its door on a short walk from the street. Out here and along the east lane, beyond the sun's shadow, the shadows of trees and blocks are laid flat on the ground and turn with the sun after work. After work the lamps, the clinic's canopy, ground floor, stair, names and cross, some upper windows and the canteen's kitchen windows are lit.

In the morning the plaza is a side trip with no story beat: the goal points back to the head-office lift, and the east end of the lane goes on into the east lane. After work it is on the walk home, and the east end of the lane goes on to the dorm courtyard.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_lane` | To head office | The lane west of the plaza, back to the forecourt. |
| `fountain` | Fountain | The fountain in the middle of the plaza. |
| `dorm_lane` | To the dorms | The lane east of the plaza, toward the dorms (before work is over, into the east lane). |
| `training_door` | Training centre | block_e1's door at the head of the cross walk. Go in: it is locked. |
| `canteen_door` | Canteen | The actual glazed front door on the fountain axis. Opens the ground-floor dining room on days 1–5. |
| `canteen_table` | Canteen table | The terrace table nearest the link, with the last chair standing. After work only. |
| `noticeboard` | Notice board | The notice board at the south of the circle. Read: its posts up close; from day 3 the club posters first, each with a slip to take ([systems.md](systems.md#notice-board)). |
| `shop_walk` | To the shop street | The south walk east of the cross walk's foot, by the finger sign. |
| `board_map` | Map | From day 3: the island map on its own post beside the notice board, a handwritten ここ sticker by its arrow. Look: the map close up, and the word koko to try. |

### Spots

`office_entry`, `fountain_edge`, `dorm_exit`, `shop_walk` (on the south walk by the finger sign), `plaza_seat_bay`, `plaza_shrine` (the nooks, below)

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `plaza_seat_bay` | The paved bay off the cross walk, east of it, in front of the training centre's bed. | The bay's bench looking down the cross walk; a potted shrub at its east end. Now walkable. | An encounter: someone on a break from the training centre. |
| `plaza_shrine` | On the lawn west of the cross walk, under the ginkgo by the bike pad, reached off the cross walk. | A small hokora on a stone plinth behind a red torii, two stone lanterns, an offering box, raked gravel. | A secret or a collectible: an offering, an omamori, a note left at the shrine. |

### Seats

None.

### Zones

`office_lane` (the lane west of the circle), `dorm_exit` (the lane east of the cross walk), `shop_walk` (the south walk past the finger sign)

### Who's there when

Day 3: Aoi at the notice board in the morning until she has introduced herself (`boardVisit`: she takes a tennis slip, then walks off toward the shop street); Tama asleep in the seat bay's shade at lunch. The island map stands on its own post beside the board from day 3.

Day 2 (to build): No day-1 lunch workers or lunch event repeat. The established ambient crowd may remain; the plaza connects the job route and optional walks.

None of the cast lives here yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Hidden (she ran ahead to a server). | – |
| `canteen_worker` | After work only: carries the last chair over, then wipes down the next table east. Can be talked to whenever not walking; helping with the chair is the canteen table's. | – |
| `aoi` | Day 3, morning: at the notice board until her introduction (`d3_aoi_intro`). Label "Woman from the train", then "Aoi". | – |
| `tama` | Day 3, lunch: asleep in the seat bay's shade. Can be petted. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 14 | 2 | 1 | 0 | 20% | 20% | Most walk in from the dorms and the shop street toward head office. Others go the other way or across: to the shop street, back toward the dorms, in and out of the canteen. Two on the benches, a pair talking. |
| morning | 6 | 2 | 0 | 0 | 35% | 20% | A few crossing every way; two on the benches. |
| lunch | 17 | 4 | 2 | 0 | 30% | 35% | Out of head office into the canteen and the shop street, and back, some to and from the dorms; the benches fill up. |
| afternoon | 7 | 2 | 1 | 0 | 35% | 20% | A few crossing every way; two on the benches, a pair talking. |
| evening | 17 | 3 | 2 | 0 | 25% | 30% | Most walk home east toward the dorms and down to the shop street; some come the other way or go between the shops, the dorms and the canteen. Three on the benches, two pairs talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `canteen_table` | Optional terrace interaction after work | [The walk home](stories/evening-walk.md) records the encounter. |
| `to_canteen` | Use the front canteen door | Walk into the ground-floor dining room. |
| `arrive` | Arrive from the forecourt | The goal points back west to the head-office lift; after work, east to the dorms. |
| `training_locked` | Go in at the training centre's door, morning or after work | The door is locked; a notice on the glass says the next new-staff training starts in April. |
| `fountain` | Talk to the fountain | A sign on the rim asks people not to throw coins; the bottom is covered in coins. |
| `to_dorms` | Use or walk into the lane's east end, after work | Eric walks on to the dorm courtyard. |
| `to_east_lane` | Use or walk into the lane's east end, before work is over | Eric walks on into the east lane. |
| `to_forecourt` | Use or walk into the lane's west end | Eric walks back to the forecourt. |
| `to_shops` | Use or walk into the south walk past the finger sign | Eric walks on to the shop street. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `pigeons` | pigeon | 8 | `day` | On the paving round the fountain. |
| `sparrows` | sparrow | 4 | `day` | Round the benches and in the hedges. |
| `crows` | crow | 2 | `all` | On the fountain's top, the roofs and the trees. |
| `butterflies` | butterfly | 3 | `day` | Over the lawns. |
| `dragonflies` | dragonfly | 3 | `day` | Over the lawns. |
| `cat` | cat | 1 | `evening` | A grey tabby on a wall or a bench. Can be petted. |

## Shop street and seafront (`shotengai`)

The first district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1, 2026-10-02; its places are in [island.md](island.md), "Shop street and seafront"). The chunk is turned so its camera looks west, down the arcade from its east mouth, a little lower than the plaza's; over the alleys and down the rows' west end it steepens so the rows don't hide Eric. Eric comes in from the plaza along the dorm street, turning into the shop walk past the izakaya's door (Getting between places).

The shop rows are runs of small two-storey buildings of one to three bays, each its own height and wall colour; one is three storeys. Their storeys are as tall as the town's offices'. Each bay's ground floor is a shopfront with an awning in one of three muted colours over it, or a grey shutter down (a named shop's door bay has no awning, so its door shows); upper floors have a pair of windows a bay. Their roofs differ: flat behind a coped parapet with condensers, a stair hut and a water tank, or with rows of solar panels, or with a louvred plant screen; roof gardens with planters and a slatted deck, or with square raised beds on gravel; and pitched roofs of grey tiles. The arcade between the rows is a shallow barrel of glass on steel ribs, on thin dark posts one a bay along both fronts; it fades out while Eric walks under it, so the street is seen open from above, and shows again when he is out on the promenade. The arcade's floor is pale slabs with a band of darker stone laid across down the middle and a dark course on every bay line. On every other post, staggered side to side, a lantern on a short arm; on the posts between, a cloth banner hung across the street's line (slate blue, muted red, green or lilac, with a pale band at its head).

The shops with a name have a sign board over their bays on the front, the kana large and the English small, and a projecting sign over the arcade at their door, its kana stacked top to bottom so it reads up and down the street: the bike shop (じてんしゃ BICYCLES, north row, bay 2) with three bikes in a rack by its door; the island's combined konbini, 100-yen shop and drugstore (コンビニ KONBINI · 100 YEN · DRUGSTORE, bay 7) with the sorted bins; the bakery (パン BAKERY, bay 10) with an A-board; the game centre (ゲームセンター GAME CENTRE, bays 12 and 13, its projecting sign ゲーム) with three crane games along its second bay; and the karaoke box (カラオケ KARAOKE, south row, bays 13 and 14) with an A-board. Each has a pair of glass doors in its door bay, shut, with a white card on the glass: 準備中 CLOSED (after work on day 2: 本日休業 CLOSED TODAY). The izakaya, three storeys at the shop walk with an indigo noren over its door (after work on day 2 a small card tucked into it says 本日貸切 RESERVED THIS EVENING, and its door's card is down), and the ramen shop across the dorm street are built as from the plaza. Their shopfronts never have a shutter down. Low planters with a shrub stand at the piers of the plain shopfronts every other bay, and a bench faces the shops on the north side at each alley's mouth.

Three alleys, one bay wide and five bays apart, cut through the south row between planted beds, from the arcade to the promenade. A walk runs down the rows' west end past the arcade's west mouth to the promenade (its north half, on to the footpath behind the rows, isn't walked); at the east end a walk turns down from the shop walk past a planted bed with a zelkova to the promenade. The promenade runs behind the south row in pale slabs, with a dark course on every bay line and a darker band along the sea wall where lamps, back-to-back benches and bins stand, from the foot of the walk south of the station (not walked) to a lookout with a rail over the rocks. On each alley's axis a band of darker stone crosses it to a flight of stairs down the wall to a sand beach; each flight's head is chained off between two posts, so the beach is seen and not walked: shrubs and rocks at the wall's foot, three beach huts by its west return, a few striped umbrellas, boulders in groups at the water's edge, wet sand and foam along the shore. East of the beach the wall stands in the sea on armour rocks, as west of the station, with three black pines behind it. The plaza and the forecourt draw the same street, from its backs, as backdrop and on the island map.

In the morning the sun comes from the east-south-east behind the camera's left shoulder; after work it is low in the west, ahead down the street, and the shopfronts' glass, the signs, the lanterns with pools of light under them, the promenade's lamps and the izakaya's door light are lit. The karaoke door opens onto its front desk (`karaoke`, below; shut on day 2), and the izakaya door opens for the department's day-2 welcome dinner. Other shops stay shut. It also loads directly with `?place=shotengai`, at the shop walk. Nobody is here yet.

### Day-2 party plan

The welcome dinner is inside the izakaya, reached through its existing door off the shop walk. Kenji waits beside that door until the protagonist meets him. The promenade remains ordinary public seating; it has no dinner or party marker. Inside, the protagonist, Mori, Mio, Kenji and Emi occupy five actual chairs around one table, facing inward. Each setting has rice, a plate and a cup; shared platters hold yakitori and grilled vegetables, with pickles. The player walks from the entry to the chair before sitting. Dining actions use real wrist reaches. Mio and Kenji leave through the entrance at the goodbye; Mori and Emi stay at the table for the closing conversation. Saves keep the seated player, department positions and food progress.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_lane` | To head office | North along the west passage into the bicycle court. |
| `plaza_lane` | To the plaza | The shop walk's east end at the dorm street. |
| `bike_shop` | Bike shop | The bike shop's door. Go in: shut. |
| `store` | Konbini | The konbini's door. Go in: shut. |
| `bakery` | Bakery | The bakery's door. Go in: shut. |
| `game_centre` | Game centre | The game centre's door. Go in: shut. |
| `karaoke` | Karaoke | The karaoke box's door. Go in: into its front desk (`karaoke`). |
| `izakaya` | Izakaya | The door on the shop walk. On day 2 after the shift, enter the real dining room. |
| `mori` | Mr. Mori | Day 2, after work. |
| `kenji` | Kenji | Day 2, after work. |
| `party_seat` | Bench | Day 2: Eric's end of the party bench (the story labels it "Join the others" until he has eaten). Sit. |

### Spots

`office_lane` (north entrance from the bicycle court), `plaza_entry` (on the shop walk, the arcade ahead); `party_group` (the middle of the party bench), `party_mio` and `party_kenji` (standing at its near and far ends); and each nook below

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `shotengai_shrine` | On the lawn past the arcade's west mouth, off the walk down the rows' west end, with the pines behind it. | A hokora on its plinth behind a red torii, two stone lanterns, an offering box, raked gravel. | A secret: something left at the shrine, or a shrine visit at night. |
| `shotengai_back_alley` | The middle alley through the south row, along its west wall. | The shops' back: an air conditioner's outdoor unit, stacked crates of empties, a bucket, a potted shrub, a bike parked along the wall. | An encounter: a shop worker on a break. Or a cat. |
| `shotengai_pine_bench` | Through a gap in the east rail of the promenade's lookout, on the lawn under the pines. | A bench looking out to sea past the pines, a stone lantern, a paved pad. | An encounter at sunset, or a collectible under the bench. |

### Seats

`party_seat` and `party_mori` remain only for old checkpoint compatibility. Their outdoor interaction is disabled; actual dinner chairs belong to `izakaya`.

### Zones

`office_exit` (north end of the west passage), `plaza_exit` (the shop walk's east end, out onto the dorm street)

### Who's there when

Day 3: Mori shopping by the konbini in the morning; at lunch Kenji with his curry bread and Hamada making up his mind at the bakery, Aoi at the bike shop's window, Kuro and Rei at the izakaya's lunch counter; Kenji watching the game centre in the afternoon. Day 2's party is not here.

Day 1: none of the cast. On day 2 after the shift, Kenji waits beside the izakaya door until the protagonist meets him. The department is seated inside the venue; there is no outdoor dinner or coda.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Day 2: inside the izakaya, hidden on the street. | – |
| `mori` | Day 2: inside the izakaya. Day 3 shopping uses this place's body. | – |
| `kenji` | Day 2 after work: by the izakaya's curtain until met, then inside. | – |
| `kuroda` | Day 3, lunch: at the bakery, still deciding. | – |
| `aoi` | Day 3, lunch: looking at shoes. Label "Woman from the train" until her introduction. | – |
| `kuro` | Day 3, lunch: waiting at the izakaya. Label "Receptionist" until her introduction. | – |
| `rei` | Day 3, lunch: at the izakaya beside Kuro. Label "Tennis player". | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 10 | 1 | 0 | 3 | 20% | 15% | People down the arcade both ways and in off the promenade, three waiting at the konbini door for it to open, a jogger and a slow walker on the promenade. |
| morning | 7 | 2 | 1 | 0 | 40% | 25% | A few down the arcade both ways, a stroller on the promenade; two on the benches, a pair talking. |
| lunch | 20 | 4 | 2 | 0 | 40% | 35% | The arcade busy both ways, some off toward the promenade; strollers on the promenade; the benches full. |
| afternoon | 9 | 2 | 1 | 0 | 40% | 25% | A few down the arcade both ways, a stroller on the promenade; two on the benches, a pair talking. |
| evening | 17 | 3 | 2 | 0 | 35% | 35% | People home from work down the arcade, some the other way and some up from the promenade; strollers and a jogger on the promenade; three on the benches, two pairs talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `to_forecourt` | Walk north out of the west passage or use its travel marker | Return to the bicycle aisle by head office. |
| `arrive` | Arrive | Goal line: "Head office is north past the bicycle parking. Take its lift down to B2."; after work, "The dorms are up the street, east of the arcade." The way out east is the goal's pin. |
| `shut` | Go in at any named shop's door but the karaoke box's | The door is shut; a card on the glass says 準備中: not open yet. |
| `to_karaoke` | Go in at the karaoke box's door | Eric walks in, onto the front desk's floor. |
| `to_plaza` | Use or walk into the shop walk's east end, before work is over | Eric walks back to the plaza. |
| `to_dorms` | Use or walk into the shop walk's east end, after work | Eric walks up the dorm street to the dorm courtyard. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `pigeons` | pigeon | 5 | `day` | On the shop street and the seafront. |
| `sparrows` | sparrow | 3 | `day` | On the paving and the planters. |
| `gulls` | gull | 3 | `day` | Over the sea off the seafront, and on the water. |
| `crows` | crow | 2 | `all` | On the shop roofs. |
| `shop_cat` | cat | 1 | `all` | A ginger and white cat by a shop wall or on a planter. Can be petted. |
| `night_cat` | cat | 1 | `evening` | A black cat on a wall. Can be petted. |

## Karaoke box, front desk (`karaoke`)

Downstairs in the karaoke box at the shop street's east end (south row, bays 13 and 14), for the karaoke club (issue #227; [days 3 to 5](../../notes/days3-5-outline.md): the desk where the Sunday booking is made, the stairs up to the booth). In through its glass door off the arcade and out the same way; up the stairs at the back to the booth (`karaoke_booth`, below) and down again (Getting between places). It also loads directly with `?place=karaoke`, inside the door. Built as a room in its own frame (scenes/rooms/karaoke.js) on the club interiors' shared shell.

The camera looks in from the door's side over the cut-down front wall: on a desktop the whole room in one still frame, on a phone following Eric. Walked: the floor round the desk, the drinks bar and the bench; not behind the desk or up the flight itself.

A dark carpet and pale walls, posters for new songs on the back wall. Along the east wall the front desk, a purple front under a pale top with a pink stripe: the staff's terminal on it, two baskets of microphones, a bell, and the price board on the wall behind it, a pink band over rows of times and prices. Along the back wall the drinks bar: three drinks machines with coloured panels, glasses stacked, an ice bin. By the door the stand of song catalogues and a padded bench to wait on along the west wall. In the north-west corner the stairs up, carpeted, a rail along their open side and a pink sign over them.

### Things

| Id | Label | What it is |
|---|---|---|
| `karaoke_door` | To the shop street | The glass door, back out onto the arcade. |
| `karaoke_stairs` | Upstairs | The stairs at the back, up to the booth. |
| `karaoke_desk` | Front desk | The front desk and its terminal, where booths are booked. Nothing uses it yet. |

### Spots

`karaoke_in` (inside the door, the arrival point), `karaoke_desk` (in front of the desk), `karaoke_drinks` (at the drinks bar), `karaoke_stairs` (at the foot of the stairs); and each nook below

### Nooks

Small places in the room, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `karaoke_bench` | At the waiting bench along the west wall, by the song catalogues. | The bench, the catalogue stand, a poster over it. | Something left on the bench; a page marked in a catalogue. |

### Seats

`karaoke_bench` (the waiting bench, facing the room)

### Zones

None.

### Who's there when

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

No crowd.

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back past the plaza. Take its lift down to B2."; after work, "The dorms are up the street, east of the arcade." |
| `to_street` | Use the glass door | Eric walks back out onto the arcade. |
| `to_booth` | Use the stairs | Eric goes up to the booth. |

## Karaoke booth (`karaoke_booth`)

One booth upstairs in the karaoke box, up the stairs from the front desk (`karaoke`, above), for the karaoke club's evenings and its ticket (the song selector). In at its door from the corridor at the top of the stairs, out the same way and down. It also loads directly with `?place=karaoke_booth`, inside the door.

The camera looks in over the cut-down front wall: on a desktop the whole booth, on a phone following Eric. Walked: the floor between the benches and the table.

Dark walls and carpet, the door in the east wall open onto the corridor's warm light. On the north wall the screen, a song's title and lyrics lit on it, over a low cabinet with a speaker either side. Padded benches in a deep rose along the west wall, the east wall and the inside of the front wall round a low table: on it the song selector, a tablet in its docking cradle with a pink stylus on a cord, two microphones in their basket, a tambourine, the menu and two glasses. A small mirror ball hangs over the table; pink, cyan and blue lights.

### Things

| Id | Label | What it is |
|---|---|---|
| `booth_door` | Downstairs | The booth's door, back down to the front desk. |
| `song_terminal` | Song selector | The tablet in its cradle on the table, where songs are chosen. Named for the ticket; nothing uses it yet. |
| `booth_screen` | Screen | The screen on the north wall. Nothing uses it yet. |

### Spots

`booth_in` (inside the door, the arrival point), `booth_table` (at the table, by the selector), `booth_screen` (in front of the screen)

### Nooks

None.

### Seats

`booth_seat_w` (the bench along the west wall, facing the table), `booth_seat_e` (the bench along the east wall, facing it)

### Zones

None.

### Who's there when

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

No crowd.

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back past the plaza. Take its lift down to B2."; after work, "The dorms are up the street, east of the arcade." |
| `to_desk` | Use the booth's door | Eric goes back down to the front desk. |

## East lane (`east_lane`)

The second district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1; its places are in [island.md](island.md), "East lane"). It is the ground the plaza shows as its east lane backdrop (under the plaza above), built by the same code, so the two always match: the lane's jog, the pocket park, the dorm street, the north street, the south walk and the small blocks, with the back lane and the clinic to the north. Eric comes in from the plaza along the lane, in the morning (Getting between places).

Walked: the lane from just west of the cross walk east to the jog, its west leg and top leg and the three turns; the dorm street from the top leg south past the dorm courtyard's gate and the dorm row's mouth to just short of the shop walk; the pocket park's two walks and its gravel square (not its benches, lamps or tree); the cross walk from the lane down to the south walk and on to the liquor shop's door; the south walk along the café and the barber to the dorm street; the north street from the top leg north to a little past the back lane, where it goes on to the sports ground (`sports`, below), with the short walks to block_e3's and r9's doors; the back lane west to Amakawa Travel's walk, and the walk up to its door. Lawns, beds, the plaza's own cross walk north of the lane and the dorm courtyard are not walked here.

The camera turns with the place, and a held direction key keeps the frame it was pressed in until it is let go, so a walk doesn't bend while the camera turns. Over most of the district it looks north-east, so the park, the north street's fronts and Amakawa Travel face it; as Eric comes onto the south walk it eases round to look south-east and a little steeper, so the shop fronts there face it and the lane's trees north of the walk don't hide him.

The named shops each have a sign, the kana large and the English small, and a pair of glass doors, shut, with a white card on the glass: 準備中 CLOSED (after work on day 2: 本日休業 CLOSED TODAY). The café (カフェ CAFE, m_e1, on the south walk) has its sign on the wall over the green awnings; the liquor and rice shop (さかや SAKE · RICE, m_e2, at the foot of the cross walk, one storey under a tiled roof, an indigo noren) has a board standing on the front of its roof and a cedar ball (sugidama) hung by its door; the barber (とこや BARBER, r8, on the park's axis across the south walk) has its sign over its windows and a striped pole, red and blue winding up a pale drum, on a bracket by the door; Amakawa Travel (あまかわトラベル AMAKAWA TRAVEL, the ground floor of block_e2 on the back lane) has its sign standing on its door canopy, as the training centre's. The family flats, r9 and r3 are walked past.

In the morning the sun is the plaza's, and after work the lamps along the streets and in the park, the blocks' glass and the shops' signs light up. It also loads directly with `?place=east_lane`, on the lane. Nobody is here yet.

### Things

| Id | Label | What it is |
|---|---|---|
| `plaza_lane` | To the plaza | The lane west of the cross walk, back to the plaza. |
| `shop_street` | To the shop street | The dorm street's south end, toward the shop walk. |
| `dorm_row` | To the sea terrace | The dorm row's mouth off the dorm street, east toward the sea terrace and the east coast. |
| `north_street` | To the gym and pool | The north street north of the back lane, toward the sports lane. On day 2 it is the road-closed barrier there (below), and using it walks Eric up to the barrier. |
| `dorm_gate` | To the dorms | The dorm courtyard's gate off the dorm street. |
| `cafe` | Café | The café's door on the south walk. Go in: shut. |
| `liquor_shop` | Liquor shop | The liquor and rice shop's door at the foot of the cross walk. Go in: shut. |
| `barber` | Barber | The barber's door on the south walk. Go in: shut. |
| `travel_office` | Amakawa Travel | Amakawa Travel's door at the end of its walk off the back lane. Go in: shut. |

### Spots

`plaza_entry` (on the lane, the jog ahead); and each nook below

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `east_lane_shrine` | On the north street, through a gap in its west verge between two zelkovas. | A hokora on its plinth behind a red torii, two stone lanterns, an offering box, raked gravel. | A secret: something left at the shrine. |
| `east_lane_footpath` | The footpath behind the barber's and the café, a few steps in off the dorm street, closed by bollards beyond. | Paving, a bench at the edge of the planting, a stone lantern, three bollards across the path. | An encounter: someone who comes here not to be seen from the street. |

### Seats

None.

### Zones

`plaza_exit` (the lane west of the cross walk), `shop_exit` (the dorm street's south end), `dorm_exit` (the dorm courtyard's gate), `row_exit` (the dorm row's mouth), `north_exit` (the north street north of the back lane)

### Who's there when

Day 2: only the usual crowd; no story actor. The liquor-shop tag is an optional discovery ([Day-2 visits](stories/day2/visits.md)). The north street is closed for resurfacing in both periods: just short of its way out a yellow-and-black striped bar on two white stands runs right across the street, with a round red no-entry sign on a post in its middle and an orange cone at each end (game3d/js/places/closure.js). The walk grid stops at it, so he never reaches the way out.

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 14 | 1 | 1 | 0 | 15% | 20% | Most go out of the dorm gate and the dorm row, west along the lane toward head office, one or two up the north street. Some go the other way: back to the dorm gate, to the shop street. One on a bench, a pair talking. |
| morning | 6 | 1 | 0 | 0 | 30% | 20% | A few every way between the dorm gate, the lane, the shop street and the north street. |
| lunch | 12 | 2 | 1 | 0 | 30% | 30% | Between the lane and the shop street, some to and from the north street and the dorm row. |
| afternoon | 6 | 1 | 0 | 0 | 30% | 20% | A few toward the dorm row and the shop street, someone out of the dorm gate. |
| evening | 14 | 2 | 1 | 0 | 25% | 30% | Home along the lane into the dorm gate and the dorm row, some on to the shop street, a few back out; two on benches, a pair talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back west past the plaza. Take its lift down to B2."; after work, "The dorms are through the gate off the street, east of the park." |
| `shut` | Go in at any named shop's door | The door is shut; a card on the glass says 準備中: not open yet. |
| `dorms_later` | Use or walk into the dorm courtyard's gate, before work is over | That's the gate to the dorm courtyard; the dorms are for after work. |
| `to_plaza` | Use or walk into the lane west of the cross walk | Eric walks back to the plaza. |
| `to_shops` | Use or walk into the dorm street's south end | Eric walks on to the shop street. |
| `to_coast` | Use or walk into the dorm row's mouth | Eric walks on east along the dorm row to the east coast. |
| `to_sports` | Use or walk on up the north street past the back lane | Eric walks on north to the sports ground. |
| `to_dorms` | Use or walk into the dorm courtyard's gate, after work | Eric walks in to the dorm courtyard. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `sparrows` | sparrow | 5 | `day` | On the lane and in the hedges. |
| `crows` | crow | 2 | `all` | On the roofs and the trees. |
| `butterflies` | butterfly | 2 | `day` | Over the verges and gardens. |
| `dragonflies` | dragonfly | 2 | `day` | Over the verges. |
| `cat` | cat | 1 | `evening` | A grey tabby on a wall. Can be petted. |

## East coast (`east_coast`)

The third district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1; its places are in [island.md](island.md), "Dorms" and "Sports and baths"). It runs from the dorm street east along the dorm row to the dorms' sea terrace, north up the east coast and on to the onsen's front. The dorm row, the terrace and the blocks round the inner court are the dorm cluster the plaza, the east lane and the dorm courtyard show as backdrop (under the dorm courtyard below), built by the same code, with the courtyard and Eric's block as the plaza shows them. Eric comes in from the east lane, off the dorm street (Getting between places).

Walked: the dorm row from the dorm street east to the square at dorm_3's door, and north off it the inner court (issue #227, the art club): the north-south walk up to the common room's glazed door in dorm_gallery's south face, the paved square round the maple's raised bed where it crosses the east-west walk, and that walk from dorm_1e's door to dorm_3's (not the bed, the benches, the bins or the lamps); the walk on east to the sea terrace, and the terrace (not its pine bed, benches, drinks machine or lamp); the east coast walk out of the terrace's east side, north along the coast behind dorm_4, west where the coast comes in, north past dorm_6 and west behind the north residence; the onsen path north along the tennis courts' fence and east along the onsen's precinct wall to the red gate; inside the gate, the stone walk to the onsen's porch; and from the onsen path's foot a few steps west along the courts walk, which goes on to the sports ground (`sports`, below). The terrace's low wall on the coast side is now open on its east side, where the walk leaves it; a finger sign there points along it: Onsen 温泉 →, and another where the onsen path turns east.

The coast walk is pale slabs between kerbs, 2 wide, turning in squares. On its landward edge stand post lamps about every 8, and two paved bays with a bench look over it to the sea. Between it and the coast's wall (the forecourt's wall, rocks and broken surf, here along the east coast) a strip of black pines; behind dorm_4 and dorm_6 a grove of cherries on the lawn; where it turns inland, pines and zelkovas; a clipped hedge along the north residence's back. The onsen path runs between the tennis courts (two hard courts with their lines and nets inside a steel fence) and the onsen's grounds: a wood of pines, maples and zelkovas, kept back from the path by a band of layered planting, and a belt of trees between the path and the precinct wall.

The onsen: a precinct wall of white plaster on a stone base under a tiled cap, the red gate in its south side on the hall's door axis: two round vermilion posts on stones, a tie beam, a dark top beam and a small tiled gable, its two leaves standing open against the wall's inside, and by its west post a tall board with おんせん written top to bottom. Inside, a stone walk of dark slabs runs up to the porch between raked gravel, with a big black pine and a set of rocks to the west, a maple to the east and a stone lantern either side of the walk by the porch; a moss garden with maples and a pine lies behind the west corner. The hall is two storeys of white plaster between dark timber posts over a dark timber skirt, with lattice windows over paper screens, a tiled pent roof along the ground floor and a tiled gable roof over all. The porch on the axis has two posts with paper lanterns, its own tiled roof, and おんせん ONSEN on a board standing on its eave; its sliding lattice doors are shut, with a white card on the glass: 準備中 CLOSED (after work on day 2 a larger notice in its place: 本日休業, ボイラー修理のため, CLOSED TODAY · BOILER REPAIR). East of the hall, toward the sea, two bath courtyards behind bamboo fences, each with a rock-edged pool. Nothing behind the door is built.

The camera turns with the place, and a held direction key keeps its frame until it is let go (as in the east lane). Along the row it looks east toward the terrace and the sea, from a little north of the row and steeply, so the row's trees, on its south side, don't hide Eric; over the terrace it turns to look north-east up the coast, the sea on the right; as he comes off the coast walk onto the onsen path it turns to look north, so the gate and the hall's front face it. On the inner court it looks north from the row's side, so the common room's door faces it.

In the morning the sun is the plaza's; after work the lamps, the stone lanterns, the porch's lanterns and the onsen's paper screens light up, with the town's windows. It also loads directly with `?place=east_coast`, on the row. Nobody is here yet.

### Things

| Id | Label | What it is |
|---|---|---|
| `dorm_street` | To the dorm street | The dorm row's west end, back to the dorm street. |
| `courts_walk` | To the gym and pool | The courts walk west of the onsen path's foot, toward the pool and the gym. On day 2 it is the road-closed barrier there (below). |
| `lookout` | Lookout | The lookout nook (`east_coast_lookout`); its pin shows while the story uses it (day 2). Look. The coin telescope's slot is taped over ("Free to use"). Below it, in a gap in the armour rocks, narrow maintenance steps go down off the sea wall's coping into the water, the lowest two wet and under the surface; they can't be walked. |
| `kuroda` | Mr. Hamada | Day 2, after work, at the telescope. |
| `onsen` | Onsen | The onsen's door under its porch. Go in: shut. |
| `commons` | Common room | The common room's glazed door in dorm_gallery's south face, at the north end of the inner court's north-south walk. Go in: into the dorm common room (`dorm_commons`). |

### Spots

`row_entry` (on the dorm row, the terrace ahead); `inner_court` (on the inner court's square, by the maple's bed), `inner_court_bench` (in front of the square's bench facing the common room); `terrace_bench` (just behind the sea terrace's east bench, which looks south over the low wall to the sea); `lookout_view` (the shoreline below the lookout, where the view through the telescope is framed from above); and each nook below

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `east_coast_lookout` | Where the coast walk turns inland, out to the sea wall. | A low rail on the wall, a coin telescope, a name card (みはらし Lookout). | A collectible or a secret: what the telescope shows. |
| `east_coast_shrine` | On the lawn south of the walk inland, before the cherries. | A hokora on its plinth behind a red torii, two stone lanterns, an offering box, raked gravel. | A secret or a collectible. |

### Seats

None.

### Zones

`row_exit` (the dorm row's west end, at the dorm street), `courts_exit` (the courts walk west of the onsen path's foot)

### Who's there when

Day 3: Emi eating her lunch on a terrace bench at lunch; Mio with her laptop on the other in the afternoon, and Hamada resting on the coast walk's first bench; Aoi walking by the terrace's sea wall in the evening. Day 2's lookout visit is not here.

Day 2: Hamada (`kuroda`) visits the lookout telescope after work (the `coastVisit` hook: standing at the eyepiece wiping the lens, then aside by the rail; Eric at the eyepiece looks down on the steps from above, then steps back on the pad); he is absent here in the morning and absent from the day-2 gate and train. The optional encounter and sight are in [Day-2 visits](stories/day2/visits.md). The pool approach (the courts walk) is closed for resurfacing in both periods, with the same barrier as the east lane's north street, just short of its way out.

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |
| `emi` | Day 3, lunch: on a terrace bench. | – |
| `aoi` | Day 3, evening: by the terrace's sea wall. Label "Woman from the train" until her introduction. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 7 | 1 | 0 | 0 | 15% | 15% | Joggers along the dorm row and the coast walk to the courts and the onsen path, someone back from the onsen, a slow walker; one on a bench. |
| morning | 4 | 1 | 0 | 0 | 30% | 20% | A walker and a jogger; one on a bench. |
| lunch | 6 | 2 | 0 | 0 | 30% | 30% | Strollers to and from the onsen, a jogger; two on benches. |
| afternoon | 4 | 1 | 0 | 0 | 30% | 20% | A jogger and someone back from the onsen; one on a bench. |
| evening | 11 | 2 | 1 | 0 | 25% | 30% | People to and from the onsen, joggers on the coast walk; two on benches, a pair talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back west past the plaza. Take its lift down to B2."; after work, "The dorms are back along the row, through the gate off the street." |
| `shut` | Go in at the onsen's door | The door is shut; a card on the glass says 準備中: not open yet. |
| `to_east_lane` | Use or walk into the dorm row's west end | Eric walks back to the dorm street. |
| `to_sports` | Use or walk west along the courts walk | Eric walks on west to the sports ground. |
| `to_commons` | Go in at the common room's glazed door | Eric walks in, into the dorm common room. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `gulls` | gull | 5 | `day` | Over the sea, on the water and on the sea wall. |
| `sparrows` | sparrow | 3 | `day` | On the coast walk and in the hedges. |
| `crows` | crow | 2 | `all` | On the roofs and the trees. |
| `butterflies` | butterfly | 2 | `day` | Over the grass. |
| `dragonflies` | dragonfly | 3 | `day` | Over the grass. |

## Dorm common room (`dorm_commons`)

The ground floor of dorm_gallery, the dorms' common building on the inner court, for the art club (issue #227; [days 3 to 5](../../notes/days3-5-outline.md): the shared table, the materials, the drying shelf and the printer). In through the glazed door at the north end of the inner court's north-south walk, off the dorm row in the east coast, and out the same way (Getting between places). It also loads directly with `?place=dorm_commons`, inside the door. Built as a room in its own frame (scenes/rooms/commons.js) on the club interiors' shared shell.

The camera looks in from the south over the cut-down front wall: on a desktop the whole room in one still frame, on a phone following Eric. Walked: the floor round the furniture.

A boarded floor and pale walls, three windows high in the north wall onto the back walk. West, the lounge: a TV on a low cabinet against the wall, a teal sofa facing it across a low table with a remote and two mugs, on a rug; a bookshelf of mixed spines nearer the door. In the middle the long shared table with green chairs round it, the art club's materials set out at its east end: a cutting mat with a stack of paper, two jars of brushes, paint tubes and a palette. Against the north wall a drying rack of wire shelves, sheets laid flat on it and one hung by pegs from the top rail, and beside it the shared kitchen: the fridge with notes stuck on its door, a counter with the sink, two hobs, a kettle and a rice cooker, a wall cupboard over it. By the east wall the printer on a low cabinet, a sheet in its tray, and a notice board over it.

### Things

| Id | Label | What it is |
|---|---|---|
| `commons_door` | To the inner court | The glazed door, back out onto the inner court. |
| `commons_printer` | Printer | The common room's printer by the east wall. Named for the tickets; nothing uses it yet. |
| `art_table` | Art materials | The art club's materials at the shared table's east end. Nothing uses them yet. |
| `drying_rack` | Drying rack | The rack of wire shelves against the north wall, sheets drying on it. Nothing uses it yet. |
| `commons_board` | Notice board | The notices over the printer. Nothing uses it yet. |

### Spots

`commons_in` (inside the door, the arrival point), `commons_table` (at the table's south-east corner, by the materials), `commons_sofa` (between the sofa and the table), `commons_kitchen` (at the kitchen counter), `commons_rack` (in front of the drying rack); and each nook below

### Nooks

Small places in the room, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `commons_books` | In front of the bookshelf by the west wall. | Three shelves of mixed spines with gaps. | Something left between two books. |
| `commons_fridge` | At the fridge, at the kitchen's west end. | Notes stuck on its door, names on the food inside. | A note on the door, a name on a box. |

### Seats

`commons_sofa` (the sofa, facing the TV)

### Zones

None.

### Who's there when

Day 3: Kenji on the sofa in front of the TV in the evening.

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |
| `kenji` | Day 3, evening: on the sofa, watching a replay. | – |

No crowd.

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back west past the plaza. Take its lift down to B2."; after work, "The dorms are back along the row, through the gate off the street." |
| `to_court` | Use the glazed door | Eric walks back out onto the inner court. |

## Gym and pool (`sports`)

The fourth district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1; its places are in [island.md](island.md), "Sports and baths"). It runs from the north street's top past the back lane, west along the sports lane to the gym's front, north up the pool walk between the gym and the pool to the shower pavilion's door, and east along the courts walk behind the north residence to the foot of the onsen path. Eric comes in from the east lane, up the north street, from the east coast, along the courts walk, and from the office street, round the gym's corner (Getting between places). With those two it closes the first loop round the south-east of the island. The back lane, the clinic, the grove, Amakawa Travel and the blocks south of the north street's top are the ground the east lane shows (under the plaza above), built by the same code, as are r3's and block_e3's fronts.

Walked: the north street from a little north of the back lane up to the sports lane, with the short walk to r3's door; the sports lane from the gym's west corner east to the north street, and the gym's apron in front of its door; the pool walk from the sports lane north to the pavilion's door; the courts walk from the pool walk east to the onsen path's foot, with the short walks north to the tennis courts' gate and south to the north residence's door, on one axis across it; through the gate, both tennis courts and their run-off, with each net blocked. Sunday beginners use the west court while the doubles players use the east court. Lawns, beds and the pool's deck (walked as `pool`, below) are not walked. West past the gym's front the sports lane turns north at the gym's corner by gym_link into the office street, walked a few steps west to where the office quarter takes over (`office_quarter`, below); the corner and the street in front of Amakawa Life and Construction, their fronts and Construction's walk are the office quarter's, built by the same code.

The north street and the sports lane are the lanes' brick between pale borders, turning into each other at a square of herringbone; the north street keeps its verge and zelkovas down its west side and its lamps on its east, as in the east lane, and the sports lane has a verge with a low hedge on its south side and post lamps behind its kerb, and no trees there, so nothing stands between Eric and the camera. The walks are the coast walk's pale slabs between kerbs. A finger sign at the lanes' corner points west: Gym 体育館 and Pool プール; another at the courts walk's start points east: Onsen 温泉.

The gym: a long hall of pale concrete on a granite plinth under a shallow barrel-vaulted roof of muted green with standing seams, overhanging, its eaves and arched ends edged dark. Pilasters run down the long sides with a band of clerestory glass between them under the eaves; the south end carries the wall up into the arch with a lunette of glass and mullions. On the south face, on the door's axis, a glass front in a dark frame with two pairs of glass doors, which open onto the gym's lobby (`gym`, below); a flat canopy on two posts over it with たいいくかん GYM on a board standing on its front edge, two lights under it, and beds of low shrubs either side between the face and the lane.

The pool: behind a steel mesh fence, a deck of pale slabs round a 25 m pool of six lanes in a white coping, the lane lines dark under the water, lane ropes of blue and white floats with red at the ends, starting blocks at the pavilion's end and a ladder at each of that end's corners; a lifeguard's chair by its middle and white loungers down the east side. The shower pavilion closes the deck's north side: one tall storey of white walls on a plinth, a blue band round it, frosted windows high up, a flat roof with its plant and two rows of solar water heaters. Its door is on the west face at the end of the pool walk: glass in a dark frame under a canopy with プール POOL on a board on its front edge. It opens: through it and the men's changing room is the pool deck (`pool`, below). On the deck side the two changing rooms' doors, a blue and a red plate by them, and shower heads on the wall between. The pool walk has gravel against the gym's wall on one side and ground cover and lamps along the pool's fence on the other.

Along the courts walk: a clipped hedge in front of the pool's and the courts' fences, two paved bays on its south side with a bench each looking over the walk at the pool, lamps behind the south kerb, and a hedge and the north residence's planting between the walk and the residence. The tennis courts (the east coast's, under the east coast above) have a gate in their south fence on the gate walk, its two mesh leaves standing open against the inside of the fence, the chain hanging loose off the west post, and テニスコート TENNIS COURTS on a board on two posts beside the walk, facing west. Across the walk the north residence's door: a glazed pair in a panel of its wall under a canopy with two lights, and きたレジデンス NORTH RESIDENCE on a low wall by its walk, facing west. On the west court, along the fence by the net's west post: the players' bench facing the court, a wire ball basket on legs full of yellow balls, and the score display on its post facing the court, two white digit windows and four buttons under them. Trees between the pool and the courts; a wood of cherries, maples and a pine in the corner between the lane, the pool walk and the courts walk; zelkovas and cherries east of the north street up to the residence; pines, maples and zelkovas north of the gym.

The camera turns with the place, and a held direction key keeps its frame until it is let go (as in the east lane). Over the north street, the sports lane and the pool walk it looks a little east of north, so the gym's front faces it and the gym's east wall stays clear of the line to Eric on the pool walk; at the pool walk's north end, past the gym, it turns to look east-north-east, so the pavilion's door faces it; along the courts walk it looks east from a little north of the walk and steeply, so the north residence, south of the walk, doesn't hide Eric. On the tennis court it looks up the court from the south, steeply, and holds the whole court in one frame, both baselines and both sides of the net, easing there as he walks in at the gate and back to following him as he walks out.

In the morning the sun is the plaza's; after work the lamps, the gym's glass, the pavilion's windows and door, the canopies' lights, the back lane's lamps and the town's windows light up. It also loads directly with `?place=sports`, on the north street. Nobody is here yet.

### Things

| Id | Label | What it is |
|---|---|---|
| `north_street` | To the north street | The north street's south end, back down to the east lane. |
| `onsen_path` | To the onsen path | The courts walk's east end, on to the onsen path's foot in the east coast. |
| `gym` | Gym | The gym's doors on its south face. Go in: into the gym's lobby (`gym`). |
| `pool` | Pool | The pool pavilion's door at the end of the pool walk. Go in: through the men's changing room onto the pool deck (`pool`). |
| `court_display` | Score display | The tennis court's score display on its post by the net. Named for the tickets; nothing uses it yet. |
| `ball_basket` | Ball basket | The wire basket of balls by the tennis court's bench. Nothing uses it yet. |
| `office_street` | To the office street | The office street west of the gym's corner, on to the office quarter. |

### Spots

`north_entry` (on the north street, the sports lane ahead), `court_gate` (on the tennis court, inside the gate), `court_bench` (in front of the court's bench), `court_net` (on the court, south of the net's middle), `court_baseline_s` and `court_baseline_n` (behind each baseline), `court_display` (in front of the score display); and each nook below

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `sports_courtside` | North off the courts walk through a gap in its hedge, between the pool deck's fence and the tennis courts. | Two drinks machines against the courts' fence, the sorted bins beside them. | An encounter: a player buying a drink after a game. Or a coin under the machine. |
| `court_corner` | The tennis court's run-off, its north-west corner, under the clubhouse's windows beyond the fence. | Bare court and the fence's corner posts. | A lost ball; something pushed through the fence from the clubhouse side. |
| `sports_grove_bench` | On the grass between the pool walk and the grove behind the gym, near the pavilion. | A bench behind a clipped hedge, a stone lantern, a zelkova over it, paving. | An encounter, or a collectible left on the bench. |

### Seats

`court_bench` (the players' bench by the tennis court's net, facing the court)

### Zones

`north_exit` (the north street's south end, by the back lane), `east_exit` (the courts walk's east end, at the onsen path's foot), `west_exit` (the office street a few steps west of the gym's corner)

### Who's there when

Day 3: Rei serving on the west court in the afternoon. Sunday afternoon and evening: Rei demonstrates the loose score button beside the bench; its cap can be lifted and reseated, with a visible double increment before repair and a single increment afterward. Sunday evening adds Aoi with a ball basket, two spare rackets, a member beside the bench and three players on the other court. The player and Aoi practise on the west court; Rei rejoins the east court for doubles. Evening floodlights illuminate the courts. Drinks, a loosened shoelace and the member’s bottle-and-ball action are physical props. The bench approach leaves room around seated knees. On days 3 and 4 the office street is closed past the gym's corner by a barrier (places/closure.js); its marker moves to the barrier. The same closure redirects ambient office-approach walkers through the open onsen path, preserving each period’s crowd count. They resume the office approach on day 5.


| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |
| `rei` | Day 3 afternoon and Sunday afternoon/evening at the courts. Label "Tennis player" until introduced. | – |
| `aoi` | Sunday evening, first beside the gate and later practising or seated at the bench. | – |
| `member` | Sunday evening beside the bench with a bottle and a ball. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 10 | 0 | 1 | 0 | 15% | 15% | Joggers round the lane, the courts walk and the onsen path; people up the north street on the way to the office street; a pair talking. |
| morning | 4 | 0 | 0 | 0 | 30% | 20% | Someone to the pool, a jogger. |
| lunch | 7 | 0 | 1 | 0 | 30% | 30% | Between the office street and the pool; a jogger; a pair talking. |
| afternoon | 5 | 0 | 0 | 0 | 30% | 20% | A jogger; someone back from the pool. |
| evening | 11 | 0 | 1 | 0 | 25% | 30% | From the office street to the pool and up the north street; joggers; a pair talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back west past the plaza. Take its lift down to B2."; after work, "The dorms are back down the north street, east of the park." |
| `to_gym` | Go in at the gym's doors | Eric walks in through the main doors, into the gym's lobby. |
| `to_pool` | Go in at the pool pavilion's door | Eric walks in, and out of the men's changing room onto the pool deck. |
| `to_east_lane` | Use or walk into the north street's south end | Eric walks back down to the east lane. |
| `to_coast` | Use or walk into the courts walk's east end | Eric walks on east to the onsen path, in the east coast. |
| `to_offices` | Use or walk west along the office street past the gym's corner | Eric walks on west along the office street, in the office quarter. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `pigeons` | pigeon | 5 | `day` | On the sports lane and the pool walk. |
| `sparrows` | sparrow | 4 | `day` | On the paths and in the hedges. |
| `crows` | crow | 3 | `all` | On the gym's roof, the fences and the trees. |
| `butterflies` | butterfly | 2 | `day` | Over the grass. |
| `dragonflies` | dragonfly | 4 | `day` | Over the grass. |
| `cat` | cat | 1 | `evening` | A black cat on a wall. Can be petted. |

## Gym (`gym`)

The gym's ground floor inside its main doors: the entrance lobby with the reception, and the sports hall behind its glass wall, for the clubs' winter meetings and the gym's tickets (issue #227; [days 3 to 5](../../notes/days3-5-outline.md): the booking terminal, the printer where `dashite` is taught, the desk fan, and the gym meetings after the pool closes). Rebuilt as a company sports centre after Jørgen's in-game note of 2026-10-05 (notes/feedback-game/2026-10-05_225748: "there is a reception out on the gym floor itself, this gym is totally illogical in every respect"). In through the main doors from the sports lane, out the same way (Getting between places). It also loads directly with `?place=gym`, inside the doors. Built as a room in its own frame (scenes/rooms/gym.js, the lobby's furniture in gym-lobby.js, the hall in gym-hall.js, the plan in gym-plan.js), on the club interiors' shared shell (scenes/rooms/shell.js) and machines (scenes/rooms/machines.js).

The camera looks in from the south over the cut-down front wall, steeply: on a desktop the whole floor in one still frame, on a phone following Eric. Walked: the entrance's tiles, the lobby, the staff side behind the reception counter (through the gap at its north end), and the hall through its open doors, with the equipment store; not the changing rooms or the pool corridor.

The entrance: inside the glass doors a strip of grey tiles where outdoor shoes come off, a mat, a grey shoe locker of cubbies either side with a few pairs in them, and a step up onto the lobby's pale floor with a steel rack of green indoor slippers on it and two pairs set out.

The lobby: west of the entrance the reception, a counter in blue-grey with a pale top running along the lobby's west side, its front facing the lobby; on it, facing the lobby, the booking terminal (a screen on a short neck, a keypad and a card slot), an old desk fan with a caged head and a lever on its base, a tray of booking sheets, a bell and a pen stand. Behind it the staff side: the attendant's chair, and along the west wall a back counter with the printer on it (a paper tray out at its front), binders, and the key box on the wall over it. 受付 RECEPTION hangs over the staff side on the glass wall. A 受付 RECEPTION plate stands on the counter's north end. East of the entrance an umbrella stand inside the doors, a blue waiting bench along the east wall and another across the lobby facing the doors, a drinks machine, a plant in a white pot by the counter's front, and the club board (notices pinned on cork) on the solid pier at the glass wall's east end. In the lobby's north-east corner the changing block's front faces the lobby: the men's changing room's open doorway with a blue noren and 男子更衣室 MEN · CHANGING over it, the women's with a red noren and 女子更衣室 WOMEN · CHANGING, the pool's season notice between them ("Outdoor pool. Last swim: Sat 3 Oct. Swimming club meets in the hall from 10 Oct"), the pool corridor's shut glass door with プール POOL over it, and an AED in a white box east of it.

The hall: across the lobby's north side a glass wall in a dark frame from the west wall to the pier, its double doors open on the entrance's axis with アリーナ SPORTS HALL over them. Behind it the maple floor in narrow boards, a wainscot of boards round the walls to about chest height with a rail, high windows over it down the west and east walls and along the north wall, sky beyond, and a red boundary line round the floor. The changing block's walls run back into the hall's east side, roofed. The badminton court's lines in green across the hall's north part with its net up on two posts and a shuttlecock or two on the floor; a basketball goal on the north wall over the court and a clock over the meeting corner. Down the west wall by the windows two long benches facing the hall; a cart of volleyballs inside the doors. In the north-west corner the equipment store, its sliding door in its south wall pushed open: a cart of basketballs, a cart of volleyballs, blue mats stacked, the badminton net posts and a low shelf with folded bibs on it. North-east, past the changing block, the winter meeting corner: two rows of blue folding chairs facing a whiteboard on wheels with notes on it, and a trolley of folded chairs against the east wall.

### Things

| Id | Label | What it is |
|---|---|---|
| `gym_door` | To the sports lane | The main doors, back out onto the gym's apron. |
| `gym_changing` | To the pool | The protagonist's own changing room's doorway (the men's for Eric, the women's for Carina), through to the pool deck (`pool`). No pin until the story uses it (`talk:gym_changing`). |
| `booking_terminal` | Booking terminal | The terminal on the reception counter where the gym's courts and rooms are booked. Ticket T-0004 and a kotodama target (`ugoite`). |
| `gym_printer` | Printer | The printer on the back counter behind the reception, faced from the staff side; it prints the booking sheets (T-0004, where `dashite` is taught). |
| `desk_fan` | Desk fan | The old fan on the reception counter, its starter lever on the base. |
| `gym_board` | Club board | The clubs' cork board on the pier at the glass wall's east end. |

### Spots

`gym_in` (on the lobby floor just past the step, the arrival point), `gym_desk` (in front of the reception counter at the terminal), `gym_lobby` (in front of the waiting bench across the lobby), `gym_benches` (in the hall in front of the benches), `gym_meeting` (in the hall beside the folding chairs), `gym_court` (on the badminton court); and each nook below

### Nooks

Small places off the floor, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `gym_store` | In the hall, inside the equipment store's open door. | The ball carts, the mats, the net posts and the shelf of bibs. | Something left in a cart; a ball with a name on it. |
| `gym_lockers` | On the entrance's tiles, by the west shoe locker and the slipper rack. | Cubbies with a few pairs of shoes in them. | A shoe without its pair; a note in a cubby. |

### Seats

`gym_bench_n` (the hall's bench along the west wall nearer the court, facing the hall), `gym_bench_s` (the one nearer the glass wall)

### Zones

None.

### Who's there when

Day 3: the attendant behind the reception counter at the terminal through the day (not in the evening); Mori at the counter checking his Tuesday booking in the afternoon; Emi at the hall's equipment store looking for the pool keys in the afternoon. The booking terminal and printer are ticket T-0004 (`bookingRepair`, game3d/js/places/day3/booking.js): the frozen screen, the red reset button under it, the sheet printed with the day's date, the attendant walks to the back counter to collect the sheet, carries it back to the terminal to read it, then lays it on the counter. On a later Saturday's first winter meeting (`day3Setup` state `winterClub`) Emi, Kuro and the attendant are by the hall's benches.

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |
| `attendant` | Day 3: behind the reception counter in the morning, at lunch and in the afternoon. Label "Attendant". | – |
| `mori` | Day 3, afternoon: at the reception counter about his booking. | – |
| `emi` | Day 3, afternoon: by the hall's equipment store. | – |
| `kuro` | A later Saturday's winter meeting only. | – |

No crowd.

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back west past the plaza. Take its lift down to B2."; after work, "The dorms are back down the north street, east of the park." |
| `to_sports` | Use the main doors | Eric walks back out onto the sports lane. |

## Pool deck (`pool`)

The deck round the outdoor pool, for the swimming club (issue #227; [days 3 to 5](../../notes/days3-5-outline.md), the season's last outdoor session). It is the sports ground's world (`sports`, above), walked inside the pool's fence instead of on the walks round it. The player enters the pavilion's west door from the pool walk, follows its shared corridor through their own changing room, and reaches the deck through that room's door. Both rooms contain numbered lockers, a slatted bench and a tiled shower with a drain; the roof and near walls are cut away in this place. The other changing room is outside the player's walking grid. `?place=pool` starts inside the common entrance.

Walked: the pavilion entrance, corridor, own changing room and shower route, then the deck of pale slabs all the way round the pool. The water, the coping and the starting blocks are not walked; swimming is staged by a scene, never played.

The pool is 25 m of six lanes in a white coping, the lane lines dark under the water, lane ropes of blue and white floats with red at the ends, six starting blocks along the pavilion's end and a steel ladder at each of that end's corners. At the south-west corner three steps go down into the first lane, each tread a paler band under the water with a white nosing, a steel rail either side curving from the coping into the water. On the pavilion's deck face the two changing rooms' doors (men's west with a blue plate, women's east with a red one), the shower heads between them and a pace clock on its own stand, white face, dark ring, red sweep hand. Down the west side, against the fence: a bench, the lifeguard's chair by the pool's middle with 飛び込み禁止 NO DIVING on a red board on the fence above it, and another bench. Down the east side the white loungers. Along the south fence the winter cover rolled blue on its reel between two A-frame stands, a crank on its west end; at the south-east corner a steel rack of kickboards in blue and yellow and a basket of pull buoys; at the north-east corner the attendant's folding table and chair, a clear lost-property tub and a clipboard on it.

The camera looks a little east of north up the pool from the south-west and steeply, the pavilion behind the far end, following Eric. The water-entry conversation uses a lower, closer view across the lanes; Continue retains the shot, and release or a later authored shot restores the walking angle. In the morning the sun is the plaza's. At evening four raised floodlights illuminate the water and deck; they switch off when daylight returns, including a time change while inside. The gym's glass and pool-walk lamps also light up.

### Things

| Id | Label | What it is |
|---|---|---|
| `changing_room` | Pool exit | The common west entrance of the pavilion, returning to the sports-ground pool walk. The stable trigger id is retained for existing stories. |
| `pool_goggles` | Goggles | Day 3, evening, members of the swimming club only: a pair of goggles hung on the fence by the south-west corner, until their owner has them back. |

### Spots

`deck_in` (outside the protagonist's changing-room door on the deck), `pool_steps` (on the deck at the top of the steps into the first lane), `pool_blocks` (the north end, behind the starting blocks' middle), `lifeguard_chair` (on the deck beside the lifeguard's chair), `deck_benches` (between the two benches on the west side), `float_rack` (in front of the kickboard rack); and each nook below

### Nooks

Small places off the deck, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `pool_fence_corner` | The deck's south-west corner, between the steps and the fence. | The reel's crank and the end of the rolled cover; the fence beside it, where things get hung up and forgotten. | Something left on the fence, waiting for its owner. |
| `pool_lost_property` | The deck's north-east corner, by the attendant's table. | The folding table and chair, the lost-property tub and a clipboard. | Something in the tub; a word on the clipboard. |

### Seats

`deck_bench_n` (the bench against the west fence north of the lifeguard's chair, facing the pool), `deck_bench_s` (the one south of it, facing the pool)

### Zones

None.

### Who's there when

Day 3, evening: the swimming club's last outdoor swim (game3d/js/places/day3/swim.js, `poolSession`). Before it Emi stands by the steps with the club's three bags, Kuro is already in the water in the second lane, a member stands with the equipment list and the attendant packs the unused floats on the south deck; after it Emi rests on the south bench and Kuro by its end with their towels, the bags with the attendant. Bags rest on low racks and are carried visibly by their handles; the equipment sheet moves between hands, the bench and the attendant's table. A swimming player walks to their own lockers and shower before using the pool steps. A local swim overlay keeps each rig's face above the water, animates the arms and leans forward for lengths; actors use the steps to get out. Continue restores water or bench poses, and leaving cancels pending movement. Approved swimwear variants are still missing for Kuro, Emi and both protagonists: their everyday meshes remain visible, so the wardrobe requirement is not complete.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |
| `emi` | Day 3, evening: the club (above). Talk to her to start or resume the session. | – |
| `kuro` | Day 3, evening: in the water, then resting. Label "Receptionist" until her introduction. | – |
| `attendant` | Day 3, evening: packing the floats; takes the bags and the list. | – |
| `member` | Day 3, evening: the club member with the equipment list; her goggles are on the fence. | – |

No crowd.

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back west past the plaza. Take its lift down to B2."; after work, "The dorms are back down the north street, east of the park." |
| `to_sports` | Use the changing room's door | Eric walks back through the pavilion and out onto the pool walk. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `sparrows` | sparrow | 3 | `day` | On the deck and the fence. |
| `crows` | crow | 2 | `all` | On the pavilion's roof and the lamps. |
| `dragonflies` | dragonfly | 3 | `day` | Over the grass round the fence. |

## Office street (`office_quarter`)

The fifth district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1; its places are in [island.md](island.md), "Office quarter"). It runs from the gym's corner, where the sports lane turns north by gym_link, west along the office street past the fronts of Amakawa Life, Logistics, Electric and Trading on its north side, with a walk north on the shed street's line to Amakawa Foods, a walk between Logistics and Life to the court before Amakawa Construction, and the bank's door a few steps down the quarter street. Eric comes in from the sports ground, west along the sports lane and round the corner, and from the harbour, east along the street (Getting between places); west past Amakawa Trading the street goes on into the harbour (`harbour`, below), which builds the street's west end with the same code. The gym is the sports ground's, built by the same code, and so is the corner: both chunks lay it, and the sports ground also builds the street in front of Amakawa Life and Construction.

Walked: the sports lane from the gym's front west to its turn, gym_link north, and the office street from the corner west to just short of the harbour walk, where the harbour takes over; the forecourts in front of the four offices on the street, up to their doors; the walk north to Amakawa Foods' door; the walk north between Amakawa Logistics and Life and the court before Amakawa Construction's door; the quarter street's mouth south to a row of bollards past the bank's door. The shed street's mouth is laid a little way south with bollards across it, not walked; the harbour walk's mouth is the harbour's. Lawns, beds and the gym's surroundings are not walked.

The street, gym_link and the lane are the lanes' brick between pale borders, turning at squares of herringbone at the corner. On the street's south side a verge with a low hedge, post lamps behind its kerb, and two bays with a bench each looking over the street at the offices, and no trees there, so nothing stands between Eric and the camera; its north side is kerbed between the forecourts, with low beds. The forecourts are mid-grey slabs, with beds against the deeper ones either side of the door, and company bike racks at Amakawa Electric's and Logistics' outer ends. The walks are pale slabs between kerbs. Gravel runs along the gym's west wall at the corner, and a clipped hedge along the street's north kerb there, with a wood of cherries, maples and zelkovas behind it on the lawn between the offices and the gym. Belts of trees stand between and behind the blocks north of the street and set back on the lawns south of it, and a small wood on the quarter park. Finger signs: at the corner, Offices 事務所 and Bank 銀行 pointing west, Pool プール east; at the street's west end, Harbour 港 pointing on west, Gym 体育館 and Pool プール back east.

The offices are the town's lower blocks (as head office's wing): a ground floor of piers and glass, ribbon windows above, a parapet and roof plant. Each door is a glazed pair under a deep canopy on the face toward its street or walk, its name standing on the canopy, the kana large and the English small: しょうじ AMAKAWA TRADING, しょくひん AMAKAWA FOODS, でんき AMAKAWA ELECTRIC, ぶつりゅう AMAKAWA LOGISTICS, けんせつ AMAKAWA CONSTRUCTION, せいめい AMAKAWA LIFE; the doors are shut, a white card on the glass: 準備中 CLOSED. The bank is two storeys south of the street, set back behind a bed and a hedge, its door on its east face under the same canopy with ぎんこう BANK, and at the corner toward the street its ATM corner with ATM CASH CORNER on a blue board.

The camera turns with the place, and a held direction key keeps its frame until it is let go (as in the east lane). Along the street it looks north-north-west from a little east of south, so the offices' fronts face it and the bank, south of the street, stays out of the line to Eric; up the walks north between the blocks it looks north; in the quarter street's mouth it looks from the south-east, so the bank's door faces it; by the gym it turns to the sports lane's look, as the sports ground has it there.

In the morning the sun is the plaza's; after work the lamps, the canopies' lights, the offices' ground floors and doors, some of their windows above, and the gym's glass light up. It also loads directly with `?place=office_quarter`, on the street west of the corner. Nobody is here yet.

### Things

| Id | Label | What it is |
|---|---|---|
| `sports_lane` | To the gym and pool | The sports lane east of the corner, back to the sports ground. |
| `harbour` | To the harbour | The office street west of Amakawa Trading, on to the harbour. |
| `trading_office` | Amakawa Trading | Amakawa Trading's door on the street. Go in: shut. |
| `foods_office` | Amakawa Foods | Amakawa Foods' door at the end of its walk. Go in: shut. |
| `electric_office` | Amakawa Electric | Amakawa Electric's door on its forecourt. Go in: shut. |
| `logistics_office` | Amakawa Logistics | Amakawa Logistics' door on its forecourt. Go in: shut. |
| `construction_office` | Amakawa Construction | Amakawa Construction's door on its court. Go in: shut. |
| `insurance_office` | Amakawa Life | Amakawa Life's door on its forecourt. Go in: shut. |
| `bank` | Bank | The bank's door on the quarter street. Go in: shut. |

### Spots

`street_entry` (on the street west of the corner, walking west); and each nook below

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `office_smokers` | In the planted gap between Amakawa Electric and Amakawa Trading, off Electric's forecourt. | Frosted screens on three sides, a standing ashtray, a bench, the sign (きつえんじょ Smoking area). | An encounter: office gossip from someone on a smoke break. |
| `office_vending` | On Amakawa Life's forecourt, west of its door. | Two drinks machines against the bed, the sorted bins beside them. | An encounter, or a coin under the machine. |

### Seats

None.

### Zones

`east_exit` (the sports lane east of the corner), `west_exit` (the street's west end, short of the harbour walk)

### Who's there when

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 17 | 0 | 1 | 0 | 15% | 15% | Office workers along the office street both ways, in from the sports lane and up the quarter street, some toward the gym and the harbour end; a pair talking. |
| morning | 7 | 0 | 0 | 0 | 30% | 20% | A few between the quarter street, the bank and the harbour end. |
| lunch | 14 | 0 | 2 | 0 | 30% | 30% | Between the quarter street and the bank, some along the street; two pairs talking. |
| afternoon | 7 | 0 | 0 | 0 | 30% | 20% | A few along the street. |
| evening | 14 | 0 | 1 | 0 | 25% | 30% | Most east along the street toward the sports lane and the gym, some west toward the harbour end and into the bank street; a pair talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back past the gym and the plaza. Take its lift down to B2."; after work, "The dorms are back past the gym and down the north street." |
| `shut` | Go in at any office's or the bank's door | The door is shut; a card on the glass says 準備中: not open yet. |
| `to_sports` | Use or walk into the sports lane east of the corner | Eric walks back east to the sports ground. |
| `to_harbour` | Use or walk into the street's west end | Eric walks on west along the street, into the harbour. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `pigeons` | pigeon | 6 | `day` | On the office street. |
| `sparrows` | sparrow | 3 | `day` | On the street and in the planting. |
| `crows` | crow | 2 | `all` | On the office blocks' canopies and roofs, and the trees. |
| `cat` | cat | 1 | `evening` | A grey tabby on a wall or a planter. Can be petted. |

## Harbour (`harbour`)

The sixth district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1; its places are in [island.md](island.md), "Harbour"). It runs from the office street in front of Amakawa Trading west past the harbour walk's mouth into the supply yard, out on the supply pier, across the yard to the ferry landing and out on the ferry pier, and south down the harbour walk. Eric comes in from the office quarter, west along the street, and from the old works, down the works lane or the works street (Getting between places), and leaves the same ways. The street in front of Amakawa Trading, its front and the street's planting are the office quarter's, built by the same code.

Walked: the office street from Amakawa Trading's front west to the yard; the harbour walk from the street south to a row of bollards where it meets the coast walk (which goes on south past the station, not walked), and the bay off its sea side; the whole supply yard up to a step from its quay edges, round the warehouse, the foreman's hut, the containers and the crane; the supply pier; the ferry landing up to the terminal's door; the ferry pier; the works lane's mouth north of the yard and the works street's mouth north of the office street, a few steps each, where the old works take over (`works`, below). Lawns, planting and the water are not walked.

The harbour's water lies lower than the quays, which are concrete walls down to it with a pale coping, black rubber fenders on their face, mooring bitts a step in from the edge, a steel ladder now and then, and a yellow line painted along them. The piers are concrete decks on rows of round piles, with fenders and bitts along both sides and a green-topped beacon on the head. The yard is big concrete slabs with a green footway painted across it, edged white, from the street to the landing. The landing is pale granite with benches looking out over the water, lamps, two pines in tree pits and lifebuoys on posts. The office street keeps its brick, its north side's beds and its verge with lamps on the south side; west of the harbour walk the rocks come up close behind the verge. The harbour walk is the coast walk's pale slabs between kerbs, lamps on its landward edge, the bay paved darker with two benches looking west over the rocks. North of the street's west end, west of the terminal, behind the harbour office and between the walk and the rocks stand belts of pines, zelkovas, cherries and maples, and a line of pines along the rocks. The rocks are the coast's sea wall with armour rocks and surf at the harbour's water level, north-west of the landing and from the yard round to the coast walk. Finger signs: at the yard's edge, Ferry フェリー west and Offices 事務所 east; on the landing, Offices 事務所 east; at the office street's west end, the office quarter's.

The warehouse stands on the yard's north side: a long shed of pale ribbed metal on a concrete plinth under a low-pitched roof, three roller doors in its south face (the middle one half up, dark behind), a personnel door with a lamp over it, yellow guards at the jambs, and にあげば AMAKAWA LOGISTICS · SUPPLY QUAY on a board over the doors. The foreman's hut is a white site cabin on blocks by the supply pier's root, a window and a door to the yard, company bikes in a rack along its east side. The crane is a muted orange pedestal jib crane on the south quay, its jib out over the freighter, the hook hanging. The containers are 20-foot boxes in two blocks, one or two high, in muted blues, reds, greens, cream and grey, with pallets and crates by the warehouse, the hut and on the supply pier, and two floodlight masts over the yard.

The ferry lies along the ferry pier's west face: a white hull over a dark blue boot top with a teal band, a long two-tier white superstructure with ribbon windows, the bridge forward with its wings, a teal funnel aft, orange lifeboats on the upper deck, あまかわ AMAKAWA FERRY on the superstructure's fore end, and a gangway down to the pier. The freighter lies along the supply pier's west face: a dark green hull, two hatch covers with two containers and a deck crane, the white deckhouse aft with its bridge and funnel. Mooring lines run from both ships to the piers' bitts. Nothing moves.

The terminal and the harbour office are the town's lower blocks (as the offices on the office street), each door a glazed pair under a deep canopy with the name standing on it: フェリーのりば FERRY TERMINAL on the terminal, one storey with a tall ground floor, on the landing's north side with planters either side of its door; みなとじむしょ HARBOUR OFFICE on the office, two storeys on the yard's north edge by the landing. Both doors are shut, a white card on the glass: 準備中 CLOSED.

Past its ways out, not walked here, the neighbours' ground is built as they build it, so the next place stands finished before the crossfade. East of the way out the office street runs on past the shed street's mouth (its brick, kerbs and bollards) to Amakawa Electric's east end, with its verge, lamps, bench bay and planting, and the fronts and forecourts of Amakawa Foods (its walk north) and Electric. Up the works lane from the yard the lane's slabs, the works yard and its aprons in their worn concrete with cracks, the lane's arm lamps and the trees either side of the harbour office, under the power plant, the chimney, the pipe bridge, the works shed, the factory and the server hall as the old works have them. Past the harbour walk's bollards the coast walk runs on south in the same pale slabs to its bay with two benches, and its leg turns east past the platform shed's north end to the shed street, kerbed, with post lamps and the pines, beds and shrubs between it and the wall.

The camera turns with the place, and a held direction key keeps its frame until it is let go (as in the east lane). On the street and down the harbour walk it has the office street's look; as Eric comes off the street into the yard it turns to look a little west of north and a little steeper over the yard, the landing and the piers, so the warehouse's, the office's and the terminal's fronts face it and the ships lie beside the piers.

In the morning the sun is the plaza's; after work the lamps, the floodlights, the beacons, the fronts' ground floors and canopies, the ships' windows and the town's windows light up. It also loads directly with `?place=harbour`, on the street west of the harbour walk's mouth. Nobody is here yet.

### Things

| Id | Label | What it is |
|---|---|---|
| `office_street` | To the office street | The street in front of Amakawa Trading, back to the office quarter. |
| `works_lane` | To the old works | The works lane north out of the supply yard, on to the old works. |
| `works_street` | To the works street | The works street north off the office street, on to the old works. |
| `ferry_terminal` | Ferry terminal | The terminal's door on the landing. Go in: shut. |
| `harbour_office` | Harbour office | The harbour office's door on the yard's north edge. Go in: shut. |

### Spots

`street_entry` (on the street west of the harbour walk's mouth, walking west); and each nook below

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `harbour_pier_end` | The supply pier's south end. | Mooring bollards, a life ring on its post, a coil of rope, a bucket, a folding stool, a fish crate. | An encounter: someone fishing off the end. Or something fished up. |
| `harbour_shed_back` | The warehouse's east side, between it and the yard's edge. | The outdoor units against the wall, crates of empties, buckets, a potted shrub, a hose reel. | An encounter: a dock hand on a break. Or a collectible behind the crates. |
| `harbour_ferry_lookout` | The ferry pier's south end. | A low rail, a coin telescope, a bench looking out to sea, a name card (みなと Harbour). | A secret or a collectible: what the telescope shows. |

### Seats

None.

### Zones

`east_exit` (the street in front of Amakawa Trading), `lane_exit` (the works lane's mouth), `street_exit` (the works street's mouth)

### Who's there when

None of the cast yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| early | 7 | 1 | 1 | 0 | 15% | 15% | Dock workers in from the office street to the works lane and the piers, someone off the ferry, a jogger up the harbour walk; one on a bench, a pair talking. |
| morning | 4 | 0 | 1 | 0 | 30% | 20% | A few between the street, the piers and the works lane; a pair talking. |
| lunch | 6 | 2 | 1 | 0 | 30% | 30% | A few between the piers, the street and the ferry; two on benches, a pair talking. |
| afternoon | 4 | 0 | 1 | 0 | 30% | 20% | A few between the street, the works lane and the piers; a pair talking. |
| evening | 7 | 2 | 1 | 0 | 25% | 30% | Back from the works lane and the piers to the street, a stroller down the harbour walk; two on benches, a pair talking. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back along the office street, past the gym and the plaza. Take its lift down to B2."; after work, "The dorms are back along the office street, past the gym and down the north street." |
| `shut` | Go in at the terminal's or the harbour office's door | The door is shut; a card on the glass says 準備中: not open yet. |
| `to_offices` | Use or walk east along the street in front of Amakawa Trading | Eric walks back east to the office street. |
| `to_works`, `to_works_street` | Use or walk into the works lane's mouth, or the works street's | Eric walks on north into the old works. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `gulls` | gull | 7 | `day` | Over the harbour, on the water, the quays and the roofs. |
| `night_gulls` | gull | 3 | `evening` | Sitting on the water, the quays and the roofs. |
| `pigeons` | pigeon | 4 | `day` | On the street and in the yard. |
| `crows` | crow | 2 | `all` | On the roofs and the trees. |
| `harbour_cat` | cat | 1 | `all` | A ginger and white cat on a quay wall or a bench. Can be petted. |

## Old works (`works`)

The seventh district of the island's south half built to walk (issue #173, after Jørgen's "Correct" on Review island-half-1; its places are in [island.md](island.md), "Old works"). It runs from the supply yard's north edge up the works lane past the power plant's door to the chimney's foot, east along the works yard past the works shed, the factory's gates, the gatehouse and the server hall, down the works street to the office street past the recycling centre, and east along the research walk to Amakawa Research. Eric comes in from the harbour, up the lane out of the supply yard or up the street off the office street, and goes back down either (Getting between places). The harbour office's side and the warehouse are the harbour's, built by the same code.

Walked: the works lane from the supply yard to a dead end at the chimney's foot, and the short apron before the power plant's door; the works yard; the factory apron north off it up to the gates; the hall apron south off it to the server hall's door; the works street from the office street to the yard; the forecourt before the recycling centre's door; the research walk and the landing before Amakawa Research's door; and the five nooks below. Lawns, planting and the fenced lot west of the street are not walked.

The works are older than the rest of the town and look it. The lane carries on the supply yard's big concrete slabs; the yard and the aprons are older concrete, worn and patched, with cracks across them and weeds along the walls. An old siding comes out of the factory's gates, rails set flush in the concrete, curves east and runs along the yard to a buffer stop. The works street is old asphalt with faded white edge lines and patches, concrete utility poles with their wires down its west side, and behind them a chain-link fence round the works' empty land, its gate chained. The lamps are the works' own, arm lamps on tall poles; the research walk and the two forecourts are the town's pale slabs and post lamps, newer than the works round them. A pipe bridge of three pipes, one lagged in silver, runs on steel portals from the power plant over the lane's head to the factory. Trees stand between the lane and the harbour office, between the harbour office and the plant, behind the street's east side, in the fenced land and south of the research walk; a low hedge runs along the walk. A finger sign at the yard's east end points to Research 研究所 east and Harbour 港 west.

The factory is three storeys of faded green-grey corrugated walls on a concrete base under four saw-tooth roofs, their glazing to the north, with rows of steel works windows, a few panes dark, and rust under the gutter. Its gates are a pair of teal sliding leaves under their track, chained and padlocked, a 立入禁止 KEEP OUT plate on them and 安全第一 SAFETY FIRST on a green board above. The power plant is a tall pale concrete hall, piers between tall works windows, a boiler house on the roof and ivy up its south-east corner; its door on the lane is a chained steel pair under a concrete hood, はつでんしょ No.1 POWER PLANT on a plate beside it. The chimney stands at the lane's head, round and tapering, banded red and white at the top, a caged ladder up its south side. The works shed is pale blue-grey corrugated under a low gable, a roller door to the yard and its number ２ on the east gable. The gatehouse is a pale concrete box under a slab roof, its counter window onto the factory apron with うけつけ RECEPTION over it, and a red and white barrier raised at the apron's mouth. The server hall is low, pale panels under a blue band, louvres and two high windows on its north side, condensers on the roof; its door on its east face is a glazed pair under a canopy with サーバーとう SERVER HALL on it. The recycling centre and Amakawa Research are the town's lower blocks, each door a glazed pair under a deep canopy with the name on it: リサイクルセンター RECYCLING CENTRE on the street, sorting bins in four colours beside it; けんきゅうじょ AMAKAWA RESEARCH at the walk's end. The three doors are shut, a white card on the glass: 準備中 CLOSED. The factory's gates and the plant's door are chained.

Past the works street's mouth, not walked here, the harbour's ground is built as the harbour builds it: the office street from the supply yard to Amakawa Trading's east end with its verge, lamps and planting, Amakawa Trading's front and forecourt, the harbour walk's first stretch south, the trees between the yard and the works street, and the yard's slabs, painted footway, containers and floodlight mast beyond the warehouse.

The camera turns with the place, and a held direction key keeps its frame until it is let go (as in the east lane). Up the lane it looks from the south-east, so the plant's door faces it; over the yard from a little east of south, so the shed, the factory's gates and the gatehouse face it; on the hall apron from the south-east, so the server hall's door faces it; up the street and along the research walk from the south-west, so the recycling centre's and Amakawa Research's doors face it.

In the morning the sun is the plaza's; after work the lamps, the server hall's door and two of its high windows, the two fronts' ground floors and canopies and the town's windows light up; the factory, the plant and the gatehouse stay dark. It also loads directly with `?place=works`, where the lane meets the yard. Nobody is here yet.

### Things

| Id | Label | What it is |
|---|---|---|
| `harbour_lane` | To the harbour | The works lane south, back into the supply yard. |
| `office_street` | To the office street | The works street south, back onto the office street. |
| `old_power_plant` | Old power plant | The plant's door on the lane. Go in: chained. |
| `old_factory` | Old factory | The factory's gates on its apron. Go in: chained. |
| `server_hall` | Server hall | The server hall's door on the hall apron. Go in: shut. |
| `recycling_centre` | Recycling centre | The recycling centre's door on the works street. Go in: shut. |
| `research_lab` | Amakawa Research | Amakawa Research's door at the research walk's end. Go in: shut. |

### Spots

`lane_entry` (where the lane meets the yard, facing north), `chimney_foot`, `smoking_corner`, `gatehouse_window`, `transformer_lot`, `weather_station` (the nooks, below)

### Nooks

Corners off the way, each reachable on foot, with something to look at and room for something more. Nothing is in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `chimney_foot` | The lane's dead end past the plant's door, under the pipe bridge | The chimney's plinth and its caged ladder, two old drums | A secret |
| `smoking_corner` | Behind the server hall, off the lane, fenced from the yard | The hall's condensers, a plank bench on two crates, a sand bucket, きつえんじょ SMOKING AREA on the wall | An encounter |
| `gatehouse_window` | On the factory apron, at the gatehouse's counter window | The sliding window and the shelf under it | A collectible |
| `transformer_lot` | East of the gatehouse, through the open gate of its chain-link fence | Two old transformers with their insulators, a water tank on legs, weeds | A secret |
| `weather_station` | North of the research walk by Amakawa Research, through a low fence's open gate | A white louvred screen on legs, a rain gauge, a wind mast | An encounter or a collectible |

### Seats

None.

### Zones

`lane_exit` (the lane's south end, a step into the supply yard), `street_exit` (the street's south end, at the office street)

### Who's there when

Nobody yet.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Arrive | Goal line: "Head office is back down the works street and east along the office street, past the gym and the plaza. Take its lift down to B2."; after work, "The dorms are back down the works street, east along the office street, past the gym and down the north street." |
| `chained` | Go in at the factory's gates or the plant's door | It is chained shut. |
| `shut` | Go in at the server hall's, the recycling centre's or Amakawa Research's door | The door is shut; a card on the glass says 準備中: not open yet. |
| `to_harbour` | Use or walk into the lane's south end | Eric walks back down into the supply yard. |
| `to_street` | Use or walk into the street's south end | Eric walks back down onto the office street. |

### Creatures

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `crows` | crow | 4 | `all` | On the factory's saw-tooth roofs, the power plant and the walls. |
| `pigeons` | pigeon | 5 | `day` | On the works yard's old concrete. |
| `sparrows` | sparrow | 3 | `day` | On the yard and the street, in the weeds and hedges. |
| `butterflies` | butterfly | 2 | `day` | Over the planting. |
| `works_cat` | cat | 1 | `all` | A black cat on a wall or a ledge. Can be petted. |

## The lift (`lift`)

A small lit car, the same inside head office at the forecourt (floor 1) and on B2. The display counts floors: B2, B1, 1 to 5 in the ride. No things of its own; the ride's lines are in the [`emi-budget`](stories/emi-budget.md) storyline.

## IT support, B2 (`office`)

The second basement of head office: IT support. One compact floor, close to square with no empty gaps, planned from the B2 pixel mockup (art/pixel/island/b2/mockup2-full-1x.png; Jørgen: "not bad"), not from 3-office.png's plan, which was "kind of nonsensical". Top row, left to right: the lift landing with the stairwell behind it and a vending machine; the main office (企画室) with one island of six steel desks and the section chief's desk across its head; the machine room (機械室) with the server racks, behind a door with a card reader. A corridor runs across the middle, with the fire exit at its right end. Bottom row: Emi's office and the copy room (コピー室), the kitchenette (給湯室, its door facing the office door, with a tray of seven cups, three of them dusty), then the men's and women's toilets. Door plates B2 and 企画室７. Near walls are cut away for the play camera.

Emi's office is the left part of what was one big copy room, split by a partition (Jørgen, 2026-10-05: "the copy room is too big, if you slice it vertically and use the left side for Emi's office, that would work. her office should have some decoration not just bare walls, and a defined desk etc."). It has its own doorway from the corridor, a plate マネージャー / MANAGER on the wall top beside it, and carpet tiles instead of the copy room's vinyl. She sits facing the doorway (Jørgen, 2026-10-05: "it doesnt make sense to have her back to the door, and the guest seat on the inner side of the office"): her desk stands in the middle of the room with her chair on the far side, and the guest chair is on the visitor side between the doorway and the desk, on a rug, facing her. Her desk is open underneath (Jørgen, 2026-10-05: "the desk should also be open underneath showing her legs"): no front panel, one drawer unit on the side away from the doorway, so her legs and feet show from the doorway and from the guest chair. On the desk: a monitor, a keyboard, a paper tray, folders, a desk lamp, a mug and a nameplate エミ / EMI facing the visitor. Beside her, a backlit coast panel on the left wall stands in for a window (B2 has none), and a wall calendar hangs on the partition. Behind her a low cabinet holds a framed team photo, a small plant and binders, with a tall plant in the corner and a filing cabinet by the partition. Inside the doorway a coat stand stands by the corridor wall, and two framed prints hang over a low bookcase of binders on the left wall. The way from the doorway to the guest chair and round the desk is clear. The copier, the fax, the paper shelf and the worktable are in the copy room on the right.

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
| `my_chair` | Your chair | Starts in the machine room with Tama asleep on it. Its action, "Push to your desk", sends it home: Eric pushes it through the corridor to his desk with Tama riding. Petting Tama does the same, and she is the goal there (`tama`, below). |
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

`lift_out`, `mori_greet`, `lobby`, `office_door`, `my_seat`, `emi_seat`, `emi_door` (the doorway of Emi's office, in the corridor's south wall), `emi_desk` (the middle of her desk; for the camera and pins, not a walk target), `copier_front`, `coffee_front`, `corridor_w`, `corridor_e`, `machine_front`, `mio_by_desk`, `kenji_desk`

### Seats

`my_seat` (Eric's, south row, middle), `mio_seat` (south row, left), `emi_seat` (Emi's desk chair, in her office, facing the doorway; she gets on from behind it)

### Zones

`office`, `emi_office`, `copy_room`, `kitchen`, `toilets`, `machine_room`, `corridor`. The copy room and machine room zones start a step past their doorways.

### Who's there when

Day 3: B2 is empty on Saturday.

Day 2 (the `officeDay2` hook, also on entering, before the lift doors open): before the shift ends Emi sits at her desk in her office, Mori sits at the chief's desk and Kenji at his. Mio is at the station on the warm promise history (`lunch_mio || mio_warm >= 2`) until `d2_ticket_done`, then at her desk beside Eric's; on the other history she is at her desk all morning. At her desk she alternates typing with reading the monitor and looks toward an approaching player; this activity yields during dialogue. After work (sitting at Eric's desk) Emi is upstairs and the others have gone to the gathering, so none of them is here. Lunch, the copier and the day-1 evening don't run.

The story moves the clock ([systems.md](systems.md)): morning when Eric arrives, lunch at 12:10, afternoon at 14:00, evening at 18:05.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | In the machine room in the morning and at lunch; sitting at her desk in the afternoon; standing beside Eric's desk in the evening, until she leaves by the lift. | morning `racks`, lunch `racks`, afternoon sits `mio_seat`, evening `mio_by_desk` |
| `mori` | Waits at the lift landing to greet Eric, then at his desk; the kitchenette table at lunch; gone home in the evening. | lunch `kitchen_table`, afternoon `chief_desk`, evening hidden |
| `kenji` | His desk, north row, left; gone home in the evening. | evening hidden |
| `emi` | Upstairs all day, so her office is empty; comes down at 17:40, then sits at her desk in her office for the rest of the day. | early hidden, morning hidden, lunch hidden, afternoon hidden, evening sits `emi_seat` |
| `tama` | Asleep on Eric's chair in the machine room, then wherever the chair goes. In the machine room she is the goal, and petting her sends the chair home with her on it (Jørgen, 2026-10-04: "make the cat be the one that moves the scene along"). | – |
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

Eric's block, `dorm_1` in the island layout, from the plan Jørgen picked on [dorm-floor-1](../../reviews/dorm-floor-1/review.json) (option a, the open-air corridor, 2026-09-30): five storeys of plain concrete, the long face on the dorm courtyard, the return at its south end. The ground floor has the entrance hall, the manager's room, the stairs and rooms that are not part of day 1; 2F to 5F have six flats each, off an open corridor on the court side. The hall is walked in the courtyard (`dorm_court`), the stairs from it are the trip, and the 2F corridor, 3F and the roof are walked in `dorms` (Jørgen, 2026-10-05: "I should not be forced out and there should be things to discover"). No lift.

- Entrance hall: the glass front with its open doors, a doormat inside them, the 24 mailboxes on the back wall (rows 5F at the top down to 2F, each with its room number; 203 has a strip of tape reading エリック), the manager's window, the passage to the stairs and the notice board right of it. The board and the manager's window have a look line each (`dorm_court` Things). Shoes stay on in the common parts: every flat has its own genkan, so there are no shoe lockers and no step.
- Manager's room (管理人室 MANAGER, on a plate over the window): behind the mailboxes, its window facing the hall beside the passage's mouth, curtain drawn and light off for the night. Nobody is there on day 1.
- Stairs: in the return, where it meets the long block, two flights a floor with a half landing, behind the stair window on the return's face; the corridor on each floor runs into them. On each landing the flight down runs along the stair window and the flight up beside it, drawn a few treads up and cut like the walls. The 2F landing has the store's steel door, a 2F sign and a fire hose cabinet; the 3F landing a 3F sign, the fire hose cabinet and a drinks machine (blue band, lit front, a bin beside it) where 2F has the store. No lift.
- 2F: six flats along the corridor, numbered from the stairs, skipping 4 as many Japanese buildings do: 201 (dark), 202 (home, TV on), 203 (Eric's), 205 (out, dark), 206 (desk lamp on), 207 (dark, a crate of empty bottles at the door). Each door has its number plate over it and a light beside it, a meter box and a grilled kitchen window; 202's and 206's kitchen windows are lit. The corridor is open to the court behind a low parapet; below it are the roofs of the hall, the laundry and the sento, and at the west end the garden: moss under two zelkovas and two maples, shrubs, the hedge along the block and its tall lamp. Every flat's window is at the back, and dorm_1e's wall stands about 1.2 out behind them. Past 207 the floor's shared kitchen (KITCHEN on the plate over its open door, a lit kitchen window beside it): a flat's width, one room cut open at the ceiling, with a counter along the west wall (sink, two rings under a hood, a pot, the rice cooker, a kettle, a dish rack), a tall fridge in the back corner with name magnets and a note asking for room numbers on the food, a shelf of coloured baskets one per flat with the microwave and a toaster on top, a whiteboard of rubbish days over a table along the east wall with two stools, the sorted bins inside the door, and a blind half down at the back window. He can walk in; while he is inside, its front above the cut-low wall fades away, as his flat's does, and comes back when he leaves (the laundry on 3F is the same). Then the block's end wall, with the fire escape's steel door under its green sign and the escape's top landing outside. The floor's notice board hangs on the corridor wall between 201 and the stairs.
- 3F: the same corridor and stairs a storey higher, 301 to 307. All six flats are cut open like 2F's: 303 with a desk lamp on, 305 home with the TV on, the rest out and dark. 303's and 305's kitchen windows are lit, as the court sees them. At the doors: work boots at 301, a bag of cans at 302, a glass wind chime at 303, an umbrella at 305, a pot plant at 307. Past 307 the building's laundry (LAUNDRY over its door): three top-loading washers along the west wall (the middle one dark, "Broken. Reported." on its lid), a coin dryer on its stand and a sink at the back, a shelf of powders over the lost property box (a sock and a hand towel on it), a folding table with a basket and folded washing, a plastic chair to wait in, and "Machines until 22:00, please" on the wall.
- 4F and 5F repeat 3F (401 to 507); the stairs pass them on the way to the roof.
- The roof: up the stairs from 3F, out of the stair house on the return through its steel door under a bulkhead light (a card by the door with the roof's hours; on top a vent hood, an aerial and a lightning rod). The long flat roof over the flats and the corridors, grey-green in bays with a low parapet all round, a steel fence on the back and west parapets: four air-conditioner units along the back with their duct running east, a row of capped vent stacks down the middle and a roof hatch, the water tank on its steel stand by the stair house with its ladder and pipe, a pair of washing poles with a sheet, two towels and a shirt left out, a futon aired over the front parapet with two pegs, five polystyrene boxes of tomato plants and herbs along the front with a watering can, a pot with a small mandarin tree, a hose reel at the back, and at the west end two blue folding chairs and an upturned crate with a coffee can on it, and a plank bench on two blocks along the parapet. Over the back parapet dorm_1e rises two storeys more, its wall with a few small lit windows; past the front edge the block's face drops away into the dark, the corridor parapets of the floors below a shade lighter.
- Gate to Eric's genkan is under 20 seconds: about 5 seconds' walk to the passage, the trip up about 5, the corridor to his door about 5, the walk in about 3.
- Between the floors in `dorms` the stairs are a watched move in the one place: he walks onto the flight with the camera close, the frame crossfades, and he comes up (or down) the next flight onto that floor's landing, or out through the stair house's door onto the roof, and the camera lets go.

## Dorm courtyard (`dorm_court`)

The entrance court of Eric's dorm, on the west side of the dorm cluster in the south-east of island-map-4 (Jørgen, 2026-09-30: "less saturated, uses our existing style. Focus on the area we need, not the whole island at once. Break the outdoor locations into chunks you navigate between"). The camera looks east at the blocks, the way the map has them. At the back stands his block: plain concrete, five storeys, running past both edges of the frame, with an open corridor along it on every floor from 2F up: the slab and a low concrete parapet, and behind it the flats' steel front doors, each with a light, a meter box and a grilled kitchen window, some lit (the building is described under Eric's dorm building). 203's door, Eric's, is almost straight above the hall doors. On the right the block turns and comes forward along the court's side; on the return's face, by the corner, a tall lit stair window on every floor. In front of the block is the one-storey entrance hall, its glass front cut low like the indoor near walls, with open doors, and Eric can walk in: a doormat inside the doors, the bank of 24 steel mailboxes with their room numbers on the back wall, then the manager's window, then the passage to the stairs, and the notice board right of the passage. Behind the hall, under the 2F corridor, a flat roof with a parapet, an air-conditioner unit and a vent. A low stone by the door reads 社員寮 STAFF DORM. West of the hall is the coin laundry's lit shopfront (コインランドリー COIN LAUNDRY, washers behind the glass) under a shallow steel canopy, with a flat roof behind a parapet and three air-conditioner units and a vent on it. East is the sento: a low front under a gabled roof of grey tiles, a navy ゆ BATH noren over its lit door, and behind it the boiler room's flat roof with the tall chimney rising past the dorm's roof. Both are frontages only. Two drinks machines, one red and one blue, stand lit in front of the laundry's blank west end. The court is laid on the shared outdoor kit, on two axes. The way in runs north-south on the hall doors' axis: the lane from the plaza (grey brick between pale borders, as in the plaza) runs past the front as the street, and turns in through a gateway in the front bed, a stone pier with a lantern either side, then across the walk and up to the doors between two low beds. The court's walk of dark granite with a pale border runs east-west from the garden at the west end, past the machines, the laundry, the hall and the sento (a leg up to its door), to the bike shelter; pale square pavers fill the rest. The bike shelter stands on the east side against the block's return: a frosted roof on steel posts running out past the return's front, a lit strip under it, a rack of six places with five bikes, all under the roof, and a blue bike sign. The court is closed on the west and the south by raised beds with a low wall. The front bed is pale raked gravel with planted groups on moss: at the gate a clipped podocarpus column and a sweep of clipped azaleas either side; west of it a lit stone lantern with hakone grass, and a maple over clipped balls and a white sasanqua; east of it a walled bay with clipped balls and grass, then maples, clipped balls, a white sasanqua and a cherry out of the frame, where the bed ends at the dorm row. A bench backs onto it, with the sorted bins next to it; the dorm's garbage cage stands in the south-east corner, and there are air-conditioner units at the foot of the return. The garden west of the laundry has zelkovas, maples and shrubs, a hedge against the block and a tall lamp where the walk ends. Another tall lamp stands by the drinks machines, with two low bollard lights along the front bed. Across the street is a verge with a low hedge and a row of zelkovas, as along the lane in the plaza, and a small two-storey building. Past the frame the rest of the dorm cluster stands round an inner court, on the same grid as Eric's block (backdrop, 2026-10-01; Eric can't walk it, he sees it on the map). South of the court's front bed the dorm row leaves the street east, 3 wide in the lane's brick between pale borders, along the end of Eric's block and the inner court, with lamps and zelkovas in tree pits along its south edge and a verge with a low hedge behind them. South of it, between the ramen shop and dorm_2, a lawn with cherries, a pine, drifts and a bench; then dorm_2's paved apron and door. The row ends in a square of herringbone brick at dorm_3's main door, and a walk between two beds runs on east to a terrace with three benches looking south over the coast and a black pine in a raised bed. The inner court lies between dorm_1e, the dorms' two-storey common building (dorm_gallery), dorm_3 and the row, hedged on the row: four kerbed lawns with ginkgos, a maple and a cherry, and two walks of pale slabs crossing at a paved square with a maple in a raised bed, two benches, a low seat wall and the sorted bins round it, and two lamps. One walk runs from the common building's glazed door (a notice board beside it, bikes left on its apron) over the row to dorm_2's door, the other from dorm_1e's door to dorm_3's side door. From the court's north-east corner a walk runs north along dorm_3 to a back walk that joins dorm_entry's door to dorm_4's, past a roofed bike shelter full of bikes, with lamps on its edge and beds of mixed trees and shrubs behind it and between the towers. The blocks are concrete, three to nine storeys, with floor bands, windows on every face, and on dorm_1e's court side and the south faces of dorm_2, dorm_3 and dorm_4 a balcony a room with pale fronts, dividers, air-conditioner units and washing; their flat roofs carry plant, and each door is a glazed entrance under a canopy with a name board, a light over it and a potted shrub either side. Round the outer edges run planted belts: black pines along the coast to the south, mixed trees to the north and east. After work the lamps, the door lights, the bike shelter and some windows are lit. Further out the town comes from the island layout. Evening: dusk after the sun has dropped behind the blocks, with a cool sky and a last warm light from the west. The block's lit windows, the lamps and lanterns, the hall, the laundry, the drinks machines and the sento door light the court.

Eric arrives along the lane from the plaza on the walk home, through the gate, and walks in through the hall doors himself. Walking into the passage at the back of the hall, or using it, starts the trip up the stairs to 2F. The courtyard also loads directly with `?place=dorm_court`. The sento doorway has no public interaction. Private mode can add an optional scene there; it is not part of the public story.

### Things

| Id | Label | What it is |
|---|---|---|
| `bath` | Bath | The sento's lit doorway under the ゆ noren. The pin stays off in the public story. Private mode may show it and run `bathPeep`. |
| `dorm_entry` | Dorm entrance | The hall's glass doors; using them walks Eric in. Its pin goes once he is inside. |
| `stairs` | To the stairs | The passage at the back of the hall, to the stairs. |
| `street_gate` | To the street | Day 2: the court's gate, out to the lane and the east lane. Its pin shows while the story uses it. |
| `mailboxes` | Mailbox 203 | Eric's mailbox in the bank: 203 and his name on tape (エリック ERIC), a flap that opens (the `mailbox203` hook) on one folded bakery flyer (パン BAKERY). Take mail: the box opens and Eric takes the flyer (a find, [systems.md](systems.md), Finds); the box stays empty after, and its pin goes. Its pin shows once the story uses it. |
| `hall_board` | Notice board | The hall's notice board, right of the passage. Read, its pin when he is close: a narration line (game3d/story/dorm-building.js). |
| `manager_window` | Manager's window | The manager's window, left of the passage, its curtain drawn. Look, its pin when he is close: a narration line (game3d/story/dorm-building.js). |

### Spots

`plaza_entry` (just inside the gate), `dorm_entry` (outside the doors), `hall` (just inside the doors), `passage` (the passage's mouth), `bath` (a step short of the curtain)

### Seats

None.

### Zones

`hall` (inside the doors), `passage` (the passage's mouth), `street_exit` (day 2: out on the lane past the gate)

### Who's there when

Day 3: Tama asleep on the courtyard's bench in the afternoon.

Day 2: no story actor; the street gate and the way up to room 203 stay open in both periods. Coming down from his floor, Eric walks out of the passage to just inside the hall doors. In the morning the court has the other chunks' morning light, its lamps off and a little more light from the sky in the blocks' shade; it turns to dusk after work.

Played in the evening, after work. None of the cast is here.

| Id | Usually | Schedule |
|---|---|---|
| `mio` | Not here. | – |
| `tama` | Day 3, afternoon: asleep on the bench. Can be petted. | – |

The crowd ([systems.md](systems.md), The crowd):

| Period | Walking | Sitting | Talking | Waiting | Stop on the way | In twos | What they do |
|---|---|---|---|---|---|---|---|
| evening | 3 | 0 | 0 | 0 | 0% | 0% | Two or three residents between the street gate and the hall doors, in and out. Nobody sits, and nobody stops in the doors, the passage, the sento doorway or at the mailboxes. |

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `mailboxes` | Optional interaction on the walk home | [The walk home](stories/evening-walk.md). The bath is not a public node. |
| `arrive` | Arrive | Goal line: "Go in through the dorm entrance. Your room is 203." Its pin on the hall doors. |
| `hall` | Step inside the doors, or use them | Goal line: "Room 203 is on 2F. The stairs are through the back." Its pin on the passage. |
| `go_up` | Reach or use the passage | The trip up to `dorms`. |

### Creatures

Grok agreed to these (G-0033): they keep 3 m clear of the sento doorway, the hall doors, the mailbox bank and the stairs passage.

| Id | Kind | How many | When | Where |
|---|---|---|---|---|
| `sparrows` | sparrow | 4 | `day` | On the court's paving and the front bed's wall. |
| `cat` | cat | 1 | `evening` | A grey tabby on the front bed's wall or a bench. Can be petted. |

## Eric's dorm room (`dorms`)

Eric's floor, 2F of the dorm building (above), and his flat, 203; also 3F and the roof, built beside it in the same place and reached by the stairs (Eric's dorm building). The worst room in the dorm ([cast.md](cast.md)), built from the room view in [dorm-route-1](../../reviews/dorm-route-1/review.json) (2026-09-30) and furnished as a real company-dorm 1K on 2026-09-30 (issue #75). All three playable floors share the building’s position on the island map. The camera looks north, down into the flat with its ceiling cut away; the flats either side are cut open at the same height, so the floor reads as a row of rooms of the same plan (reworked 2026-09-30 after the re-score in notes/environment-critique.md). They sit a shade darker than his, capped pale where the walls are cut: on the right someone is home (a kotatsu with a cup noodle and mikan, the TV on in the corner, washing on a rack, curtains drawn), on the left they're out (dark, the bed made, the monitor off at a desk under the window, suits on a rail); at the frame's edges one more flat each side, one with a desk lamp on. Past them, on the left, 207, dark with its bed made, and the shared kitchen at the corridor's west end; on the right the building is cut solid. At the back is the room itself, about 3 by 4 metres, on six tatami mats with navy borders. In the back-left corner, against the back wall left of the window, a grey steel desk with the company computer on it, set up and switched on before he arrived (Jørgen, 2026-10-03: "the apartment of eric should have a computer"): the monitor showing a plain desktop (sea-and-island wallpaper, a few icons, one window, no words) with a soft cool glow on the desk and a welcome note stuck on its corner, the keyboard, the mouse on its pad, a small tower in the corner with his headphones hung over it, a mug, and the arm lamp switched on over the mouse. The desk chair stands in front of it, pulled out and turned a little toward the room. The single bed runs along the left wall (white steel frame, the navy duvet turned back, his work bag dropped on it), a nearly empty shelf over its head (the company handbook and today's forms, a few books, a small plant) and a company calendar on the wall over it. In the back-right corner the oshiire: sliding paper doors below, a small cupboard above, one door pushed back on the folded company futon. Between the closet and the boxes a rug with a folding table, his konbini bento, a bag and a bottle of tea on it and a muted red cushion beside it. His boxes from home stand along the right wall: two taped and stacked, one open with the flaps up and books and a sweater inside, a small one by the doorway, and his coat on a hook above them. The one window, straight ahead with dusty blue curtains drawn back and a white air conditioner over it, looks onto the next block's bare concrete end wall about two metres outside, lit by a lamp on that wall; straight across, a floor down and seen through his window from the play camera, the frosted window of a bathroom in the flat opposite, lit, with the shapes of shampoo bottles, a cup of toothbrushes and the shower head behind the glass and its fan grille beside it. A clear aisle runs from the doorway to the window. In front of the room is the entry strip, on grey plank vinyl: the kitchenette on the left (sink, one ring, a steel splashback with the range hood fixed to it and its duct boxed in up the wall, a strip light under the hood, a small fridge under the counter, a kettle, a mug and a dish rack), the unit bath on the right behind its door (tub, basin, toilet), and the genkan a step down inside the front door, with pale grey tiles under its own small light, the shoe cupboard, his work shoes on the tiles and the company slippers at the step. The room's frosted sliding door stands open along its wall. Outside the front door is the open corridor, with a low parapet and the neighbours' steel doors either side (number plates, corridor lights, meter boxes, grilled kitchen windows, lit where someone's home; an umbrella and sandals at the right-hand door, a pot plant and a parcel waiting at the left-hand one). It runs right past 202 and 201 and the floor's notice board to the landing at the top of the stairs, where the flight Eric comes up rises from the half landing along the stair window, the flight up to 3F beside it; and left past 205, 206 and 207 to the kitchen and the end wall. From the corridor his own front is full height with its door shut and 203 over it, like the neighbours'; once he has stepped in through the door it fades out to the cut-low front the room is seen through. The strip's walls and the parapet are cut low for the camera, and past the parapet are the roofs of the hall, the laundry and the sento below. The light is a dim cool evening, with the warm light of the ceiling light (on the ceiling the camera looks through, so it isn't drawn), the desk lamp's pool, the light under the kitchen hood and the cool corridor light at the door.

Eric arrives from the dorm courtyard (Getting between places) on the landing. The corridor camera looks down on it from over the court: on a desktop the whole way from the landing to his door, on a phone following him. He walks left past 201 and 202 to 203, and can walk on along the corridor, into the kitchen and up the stairs. Stopping at his door, walking up to it or using it, he goes in (walking past it along the corridor doesn't): he steps to the side, the door swings open onto the corridor, he steps through, the tall front fades out as the camera widens to the whole flat, he walks over the genkan to `room_entry` and the door shuts behind him. The window, the boxes and the bed have their pins once he is inside. Going out (day 2 on: the front door, the genkan, or a story's trip to the courtyard while he is inside) he walks over the genkan, the door swings out, he steps onto the corridor as his tall front comes back up round the door and the view goes back to the corridor, and the door shuts behind him; he is on the corridor, free to walk it. The flight down from the landing is the way out to the courtyard (Getting between places). The small things round the building have a pin when he is close and one narration line each (game3d/story/dorm-building.js), the same every day. While the goal is his door or his front door and he is on another floor (or out on the corridor), the goal's pin is on the way down. It also loads directly with `?place=dorms`, on the landing. Nobody else is here.

### Things

| Id | Label | What it is |
|---|---|---|
| `window` | Window | The one window, onto the concrete wall. |
| `boxes` | Boxes | His two boxes, sent ahead, by the desk. |
| `bed` | Bed | The single bed. |
| `door_203` | Room 203 | His front door on the corridor. |
| `computer` | Computer | The company computer on his desk, switched on. Look. |
| `door_out` | Front door | Day 2 on: the front door from inside, over the genkan. Go out: out onto the corridor (the `leaveRoom` hook). |
| `stairs_up` | Upstairs | A stair pin on 2F and 3F at the foot of the flight up, beside the flight down. Go up: up to 3F, or from 3F up past 4F and 5F and out of the stair house onto the roof. |
| `stairs_down` | Downstairs | A stair pin at the top of the flight down on 3F (to 2F) and on 2F (day 2 on: the trip down to the courtyard); on the roof the stair house's door (down to 3F). |
| `kitchen` | Shared kitchen | 2F, the shared kitchen at the corridor's west end. Look: a narration line (game3d/story/dorm-building.js). |
| `notices` | Notice board | 2F, the notice board on the corridor wall by the stairs. Read: a narration line (game3d/story/dorm-building.js). |
| `laundry` | Laundry | 3F, the washers in the laundry. Look: a narration line (game3d/story/dorm-building.js). |
| `drinks` | Drinks machine | 3F, the drinks machine on the landing. Look: a narration line (game3d/story/dorm-building.js). |
| `washing` | Washing | The roof, the washing on the line. Look: a narration line (game3d/story/dorm-building.js). |
| `planters` | Planters | The roof, the tomato plants along the front. Look: a narration line (game3d/story/dorm-building.js). |

### Spots

`landing` (at the top of the stairs), `door_203` (in the corridor at his door), `room_entry`, `window_front`, `desk_front` (beside the desk chair, facing the computer), `landing_3f` (on 3F's landing), `roof_door` (on the roof, just out of the stair house's door), and the nooks `dorm_2f_end`, `dorm_kitchen_shelf`, `dorm_3f_end`, `dorm_laundry_box`, `dorm_roof_chairs`, `dorm_roof_units` (below)

### Nooks

Small places off the walks, kept for later secrets, encounters and collectibles (GUIDE, Visual design). Each is a named spot in the place's code; nothing is placed in them yet.

| Id | Where | What's there | Could hold |
|---|---|---|---|
| `dorm_2f_end` | 2F, the corridor's west end, past the kitchen's door. | The end wall with the fire escape's door under its green sign, the escape's landing outside. | An encounter: someone sneaking in or out by the fire escape. |
| `dorm_kitchen_shelf` | 2F, in the kitchen by the shelf of baskets. | A coloured basket for each flat, the microwave and the toaster on top, the whiteboard. | Something left in another flat's basket; a note on the whiteboard. |
| `dorm_3f_end` | 3F, the corridor's west end, past the laundry's door. | The same end wall and fire escape door as 2F's. | An encounter on the way to the laundry. |
| `dorm_laundry_box` | 3F, in the laundry by the lost property box. | A cardboard box of lost things under the shelf of powders, a sock and a hand towel on top. | A collectible in the box. |
| `dorm_roof_chairs` | The roof's west end, by the parapet. | Two blue folding chairs, an upturned crate, a coffee can. | An encounter: whoever sits up here in the evenings. |
| `dorm_roof_units` | The roof, past the end of the air-conditioner units along the back parapet. | A corner out of sight of the stair house door. | A secret: something tucked behind the last unit. |

### Seats

`desk_chair` (the desk chair, facing the screen; Eric gets on and off it from the desk_front spot)

### Zones

`door_203` (the corridor in front of his door, when he stops there or is walking to it), `room_exit` (day 2 on: down on the genkan tiles, on the way out)

### Who's there when

Day 2: the day starts with Eric inside room 203, in the middle of the room, in the room's view (in the morning daylight from the sky in place of the dusk, the lamps still on, and the calm loop). Mio sends a phone message but isn't here. The computer is optional, and coming back before the goodbye doesn't end the day; coming back after it, he walks on along the corridor and in at his door, and the day ends.

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
| `computer` | Look at the computer | One line of narration: the company set it up and switched it on, and someone stuck a welcome note on the screen. |


## Canteen (`canteen`)

The furnished ground floor occupies the existing canteen footprint north of the fountain plaza. Eight six-seat tables, two usable end chairs, tiled floor, teal chairs and wall protection, a hot-food counter with tray rail and cashier terminal, water dispenser, cups and a tray-return trolley. Back windows and a kitchen hatch sit above the service line. Three unnamed diners use the existing generic bodies; a worker stands behind the counter during daytime. No new conversation or food transaction is attached. At evening the worker is gone, the exterior windows darken and the wall lights warm the room; diners can still sit indoors. The existing terrace closing scene stays outside.

The entrance and return walk use the actual south-facing door. Main aisles connect the door, counter, water, return trolley and both usable chairs. Furniture and the staff lane block player movement. The upper floor and kitchen behind the serving line remain inaccessible. Desktop shows the room; phone follows the player.

### Things

| Id | Label | What it is |
|---|---|---|
| `canteen_exit` | Fountain plaza | Go out through the front door. |
| `canteen_seat_w` | Dining chair | Sit at the west side of the main aisle. |
| `canteen_seat_e` | Dining chair | Sit at the east side of the main aisle. |

### Spots

`canteen_in`, `meal_counter`, `water`, `tray_return`

### Seats

`canteen_seat_w`, `canteen_seat_e`

### Zones

None.

### Small moments

| Nodes | When | What happens |
|---|---|---|
| `arrive` | Enter | Points back to the plaza; no new dialogue. |
| `to_plaza` | Use the door | Walk back onto the terrace. |
| `sit_w`, `sit_e` | Use a dining chair | Sit; movement stands up onto the aisle. |

This completes one ground-floor interior. The training centre, clinic, unassigned office blocks, canteen upper floor and shop facades without their own registered place remain exterior shells or closed areas; this change does not make every island building enterable.


## Izakaya (`izakaya`)

The dining room fits the existing 4 × 4.5 game-unit building footprint at the east end of the shop street. A tiled threshold and entry mat open onto a shoes-on dining room with five upholstered chairs, a timber table, warm wall lights, low green wall panelling and a compact kitchen service hatch. Coats and umbrellas have space beside the entry. The aisle runs along the east side of the table; each chair has a tested free approach and a route back to the door. No invisible shoe removal or separate unbuilt room is implied.

### Things

| Id | Label | Use |
|---|---|---|
| `izakaya_exit` | To the shop street | Return through the same physical door. |
| `party_seat` | Your place at the table | Walk to the approach and sit. |
| `mori` | Mr. Mori | Talk at his table place. |
| `mio` | Mio | Talk at her table place. |
| `kenji` | Kenji | Talk at his table place. |
| `emi` | Emi | Talk at her table place. |

### Spots

`izakaya_in`, `party_group`, `party_food`, `party_mori`, `party_mio`, `party_kenji`, `party_emi`, `service_counter`

### Seats

`party_seat`, `party_mori`, `party_mio`, `party_kenji`, `party_emi`

### People

`mori`, `mio`, `kenji`, `emi`

### Zones

`izakaya_exit`

### Hooks

`partySetup`, `partyFood`
