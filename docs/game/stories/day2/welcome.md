# Welcome dinner

The department gathers inside the izakaya after work: the player, Mori, Mio, Kenji and Emi sit around one table. The restaurant has a reachable entrance, aisle and exit. The shop-street Kenji interaction leads through its blue-curtain door; entering directly also works.

## The meal

Mori welcomes the player before they sit. Pre-served chicken skewers, grilled vegetables, rice, pickles and tea establish the meal. The player can ask to try kanpai for the toast, or simply raise their glass. Kenji models tabetai; the player chooses chicken or vegetables and types the word while taking that food. They then talk about after-work life or Norway, or eat and listen. The player can later ask Mori about the food; Mio then helps with oishii. Each taught word has a visible purpose, a slow model and a typed attempt.

The player can stay, talk to each colleague, or say goodnight from their seat. Kenji optionally teaches nomitai when asked for a drink. Emi has department and food topics. Mio's door conversation distinguishes witnessing the experiment from hearing the player describe it. Mori's Japanese questions and Norway stories are made understandable by Emi, rather than granting the player unlearned Japanese comprehension.

Goodnight walks Mio and Kenji out. Mori and Emi remain to pack leftovers. Emi interprets his Norway/photo conversation; the player can ask for ikitai or leave it for a return visit. No boxes errand or inventory reward is implied. The player can leave and return through the actual door.

## State and continuity

`d2_met_kenji` records the doorway meeting or joining the meal directly. `d2_food` is yakitori or vegetables; `d2_ate` records taking it. `d2_party_done` records goodnight and permits the day ending at home. `d2_norway_talked`, `d2_mio_party_seen` and `d2_mori_rest_seen` preserve the optional conversations. The runtime restores food, seating and departure from these flags.

Old outdoor-party saves move to this venue. Old day-2 execution checkpoints restart at the current place's progress-aware arrival rather than replaying obsolete script indices. Words, payments, inventory, relationships and completed reports remain intact. Completed parties do not teleport a player who is merely walking through the street.

## Words taught

| Word | By | Node |
|---|---|---|
| `kanpai` | `emi` | `d2_toast_word` |
| `tabetai` | `kenji` | `d2_take_food` |
| `oishii` | `mio` | `d2_compliment` |
| `nomitai` | `kenji` | `d2_drink_word` |
| `ikitai` | `mori` | `d2_go_word` |

Only tabetai is required for the meal; the other four are optional. Every new word is learned by trying it, and known words can be used directly in dialogue without replaying the lesson.

## Nodes

| File | Nodes |
|---|---|
| `day2/shotengai.js` | `d2_arrive`, `d2_meet_kenji`, `d2_kenji_wait`, `d2_izakaya`, `d2_to_forecourt`, `d2_to_lane`, `d2_bakery`, `d2_shut`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/izakaya.js` | `d2_izakaya_arrive`, `d2_exit_izakaya`, `d2_food_reply`, `d2_emi_party`, `d2_emi_department`, `d2_emi_food`, `d2_supper`, `d2_toast_word`, `d2_toast`, `d2_take_food`, `d2_compliment`, `d2_topic`, `d2_after_work`, `d2_norway`, `d2_quiet`, `d2_party_free`, `d2_seat_menu`, `d2_stay`, `d2_goodnight`, `d2_kenji_party`, `d2_drink_word`, `d2_no_drink`, `d2_more_drink`, `d2_more_food`, `d2_mio_party`, `d2_mori_party`, `d2_kenji_wait`, `d2_mio_wait`, `d2_mori_wait`, `d2_mori_rest`, `d2_go_word`, `d2_mori_rest_end`, `d2_leftovers`, `d2_mori_drink`, `d2_mori_rest_idle`, `d2_mori_rest_again`, `d2_mori_go_reply`, `d2_mori_see_reply`, `d2_empty_bench`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
