# Mio on the monorail

Eric's arrival on the island. He finds a seat next to a woman with a laptop, who turns out to be Mio from his own team, coming back from a night at her mother's with a bag of pickles. She doesn't love strangers, but she'd rather not watch him embarrass B2, so she teaches him the three greetings on the ride. Jørgen's brief: Eric meets the English-speaking coworker on the train, coming back from visiting family; he needs her help to survive the first day and she gives him a quick language lesson. Built.

## Cast

`eric`, `mio`, `aoi`, `bun`, `youth`, `music`, `stander`, `ann`, `tama`, `kuroda`

## Beats

1. The game opens in the car with nothing but the walking line ([controls-and-ui.md](../controls-and-ui.md)). Mio mutters at the Wi-Fi when he comes near, the first English in the car.
2. Aoi gives the original Japanese reply and points at the seat beside Mio. The bun-haired woman, young man and headphone wearer first play their optional [encounter](train-discoveries.md), then point at the seat if nobody has done so yet. The goal is sit by the lunchbox; no extra seat-direction line follows those encounters.
3. At the seat, two steps: the camera frames her lunchbox and the choice says "Her lunchbox is about to fall off the seat." He chooses to catch it, let it fall, or let her catch it. Mio gives one reply, then he sits automatically and their conversation continues. Catching it flusters her; catching or dropping it gets her talking about her mother's pickles. The player never needs to click the box (Jørgen, 2026-09-29).
4. Sitting, she sees B2 on his card: he's the support contractor Mori told them about. She calls him 外人 and he types it. She says her name. If he asks about her mum, she answers in one line: she stayed on the mainland, and her mother packs as if she's moving abroad.
5. Talking to her again starts the lesson: where he's from (Norway), how much Japanese he has. おはようございます: he types it, then says it to the cat with the Say button (his first use of Say).
6. Back to her: she points out the sleeping man ("one day he's going to miss our stop"), and teaches よろしくおねがいします with the smallest bow he's ever seen. After he types it, her praise and advice to bow with Mori share one line. If she's warmed to him twice, she offers a pickle. The announcement: つぎは本社.
7. She sends him to the doors. At the station すみません gets Aoi out of the aisle ("honestly it works for almost everything"). Everyone gets off. What happens on the platform is [`sleeping-man`](sleeping-man.md) and [`mio-notices`](mio-notices.md).

## Choices and flags

- Catch the bag, let it drop, or leave it to her. Catching raises `mio_warm`.
- After she names herself: "I'm Eric", "Were you visiting your mum?" (only if she mentioned her mother; raises `mio_warm`), or just nod.
- How much Japanese: "ありがとう, that's about it" or "Not really". Only her reply differs.

| Flag | Set when | Read by |
|---|---|---|
| `seat_goal` | A passenger pointed at the seat | The first-talk nodes |
| `passengers` | Each passenger talked to | Retained encounter count |
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
