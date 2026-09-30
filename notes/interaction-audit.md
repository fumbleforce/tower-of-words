# Interaction audit: what every selectable thing does (2026-09-30)

Issue #106. Jørgen, playing the office at "Go to the copy room with Mr. Mori." (notes/feedback-game/2026-09-30_211255): "there are a hundred 'interactive' things in this room with symbols that dont really do anything interesting, while Mio can not be interacted with, which is silly. All people should always be interactable, but dont necessarily need to say that much interesting."

## What changed

- People: every person with a body has a pin and Talk whenever they're visible and not walking. The story's `show` no longer hides a person. Talking runs their `talk:` entry if one holds (so the lines the story already had for these moments play again: Mio's nudges on the train, Mr. Mori's copier hint), else their `idle:` line (the contract is in game3d/story/FORMAT.md, Idle lines; Codex writes the lines), else they turn to Eric and nod.
- New people to talk to: the canteen worker on the plaza after work, and the gate's background office workers (Codex's body audit, X-0327): the two standing past the gate always, the three commuters only while they stand waiting at the jam. They live in the place's `extras`, not `people` (game3d/js/places/background-people.js): no saved positions, no story walks, but look, face and gesture reach them. The lift riders (only in the scripted ride) and the hidden train passengers are left out.
- Things are sorted by what they do right now (game3d/js/gameplay/interactions.js):
  - a talk line of its own, an engine action (the card readers), or the goal: the pin as before;
  - a flat one-liner (marked `pin: 'near'` in game3d/js/places/catalog.js): the pin only within 2.5 m of Eric;
  - only words: its own `say:` joke (the fan, the coffee machine) or the stock reply every thing gives to a word (the fridge: Jørgen asked for Say there in #103): the pin only within 2.5 m, and only once he knows a word; using it opens the Say menu;
  - nothing at all (no word known yet): no pin, and it can't be picked.
- A close-only pin never crowds out a full one, and a close-only thing loses a close call for the target to a person or a full thing (the covered monitor had taken the target from Mio beside it).
- A thing that gets a talk line later (a discovery) gets its pin back with no other change.
- Two word jokes that nothing could reach are reachable now: the clock (matte) and the kettle (irete) were "no marker" things, so no word could target them. They take their word once he knows it, with the pin close by.

## Pins on screen, before and after

Counted by game3d/tools/pin-count.mjs (pins drawn: shown, on screen, not crowded out by a nearer one; each case knows the words Eric has by then). The office copy-room case is Jørgen's moment: Eric by the south desks with Mio beside him. The place's start scene leaves Mr. Mori standing at the lift in these stills.

| Moment | 1366 x 860 before | after | 390 x 844 before | after |
|---|---|---|---|---|
| Office, "Go to the copy room with Mr. Mori." | 21 | 11 (Mio one of them) | 10 | 4 (Mio one of them) |
| Office, afternoon | 23 | 10 | 11 | 5 |
| Train, seated, cat task | 7 | 8 (Mio added) | 7 | 8 (Mio added) |
| Security room, the jam | 8 | 8 (two office workers added, three things gone) | 5 | 5 |
| Forecourt, after work | 3 | 3 | 2 | 2 |
| Plaza, after work | 3 | 3 | 1 | 1 |

## Every thing, per place

"Pin before" and "Pin now": always; while a condition holds; close only (within 2.5 m); goal only (things marked "no marker" in the engine, which show only as the goal); none. "What it does" is the first steps of each talk entry and the words that have their own effect on it.

### Train (`train`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `aoi` | Woman on her phone | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `kuroda` | Sleeping man | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `reader` | Man with a book | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `music` | Girl with headphones | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `rei` | Woman with a laptop | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `cup` | Coffee | nothing of its own | goal only | goal only | story prop (the coffee); no marker |
| `bun` | Woman with a bun | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `youth` | Young man | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `tama` | Cat | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `doors` | Doors | talk [lesson_done && !arriving]: [goal] / [walk] / [stand]; talk [alighted && !on_platform]: [goal] / [walk] / [face] | always | while a talk entry holds, else none | story (getting off) |
| `door_l` | Doors | talk [lesson_done && !arriving]: [goal] / [walk] / [stand]; talk [alighted && !on_platform]: [goal] / [walk] / [face] | goal only | goal only | story |
| `door_r` | Doors | talk [lesson_done && !arriving]: [goal] / [walk] / [stand]; talk [alighted && !on_platform]: [goal] / [walk] / [face] | goal only | goal only | story |
| `plant` | Plant | talk: > It's plastic. Someone has watered it anyway. | goal only | goal only | charm, but already no marker (kept as is) |
| `bags` | Bags | talk: > Bags on every seat but one. | goal only | goal only | hint toward the free seat; no marker (kept) |
| `rack` | Luggage rack | talk: > Every suitcase up there has the same Amakawa luggage tag. | goal only | goal only | world detail; no marker (kept) |
| `straps` | Straps | talk: > You hold on as the car sways. Nobody else bothers. | goal only | goal only | flat; no marker (kept) |
| `window` | Window | talk: eric: Sea on both sides. Nobody said the island was this far out. | goal only | goal only | Eric's first line about the island; no marker (kept) |
| `poster` | Poster | talk: > A poster in katakana, with a smiling cartoon monorail on it. | goal only | goal only | flat; no marker (kept) |
| `sign` | Station sign | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `foodbag` | Her lunch bag | talk [bag_wobble]: [bag] / mio: Ah, sorry, sorry. Thank you. It's pickles. My mother thinks island has no food, so... every time I visit. | always | while a talk entry holds, else none | story (the falling lunch bag) |
| `stander` | Man with a bag | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `platform` | Platform | nothing of its own | goal only | goal only | nothing to do on it |
| `mio` | Mio | a person | always while `!sat || !lesson_on || (cat_done && !lesson_done) || (phone_buzz && !can_exit)` | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

### Security room (`gate`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `guard` | Mr. Ishibashi | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `kuroda` | Mr. Hamada | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `aoi` | Aoi | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `tama` | Tama | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `reader_l` | Card reader | act (engine); words: akete | always | always | story (card taps) |
| `reader_r` | Card reader | act (engine); words: akete | always | always | story (card taps) |
| `gate` | Gate | talk [jammed && !gate_through_way]: [face] / [face] / [face]; talk: gatev: {ohayo}！カードをタッチしてください！; words: akete, matte, ohayo, sumimasen | always | always | words in context (the gate greets you, card please) |
| `desk` | Guard desk | talk [jammed && !gate_through_way]: [face] / guard: 少々お待ちください。 / [face]; talk [!greeted_guard && !guard_asked]: eric: Hi. Um... good morning? / [typing] / [emote]; talk: [gesture] | goal only | goal only | same as the guard; no marker (kept) |
| `counter` | Visitor counter | talk: > TAMA is the first name in today's visitor book. | goal only | goal only | same line as the visitor book; no marker (kept) |
| `signin` | Visitor book | talk: > TAMA is the first name in today's visitor book. | always | always | charm (TAMA signed in first) |
| `lostfound` | Lost and found | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `screen` | Notice screen | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `kiosk` | Coffee machine | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `bench_l` | Bench | nothing of its own | goal only | goal only | nothing; no marker |
| `bench_r` | Bench | talk: [sit] | goal only | goal only | sit; no marker (kept) |
| `poster_l` | Poster | talk: > PEOPLE. IDEAS. PROGRESS. | always | close only | filler (company slogan) |
| `poster_r` | Poster | talk: > PEOPLE. IDEAS. PROGRESS. | always | close only | filler (company slogan) |
| `lift` | Station exit | nothing of its own | always | close only, once he knows a word (Say gets the stock reply); always as goal | goal once through the gate |
| `entrance` | Entrance | nothing of its own | goal only | goal only | no marker |
| `plant` | Plant | nothing of its own | goal only | goal only | no marker |
| `bowl` | Tama's bowl | nothing of its own | goal only | goal only | no marker |
| `worker_a` | Office worker | a background person | none (not a target) | always, Talk | people are always interactable (Codex's body audit, X-0327) |
| `worker_b` | Office worker | a background person | none (not a target) | always, Talk | people are always interactable (Codex's body audit, X-0327) |
| `commuter_1` | Office worker | a background person | none (not a target) | while waiting in the queue at the jam, Talk | people are always interactable (Codex's body audit, X-0327) |
| `commuter_2` | Office worker | a background person | none (not a target) | while waiting in the queue at the jam, Talk | people are always interactable (Codex's body audit, X-0327) |
| `commuter_3` | Office worker | a background person | none (not a target) | while waiting in the queue at the jam, Talk | people are always interactable (Codex's body audit, X-0327) |
| `mio` | Mio | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

### Forecourt (`forecourt`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `station_exit` | Station | nothing of its own | goal only | goal only | no marker |
| `office_entrance` | Head office | talk [!going_home]: : Take the lift inside head office down to B2. | always while `!going_home` | while a talk entry holds, else none | story (morning) |
| `lift` | Lift to B2 | talk [!going_home]: [next] | always while `!going_home` | while a talk entry holds, else none | story (morning) |
| `kuro` | Receptionist | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `plaza_lane` | To the plaza | talk: [trip] | always | always | the way to the plaza |
| `garden_bench` | Garden bench | talk [going_home]: [cam] / [sit] / [gardenCat] | always while `going_home` | while a talk entry holds, else none | discovery (Tama on the bench) |
| `fallen_bicycle` | Bicycle | talk [going_home && !evening_bikes_upright]: [cam] / [bicycle] / [bicycle] | always while `going_home && !evening_bikes_upright` | while a talk entry holds, else none | discovery |
| `mio` | Mio | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

### IT support, B2 (`office`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `emi` | Emi | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `kenji` | Kenji | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `rei` | Rei | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `aoi` | Aoi | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `mori` | Mr. Mori | a person | always while `!greeted_mori || afternoon_on` | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `tama` | Cat | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |
| `covered` | Covered desk | talk: > There's no dust on the name card in front of it. | always | always | charm and a small mystery (no dust on the name card) |
| `covered_monitor` | Covered monitor | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `box_crowns` | Box | nothing of its own | goal only | goal only | no marker |
| `cups` | Cups | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `nameplate` | Nameplate | nothing of its own | goal only | goal only | no marker |
| `my_desk` | Your desk | talk [!kenji_intro]: [walk] / [meet] / [face]; talk [afternoon_on && !evening_on]: [sitDown] / > 17:40. / [period]; talk: > Your name card, in katakana. Someone has written ERIC under it in pen, just in case. | always | always | story and charm (ERIC in pen) |
| `my_chair` | Your chair | talk [!chair_back && found_chair]: [chairRoll] / [walk] / [face]; talk: (nothing) | always | while a talk entry holds, else close once a word is known (Say only, #128) | story (chair push; claude-agent:chair-actions owns it) |
| `lift` | Lift | talk [going_home]: [trip] | always | while a talk entry holds, else none | the way home after work |
| `vending` | Vending machine | talk [vend_stuck]: [sound] / > Your drink still hasn't come out.; talk: [choice]; words: ugoite | always | always | the drinks (gifts) |
| `bench` | Bench | nothing of its own | goal only | goal only | no marker |
| `stairs` | Stairs | talk: > The stairs up. A line of small paw prints goes up them in the dust. | always | always | charm (paw prints in the dust) |
| `office_door` | Office door | nothing of its own | goal only | goal only | no marker |
| `inout_board` | In/out board | talk: > Four names in Japanese, and one new magnet in capitals: ERIC. | always | close only | flat line (a new magnet) |
| `clock` | Clock | words: matte | goal only | goal only, or close once the word is known | word toy (matte stops the second hand); was unreachable |
| `whiteboard` | Whiteboard | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `calendar` | Calendar | nothing of its own | goal only | goal only | no marker |
| `water_cooler` | Water cooler | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `cabinets` | Cabinets | nothing of its own | goal only | goal only | no marker |
| `fan` | Fan | words: tomatte | always | close only, once the word is known | word toy (tomatte stops it) |
| `boxes` | Boxes | nothing of its own | goal only | goal only | no marker |
| `chief_desk` | Mr. Mori's desk | nothing of its own | goal only | goal only | no marker |
| `machine_door` | Machine room | talk [!kenji_intro]: [walk] / [meet] / [face]; talk [!machine_open && knocked]: [walk] / [machineDoor] / mio: Okay, okay, I'm coming... Come in, but don't touch anything, okay? Especially the cables.; talk [!machine_open]: mio: Mm, one minute!; talk: [walk]; words: akete | always | always | story (the machine room) |
| `racks` | Server racks | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `fire_exit` | Fire exit | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `noticeboard` | Noticeboard | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `extinguisher` | Extinguisher | nothing of its own | goal only | goal only | no marker |
| `hydrant` | Hydrant | nothing of its own | goal only | goal only | no marker |
| `copier` | Copier | talk [got_ticket && !copier_done]: [walk] / [walk] / [face]; talk: (nothing); words: ugoite | always | while a talk entry holds, else close once the word is known | story (the ticket), then a word toy (ugoite prints a blank sheet) |
| `fax` | Fax | nothing of its own | goal only | goal only | no marker |
| `paper_shelf` | Paper shelf | nothing of its own | goal only | goal only | no marker |
| `worktable` | Worktable | nothing of its own | goal only | goal only | no marker |
| `coffee_machine` | Coffee machine | words: ugoite | always | close only, once the word is known | word toy (ugoite) |
| `kettle` | Kettle | words: irete | goal only | goal only, or close once the word is known | word toy (irete pours tea); was unreachable |
| `fridge` | Fridge | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `microwave` | Microwave | nothing of its own | goal only | goal only | no marker |
| `kitchen_table` | Table | nothing of its own | goal only | goal only | no marker |
| `toilet_m` | Men's toilet | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `toilet_f` | Women's toilet | nothing of its own | always | close only, once he knows a word (Say gets the stock reply) | nothing of its own |
| `plant` | Plant | nothing of its own | goal only | goal only | no marker |
| `mio` | Mio | a person | always while `(chair_back && !got_ticket) || (copier_done && !ticket_closed) || afternoon_on` | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

### Fountain plaza (`plaza`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `office_lane` | To head office | talk: [trip] | always | always | the way back |
| `fountain` | Fountain | talk: > A sign on the rim asks people not to throw coins. The bottom is covered in coins. | always | always | charm (coins under a no-coins sign) |
| `dorm_lane` | To the dorms | talk [going_home]: [trip]; talk: > The dorms are further down this lane. That's for after work. | always | always | the way home |
| `canteen_table` | Canteen table | talk [going_home && !evening_canteen_helped]: [cam] / [canteenChair] / eric: {sumimasen}。 | always while `going_home && !evening_canteen_helped` | while a talk entry holds, else none | discovery (the last chair) |
| `canteen_worker` | Canteen worker | a person | none (not a target) | always when not walking, Talk | people are always interactable; the chair stays the canteen table's |
| `mio` | Mio | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

### Dorm courtyard (`dorm_court`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `bath` | Bath | talk [going_home && !evening_bath_heard]: [face] / [bathSong] / > Someone else finishes the song for him. He's worse. | always while `going_home && !evening_bath_heard` | while a talk entry holds, else none | discovery |
| `dorm_entry` | Dorm entrance | talk: : Room 203 is on 2F. The stairs are through the back. | always | always | the way in |
| `stairs` | To the stairs | talk: [next] | always | always | the way up |
| `mailboxes` | Mailbox 203 | talk [going_home && dorm_room_known]: [mailbox203] / > エリック · erikku · Eric / [mailbox203] | always while `going_home && dorm_room_known` | while a talk entry holds, else none | discovery |
| `mio` | Mio | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

### Eric's floor (`dorms`)

| Id | Label | What it does | Pin before | Pin now | Why |
|---|---|---|---|---|---|
| `door_203` | Room 203 | talk: [goal] / [enterRoom] | always | always | the goal |
| `window` | Window | talk: eric: I was hoping I'd at least be able to see the sky. | always | always | Eric's line (charm) |
| `boxes` | Boxes | talk: eric: I can't remember which one I put the clean shirts in. | always | always | Eric's line (charm) |
| `bed` | Bed | talk: eric: If I lie down now, I'm not getting up again. | always | always | Eric's line (charm) |
| `mio` | Mio | a person | always | always, Talk (idle line or a nod when nothing else holds) | people are always interactable |

## Menus with nothing in them (issue #128, 2026-09-30)

The rule, now checked: a thing can be picked only while its menu has a row that does something now (docs/game/controls-and-ui.md, Markers). Two gaps were left after the sorting above:

- A talk entry that falls back to an empty node (office `my_chair` → `noop` before the chair is found or once it's back; `copier` → `copier_look` outside the ticket scene) counted as a use, so the menu showed an E row ("Look") that only opened the Say menu, with no Say row. It is no use now: those two show Say only, with the copier's own ugoite joke or the stock reply.
- Before Say is first used (the train, until the cat), a word made a thing pickable although the menu hides Say there. Words count only once Say has been taught.

The talk entries that hold only at some times (Hamada, the train doors, the lunch bag, the lifts, the garden bench, the bicycle, the bath, the mailbox, the canteen table) already gave no E row outside those times; they become Say-only things close by, or nothing before a word is known.

Checks: game3d/tools/menu-day-check.mjs plays the fast day and, at every moment no scene runs, fails on a pickable thing with no row that does something or an E row that does nothing (the rule lives in game3d/test/support/menu-effects.mjs). say-menu-check.mjs runs the same test per place with every word known; it had been listing things before the markers' 400 ms cache caught up with the words, so it missed the close-only things (office: 10 things checked before, 25 now).

| Check | Before | After |
|---|---|---|
| menu-day-check, whole day, 1366 x 860 | FAIL: office `copier` and `my_chair`, E row that does nothing (4 faults) | PASS, 0 faults |
| menu-day-check, whole day, 390 x 844 | (not run) | PASS, 0 faults |
| say-menu-check, every place, every word | FAIL: office `copier` E row does nothing | PASS |

Reach (issue #129): reach-check.mjs failed on the train `platform` and the gate's `worker_a` and `worker_b` (the guard and the office things had already been fixed). All three are behind a walk-grid block the story lifts: the platform once the train doors open, the two workers once the gate opens (before that Eric talks to them across it). They carry `reachAfter: 'doors'` / `'gate'`, and the check tests them with that block lifted: PASS, every thing and person reachable.
