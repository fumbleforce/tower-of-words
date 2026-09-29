# Mio on the monorail

Eric's arrival on the island. He finds a seat next to a woman with a laptop, who turns out to be Mio from his own team, coming back from a night at her mother's with a bag of pickles. She doesn't love strangers, but she'd rather not watch him embarrass B2, so she teaches him the three greetings on the ride. Jørgen's brief: Eric meets the English-speaking coworker on the train, coming back from visiting family; he needs her help to survive the first day and she gives him a quick language lesson. Built.

## Cast

`eric`, `mio`, `aoi`, `bun`, `youth`, `music`, `stander`, `ann`, `tama`, `kuroda`

## Beats

1. The game opens in the car with nothing but the walking line ([controls-and-ui.md](../controls-and-ui.md)). Mio mutters at the Wi-Fi when he comes near, the first English in the car.
2. The first passenger he talks to answers in Japanese and nods at the free seat, which gives the first goal: sit down. After three passengers the nod goes to the woman with the laptop.
3. At the seat the train lurches and her bag of pickles slides. He can catch it (she's flustered and tells him about her mother), let it drop (dry: "I think nothing broke"), or she catches it herself.
4. Sitting, she sees B2 on his card: he's the support contractor Mori told them about. She calls him 外人 and he types it. She says her name.
5. Talking to her again starts the lesson: where he's from (Norway), how much Japanese he has. おはようございます: he types it, then says it to the cat with the Say button (his first use of Say).
6. Back to her: she points out the sleeping man ("one day he's going to miss our stop"), and teaches よろしくおねがいします with the smallest bow he's ever seen. If she's warmed to him twice, she offers a pickle. The announcement: つぎは本社.
7. She sends him to the doors. At the station すみません gets Aoi out of the aisle ("honestly it works for almost everything"). Everyone gets off. What happens on the platform is [`sleeping-man`](sleeping-man.md) and [`mio-notices`](mio-notices.md).

## Choices and flags

- Catch the bag, let it drop, or leave it to her. Catching raises `mio_warm`.
- After she names herself: "I'm Eric", "Were you visiting your mum?" (only if she mentioned her mother; raises `mio_warm`), or just nod.
- How much Japanese: "ありがとう, that's about it" or "Not really". Only her reply differs.

| Flag | Set when | Read by |
|---|---|---|
| `seat_goal` | A passenger nodded at the seat | The first-talk nodes |
| `passengers` | Each passenger talked to | Where the nod points |
| `bag_wobble` | The bag is sliding | Catch, drop |
| `heard_mum` | She mentioned her mother | The "your mum" choice |
| `mio_warm` | Caught the bag, asked about her mum, a quiet lunch | The pickle, her goodbye, her last line of the day |
| `sat` | Sat down | Mio's talk triggers |
| `mio_named` | She said her name | Her label |
| `chat1` | First chat done | |
| `lesson_on` | The lesson started | Mio's talk triggers |
| `cat_task` | Sent to greet the cat | The cat's goal |
| `cat_done` | Greeted the cat | The next lesson |
| `lesson_done` | The greetings are taught | The doors |
| `arriving` | Went to the doors | |
| `alighted` | Everyone got off | The platform |

## Words taught

| Word | By | Node |
|---|---|---|
| `gaijin` | `mio` | `sit` |
| `ohayo` | `mio` | `lesson2` |
| `yoroshiku` | `mio` | `lesson3` |
| `sumimasen` | `mio` | `arrival` |

## Nodes

| File | Nodes |
|---|---|
| `train.js` | `intro`, `ambient:mio_wifi`, `first_aoi`, `first_bun`, `first_youth`, `first_music`, `first_stander`, `nod_seat`, `seat`, `mio_catches`, `caught`, `dropped`, `sit`, `its_eric`, `family`, `leave_it`, `chat1_end`, `lesson`, `jp_one`, `jp_none`, `lesson2`, `cat_nudge`, `ohayo_mio_again`, `ohayo_cat`, `lesson3`, `mio_doors_nudge`, `approach`, `arrival` |

`first_stander` has no trigger: the man with a bag can't be talked to, so it never plays.
