# Day-2 visits

Eric can use his room computer, take a nearby walk before or after work, and return home without a timer. Authored; implementation pending.

## Cast

`eric`, `mio`

## Beats

1. A message from Mio reminds Eric about the station at the beginning of day 2. His computer optionally shows the repair-inbox note or lets him send a short message home. The message is fictional story text; no external service is contacted. Neither action changes the work schedule.
2. Room, courtyard and street exits remain available all day. The open area and its two periods are listed in [the day-2 overview](README.md). New districts are the shop street, east lane and east coast. All shops remain closed, and the north crossings have visible resurfacing barriers.
3. The east-coast lookout gives a short, quiet view; a repeat is shorter. The route back stays available.
4. An unread mailbox flyer can still be found on the way. The story respects `found_bakery_flyer` from day 1.
5. The optional Mori encounter belongs to [welcome food](welcome.md). Re-entering Eric's room after the party saves and ends day 2 with its summary. Returning earlier does not end the day.

## Choices and flags

| Flag | Set when | Read by |
|---|---|---|
| `d2_started` | The first day-2 room start | Prevents restarting the day on a return |
| `d2_computer_seen` | The first computer interaction | Its opening line |
| `d2_wrote_home` | Sending either message | Hides repeated sending |
| `d2_lookout_seen` | Looking out to sea | The repeat interaction |
| `d2_complete` | Entering the room after the party | Save and day-2 summary |

## Words taught

None. The word teaching is in [welcome food](welcome.md).

## Nodes

| File | Nodes |
|---|---|
| `day2/dorms.js` | `d2_room`, `d2_computer`, `d2_inbox`, `d2_write_home`, `d2_send_home`, `d2_close_computer`, `d2_leave_room`, `d2_bed`, `d2_window`, `d2_boxes`, `d2_end`, `d2_food_away`, `d2_drink_away` |
| `day2/dorm_court.js` | `d2_arrive`, `d2_hall`, `d2_go_up`, `d2_to_lane`, `d2_mailboxes`, `d2_food_away`, `d2_drink_away` |
| `day2/east_lane.js` | `d2_arrive`, `d2_to_plaza`, `d2_to_shops`, `d2_to_coast`, `d2_to_dorms`, `d2_shut`, `d2_north_closed`, `d2_food_away`, `d2_drink_away` |
| `day2/plaza.js` | `d2_arrive`, `d2_to_office`, `d2_to_lane`, `d2_to_shops`, `d2_fountain`, `d2_food_away`, `d2_drink_away` |
| `day2/east_coast.js` | `d2_arrive`, `d2_to_lane`, `d2_north_closed`, `d2_shut`, `d2_lookout`, `d2_lookout_again`, `d2_food_away`, `d2_drink_away` |

## To build

The PC prop is Claude's C-0369 work. The pending exits, camera, day selection and summary work are in the [handoff](../../../../game3d/story/day2/README.md).
