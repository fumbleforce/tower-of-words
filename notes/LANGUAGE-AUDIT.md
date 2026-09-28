# Language audit, day 1 (2026-09-28)

Tool: `node game3d/tools/lang-audit.mjs` (full report), `--brief` (one line plus the errors, for the fast test), `--json`. It takes about 50 ms. It walks the day in story order through every branch (both gate routes, both lunches, every choice), keeps track of which words Eric has been taught at each point, and flags readable Japanese he hasn't been taught: story lines, choice buttons, hints, overheard lines (their `clear` lists and the interjections the gibberish filter leaves readable), speaker names, labels, the People panel, signs and props in the 3D scenes, and the UI. It also checks that a known word inside an overheard line comes through clear in the voice clip (audio/spans.json), and lists how often each taught word comes back.

"Taught" follows the engine: typed (`type`), `learn`, `offer`, or shown glossed as `{id}`. A `clear` entry is readable for one line and teaches nothing.

The main line (the nodes every player passes) is listed at the top of the tool as `MAIN`. If the story's route changes, update it there; the tool warns about any node it names that no longer exists and skips it.

## Result on the current build

9 errors, 12 warnings. The story text itself is clean: no untaught Japanese in an English line, no word used before it's taught, no broken word ids, every known word in an overheard line has its clear span in the voice clip. The errors are all signs and one UI glyph.

### What's taught, and whether it comes back

| Word | Taught | Later lines | Things that answer it |
|---|---|---|---|
| 外人 gaijin | glossed, train (Mio, on sitting) | 3 | none (not sayable) |
| おはようございます ohayō gozaimasu | glossed, then typed, train | 12 | 10 |
| よろしくおねがいします yoroshiku onegaishimasu | glossed, then typed, train | 3 | 5 |
| つぎは tsugi wa | glossed, train announcement | **0** | 0 |
| 本社 honsha | glossed, train announcement | **0** (the station and lobby signs show it) | 0 |
| すみません sumimasen | glossed, then typed, train | 3 | 8 |
| 待って matte | glossed, then typed, train doors | **0** | 4 |
| 開けて akete | heard from Hamada, gate | 1 | 5 |
| 動いて ugoite | glossed, then typed, copier | **0** | 2 |
| 止まって tomatte | typed, lunch with Mio only | **0** | 1 (fan) |
| 入れて irete | typed, lunch with Mori only | **0** | 1 (kettle) |

The greetings are in good shape: heard, said and answered all day. The commands are the weak spot. Each is taught in one strong moment and then never appears in a line again; the player only meets them again if they go looking with the Say menu, and three of the reactions they'd find (clock, fan, coffee machine) have no line at all. つぎは and 本社 are taught and dropped, which is fine for a station announcement (本社 is on two signs afterwards).

### Errors (readable, untaught, nothing explains it)

World (signs drawn in the scenes):
- office.js:297, the plate `企画室７` (Planning Office 7) on the main office. It is also wrong for the story now: the team is IT support.
- office.js:298 `機械室` (machine room), 299 `階段` (stairs), 302 `コピー室` (copy room) and `給湯室` (kitchenette).
- office.js:129, the in/out board header `行動予定表`.
- lobby.js:197 `階段`, lobby.js:286 `忘れ物` (lost property).

Shell:
- css/style.css:284, the phone Words button uses the kanji `言` as its icon. Untaught, and the desktop button already has an SVG icon.

Fix for the signs, matching what the lobby already does with 受付 VISITORS: keep the Japanese and add a small English line under it. Details are in production-requests.md.

### Found by reading (the tool can't see these)

- **Eric's desk has Mio's name card.** office.js:393 puts `ミオ / Mio` on `my_desk`, left over from when Mio was the player. The story's look line says "A name card in katakana. You hope it says Eric."
- The 外人 / 外国の方 beat in the office: Mori's correction shows as gibberish and Mio explains it in romaji only. The player never sees the word she's explaining.
- The gate hint "Mio said if you're stuck, say すみません and point" is story advice in a UI panel, and it writes すみません raw instead of `{sumimasen}`.

### Warnings

- `clear` entries outside the taught set: コンサルタント (lift), ノルウェー and リレハンメル (lunch with Mori), ゲート (Kenji's gossip), ありがとう twice (gifts to Mori and Kenji). The loanwords are the "caught by ear" kind VOICE.md allows. ありがとう isn't a loanword; it's defensible only because Eric says on the train that it's the one word he knows. Keep it as a known exception or drop the clear entry; either is fine, but it should be a decision.
- The train choice "ありがとう (arigatō). That's about it." glosses the reading but not the meaning.
- The gibberish filter leaves はい readable with no gloss (gate, guard answering yoroshiku; office, Mori answering ohayō). Jørgen asked for clear interjections; はい is a word, though. lang.js now exports `INTERJ_GLOSS` (はい: hai, yes; うん; ええ; まあ; ほら) for the shell to use in `heardHTML`; the audit stops flagging them once ui.js uses it.
- The gibberish glyph pool in ui.js includes 29 real kanji (会社部長話時間問題今日…). Two neighbours can spell a real word (会社, 時間, 今日), so gibberish can accidentally show readable Japanese. Kana-only glyphs, or kanji that don't pair into common words, would avoid it.
- つぎは and 本社 are never used again (see above; low priority).

### Notes (no action needed)

- lang.js has 来て, 出して, お疲れさまです and 言霊, none taught on day 1. Fine to keep for later.
- The two office ambient lines (Kenji and Mori talking about Eric) have no voice clips yet.
- 本日のお知らせ on the lobby notice screen passes because English sits under it, but that English is the notice, not a translation of the header. Low priority.

## Hooked into the fast test

Requested from the builder: run `lang-audit.mjs --brief` inside fast.mjs and print its line; count its errors as a FAIL once the world's sign fixes are in (until then, print only, so it doesn't block pushes).
