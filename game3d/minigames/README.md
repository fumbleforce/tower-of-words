# Grammar minigames (prototypes)

Standalone pages that teach grammar as a game. They are not part of the game yet: nothing in game3d/js loads them. Asked for by Jørgen on 2026-10-02 ("giving and receiving should get one ... One for telling x is better than y or liking one thing over another"). After the second giving game he said: "even less fun, start over, write a new game from scratch, make it the most fun and impressive grammar game in existence" (Review minigames-2, 2026-10-04). Kotodama is that new game; the three below it are the earlier prototypes, kept as they are.

Play them with the repo served on 8771 (`./start`):

- http://127.0.0.1:8771/game3d/minigames/kotodama.html (Kotodama, the new one)
- http://127.0.0.1:8771/game3d/minigames/give.html (Friday drinks; the first version is give-v1.html)
- http://127.0.0.1:8771/game3d/minigames/compare.html (Lunch run)
- http://127.0.0.1:8771/game3d/minigames/want.html (Favours)

## Kotodama (kotodama.html): を, に, と, も, みんな, ～てください

### Pitch

B2 after six. Everyone wants something from the old machines, and the machines do exactly what Eric says, word for word. You build each command from the room itself: tap who and what, give each a particle, and fire the verb. The particles decide what flies where, so ミオさんに コーラを だして lands a can on Mio's desk and コーラに ミオさんを だして sends Mio to the can.

### Core loop

1. People ask for things. Each request is a bubble over their head with the thing in it and a few pips of patience. Patience counts commands, not seconds: nothing in the game runs on a clock.
2. You build one command. Tap a thing in the room and its word drops into the sentence, then tap its particle (を, に, と, later も). Tapping a drink on a machine also turns Eric to that machine (じはんき、). The machine's verb is the fire button: だして for the vending machine and the fridge, いれて for the hot-water pot (ポット).
3. The machine does it, literally. The kotodama effect from the game plays (the lights dip, the command rises off the machine in light, the low tone), then cans fly in arcs to whoever に points at. Served people tick off their bubble; the wrong person gets a spare can on their desk; a person marked with を gets put out of the machine.
4. Score: every request served by one command multiplies the others (two served is 2 × 2, three is 3 × 3), and clean commands in a row add a streak multiplier on top (up to ×4). The multiplier flashes over the room and stays written under the score until the next command. Someone just served doesn't ask again until after the next command. A request that runs out of patience costs one of three hearts.
5. Three shifts of five to seven commands. New requests come faster each shift than one command can answer one at a time, so the only way to keep up is bigger sentences: と to serve two or three people in one go.
6. Between shifts you pick one power word of three: も (send the same again to someone else, free), みんな (everyone, once a shift), まって (everyone waits two commands longer, once a shift) or ください (polite commands score double).

A run is about four minutes. The daily run has the same requests for everyone that day, with a best score kept on the device and a line to share; free play deals a new run.

### Why it should be fun

- Grammar is the throughput. The pressure ramps until one request per command loses, so と stops being a grammar point and becomes the combo you reach for, and the run's biggest moment is a long sentence firing three cans at once. Like Mini Metro, the pressure grows faster than you can answer it the simple way.
- The world takes you literally (Scribblenauts, Baba Is You). Any sentence you can build is acted out exactly as said, so a swapped particle is a joke you caused, and you see why it went wrong. People react in character.
- Build and combo escalation (Balatro, Vampire Survivors): squared combos, a streak multiplier, and power words that change how you play (も chains after a と combo; みんな as a bomb when everyone wants coffee).
- Juice: arcs, landings, screen shake on big combos, a combo banner, a score that counts up with rising notes, particles, the game's own kotodama sound.
- Short and repeatable (Wordle): one daily run, a best score, a share line.

### What it teaches, and how

- を marks the thing that moves, に where it goes or who gets it. Word order is free; the particle decides the role, and the room shows it.
- と joins nouns on either side: ケンジくんと モリさんに コーヒーを (two people), コーラと コーヒーを (two things).
- Request forms from day 1 (だして, いれて), ～てください, the power words も and みんな, and the people's own lines (コーラ、ちょうだい, おちゃを おねがいします, ありがとうございます), each tappable for its reading and meaning.
- English fades by shift: shift 1 shows English under every tile, the whole command in English as it is built, and arrows on the room for where things will go. Shift 2 keeps the English one tap away (the EN chip) and drops the arrows. Shift 3 is the same with more machines and people. A mistake is never a fail screen: the command plays out literally, then one short line says what the particles said ("に marks where it goes: the cola. を marks what goes: Mio.").

### Honest check against "most fun and impressive"

Strong: the action is the grammar (no quiz screen anywhere), the outcome of every sentence is visible and often funny, and the pressure curve makes long sentences the reward instead of the chore. Weak: building a command is five or six taps, which could feel slow by shift 3; the depth is in grouping and the power words, not in hard grammar, and the variety of machines is small. If play shows the tapping is slow, the next step is one-tap particle cycling on the tiles themselves.

### Code

kotodama/: data.js (words, machines, people, lines, shifts), grammar.js (parses a command, writes its English and the line after a mistake), sim.js (requests, resolving a command, scoring, seeded random), stage.js (the room and its animations), fx.js (particles, shake, floaters), audio.js (synthesised notes plus the game's own sfx), art.js (the machines and items as SVG), ui.js (top bar, talk strip, sentence rail, pad, cards), game.js (flow, input, the test hook), kotodama.css. Unit tests: game3d/test/unit/kotodama.test.mjs. tools/frames.mjs saves frame strips of the first command, a swapped particle and the first と combo. Pacing was tuned with the planner from sim.js playing 200 seeded runs: answering one request per command scores about 600 and loses a heart or so; grouping with と scores about 1,500 with no hearts lost.

## The earlier three

Friday drinks, Lunch run and Favours each take three to five minutes, work offline, on the phone and on the desktop (drag, or tap one thing and then the other; Enter on a focused thing works too). Nothing runs on a timer. Japanese shows with readings: kana over kanji, romaji over katakana, and any dotted word can be tapped for its reading and meaning. Early lines show the English under them; later ones keep it one tap away, and the English button in the top bar shows it always. A wrong answer is never a fail: the game shows what the sentence would have meant, someone reacts, Mio says the rule once, and the player tries again. The round pips at the top fill in teal for a first-try answer.

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
- tools/play.mjs plays a game to the end in a headless browser, the way a player would, with a screenshot per step in game3d/shots/minigames/. `--wrong 3` gets every third task wrong first (in Kotodama, the particles swapped). tools/play-all.sh runs all five pages at 390 × 844 and 1366 × 860, both ways. The pages draw no WebGL, so they run with GL=soft.
