# Words

Every Japanese word the game knows (id, Japanese, reading, meaning, kind), the nine words day 1 teaches, the four day 2 teaches, the ticket system's ten labels, how a word is shown, and when it counts as known. Last checked against the game on 2026-09-29.

Elsewhere: which storyline teaches a word, and who teaches it, is in that storyline's "Words taught" table ([stories/](stories/); `node tools/facts/check.mjs --game` prints them all in one list). How the Say menu, typing and word practice work is in [systems.md](systems.md) and [controls-and-ui.md](controls-and-ui.md). How to write a word into a line (`{id}`) is in game3d/story/FORMAT.md.

## Words

Checked against game3d/js/lang.js. Kind: a `phrase` is a greeting Eric can say to people; a `command` is a word he can say to make a machine do something (kotodama); a `word` is shown with its gloss but can't be said; a `label` is one of the ticket system's screen labels (Labels on the ticket system, below).

| Id | Japanese | Reading | Meaning | Kind |
|---|---|---|---|---|
| `ohayo` | おはようございます | ohayō gozaimasu | good morning | phrase |
| `yoroshiku` | よろしくおねがいします | yoroshiku onegaishimasu | nice to meet you | phrase |
| `sumimasen` | すみません | sumimasen | excuse me, sorry | phrase |
| `tabetai` | 食べたい | tabetai | I want to eat | phrase |
| `nomitai` | 飲みたい | nomitai | I want to drink | phrase |
| `mitai` | 見たい | mitai | I want to see | phrase |
| `ikitai` | 行きたい | ikitai | I want to go | phrase |
| `koko` | ここ | koko | here | phrase |
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
| `kenmei` | 件名 | kenmei | subject (of a ticket or an email) | label |
| `iraisha` | 依頼者 | iraisha | the person who asked | label |
| `jotai` | 状態 | jōtai | status, state | label |
| `mitaio` | 未対応 | mitaiō | not started yet | label |
| `taiochu` | 対応中 | taiōchū | being worked on | label |
| `kanryo` | 完了 | kanryō | done, finished | label |
| `hoshu` | 報酬 | hōshū | pay, a fee | label |
| `tanto` | 担当する | tantō suru | to take something on as your job | label |
| `modoru` | 戻る | modoru | to go back | label |
| `tojiru` | 閉じる | tojiru | to close | label |

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
- A new word is said once, then again slowly; a short narration line says how the speaker gets the meaning across (a gesture), because the models don't act it out (Jørgen: "too much fiddly work"). Then Eric types its romaji ([systems.md](systems.md), Typing a word). Taught words in dialogue can be clicked (or their small play button) to hear them again, always Mio saying it slowly in Japanese (audio/word-<id>.mp3; Jørgen, 2026-09-30: "when I click on words during conversation, it should be mio saying it in japanese"). Eric's own clip (audio/eric-<id>.mp3) plays only when he says the word. The other words (`honsha`, `tsugiwa`, `otsukare`, `kotodama`) have no clip and no play button.
- Katakana always shows its reading. Loanwords Eric would catch by ear (コンサルタント, ゲート, ノルウェー, IT, B2) can be made clear inside an overheard line for that line only; they don't become known.
- People's names are never hidden (Jørgen, 2026-09-30: "his name should not be obscured"). In an overheard line a name stays readable with the name in romaji after it, taught or not, and an honorific after it goes with it: 森 (Mori), 浜田さん (Hamada-san). The spellings are listed in game3d/js/lang.js `NAMES`; the language check fails on a name before さん or と申します that isn't listed.

## When a word is known

- Only words taught in play count as known: typed at the typing prompt, taught with `learn` or `offer`, or a ticket system label tapped or used (below) (Jørgen). Nothing is known at the start. A word shown glossed in a line is explained there but not taught; never mark other words as known (九時 at the gate was wrong).
- Known words stay sharp in overheard Japanese from then on, and in the voice they come out clear while the rest is muffled ([systems.md](systems.md), Overheard Japanese).
- Phrases and commands Eric knows go in the Say menu; how often he has to type one before a click is enough is in [systems.md](systems.md), Word practice.

## Taught on day 2

The [day-2 set](../../game3d/story/day2/README.md) keeps its four records in `story/day2/words.js`; game3d/js/lang.js adds them to its words, so they are in the table above. Who teaches them, and in which node, is in [welcome.md](stories/day2/welcome.md) and [visits.md](stories/day2/visits.md).

The single new pattern is the **-tai form**, saying what you want to do yourself. The Words panel pairs 食べたい with 食べる (taberu, to eat), 飲みたい with 飲む (nomu, to drink), 見たい with 見る (miru, to see), and 行きたい with 行く (iku, to go), with one line on what -tai does over the phrases once one is known. Only tabetai is required; the other three are optional reinforcement in the gathering or nearby encounters. All start unknown, become known through typing, and are things to say to people. None commands a machine. Their clips (eric-<id> and word-<id> for each) are in the voice manifest, still to be made; until then the words have no play button and Eric says them silently.

## Taught on day 3

The [day-3 set](../../game3d/story/day3/README.md) keeps its one new record, `koko` (ここ, here), in `story/day3/words.js`; lang.js adds it to its words. It is taught by typing at the plaza's map, whose handwritten sticker by the arrow says ここ (story/day3/plaza.js `d3_map`, `d3_koko_word`; optional), and said to the map afterwards. The Words panel calls it a place word. At the gym's printer the attendant says the known command 出して (dashite) to the machine out of habit; a player who doesn't know it yet can learn it there by typing, after the sheet is out (`d3_dashite_word`). Clips: eric-koko and word-koko in the voice manifest.

## Labels on the ticket system

The ticket app ([controls-and-ui.md](controls-and-ui.md)) labels its columns, fields, statuses and buttons in Japanese (Jørgen, 2026-10-03: "Some japanese here, and learnable"): 件名, 依頼者 and 状態 over the list and down the ticket's form, 報酬 by the pay, the statuses 未対応, 対応中 and 完了, and the buttons 担当する, 戻る and 閉じる. They are kept in game3d/js/tickets/words.js, which lang.js adds to its words. Each label shows its reading over it in small type and its short English after it (件名 Subject), every time. Tapping or clicking a label teaches its word, and using a button teaches the button's; a line at the foot of the page says "New word in your Words: 件名 kenmei, subject (of a ticket or an email)", the Words chip pops and the word joins the Words panel's Words list. Until one is known, that line says "Tap a Japanese label to learn it." (desktop: "Click"). A known label loses its dotted underline. None of them is needed to use the app or to move the story, none can be said, and none has a voice clip yet.
