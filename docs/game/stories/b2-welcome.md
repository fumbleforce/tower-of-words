# Welcome to B2

Eric's arrival in IT support on B2. Mr. Mori meets him at the lift with a formal introduction and waits for a proper answer. Kenji, in broken English, confesses he borrowed Eric's chair, which is now in the machine room with the cat on it, and Mio won't let Kenji in there. Built.

## Cast

`eric`, `mori`, `kenji`, `mio`, `tama`

## Beats

1. The lift opens on B2 and Mori is waiting: おはようございます。森と申します。ITサポートへ、ようこそ。 A deep bow, and he waits. Eric stays with him until he answers (the story holds him there).
2. よろしくおねがいします is what Mori was hoping for: こちらこそ, an even deeper bow and a happy note. おはようございます gets a polite answer, a pause and a smaller bow. Either way he shows Eric into the office and goes to his desk.
3. Kenji, at his desk: 新しい人！ He's glad not to be the newest any more (two months). He borrowed Eric's chair because his broke, and it's in the machine room with the cat. Norway has the big forest cats, right? He saw them on YouTube... but Mio says he can't go in the machine room any more. Eric goes.
4. The machine room door: knocking gets Mio shouting "one minute!", and then she lets him in ("don't touch anything, especially the cables"). If he knows 開けて from the gate, it opens the door with the kotodama effect, and Mio: "...That door has a card reader, you know."
5. Inside, the chair, with Tama asleep on it. Pushing it rolls it back to his desk, cat and all. Mio: "She comes with it, I think." She has a job for him ([`copier`](copier.md)).
6. Later, Kenji asks if the chair is okay and offers help (cables, printer, the good tape). Eric can say his Japanese is worse than Kenji's English (a laugh and a high five: "we practise together") or pat the chair (Kenji pats his desk, very seriously).
7. Greetings to the team: Kenji laughs at おはようございます (かたっ！おはよう、でいいよ) and answers よろしく with a fist bump. Mio finds おはようございます too polite ("I'm not your boss"). In the afternoon Kenji asks Mori quietly how the new guy is; Mori: 礼儀正しい人ですよ.

## Choices and flags

| Flag | Set when | Read by |
|---|---|---|
| `greeted_mori` | Answered Mori | His goal, his triggers |
| `kenji_intro` | Met Kenji | The machine room door, the desk |
| `greeted_kenji` | Greeted Kenji | |
| `kenji_talked` | The second talk with Kenji | |
| `kenji_laughed` | "Mine's worse" | |
| `knocked` | Knocked on the machine room door | Mio opening it |
| `machine_open` | The door is open | The machine room |
| `door_magic` | Opened it with 開けて | |
| `found_chair` | In the machine room | The chair |
| `chair_back` | The chair is back at his desk | Mio's job, Kenji |

## Words taught

None.

## Nodes

| File | Nodes |
|---|---|
| `office.js` | `office_in`, `mori_wait`, `yoroshiku_mori`, `ohayo_mori`, `lead_in`, `greet_again_mori`, `sumimasen_mori`, `mori_again`, `kenji_first`, `kenji_again`, `kenji_small`, `kenji_pat`, `ohayo_kenji`, `yoroshiku_kenji`, `greet_again_kenji`, `sumimasen_kenji`, `machine_door`, `mio_opens`, `akete_machine`, `machine_in`, `chair_push`, `ohayo_mio`, `yoroshiku_mio`, `sumimasen_mio`, `mio_busy`, `ambient:kenji_mori` |
