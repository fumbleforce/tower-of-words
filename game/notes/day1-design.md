# Day 1 design: the copy room, adaptive learning, variety

Status: proposal for Jørgen to adjust. No code or data has changed. The full script for every branch is in `day1-draft.md`.

Flow: monorail → gate → basement office (B2) → copy room (B1) → office → Sales (3F) → office, afternoon skip, evening with Emi. Cast on screen: Emi, Mio, Rei. Ishibashi is voice and text at the gate. Canteen, rooftop and bar are gone from day 1.

## 1. The magic mechanic

### The rule
A spell is one ordinary Japanese verb in one form, said with intent. Objects and people do exactly what the words say, even when you meant something else. The verb picks what happens, and the form picks how.

The player never reads this rule. It shows up through results: the first time 動け makes the copier roar, the player learns what the imperative does.

### Building a spell
It uses the existing spell ring in `main.js` (pick a verb, then pick the ending from tiles, or type the whole word in romaji):

1. The ring shows the goal in plain words ("Get the copier running"), who can see you (見ている人), and your voice marks.
2. Pick a verb. On day 1 each step offers one or two verbs.
3. Pick the ending from tiles, or type it. The tiles always include the right form, the other forms that do something, and a couple of distractors.
4. New on day 1: an optional slot before the verb. The copy step has a count slot (十部 / 二十部 / 百部 / nothing). Later slots can hold objects, adverbs or times.

### What each form does
| Form | Example | What happens | Why it fits |
|---|---|---|---|
| te-form request | 動いて | Works, at normal strength. | It's how you ask for something. |
| Imperative | 動け | Works too hard: loud, fast, overdone. On a person it feels like an order and they notice. | The imperative really is blunt and rough. |
| Dictionary form | 動く | Nothing. The thing "agrees" and doesn't act. | A statement doesn't ask anything. |
| Past | 動いた | The thing repeats the last thing it did. | "It moved": it goes back to what it did before. |
| Wrong verb | 止めて on the copier | A literal misfire: the paper stops, the rollers keep screaming. | Transitive and intransitive pairs become funny instead of abstract. |

The day-1 steps also teach the te-form sound rules one at a time, each attached to a thing on screen:
- Required: 動く → 動いて (く→いて), 出す → 出して (す→して), コピーする → コピーして (する→して).
- Optional or conditional: 急ぐ → 急いで (ぐ→いで), 止まる → 止まって (る→って, heard from Ishibashi at the gate), 並ぶ → 並んで (ぶ→んで).

No player has to learn all six on day 1. A careful player needs only the first three.

### Resources on day 1
- **Voice (声): 5 marks** instead of the current 3. Every cast costs one, including a misfire. The perfect copy-room run uses 2 or 3, which leaves enough for Rei. A messy run can leave you with nothing at Sales. This is the day's main strategic link.
- **Time.** Every manual alternative costs minutes on the clock. Emi wants the numbers by 10:30 and Rei leaves for the meeting at 10:45.
- **Noise (hidden).** Loud outcomes (imperatives, paper floods, a runaway copier) add noise. The player never sees a meter. They hear the machine roar, and later they hear footsteps.
- **Witnesses.** Anyone who sees a cast. Shown in the ring as 見ている人.
- **Suspicion per person** instead of one global number: Mio, Rei and Ishibashi each remember specific things. Later confrontations read from the person who noticed.

### Failure is a scene
Nothing in the copy room gives a red X. Each wrong form produces a result you can see, and most of them cost time, voice or noise:
- 動いた: the copier prints its own "broken" sign thirty times.
- 出せ: it spits the jammed page, then the whole paper tray, at the door.
- No count: it copies forever and floods the floor, which triggers a timed 止まって.
- 急いで: done in thirty seconds, every page slightly crooked. Emi notices.
- On Rei, 渡せ gets you the folder slapped onto the desk and 「……今、私に命令した？」. 待って freezes her mid-reach, which she remembers.

### Footsteps and witnesses
In the copy room, footsteps always come down the corridor after the copying. They belong to Mio, who is walking the basement looking for phone signal because her game event ends at noon. She has no interest in you.
- Quiet run (noise 0-1): the steps stop at the door, she mutters that there's no signal here either, and walks off. Every player gets the near miss and learns that sound carries.
- Loud run (noise 2+), staying still: she opens the door, sees a "broken" copier running and paper on the floor, and asks. Mio's suspicion goes up and pays off later in the day.
- Opening the door first: you meet her in the corridor, so she never sees the room. If it was loud she still says it was noisy.

At Sales the witness is the salesman at the next desk. You can cast with him watching, wait fifteen minutes for him to leave (time cost), or skip magic.

### Three ways through each problem
Each obstacle has a manual route, a magic route and sometimes a social route. That's the "words or magic" decision from the critique:
- Copy room: hands (jam, sorting) cost time; magic costs voice and risks noise.
- Sales: ask (fails, but 「会議のあとじゃ、おそいよ。」 gets Rei's revealing 「知ってる。」), trade (give her a copy of Emi's handout before the meeting), magic, or come back in the afternoon.
- The trade exists because of the copy room. Spare copies make it free; with exactly ten, you give away one of Emi's.

### How it scales
New forms arrive as schools, unlocked by promotion or story:
| School | Form | Effect | First use idea |
|---|---|---|---|
| Asking | 〜て | Normal effect | Day 1 |
| Force | Imperative | Overdone, loud, offends people | Day 1 (as a misfire) |
| Preventing | 〜ないで | Stops something before it happens | A falling folder, 落ちないで |
| Together | 〜よう | Pulls a group along | A stalled meeting, 始めよう |
| Traps | 〜たら | Delayed trigger | 会議が始まったら、止まって |
| Keeping | 〜ている / 〜ておいて | Keeps a state going | A door that stays open |
| Pairs | 開く/開ける, 止まる/止める | The object vs the actor | Recurring misfires |
| Ability | Potential (〜られる) | Lets someone do what they couldn't | Aoi reading a manual |
| Rank | Keigo requests | The only thing that works on superiors | Week 3+ |

The copy room itself comes back with different faults (toner, double-sided, B4 paper, someone else's job stuck in memory), so the same place tests new forms.

### Why it's replayable
- Every form has a distinct outcome, so trying the wrong one is content.
- Routes multiply: coffee yes/no, noise and Mio, count, and five ways through Rei. They feed Emi's evening verdict and the night message.
- There's optional mastery: a clean copy run (at most 3 casts, no noise, exactly ten, back before 9:35) gets Emi's special line. A hidden stamp can track it.
- Later visits randomise the faults.

### Alternatives to choose from
**B. Sentence slots.** The spell is a short sentence built from tiles: object + particle + verb form (紙を出して, 十部コピーして, ゆっくり動いて). Particles and adverbs change the outcome (紙が出て vs 紙を出して). This teaches more grammar but is slower, and the UI is heavier on a phone. It would fit weeks 3+ better than day 1.

**C. Say it out loud.** On desktop the player speaks the word into the mic (browser ja-JP recognition or local Whisper). A clear pronunciation works; a mumble fizzles or lands on a near-homophone. This directly trains speaking, which matters for his conversation goal. The risks: recognition errors feel unfair, and it can't be used on the train. The tiles stay as the fallback, and speaking could give a small bonus (no voice cost).

**D. A hand of words.** On the phone (train mode) the player prepares 3-5 words for tomorrow; only prepared words can be cast. Words level up with use. This ties spaced repetition to the story and adds deck-building strategy. It's too many systems for day 1; it fits once phone mode exists.

My recommendation: A for day 1. Add C as an optional desktop mode for the Rei cast. Bring in D with phone mode.

## 2. Adaptive learning

### Three tracks
| Track | Unit | What's tracked |
|---|---|---|
| Vocabulary | A word or set phrase (よろしくお願いします counts as one) | Meaning: exposures, look-ups, unaided days, action-proven successes |
| Grammar | A pattern (te-request, imperative, 〜ないで, counters with 部…) | Heard, understood (proven by action), produced (spells, replies, typing) |
| Letters | Each hiragana, each katakana, each kanji | Reading: seen with ruby, read without ruby and acted on correctly, tapped |

### Measured from play, not quizzes
- **A tap on a word** is a look-up for that word (as now) and a miss for its kanji.
- **Revealing a line's English** is a look-up for every word in it (as now).
- **Acting correctly on a line** is a success for the words it depends on. Examples: pressing 地下一階 on the panel (vocab and the kanji 地, 下, 一, 階), picking 十部 in the spell after hearing Emi say it (the counter and the number), coming back after 午後 (午後).
- **Spell forms** count as grammar production. Picking from tiles is assisted production; typing it is full production.
- **Reply choices** that hinge on a form or register count as grammar recognition.
- **Free typing** is judged by the LLM's `used_target` plus whether the reply parses.
- **Signs and screens with no ruby** (the copier's 紙づまり, the floor panel, door plates) are the kanji reading tests. You read them by acting on them.
- **Romaji typed for a spell** proves kana reading for that word.

A word's meaning becomes known only after unaided success on separate days (the current rule). A kanji becomes readable after unaided reads on at least 2 separate days. The two are independent.

### How text is rendered per player
For each word the engine decides per character:
1. **All of its kanji readable** → kanji. If the word's meaning is new, it's still tappable, but no ruby is shown.
2. **Some kanji not readable, word is lv 1-2 or today's target** → kanji with ruby. Ruby is kana, or romaji only while the player's hiragana track is weak.
3. **Otherwise** → kana only. This replaces the current rule where lv 3 means kana: level becomes a property of the player, not only of the word.
4. **Katakana words** are tracked per character. For players whose katakana is weak, a tap shows the romaji. GUIDE says never to put a reading above kana; see open question 6.
5. **English** stays hidden. It's revealed per line or per word, and that counts as a look-up.

Current code already does the per-word version of rules 1-3 (`wordHTML`: stage 0 romaji ruby, stage 1 kana ruby, stage 2+ plain, lv 3 kana-only). What changes is that the kanji decision reads the per-character table.

### Quick-start calibration (about 2 minutes, skippable)
It's in-world: the "new hire check" on the company phone during the monorail ride, before the announcement.
1. **Kana**: hear a word, pick its spelling from four (hiragana, then katakana). Stop after two misses.
2. **Kanji**: 12 common words in rising difficulty (人, 日本, 会社, 地下, 会議, 営業). Tap the ones you can read, then pick the reading for three of them to confirm.
3. **Grammar by ear**: four voiced lines (来てね, 止まって, 話しかけないで, 行こう). Pick what the speaker wants from pictures or short English.

Presets for a faster start: "new to Japanese", "some study", "comfortable at N4". Afterwards the level keeps adjusting. If a player taps under 5% of new words across two scenes, move them up a band. If they tap over 30%, move them down (more kana, more ruby, simpler variants). A long press on any word offers "I know this", which skips it straight to known once confirmed by a later unaided use.

### Pacing rules
- Spoken line: aim for 16 characters or fewer, with a hard cap of 24 (punctuation not counted). Longer thoughts split into two lines.
- Per line: at most one item new to this player (a word, a kanji or a form). Names and phrases already met don't count.
- Per choice screen: at most two new items across all options. Options stay at 14 characters or fewer.
- Per scene: at most 5 new words, 1 new grammar pattern and 2 new kanji shown with ruby.
- If a line breaks the budget for this player, surplus unknown kanji render as kana, and the least essential unknown word gets a tiny inline gloss (counted as exposure, not a look-up). Key lines can carry an authored `easy:` variant.
- Stall guard: after about 20 seconds on one line with no input, a small "?" pulses next to the line. Tapping it shows the English (counted as a look-up). Nothing is revealed automatically.
- Essential information (floor, time, count) is never only in one hard line. It is repeated, replayable (R) or on the phone.
- Session: day 1 runs about 20 minutes. There's a natural stopping point when Emi gives the second task (save there).
- Authoring lint: a small tool runs the script against three reference profiles (kana-only beginner, Jørgen, N4) and flags every line over budget. That makes "other players at other levels" testable.

### Exists vs new
| Area | In `main.js` now | New for day 1 |
|---|---|---|
| Word stages | 0-3 per word, calendar-day spacing, look-ups drop a stage | Unchanged; add action-proven successes |
| Kanji | Per word via glossary `lv` | Per-character table and rendering from it |
| Kana/katakana | Katakana words auto-tracked as words | Per-character kana tracking; tap-romaji for katakana |
| Grammar | One `grammar.right/total` counter | Pattern table with heard / understood / produced |
| English | Hidden; reveal = look-up | Stall guard |
| Calibration | `START_KNOWN` list | Phone check + presets + band drift |
| Spells | Verb pick, ending tiles, romaji typing, `outcomes` per form, witnesses, breath 3 | Voice 5, slots (count), timed cast, noise, per-person suspicion, "works but" outcomes that continue the scene |
| Free talk | `freeTalk` with LLM, fallback, `dayFacts`, corrections | Emi persona for the evening, new facts, magic guard, level check |
| Pacing | None | Budgets, inline gloss, lint tool |

### The LLM moment
In the evening Emi asks 「で、初日、どうだった？」. There are two typed turns (romaji → kana, as now).
- Persona: Emi, 32, lead of Planning 7, warm and teasing, casual. She calls him 新人くん. She is tired from the meeting.
- Facts passed in: how the copies went (fast, crooked, count), how the numbers were obtained (magic, trade, none), whether Mio saw anything, and the meeting result.
- Guards: she never confirms magic. If the player says 言霊 or 魔法, she treats it as a joke (「はいはい。」). At most 2 short sentences. Only N5-N4 words; any word outside the player's level is shown as kana with a tap gloss.
- Fallback when the server isn't running: a normal four-option choice with scripted replies (in the draft).

## 3. Variety

Interaction types used on day 1:
1. **Listen and act**: announcement → which door.
2. **Read a message**: Emi's chat.
3. **Act on a person**: ID card at the gate.
4. **Register reply**: polite or casual with Ishibashi, Mio, Emi.
5. **Navigate by reading**: floor panel (three times, different floors).
6. **Secret action**: the coffee machine, optional and unexplained.
7. **Listen and remember**: Emi's count, used later in a spell.
8. **Build a spell**: verb + form (copier wake, jam, copy, sort).
9. **Hands or magic**: jam, speed, sorting.
10. **Timed reflex**: stop the runaway copier (only if you gave no count).
11. **Stealth**: footsteps, stay still or open the door.
12. **Negotiate**: Rei, ask / reveal / trade / leave.
13. **Spell on a person with a witness**: Rei.
14. **Keep the secret**: Mio's 「どうやったの？」.
15. **Free typing**: Emi in the evening.
16. **Read the night hook**: a message from Rei, Emi or nobody.

Rotation on the main path (no two neighbours the same):
listen-act → message → act → register → navigate → register → register → secret action → listen-remember → navigate → hands-or-spell → build spell → hands or magic → build spell (count) → hands or magic (speed) → [timed] → stealth → hands or magic (sort) → register → navigate → negotiate → spell on person → keep the secret → rest (afternoon) → consequence → free typing → message.

There are two register replies in a row in the office (Mio, then Emi). They are different people with different right answers, and a narration beat sits between them. If that still feels repetitive, cut the Emi reply to a single line.

## 4. Beat sheet

| Scene | Who | Goal | Obstacle | Turn | New (light) |
|---|---|---|---|---|---|
| Monorail 8:40 | Announcer, Emi (message) | Get off at the right stop | Announcement in Japanese | Emi's message sets 9:00, B2 | 出口, 右側; hears 〜てね |
| Gate 8:48 | Ishibashi (text) | Get in | Guard doesn't know you | He marks you: 「変なことしたら、すぐわかるからな。」 | 止まって (plant), 見せる, 新人 |
| Office 9:00 | Mio, Emi | Make a first impression | Mio doesn't want to talk; the coffee machine is dead | Emi begs the machine 「動いて。」; alone, you can try it and it works. Emi hands you the copy job (the broken copier). | 動く, 十部, コピー, 会議 |
| Copy room 9:20 | Alone; Mio's footsteps | Ten copies, fast | Broken copier, jam, slowness, noise | The reveal of kotodama; the machine takes words literally; the near miss or Mio at the door. Yes, but: done, and someone heard. | 紙, 出す, こわれる, 急ぐ, 電波 |
| Office 9:35 | Emi, Mio | Hand in copies | None; your speed is the problem | 「……もう？」 Being fast earns a harder job: Rei's numbers by 10:30. | 営業部, 数字, 十時半 |
| Sales ~9:45 | Rei, a salesman (witness) | Get the numbers | Rei stalls on purpose until after the meeting | Five routes; every success costs something (suspicion, a trade, voice). 「君、おもしろいね。」 or 「今、私に命令した？」 | 午後, 渡す, 知ってる, 資料 |
| Office ~10:20 | Emi, Mio | Get Emi to the meeting | Mio's question 「どうやったの？」 | Secret kept or bent; Mio's own verdict (「だれにも言わない。……今は。」 or the three-months line) | 運, ひみつ |
| Afternoon | (summary) | | | Skip to 17:40; late numbers arrive at 14:00 if you gave up | |
| Evening 18:10 | Emi | Hear how the meeting went | Consequences of your routes | Emi's verdict; LLM talk 「で、初日、どうだった？」; hook message | 初日 |

Grammar across the day: the te-form request is the spine (heard in 来てね, 止まって, 動いて; produced in the copy room; used on a person at Sales). The imperative, dictionary form and past appear only as spell outcomes. 〜ないで is heard once (Mio's 話しかけないで) and not taught yet.

Continuity notes: every location change goes through the elevator or an explicit narration line. Mio leaves the office once (the corridor walk) and is back when you return. Emi is out from about 10:50 to 18:10 (meeting, then afternoon meetings). Rei's message only comes if she felt a spell.

## Story checks run and what they changed

- **story-sense**: the old day 1 was at state 4.5 (plot without pacing). Scenes worked but nothing fed anything. Change: the copy room now feeds Sales (voice spent, spare copies for a trade), and both feed Emi's evening verdict and the night message.
- **scene-sequencing**: gave every scene a goal, obstacle and outcome. The copy room and Sales both end on "yes, but" (fast leads to more work; the folder costs suspicion or a trade). Added sequel beats: Mio's quiet line after Emi leaves, and the afternoon skip.
- **key-moments**: the primary genre is Wonder (the coffee glimpse, then the copy-room capability test), with Thriller for the footsteps near miss and Relationship for Mio's and Rei's reactions. Change: the coffee beat stays unexplained so the reveal lands in the copy room, where the player gets to use it.
- **character-arc**: no full arcs on day 1, but each person pursues something of their own. Emi hands the new guy the two jobs she's been dodging (the broken copier, Rei), and in the evening admits Rei scares her a bit too. Mio chases phone signal for a game event, and her suspicion is a side effect of that walk. Rei stalls on purpose to win the meeting and says so in two words.
- **cliche-transcendence**: listed the defaults for a first-magic tutorial: a mentor explains the rules, glowing runes, magic school, a spirit guide, the accidental explosion in front of a crush, an old book. I avoided all of them. Nobody explains anything: the rules come from literal misfires, and the only "witness" is looking for Wi-Fi. For Rei: the default is the ice queen who melts. Instead she is winning a budget fight, and the trade route lets her win it.
- **dialogue**: cover-the-tags check on the office and Sales exchanges; the double-duty test on every key line. Changes: Mio corrects Emi (「ちょっとじゃない。こわれてる。」) instead of Emi explaining the copier; Rei's 「知ってる。」 carries the whole stall as subtext; I cut Emi's lines explaining why the numbers matter down to one 「スライドに入れたいから。」
- **story-analysis (read as a player, every branch)**: see the review list at the end of the draft for what I found and fixed.
- **humanizer**: run on all English narration and this document (no dashes, no "not X but Y", no one-line closers where I could avoid them).

## Open questions for Jørgen

1. **Coffee machine.** I kept it as an optional, unexplained glimpse before the copy room. It costs one voice mark, gets Emi's 「機械に好かれるタイプ？」 and shortens the copy-room reveal. Or cut it, so the copy room is the very first magic?
2. **Voice 5 on day 1** (was 3), shared between the copy room and Rei. OK?
3. **The trade route with Rei** (you show her Emi's handout before the meeting). It's morally grey and it hurts Emi's meeting. Keep it?
4. **Times**: Emi's numbers by 10:30, Rei leaves 10:45, meeting at 11:00. The old "documents by 11" becomes "numbers for the slides by 10:30".
5. **Day 2 overlaps**: day 2 opens with a copier scene (Aoi) and a meeting with Rei. Both need rewriting. The copier could come back with a new fault and Aoi as the witness.
6. **Katakana help**: allow romaji ruby over katakana for players who can't read it yet? That conflicts with the "no reading above kana" rule. Tap-to-romaji is the safe version.
7. **Where the magic comes from**: the draft keeps "since you were small" and invents nothing more. Do you want a background (a Japanese grandmother, a childhood in Japan) or keep it unexplained?
8. **Imperatives**: the player's own replies never use 動け-type forms; they exist only as loud spell outcomes. Fine?
9. **Length**: about 20 minutes. Keep it one day with a save point at the second task, or trim the jam or sort step?
