# Grammar minigames (prototypes)

Three standalone pages, each teaching one family of connected grammar with the words it needs. They are not part of the game yet: nothing in game3d/js loads them, and nothing they do is saved. Asked for by Jørgen on 2026-10-02 ("giving and receiving should get one ... One for telling x is better than y or liking one thing over another").

Play them with the repo served on 8771 (`./start`):

- http://127.0.0.1:8771/game3d/minigames/give.html (Drink round)
- http://127.0.0.1:8771/game3d/minigames/compare.html (Lunch run)
- http://127.0.0.1:8771/game3d/minigames/want.html (Favours)

Each takes about five minutes, works offline, on the phone and on the desktop (drag, or tap one thing and then the other; Enter on a focused thing works too). Nothing runs on a timer. Japanese shows with readings: kana over kanji, romaji over katakana, and any dotted word can be tapped for its reading and meaning. Early lines show the English under them; later ones keep it one tap away, and the English button in the top bar shows it always. A wrong answer is never a fail: the game shows what the sentence would have meant, someone reacts, Mio says the rule once, and the player tries again. The round pips at the top fill in teal for a first-try answer.

## Drink round (give.html): あげる, くれる, もらう

- Mechanic: the B2 team swaps vending-machine drinks at the kitchenette table, and Mr. Mori writes down who gave what so he can thank the right person. Four seats round the table; the one who is talking wears a teal "わたし" tag. In "show it" rounds the player reads a sentence and drags from the one who gives to the one who gets. In "say it" rounds a drink is handed over in front of them and they fill the gaps in the sentence (the verb, the particle on the giver, or who got it).
- What it teaches: direction and point of view. あげる goes away from whoever is talking, くれる comes in to them, もらう puts the one who gets it first with に or から on the giver; は, が, に, から and を on the right people. The drinks are the day-1 gifts (コーヒー, こうちゃ, メロンソーダ, コーンスープ) plus チョコ and おにぎり.
- Feedback: a wrong verb is acted out literally, the way kotodama takes words. Say くれました for a drink that went to Kenji and it flies to Eric instead, and Eric says he didn't get anything; get もらう backwards and the drink goes the other way and the "giver" protests.
- Ramp: あげる with English under it (two show-it rounds, then naming who got it); くれる when it comes to Eric; もらう with the trap that the first name is the one who gets; then Mio and Kenji talk, the わたし tag moves to them, and the same hand-over needs a different verb. Ends with Mori's notebook: every sentence with its English and the first-try count. Play again replays the rounds with other people and drinks, keeping each one's direction to the speaker.
- Next tier, not built: さしあげる, いただく and くださる when Mori or Emi is involved.

## Lunch run (compare.html): すき, のほうが, より, いちばん, どちら, どれ

- Mechanic: Mio is stuck with the servers and sends Eric to the canteen counter for B2's lunch. The counter shows each dish's price and bowl size; the team's trays are along the bottom. Read what someone wants and carry the dish to their tray; answer a question about two dishes by putting them in order in AはBより…です; tap the dish that answers a どれがいちばん… question; and in spicy week, with lids on, put three dishes in order from two of the canteen worker's comparisons (a small logic puzzle), then give Kenji the least spicy one.
- What it teaches: Xがすき, Xのほうがすき, AよりBのほうが, AはBより＋adjective, どちらのほうが for two and どれがいちばん for three or more, この中で, and the adjectives やすい, おおきい and からい.
- Feedback: the wrong dish lands on the tray and its owner says so; a comparison said backwards gets the prices read back ("Ramen? Ramen is ¥650, curry is ¥580."); a wrong order leaves the lids on until it is right.
- Ramp: すき with English, then のほうが after Mio's どちら question, then より with the trap that the first-named dish loses; then answering comparisons yourself; then いちばん; then the lidded puzzle; and last the player's own answer to この中でどれがいちばんすきですか, where every dish is right. Ends with every sentence said and what lunch cost. The likes here belong to this game only; they are not cast facts.

## Favours (want.html): ～たい, ～てほしい

- Mechanic: B2 in the afternoon. Each person says what they want, a job card appears on the desk, and the player gives it to whoever will do it: a person, or one of B2's machines (the copier, the kettle, the rack alarm). When the job lands on a machine, or on Eric at the kettle, Eric says the command to it, picking from the -te words day 1 teaches, and the machine glows as it takes the word.
- What it teaches: ～たい is the speaker wanting to do it themselves; Yに～てほしい is wanting Y to do it. It reuses day 1's commands (まって, あけて, うごいて, とまって, いれて) inside てほしい, so a known word turns up in a new structure.
- Feedback: the wrong person asks why it's them, a machine "doesn't want anything", and a wrong command does nothing ("You said 'wait'").
- Ramp: たい with English, then てほしい with に on who does it, then machines, then a たい after several てほしい, and last Mio asks Eric what he wants to do and any answer is right.

## Voices

Mio's word clips play for the day-1 commands in Favours (tap the word, or when Eric says it). No other word here has a clip, and none were made for these prototypes. Missing, if one of these goes further: あげました, くれました, もらいました, に, から, コーヒー, こうちゃ, メロンソーダ, コーンスープ, チョコ, おにぎり, どうぞ, みなさん, ありがとうございます, すき, ほう, より, やすい, おおきい, からい, いちばん, どちら, どれ, なか, ラーメン, カレー, うどん, やきそば, たい, ほしい, のみたい, かえりたい, ねたい, たべたい, なに, したい.

## Code

- common/: the shared frame (ui.js: top bar, talk box with portraits, choices, sentences with gaps, the word popover, the end card), jp.js (furigana, romaji over katakana, glossed words), drag.js (drag or tap-tap between things, arrows, flying items), cast.js, sound.js (the game's own interface sounds and word clips), mg.css (the game's colours and type).
- give/, compare/, want/: each game's rounds (data) and game.js (its scene and round types).
- tools/play.mjs plays a game to the end in a headless browser, the way a player would, with a screenshot per step in game3d/shots/minigames/. `--wrong 3` gets every third task wrong first. tools/play-all.sh runs all three at 390 × 844 and 1366 × 860, both ways. The pages draw no WebGL, so they run with GL=soft.
