# Grammar minigames (prototypes)

Three standalone pages, each teaching one family of connected grammar with the words it needs. They are not part of the game yet: nothing in game3d/js loads them, and nothing they do is saved. Asked for by Jørgen on 2026-10-02 ("giving and receiving should get one ... One for telling x is better than y or liking one thing over another").

Play them with the repo served on 8771 (`./start`):

- http://127.0.0.1:8771/game3d/minigames/give.html (Friday drinks; the first version is give-v1.html)
- http://127.0.0.1:8771/game3d/minigames/compare.html (Lunch run)
- http://127.0.0.1:8771/game3d/minigames/want.html (Favours)

Each takes three to five minutes, works offline, on the phone and on the desktop (drag, or tap one thing and then the other; Enter on a focused thing works too). Nothing runs on a timer. Japanese shows with readings: kana over kanji, romaji over katakana, and any dotted word can be tapped for its reading and meaning. Early lines show the English under them; later ones keep it one tap away, and the English button in the top bar shows it always. A wrong answer is never a fail: the game shows what the sentence would have meant, someone reacts, Mio says the rule once, and the player tries again. The round pips at the top fill in teal for a first-try answer.

## Friday drinks (give.html): あげる, くれる, もらう

The second version of the giving game, after Jørgen's verdict on all three prototypes (Review minigames-1, 2026-10-04: "it's a starting point, but they are not particularly fun"). The first version, the Drink round, is kept as give-v1.html with its code in give-v1/, for comparison.

Why the Drink round wasn't fun, from playing it at phone size:

- No decisions. Each task was answered by the scene: in the "show it" rounds the English sat under the sentence, and in the "say it" rounds the player had just watched the drink fly to the person they then had to name.
- No stakes. Nothing depended on getting it right; a wrong answer was a short detour and Mori's notebook at the end was a list nobody cared about.
- The same action thirteen times, with 31 tap-to-continue lines around them (44 steps on a clean run, 68 with mistakes), for five minutes.
- No surprise. The one twist (Mio talking, so わたし moves) was announced before it happened.
- Weak feedback. A thin border flash for right, a shake for wrong, and no score, run or payoff.
- The people only commented. Nobody had anything riding on the drinks.

What changed:

- A small puzzle each round. Everyone at the table gave one drink and got one, and each person sits with the drink they got. People say what happened, each from their own side: the giver says あげました, the one who got it says くれました or もらいました, and each drops their own わたし the way people do. One person never says anything (Mori never says what he gave), so the last arrow has to be worked out. In the last round one clue only names the drink ("I gave the corn soup"), so the player has to look at who is holding it.
- The player draws all the arrows (drag, or tap one and then the other), can redraw any of them, and commits with Thank them. Nothing is checked until then.
- Stakes and payoff: everyone thanks whoever the drawing says gave them theirs. A wrong arrow means a thank-you goes to the wrong person; they react in character (Kenji takes the credit), and Mio says which line gave it away, quoting it. The ending depends on how many thank-yous went wrong: Mori thanks everyone, or Kenji decides he is very generous.
- Juice: the cans arrive from the machine and land in front of people, thank-you bubbles pop over each one in turn with a tick or a cross on whoever was thanked, the arrows turn teal or red and wrong ones are redrawn dashed, there is a run counter for right thank-yous in the top bar, and the round pips fill teal for a round with no mix-up.
- Shorter: four rounds (あげる with English shown; くれる; もらう with に and から; everything mixed), 15 arrows, 38 steps on a clean run (21 of them actions, 17 lines), about 3 minutes. Two of the rounds end with Eric saying the hand-over that came to him (filling in the verb, and in the last round the particle too); a wrong verb is acted out literally, as before.
- The people have something going on across the rounds: Mori gives Mio tea every week although she doesn't drink it, she gives it to Kenji in the last round in front of him, and the one round where Mori finally says what he gave is commented on.
- Play again swaps Mio, Kenji and Mori round and changes the drinks, so the clues have to be read again; the lines written for the first run are left out.
- English: the first round shows it under every line, later rounds keep it one tap away per line (and the English button shows it always). Nothing runs on a timer: the thank-you round animates, but every line it leaves stays on screen.
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
- give/, give-v1/, compare/, want/: each game's rounds (data) and game.js (its scene and round types). give/tables.js builds every clue sentence from who said it and which hand-over it is about.
- tools/play.mjs plays a game to the end in a headless browser, the way a player would, with a screenshot per step in game3d/shots/minigames/. `--wrong 3` gets every third task wrong first. tools/play-all.sh runs all four pages at 390 × 844 and 1366 × 860, both ways. The pages draw no WebGL, so they run with GL=soft.
