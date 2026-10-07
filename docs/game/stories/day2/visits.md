# Day-2 visits

Eric can use his room computer, take a nearby walk before or after work, and return home without a timer. The room computer also opens the day-2 ticket app.

## Cast

`eric`, `mio`, `kuroda`

## Beats

1. A message from Mio reminds Eric about the station at the beginning of day 2. His computer optionally opens the [repair requests](service.md#repair-requests) or lets him send a short message home. The message is fictional story text; no external service is contacted. Neither action changes the work schedule.
2. Room, courtyard and street exits remain available all day. The open area and its two periods are listed in [the day-2 overview](README.md). New districts are the shop street, east lane and east coast. The izakaya opens for the department dinner; other shop interiors stay inaccessible; their cards reflect the period and individual closure reasons in the handoff. The north crossings have visible resurfacing barriers.
3. At the east-lane liquor shop, a tag explains the existing cedar ball. The bakery’s A-board reveals delivery to the dorm manager’s window; Eric recognises it if he kept the flyer. Both have one first-visit interaction and a shorter return.
4. The east-coast lookout telescope has a taped-over coin slot and is free to use. After work, Hamada is cleaning the lens; he yields the eyepiece to Eric. Looking down from here reveals narrow maintenance steps between the shoreline’s armour rocks, the lowest washed by the water. The view is framed and staged, and the steps are inaccessible. Eric may ask how to say “I want to see”, learn mitai, simply look, or leave. Skipping the word keeps it available on return; morning visitors can look without meeting Hamada.
5. The route back stays available.
6. An unread mailbox flyer can still be found on the way. The story respects `found_bakery_flyer` from day 1.
7. The optional Mori encounter belongs to [welcome food](welcome.md). Re-entering Eric's room after the party gives Eric one quiet beat by his computer, then saves and ends day 2 with its summary. Returning earlier does not end the day.

## Choices and flags

| Flag | Set when | Read by |
|---|---|---|
| `d2_started` | The first day-2 room start | Prevents restarting the day on a return |
| `d2_computer_seen` | The first computer interaction | Its opening line |
| `d2_wrote_home` | Sending either message | Hides repeated sending |
| `d2_sake_tag_seen` | Reading the cedar-ball tag | Its shorter return |
| `d2_bakery_seen` | Reading the delivery notice | Its shorter return |
| `d2_hamada_seen` | The first evening encounter | His shorter return and optional word offer |
| `d2_lookout_seen` | Looking out to sea | The repeat interaction |
| `d2_complete` | Entering the room after the party | Save and day-2 summary |

## Words taught

Optional `mitai` is modelled normally and slowly by `kuroda`, then typed in `d2_see_word`. It uses the same -tai pattern as the gathering’s words. No visit or word is required to complete the day. The other teaching is in [welcome food](welcome.md).

| Word | By | Node |
|---|---|---|
| `mitai` | `kuroda` | `d2_see_word` |

## Nodes

| File | Nodes |
|---|---|
| `day2/dorms.js` | `d2_room`, `d2_first_request`, `d2_take_request`, `d2_ready_first`, `d2_computer`, `d2_inbox`, `d2_accept_at_computer`, `d2_write_home`, `d2_send_home`, `d2_close_computer`, `d2_leave_room`, `d2_bed`, `d2_window`, `d2_boxes`, `d2_end`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/dorm_court.js` | `d2_arrive`, `d2_hall`, `d2_go_up`, `d2_to_lane`, `d2_mailboxes`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/east_lane.js` | `d2_arrive`, `d2_to_plaza`, `d2_to_shops`, `d2_to_coast`, `d2_to_dorms`, `d2_sake_tag`, `d2_shut`, `d2_north_closed`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/plaza.js` | `to_canteen`, `d2_arrive`, `d2_to_office`, `d2_to_lane`, `d2_to_shops`, `d2_fountain`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/east_coast.js` | `d2_arrive`, `d2_to_lane`, `d2_north_closed`, `d2_onsen`, `d2_lookout`, `d2_hamada`, `d2_see_word`, `d2_lookout_view`, `d2_hamada_idle`, `d2_hamada_again`, `d2_leave_lookout`, `d2_hamada_go`, `d2_hamada_food`, `d2_hamada_drink`, `d2_lookout_again`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/canteen.js` | `room_worker`, `room_water`, `room_trays`, `room_closing`, `room_worker_end`, `arrive`, `to_plaza`, `sit_w`, `sit_e` |

### North-campus routes

`day2/campus.js`, `day2/print_shop.js`, `day2/office_quarter.js` and `day2/harbour.js` reuse the physical routes without adding spoken scenes. The forecourt's `to_campus` enters the new loop. Campus uses `arrive`, `to_forecourt`, `to_offices`, `to_harbour`, `to_print`, `bench`; print shop uses `arrive`, `directory`, `print`, `end`, `sit`, `exit`. Office street uses `arrive`, `to_campus`, `to_harbour`, `shut`; harbour uses `arrive`, `to_campus`, `to_offices`, `shut`. Sports and works routes retain their day-2 closure. The free directory is a persistent readable item after a completed feed/output, with no new language lesson or quest.
