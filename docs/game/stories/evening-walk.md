# The walk home

Optional discoveries between leaving B2 and reaching Eric's room. Each starts from a person or object on the route; all can be skipped. The route, main goal and end of day stay available. Built for day 1.

## Cast

`eric`, `tama`, `canteen_worker`

## Beats

1. In the forecourt garden, Eric can sit beside Tama. She settles on his lap; he quietly admits he meant to sit for only a second. On advance she hops back onto the bench. He stays seated until he chooses to move. Another visit lets him sit without repeating the line.
2. At the station bicycle court, he can stand the fallen bicycle up. The neighbouring bike tips into its place. He looks at it; a second interaction stands that one up without another gag. Both bikes then stay upright.
3. On the canteen terrace, he reaches for the last upright chair while a worker stacks the others. He realises they are closing, says すみません and helps put the chair on the table. The worker bows with お疲れさまです; he bows back and leaves them to finish. Talking to the worker before helping gets a short closing-time reply; afterwards she repeats her goodbye. Talk does not run the chair action.
4. Outside the bath, an unseen man hums the monorail door chime. Eric can stop to listen. Another voice finishes the tune less successfully. A short sound caption remains until advance, including with audio muted. He never lifts the curtain or looks inside.
5. In the dorm hall, once he knows his room number, he can check mailbox 203. His name is already written in katakana on tape, with a readable inspection gloss. Inside is a bakery flyer. The open box remains in view until advance; later checks show the same contents.

## Choices and flags

These are optional actions, with no dialogue menu, purchase, inventory item, bond reward or new objective. Each requires `going_home`. Physical changes persist between places and through Continue.

| Flag | Set when | Read by |
|---|---|---|
| `evening_bench_seen` | Tama has hopped back after Eric's first line | Garden bench repeat |
| `evening_bike_tipped` | The second bicycle has tipped over | The next bike interaction |
| `evening_bikes_upright` | Eric has stood the second bicycle up | Bicycle action visibility |
| `evening_canteen_helped` | Both chairs are stacked and bows finished | Canteen action visibility |
| `evening_bath_heard` | The player advances past the sound caption | Bath action visibility |
| `dorm_room_known` | The arrival goal has given Eric room 203 | Mailbox inspection availability |

## Words taught

None. Eric reuses his learned apology; the worker repeats Kuro's leaving-work greeting. The mailbox gives a gloss of Eric's own name without teaching a mandatory word.

## Nodes

| File | Nodes |
|---|---|
| `forecourt.js` | `garden_bench`, `fallen_bicycle` |
| `plaza.js` | `canteen_table`, `canteen_closing`, `canteen_goodbye` |
| `dorm_court.js` | `bath`, `mailboxes` |
