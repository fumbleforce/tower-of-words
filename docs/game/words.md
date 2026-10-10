# Words

The game’s vocabulary (id, Japanese, reading, meaning and kind), authored teaching opportunities, ticket labels, dialogue presentation and persistent language connections. The source registry is game3d/js/lang.js and the day-specific word modules it imports.

Elsewhere: which storyline teaches a word, and who teaches it, is in that storyline's "Words taught" table ([stories/](stories/); `node tools/facts/check.mjs --game` prints them all in one list). How the Say menu, typing and word practice work is in [systems.md](systems.md) and [controls-and-ui.md](controls-and-ui.md). How to write a word into a line (`{id}`) is in game3d/story/FORMAT.md.

## Words

Checked against game3d/js/lang.js. Kind: a `phrase` is a greeting Eric can say to people; a `command` is a word he can say to make a machine do something (kotodama); a `word` is shown with its gloss but can't be said; a `label` is one of the ticket system's screen labels (Labels on the ticket system, below).

| Id | Japanese | Reading | Meaning | Kind |
|---|---|---|---|---|
| `ohayo` | おはようございます | ohayō gozaimasu | good morning | phrase |
| `yoroshiku` | よろしくおねがいします | yoroshiku onegaishimasu | nice to meet you | phrase |
| `sumimasen` | すみません | sumimasen | excuse me, sorry | phrase |
| `mada` | まだ | mada | still; not yet | phrase |
| `yasumi` | 休み | yasumi | a break; a day off | phrase |
| `kanpai` | 乾杯 | kanpai | cheers | phrase |
| `oishii` | おいしい | oishii | delicious | phrase |
| `mouichido` | もう一度 | mou ichido | once more | phrase |
| `daijoubu` | 大丈夫 | daijoubu | okay; all right | phrase |
| `tabetai` | 食べたい | tabetai | I want to eat | phrase |
| `nomitai` | 飲みたい | nomitai | I want to drink | phrase |
| `mitai` | 見たい | mitai | I want to see | phrase |
| `ikitai` | 行きたい | ikitai | I want to go | phrase |
| `isshoni` | いっしょに | isshoni | together | phrase |
| `koko` | ここ | koko | here | phrase |
| `gamen` | 画面 | gamen | screen | phrase |
| `yoyaku` | 予約 | yoyaku | booking | phrase |
| `oyogu` | 泳ぐ | oyogu | swim | phrase |
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
| `watashi` | 私 | watashi | I, me | word |
| `anata` | あなた | anata | you | word |
| `rokuji` | 六時 | rokuji | six o’clock | word |
| `futari` | 二人 | futari | two people | word |
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

Day one offers the following words; its lunch routes teach different commands. Who teaches each, and in which node, is in the storyline's "Words taught" table.

1. `gaijin`, `ohayo`, `yoroshiku`, `sumimasen`: Mio on the monorail ([mio-train](stories/mio-train.md)).
2. `matte` from Mio on the platform, `akete` from Mr. Hamada at the stuck gate ([sleeping-man](stories/sleeping-man.md)).
3. `ugoite`: Mori at the copier ([copier](stories/copier.md)).
4. `tomatte` or `irete`: one of the two, from whoever Eric has lunch with ([lunch](stories/lunch.md)).

`dashite` is taught through the gym printer from day three and reused in the later guided vending request, with a catch-up if the lesson was missed. `kite` has no lesson in the playable opening or recurring stories; its old placeholder scene is not part of those stories. `otsukare` and `kotodama` remain registry terms without a typed lesson. `honsha` and `tsugiwa` appear glossed in the opening but are not thereby learned.

## How a word is shown

- In ordinary English or teaching lines, an explicit `{id}` displays its Japanese, reading and meaning. Anyone else's Japanese is blurred, marked `overheard` or not; only learned words, recognized names, arigatō and line-only `clear` entries that are names or loanwords remain readable. Showing a gloss does not teach the word. English subtitles marked “in Japanese” are left only for ambient exchanges between other people (game3d/story/FORMAT.md; the rule and its check are in docs/game/systems.md).
- A new word is introduced in context and repeated slowly, with the meaning supported by the actual gesture, object or action. The player types its romaji ([systems.md](systems.md), Typing a word). Taught words in dialogue can be clicked (or their small play button) to hear them again, always Mio saying it slowly in Japanese (audio/word-<id>.mp3; Jørgen, 2026-09-30: "when I click on words during conversation, it should be mio saying it in japanese"). Eric's own clip (audio/eric-<id>.mp3) plays only when he says the word. The other words (`honsha`, `tsugiwa`, `otsukare`, `kotodama`) have no clip and no play button.
- Katakana always shows its reading. Loanwords Eric would catch by ear (コンサルタント, ゲート, ノルウェー, IT, B2) can be made clear inside an overheard line for that line only; they don't become known.
- People's names are never hidden (Jørgen, 2026-09-30: "his name should not be obscured"). In an overheard line a name stays readable with the name in romaji after it, taught or not, and an honorific after it goes with it: 森 (Mori), 浜田さん (Hamada-san). The spellings are listed in game3d/js/lang.js `NAMES`; the language check fails on a name before さん or と申します that isn't listed.

## When a word is known

- Only words taught in play count as known: typed at the typing prompt, taught with `learn` or `offer`, or a ticket system label tapped or used (below) (Jørgen). Nothing is known at the start. A word shown glossed in a line is explained there but not taught; never mark other words as known (九時 at the gate was wrong).
- Known words stay sharp in overheard Japanese from then on, and in the voice they come out clear while the rest is muffled ([systems.md](systems.md), Overheard Japanese).
- Phrases and commands Eric knows go in the Say menu; how often he has to type one before a click is enough is in [systems.md](systems.md), Word practice.

## Taught on day 2

The [day-2 set](../../game3d/story/day2/README.md) keeps nine contextual phrases in story/day2/words.js. The station teaches mouichido and daijoubu for repeating the test and reporting its result. The meal teaches tabetai for the chosen food. Kanpai at the toast and oishii in a later compliment are optional. Optional conversations teach yasumi at reception, nomitai over tea, mitai at the telescope and ikitai with Mori. Kuro also teaches watashi (I, me) at reception in the same talk as yasumi, and anata (you) at reception in the evening, but only when Eric answers her お疲れさまです in Japanese. Both are typed and understood, never said from the Say menu. They prepare her later invitation, which she will only make in Japanese once Eric can follow a time, a number of people and “you and me” (Jørgen, character-voices-2). Exact teachers and nodes live in the [day-2 stories](stories/day2/README.md).

The **-tai form** expresses what the speaker wants to do. The Words panel pairs 食べたい with 食べる, 飲みたい with 飲む, 見たい with 見る, and 行きたい with 行く. Every new phrase starts unknown and is learned through typing. These phrases address people; none commands a machine. The protagonist's pronunciation key is declared in each word record and remapped for the chosen protagonist; clickable replay remains Mio's slow word clip.

## Taught on day 3

The [day-3 set](../../game3d/story/day3/README.md) adds `gamen` (screen) and `yoyaku` (booking) through separate repair requests, with a typed model before using each in the request and result. The printer's existing `dashite` lesson follows the completed ordinary print. These are the three new words on the core repair route; learning does not itself produce magic.

`koko` remains optional at the map (`d3_map`, `d3_koko_word`). Two more optional words prepare Kuro’s invitation: Aoi reads the swimming slip’s 18時 out as `rokuji` (six o’clock) at the board (`d3_aoi_name`), and Kuro asks for a table for `futari` (two people) at the shotengai bakery counter at lunch (`d3_kuro_futari`). Like watashi and anata they are typed and understood, never said from the Say menu. At the swimming club, asking how to say you will swim teaches `oyogu`, then follows the choice into the water. Swimming, helping, watching and leaving all work without this lesson. Watching can reuse already-known `mitai`. The contextual pool and pace glosses do not mark words learned.

Known `gamen` returns during the court display inspection (`d4_display`) and at the karaoke screen (`d5_screen`); `yoyaku` returns in the tennis reservation conversation (`d4_tennis_offer`). A later pool talk (`d3_kuro_pool`) reuses `oyogu`. Unknown-word branches retain ordinary English. `dashite` prepares the later guided vending request, with a completed-printer catch-up if it was missed. These scene locations describe current authored opportunities, not limits on when vocabulary can matter.

## Labels on the ticket system

The ticket app ([controls-and-ui.md](controls-and-ui.md)) labels its columns, fields, statuses and buttons in Japanese (Jørgen, 2026-10-03: "Some japanese here, and learnable"): 件名, 依頼者 and 状態 over the list and down the ticket's form, 報酬 by the pay, the statuses 未対応, 対応中 and 完了, and the buttons 担当する, 戻る and 閉じる. They are kept in game3d/js/tickets/words.js, which lang.js adds to its words. Each label shows its reading over it in small type and its short English after it (件名 Subject), every time. Tapping or clicking a label teaches its word, and using a button teaches the button's; a line at the foot of the page says "New word in your Words: 件名 kenmei, subject (of a ticket or an email)", the Words chip pops and the word joins the Words panel's Words list. Until one is known, that line says "Tap a Japanese label to learn it." (desktop: "Click"). A known label loses its dotted underline. None of them is needed to use the app or to move the story, none can be said, and none has a voice clip yet.

The optional [sender investigation](stories/investigations/sender.md) teaches `mada` only through Mio’s offered typing practice. Hearing Mori or inspecting records never learns it. Learning before or after his exact remembered remark opens the same tentative interpretation, including after the physical solve.
