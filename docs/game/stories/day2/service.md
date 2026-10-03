# The station report

Eric checks the doors before going to B2. Mio's explanation of yesterday's incident and Emi's newly secured parts budget meet in his report. Built; voice clips to make.

## Cast

`eric`, `mio`, `guard`, `emi`, `kenji`, `mori`, `tama`

## Beats

1. At the station, Mio joins Eric exactly when she promised: `lunch_mio || mio_warm >= 2`. Otherwise she supplies the job context by message. The empty carriage is between runs and remains stationary.
2. One interaction runs the door/sensor check and shows a pass. Eric can submit one of two reports, or optionally repeat the voice experiment first. The optional sequence uses already-known matte and ugoite; it never assumes akete was learned.
3. He either confirms the sensor fault or reports that it passes. The submit confirms it was sent; Mio reacts to the chosen wording, in person or by message. On the warm history she then walks out to B2 and is absent on a station return. The report saves once and is read by Emi on B2. She places the replacement order or keeps the money. It has no bond penalty, hidden correct answer or extra follow-up quest.
4. Emi asks about the old equipment; Eric can ask for assessment time or decline to promise ten years. He keeps the magic to himself. Emi supplies Mori’s notes on both reply paths; the camera frames Kenji before he invites Eric for after-work food, then goes ahead to help collect it. Emi has another meeting.
5. Sitting at the desk advances to evening; the goal becomes the meeting by the izakaya. Optional morning trips remain possible before sitting down.

## Choices and flags

| Flag | Set when | Read by |
|---|---|---|
| `d2_station_seen` | The first platform arrival | Arrival lines on returns |
| `d2_mio_here` | The day-1 promise condition holds, until the station ticket is submitted | Setup, optional-test response and departure |
| `d2_checked` | The check completes | Prevents replaying the mechanical check |
| `d2_voice_tested` | The optional experiment ends | Hides its repeat option |
| `d2_order_sensor` | Confirming the fault; unset for the pass report | Mio’s immediate reply and Emi’s response |
| `d2_ticket_done` | Either report is submitted | Route goals and the B2 conversation |
| `d2_brief_done` | The invitation finishes | Desk availability and repeat conversation |
| `d2_shift_done` | Sitting at the desk after the conversation | Period, placements and the party |

## Words taught

None. The optional door experiment reuses words already learned on both day-1 gate paths.

## Nodes

| File | Nodes |
|---|---|
| `day2/train.js` | `d2_platform`, `d2_check`, `d2_report`, `d2_voice_test`, `d2_order_sensor`, `d2_keep_sensor`, `d2_submit`, `d2_checked_again`, `d2_mio_before`, `d2_mio_after`, `d2_mio_idle`, `d2_to_gate`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/gate.js` | `d2_gate`, `d2_guard`, `d2_guard_idle`, `d2_reader`, `d2_cat`, `d2_guard_food`, `d2_guard_drink`, `d2_cat_food`, `d2_cat_drink`, `d2_to_platform`, `d2_to_forecourt`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/forecourt.js` | `d2_arrive`, `d2_to_station`, `d2_to_office`, `d2_to_plaza`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/office.js` | `d2_office`, `d2_brief`, `d2_assess`, `d2_limits`, `d2_invitation`, `d2_work`, `d2_emi_waiting`, `d2_emi_later`, `d2_desk_wait`, `d2_desk_later`, `d2_mio_work`, `d2_mori_work`, `d2_kenji_work`, `d2_kenji_invite_again`, `d2_leave`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |

