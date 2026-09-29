# Words

Every Japanese word the game knows (id, Japanese, reading, meaning, kind), the nine words day 1 teaches, how a word is shown, and when it counts as known. Last checked against the game on 2026-09-29.

Elsewhere: which storyline teaches a word, and who teaches it, is in that storyline's "Words taught" table ([stories/](stories/); `node tools/facts/check.mjs --game` prints them all in one list). How the Say menu, typing and word practice work is in [systems.md](systems.md) and [controls-and-ui.md](controls-and-ui.md). How to write a word into a line (`{id}`) is in game3d/story/FORMAT.md.

## Words

Checked against game3d/js/lang.js. Kind: a `phrase` is a greeting Eric can say to people; a `command` is a word he can say to make a machine do something (kotodama); a `word` is shown with its gloss but can't be said.

| Id | Japanese | Reading | Meaning | Kind |
|---|---|---|---|---|
| `ohayo` | おはようございます | ohayō gozaimasu | good morning | phrase |
| `yoroshiku` | よろしくおねがいします | yoroshiku onegaishimasu | nice to meet you | phrase |
| `sumimasen` | すみません | sumimasen | excuse me, sorry | phrase |
| `matte` | 待って | matte | wait | command |
| `akete` | 開けて | akete | open | command |
| `ugoite` | 動いて | ugoite | work, move | command |
| `tomatte` | 止まって | tomatte | stop | command |
| `irete` | 入れて | irete | pour, make (tea) | command |
| `kite` | 来て | kite | come | command |
| `dashite` | 出して | dashite | give it out | command |
| `gaijin` | 外人 | gaijin | foreigner | word |
| `honsha` | 本社 | honsha | head office | word |
| `tsugiwa` | つぎは | tsugi wa | next | word |
| `otsukare` | お疲れさまです | otsukaresama desu | the everyday hello at work | word |
| `kotodama` | 言霊 | kotodama | words with power in them | word |

Verbs are met in their -te form, the form for asking someone to do something. The Words panel shows each with its dictionary form (待って matte is the -te form of 待つ matsu) and a short note on what -te does (Jørgen: "it is never explained in the word menu what the -te ending is").

## Taught on day 1

Day 1 teaches nine words, in the order a player meets them. Who teaches each, and in which node, is in the storyline's "Words taught" table.

1. `gaijin`, `ohayo`, `yoroshiku`, `sumimasen`: Mio on the monorail ([mio-train](stories/mio-train.md)).
2. `matte` from Mio on the platform, `akete` from Mr. Hamada at the stuck gate ([sleeping-man](stories/sleeping-man.md)).
3. `ugoite`: Mori at the copier ([copier](stories/copier.md)).
4. `tomatte` or `irete`: one of the two, from whoever Eric has lunch with ([lunch](stories/lunch.md)).

`kite`, `dashite`, `otsukare` and `kotodama` are in the game's list but no storyline uses them yet. `honsha` and `tsugiwa` appear, glossed, in the train announcement and the guard's phone call; they're never taught.

## How a word is shown

- Every Japanese word in a line shows with its reading and its English, every time: 待って (matte, wait). English always carries the text ([setting.md](setting.md)).
- A new word is said once, then again slowly; a short narration line says how the speaker gets the meaning across (a gesture), because the models don't act it out (Jørgen: "too much fiddly work"). Then Eric types its romaji ([systems.md](systems.md), Typing a word). Taught words in dialogue can be clicked (or their small play button) to hear them again: the phrases and commands in Eric's voice (audio/eric-<id>.mp3), 外人 in Mio's slow word clip (audio/word-gaijin.mp3), since Eric never says it. The other words (`honsha`, `tsugiwa`, `otsukare`, `kotodama`) have no clip and no play button.
- Katakana always shows its reading. Loanwords Eric would catch by ear (コンサルタント, ゲート, ノルウェー, IT, B2) can be made clear inside an overheard line for that line only; they don't become known.

## When a word is known

- Only words taught in play count as known: typed at the typing prompt, or taught with `learn` or `offer` (Jørgen). Nothing is known at the start. A word shown glossed in a line is explained there but not taught; never mark other words as known (九時 at the gate was wrong).
- Known words stay sharp in overheard Japanese from then on, and in the voice they come out clear while the rest is muffled ([systems.md](systems.md), Overheard Japanese).
- Phrases and commands Eric knows go in the Say menu; how often he has to type one before a click is enough is in [systems.md](systems.md), Word practice.
