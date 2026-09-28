# Day 1 design

Revised 2026-09-25 to match every day-1 decision in GUIDE.md "Current focus". The full script for every branch is in `day1-draft.md`. The first version of this file (coffee machine, trade route, 10:30 deadline, 20-minute session) is superseded.

Flow: monorail (phone onboarding and level check) → gate → basement office (B2) → copy room (B1) → office → Sales (3F) → office → afternoon (summary) → evening in the office → dorm room.
People on screen: Emi, Mio, Rei. Ishibashi is a voice from the speaker above the security gates, with no sprite. Canteen, rooftop and bar are day 2. Locations drawn: monorail, gate, office, copy room, Sales, dorm (six). The elevator is a floor panel over a plain steel backdrop, not a drawn location.

## What changed from the first design
- No coffee machine. The copy room is the very first magic the player sees and uses.
- No trade with Rei. Sales has four ways through: ask, leave it for the afternoon, cast now with a witness, or wait until the witness leaves and cast.
- No deadlines and no clock fail states. The clock moves (waiting, wrong floors, doing things by hand) and characters react to how fast you were, but nothing is lost because a timer ran out. The runaway copier with an 8-second timer is gone. Emi wants Rei's numbers "before the meeting", said softly, with no countdown.
- 5 casts for the whole day, shared between the copy room and Rei.
- The magic's origin stays a mystery. The narration says it has worked ever since he started learning Japanese, and that he never found out why. Nothing more.
- Imperatives (出せ, 急げ) exist only as tiles in the spell ring and as their loud results. The player's own replies never use them.
- Romaji over katakana appears only when the player taps the word.
- Onboarding moved onto the monorail as the company phone's new-hire app: welcome, island map, his dorm room, the ID card, then a two-minute level check.
- The day ends in his dorm room (second floor, window facing a concrete wall), with the free-typing moment as a chat with Emi and a scripted fallback.

## 1. The magic mechanic

### The rule
A spell is one ordinary Japanese verb in one form, said with intent. Things do exactly what the words say. The verb picks what happens and the form picks how. The player never reads this rule; it shows up through results.

| Form | Example | Result |
|---|---|---|
| te-form request | 出して | Works at normal strength. |
| Imperative | 出せ | Works too hard: loud and overdone. On a person it lands as an order, and she notices. |
| Dictionary form | 出す | Nothing. The thing "agrees" and doesn't act. |
| Past | 出した | The thing repeats the last thing it did. |
| Wrong verb | 見せて on Rei | A literal result: she shows you the folder instead of handing it over. |
| Nonsense ending | 出いて | Nothing. |

Every cast costs one of the day's 5 voice marks, misfires included.

### Building a spell (UI)
The existing spell ring: the goal in plain English, who can see you (見ている人), the voice marks. Pick a verb (the copy room offers one per step; Rei's step offers two), then pick the ending from tiles, or type the whole word in romaji on desktop. The tiles are the forms that do something plus distractors. One verb, one form, one word per step. No count slot: the count is set by hand on the copier's keypad, from memory of Emi's 十部.

### The copy room, step by step
One word per step, each step teaching one te-form sound rule, each attached to something on screen:

| Step | Problem | By hand | Spell | Sound rule |
|---|---|---|---|---|
| 1. Jam | A torn page deep in the rollers; the copier is dead | Fails (button, panel, hitting). This is where he decides to use it. | 出す → 出して | す → して |
| 2. Count | The keypad asks for 部数 | 10 / 11 / 20 / 100: a listening check of Emi's 十部 (11 comes from 十一時) | none | |
| 3. Copy | One page every ten seconds | Wait (the clock moves, nothing else) | 急ぐ → 急いで | ぐ → いで |
| 4. Sort | The old copier doesn't collate | About ten minutes by hand | 並ぶ → 並んで (the pages literally queue along the desk) | ぶ → んで |
| 5. Footsteps | Mio in the corridor | Keep still, or open the door first | none | |
| 6. Staple | none | The stapler works. It's the only thing in the room that does. | none | |

Step 1 is the only forced cast. Its hint grows after each misfire ("Ask it, the way you'd ask a person.", then "The way Emi asked you.", whose request was 「これ、コピーして。」, then the て tile is marked), and "Stop" is offered only after two casts, so almost every player sees the first spell work. If the player stops or runs out of voice there, he picks the page out with a ruler over twenty minutes and the copier wakes anyway, so nobody gets stuck. Steps 3 and 4 are real choices: hands cost time, magic costs voice and can make noise. A clean run uses 1 to 3 casts and leaves 2 to 4 for Rei.

Outcomes worth noting:
- 出せ: the page, then the whole paper tray, hits the door. Works, loud.
- 出した: it prints the last thing it ever printed, the こわれています sign taped to it (so that's where it came from), and jams again.
- Typed on desktop, real Japanese that isn't a tile gets a literal result too: 出て (the page steps halfway out), 並べて (the toner boxes arrange themselves).
- 急げ: done in ten seconds, smell of hot toner, half the pages crooked. Works, loud; Emi notices later.
- 急いだ: it repeats its last act and prints the last page again, once, slowly.
- Waiting on 100 copies: after ten sets he hits stop. Nobody loses an hour to a mis-tap.
- 並べ: the pages snap into line so hard the stapler falls off the desk. Works, loud.
- 並んだ: the pages repeat their last move and slide onto the floor.
- 100 copies with 急いで: four hundred pages in a minute. Loud.

### Noise and the footsteps
Loud results add hidden noise. There's no meter; the player hears the machine. The footsteps always come, after sorting. They belong to Mio, who left the office before you to find phone signal for her game event (set up in the office: 「……また、つながらない。」 and her slippers).
- Keep still, quiet run: the steps stop at the door, a sigh, 「……ここも、つながらない。」, and she walks off. Every player gets this near miss.
- Keep still, loud run: she opens the door, sees the "broken" copier humming, asks 「それ、こわれてなかった？」. Mio saw (her suspicion +1). It pays off after Emi leaves, in her own terms: 「今度、私のゲーム機もなおして。」
- Open the door first: you meet her in the corridor, she never sees the room. If it was loud she says so, and mentions it again in the office.

### Sales: the second spell
A person, and a witness (the salesman at the next desk). Rei stalls on purpose (she tells you she knows it's too late after the meeting: 「知ってる。」). The choice comes back after every attempt:
1. Ask again: 「聞こえなかった？　午後。」
2. 「会議のあとじゃ、おそいよ。」 → 「知ってる。」 (her own agenda, in two words)
3. Leave it for the afternoon: no numbers for Emi's meeting. Emi manages. Rei hands them over at two.
4. Cast now, one witness.
5. Wait until the salesman leaves (about twenty minutes, nothing lost). Rei notices you're still standing there: 「……まだいるの？」 Then cast with no witness.

Spell: verbs 渡す (hand over) and 見せる (show, heard at the gate and on the phone's ID screen).
- 渡して: she hands it over, stares at her empty hand, 「……なんで渡したんだろう。」「……午後って、言ったのに。」 (she keeps her own goal and her irritation).
- 渡せ: the folder slaps onto the desk. 「……今、私に命令した？」 Got it, but she felt the order.
- 見せて: she opens the folder and holds it up for you, then snaps it shut. 「……見た？」 Rows of numbers, too fast to keep.
- 見せろ: she shoves it at your face and pulls it back. 「……今、私に命令した？」
- 渡す / 見せる (dictionary form): she agrees and doesn't act: 「うん、渡すよ。午後に。」
- 渡した / 見せた (past): she repeats what she was doing, typing.
- Nonsense endings: 「……何か言った？」, then 「……何？」
Every witnessed cast that moves her gets a line from the man at the next desk (he looks over, or stops typing). Repeated asks and repeated orders don't repeat lines: used options go away, a second order gets 「……また？」.
Any cast that visibly moves her while the salesman is watching is a witnessed cast (a flag for a later day). Rei's suspicion goes up with every cast she feels, and after any of them she messages you that night: 「今日の、あれ。何？」

### Resources and consequences on day 1
- Voice: 5 marks, shown next to the clock once the magic is revealed. Out of voice, magic options are greyed out ("no kotodama left today").
- Noise (hidden): decides the footsteps scene.
- Suspicion per person: Mio (saw or heard), Rei (felt it, felt an order), Ishibashi (casual at the gate). Day 1 only records it; later days read it.
- Time: the clock moves. Characters react (「……もう？」 if you're back within twelve minutes of entering the copy room, 「遅刻だよ」 if you reach the office after nine), and nothing fails. The longest possible morning still gets Emi to her 11:00 meeting.

### How it scales (later days)
Schools of forms unlock later: 〜ないで (preventing), 〜よう (together), 〜たら (traps), 〜ておいて (keeping), transitive pairs as misfires, potential, keigo requests for superiors. The copy room returns with new faults, so the same place tests new forms. See the old table in git history if needed; nothing of it is on day 1.

## 2. Adaptive learning

### Three tracks
| Track | Unit | Tracked |
|---|---|---|
| Vocabulary | a word or set phrase | exposures, look-ups, unaided days (existing word stages 0-3) |
| Grammar | a pattern (te-request, imperative, past, 〜ないで, volitional) | understood (level check, choices), produced (spells) |
| Letters | each kanji; katakana characters | kanji: state 0 hidden (kana), 1 learning (reading above), 2 readable; katakana: taps per character |

### How text is shown (per player, per kanji)
For each word with kanji the engine checks each kanji's state:
1. All readable → kanji alone. The word is still tappable for meaning.
2. The unreadable ones are all "learning" → kanji with the reading above: romaji if the player's hiragana is weak, kana otherwise.
3. Any kanji the player can't read yet → the whole word in kana.
Readings are never shown above kana. Katakana words show nothing extra; the first tap puts romaji above the word (counts against those katakana), a second tap opens the meaning (a look-up).

Kanji state comes from the player's kanji band plus per-kanji history. Band 0: every kanji starts hidden. Band 1: N5 kanji start as learning. Band 2: N5 readable, N4 learning. Band 3: N5 and N4 readable, the rest learning. A learning kanji seen without a tap on two separate days becomes readable. Tapping a word marks its kanji as missed (readable drops to learning). Once a word's meaning reaches stage 2, its hidden N5/N4 kanji move to learning.

### Level check (on the monorail, about two minutes, skippable)
In-world: the new-hire app's 日本語チェック. Or pick a preset (はじめて / すこし / N4ぐらい).
1. Hiragana: four words, pick the romaji. Stops after two misses.
2. Katakana: four loanwords, pick the romaji. Stops after two misses.
3. Kanji: twelve words from 人 to 企画. Tap the ones you can read, then confirm up to three by picking the reading.
4. Grammar: four short lines (来てね, 止まって, 話しかけないで, 行こう). Pick what the speaker wants, in English.
Results set: hiragana weak (romaji readings), katakana weak (noted, still tap-only), kanji band, and each confirmed kanji as readable. The profile lives with the word data, so restarting the week keeps it, and the app offers to keep it on a new game.

Drift: every scene the engine counts new words shown and taps. Under 5% taps across two scenes moves the kanji band up one; over 30% moves it down.

### Pacing rules (authoring)
- Spoken line: 16 characters or fewer where possible, hard cap 24 (punctuation not counted).
- At most one item new to a typical player per line; choice screens at most two across all options.
- Essential facts are never only in one hard line: the floor is on the panel, Emi's message and the ID card; the count is in the backlog (scroll up) and replayable.
- `tools/transcripts.mjs` flags spoken lines over 24 characters.

## 3. Variety on day 1
listen and act (announcement → doors) · read an app (map, room, ID) · level check · register reply (Ishibashi, Mio, Emi) · navigate by reading (floor panel, three rides) · first spell (forced, the reveal) · keypad from memory (部数) · hands or magic (copy, sort) · stealth (footsteps) · negotiate (Rei) · spell on a person with a witness · keep the secret (Mio's 「どうやったの？」) · rest (afternoon summary) · consequence (Emi's verdict) · free typing (chat with Emi, from the dorm) · night hook (Rei's message, if she felt it).

## 4. Beat sheet

| Scene | Who | Goal | Obstacle | Turn |
|---|---|---|---|---|
| Monorail 8:40 | the phone app, announcer, Emi (chat) | Arrive and get off at the right place | Everything is in Japanese | The app sets his level; the announcement is the first listening test; Emi's message gives 9:00, B2 |
| Gate 8:48 | Ishibashi (speaker) | Get in | The gate won't take his new ID; the guard doesn't know his face | Let in, but marked: 「変なことしたら、すぐわかるからな。」 He watches through cameras. |
| Office ~8:55 | Mio, Emi | First impression | Mio won't talk; the login doesn't work | Emi hands him the job she's been dodging: copies on the broken copier. Mio leaves to chase signal. |
| Copy room ~9:15 | alone; Mio's footsteps | Ten copies | A dead copier; slowness; sorting; someone coming | The first kotodama. Yes, but: done fast, and someone was right outside. |
| Office ~9:30 | Emi, Mio | Hand in copies | Being fast is the problem | 「……もう？」 Fast earns a harder job: Rei's numbers. |
| Sales ~9:40 | Rei, a salesman (witness) | Get the numbers | Rei stalls on purpose | Cast on a person, maybe watched; or leave it. Rei notices either way. |
| Office ~10:10 | Emi, Mio | Send Emi to her meeting | Mio's 「どうやったの？」 | Secret kept or bent; Mio's own verdict. |
| Afternoon | summary | | | IT sends a password that doesn't work. Mio leaves at 17:30 exactly. |
| Evening 17:50 | Emi | Hear how the meeting went | Consequences | Emi's verdict; she sends him home. |
| Dorm 18:30 | alone; Emi by chat | See the new room | It faces a wall | Emi's 「部屋、どう？」 (free typing); Rei's message if she felt the spell; save. |

Continuity: every location change goes through the elevator panel or an explicit narration line. Mio leaves the office before you go to the copy room and is back at her desk when you return. Emi leaves for her 11:00 meeting when you come back from Sales and is out until 17:50. The dorm is next to the station; the map on the phone shows it.

## Story checks run and what they changed
- story-sense: the day had been systems without links. Now the copy room feeds Sales (voice spent), and both feed Mio's reaction, Emi's verdict, the chat and the night message.
- scene-sequencing: every scene has a goal, obstacle and outcome. Copy room and Sales end on "yes, but". Sequel beats: Mio's quiet line after Emi leaves, the afternoon summary, the dorm.
- key-moments: primary genre Wonder (the capability test in the copy room), with Thriller for the footsteps near miss and Relationship for Mio and Rei noticing. The first magic is private, as GUIDE asks.
- character-arc: no arcs on day 1, but everyone wants something of their own. Emi offloads the two jobs she dreads (the copier, Rei) and admits Rei scares her a little. Mio chases signal for a game event. Rei stalls to win her meeting. Ishibashi watches cameras.
- cliche-transcendence: defaults for a first-magic tutorial are a mentor who explains, glowing runes, an old book, a spirit guide, an accident in front of a crush. None used. Rules come from literal misfires; the only witness is looking for phone signal. Default for Rei is the ice queen who melts; she is winning a budget fight and says so in two words.
- dialogue: cover-the-tags check on the office and Sales. Emi: warm, teasing, short sentences with ね/よ, admits things sideways (「こわくないよ。……ちょっとしか。」). Mio: fragments, ……, no ！, corrects people. Rei: questions as weapons, the shortest lines in the day, never explains herself.
- humanizer: run on this file and the English narration.

## Open questions for Jørgen
1. Staple is by hand (a breather beat). Keep it that way, or make it a fourth spell step?
2. The count check offers 10 / 11 / 20 / 100. 11 is the trap from 十一時. OK?
3. On a slow run (back more than twelve minutes after entering the copy room) Emi says 「おかえり。……え、できたの？」 instead of 「……もう？」. Fine, or should everyone get 「……もう？」?
5. The first spell lands about 8 to 12 minutes in (app, check, gate, office). The game saves at every scene, so a sitting can stop at the office. Trim more?
4. The ID card shows the name the player types on the welcome screen (Latin letters). Keep, or leave the name off?

## Review round (strict story editor, 2026-09-25)
A separate reviewer read the draft as a player through every branch. Fixed from its report: the first spell could be skipped or burn all five marks (hint ladder, stop only after two casts, Emi now says 「コピーして」); 100 copies plus waiting could run past the 11:00 meeting (stop after ten sets); the 「……もう？」 threshold now counts from entering the copy room; Mio said 下 for a room upstairs; the stapler line contradicted a working copier; a handwritten sign couldn't be printed by 出した (now a printout); repeated lines in the Sales loop; Rei knew who he was unasked (he introduces himself) and the stall had no set-up (Emi: 「会議の前に、ほしいの。」); the witness now shows on every cast; typed 出て and 並べて get literal results; dictionary and past forms behave the same on Rei as on the copier; the origin line implied he spoke Japanese as a child; 「君、おもしろいね。」 replaced; 「見せて」 is now actually said at the gate; the dorm door opens with the phone; 動かなかったのに; Emi's repeated まあ and がんばって; Mio's stock 「だれにも言わない。……今は。」 replaced with her own agenda.
