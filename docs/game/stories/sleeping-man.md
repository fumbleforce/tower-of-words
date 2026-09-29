# The sleeping man

Mr. Hamada from Accounts sleeps through every monorail ride back from the mainland and is late through every gate. On Eric's first morning both happen at once. Eric holds the train doors for him with 待って, then finds him stuck in the lobby gate, which has counted his briefcase as a second person. Built.

## Cast

`kuroda`, `eric`, `mio`, `ann`, `guard`, `gatev`, `miotext`, `kuro`, `tama`

## Beats

1. On the train he's asleep on the far bench with a sticky note on his briefcase: "12F 9:00!!". Greetings don't wake him. Mio says he'll miss their stop one day ([`mio-train`](mio-train.md)).
2. On the platform, after everyone is off, Eric and Mio see him still alone in the car. The announcement says the train goes back to the mainland. The doors close in steps; Mio yells 待って and nothing happens. She shows it with a flat palm, and Eric types it. The doors freeze with the kotodama effect. Hamada wakes, stumbles out, bows deeply, and the train leaves.
3. At the gate at 8:52, while Eric waits on the bench ([`gate-morning`](gate-morning.md)), Hamada bursts in, taps through, and the gate jams: the count screen shows two people, him and his briefcase. He begs it, 開けて, miming two heavy doors, then pats it like a nervous horse. The guard calls the gate company and gets hold music. Mio texts Eric: "if the guard ignores you say すみません and point at stuff. loud".
4. Two ways through:
   - His word: talk to Hamada and say 開けて with him (typed the first time). The gate bursts open; Hamada heads for the station exit; the gate company picks up just then ("いえ…開きました"); the guard stares at the gate, then at Eric, and points him to the station exit.
   - The guard's way: すみません to the guard, then mime. Point at the briefcase and at the man (the guard: he knows, it thinks they're two), at the cat (猫はいません), mime squeezing through (無理ですね), then lift an invisible briefcase over your head. The guard laughs (unless Eric skipped his good morning), shouts 浜田さん！かばん、頭の上！, the gate opens, the gate company picks up ("もう大丈夫です"), Hamada thanks Eric deeply, and the guard waves him through before nine.
5. Wrong words during the jam get honest answers: 待って to Hamada ("待ってますけど…"), すみません to the gate (one at a time, please), 開けて to the guard (a puzzled look), a greeting to Hamada (a flustered one back).
6. In the afternoon, if Eric took the guard's way, a box of rice crackers comes down from the twelfth floor: "TO B2 ERIC. THANK YOU. 12F HAMADA." Mori hands them round; even Mio takes one (in `lunch_end`, [`lunch`](lunch.md)).

## Choices and flags

- At the jam: help him with his word, or leave him to it; or go to the guard. The two ways are exclusive and change who remembers what ([systems.md](../systems.md), Memory).
- The mime menu: each option once; lifting the briefcase shows only after pointing at both the case and the man.

| Flag | Set when | Read by |
|---|---|---|
| `held_doors` | The doors held for him | |
| `jammed` | The gate jammed | Everyone's triggers at the gate |
| `gate_through_way` | Either way through started | The jam triggers |
| `gate_magic` | The gate burst open to 開けて | The guard after, Kenji's gossip, Mio's evening list |
| `guard_cool` | Went to the guard without having greeted him | The guard's mood in the mime |
| `pt_case`, `pt_man`, `pt_cat`, `m_squeeze` | Mime options used | The mime menu |
| `late_greet` | Greeted the guard during the jam | |
| `hamada_friend` | The guard's way, Hamada thanked him | The crackers |

## Words taught

| Word | By | Node |
|---|---|---|
| `matte` | `mio` | `platform` |
| `akete` | `kuroda` | `word_type` |

## Nodes

| File | Nodes |
|---|---|
| `train.js` | `hamada`, `asleep`, `platform`, `did_i`, `did_quiet` |
| `gate.js` | `bench_wait`, `hamada_stuck`, `word_type`, `word_say`, `guard_after`, `guard_busy`, `jam_greet`, `way_social`, `mime_menu`, `pt_case`, `pt_man`, `guard_knows`, `mime_cat`, `mime_squeeze`, `mime_lift`, `sumi_hamada`, `greet_hamada`, `sumi_gate`, `sumi_kuro`, `matte_hamada`, `matte_gate`, `akete_guard` |
