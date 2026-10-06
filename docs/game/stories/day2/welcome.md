# Welcome food

The team has arranged food for Eric after work. Mori wants him to enjoy it, Kenji is eager to start eating, and Mio has brought pickles. Built; voice clips to make.

## Cast

`eric`, `mori`, `mio`, `kenji`

## Beats

1. Kenji waits at the izakaya, then walks ahead to the promenade. Eric is free to explore; reaching the bench first gathers the group without requiring a second trip to Kenji.
2. The party setup and food source are in [places.md](../../places.md#day-2-party-plan-not-built). Mio's greeting notices `lunch_mio`. Mori's Japanese is subtitled, never muffled.
3. Kenji models tabetai, normally and slowly, with a short English explanation. Eric chooses a rice ball or an egg sandwich and types the word as he takes it. Those are the two required food actions. The choice changes the food handed over.
4. He can ask what they do after work, talk with Mori about Norway (with a `lunch_mori` variation), or simply eat and listen. He can then walk around and talk to the group.
5. Asking Kenji how to say he wants a drink optionally teaches nomitai, a second instance of the same pattern. It is never needed to finish the party or day. Repeating the food or drink word gets an offer while food is out. After the party, Mori still offers a leftover rice ball, or directs Eric to the dorm drinks machine once the tea is gone. Machines get no magical effect.
6. “Head home” at Eric's seat gives one goodbye and packs the party. The route home and optional walks remain open. Mori rests at the back-alley nook only after this point; Eric can stop with him while he packs the leftover rice balls. They talk about the takeaway boxes and Mori’s Lillehammer photos, with context supplied if the player never heard about Norway. Eric may ask for “I want to go” and type ikitai, or leave; the word remains available on a return. It creates no tracked task or inventory reward.

## Choices and flags

| Flag | Set when | Read by |
|---|---|---|
| `d2_met_kenji` | Meeting Kenji or reaching the bench directly | Kenji's marker and goal |
| `d2_food` | Choosing food (`riceball` or `sandwich`) | The handover |
| `d2_ate` | Typing tabetai and taking the food | Party conversation and departure options |
| `d2_party_done` | Saying goodnight at the seat | Actor placement, food replies and the room ending |
| `d2_norway_talked` | Choosing Norway as the party topic | The coda supplies missing context |
| `d2_mio_party_seen` | The optional conversation with Mio | Avoids repeating the talk about the doors |
| `d2_mori_rest_seen` | The optional after-party encounter | Its short repeat response |

## Words taught

| Word | By | Node |
|---|---|---|
| `tabetai` | `kenji` | `d2_take_food` |
| `nomitai` | `kenji` | `d2_drink_word` |
| `ikitai` | `mori` | `d2_go_word` |

Only tabetai is required. Every word starts unknown and is learned by typing. The optional coast phrase is in [Day-2 visits](visits.md).

## Nodes

| File | Nodes |
|---|---|
| `day2/shotengai.js` | `d2_to_forecourt`, `d2_arrive`, `d2_meet_kenji`, `d2_supper`, `d2_take_food`, `d2_topic`, `d2_after_work`, `d2_norway`, `d2_quiet`, `d2_party_free`, `d2_seat_menu`, `d2_stay`, `d2_goodnight`, `d2_kenji_party`, `d2_drink_word`, `d2_no_drink`, `d2_more_drink`, `d2_more_food`, `d2_mio_party`, `d2_mori_party`, `d2_kenji_wait`, `d2_mio_wait`, `d2_mori_wait`, `d2_mori_rest`, `d2_go_word`, `d2_mori_rest_end`, `d2_leftovers`, `d2_mori_drink`, `d2_mori_rest_idle`, `d2_mori_rest_again`, `d2_mori_go_reply`, `d2_mori_see_reply`, `d2_empty_bench`, `d2_to_lane`, `d2_izakaya`, `d2_bakery`, `d2_shut`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |

