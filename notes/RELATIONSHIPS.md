# Relationships

Design doc from the relationships agent, 2026-09-28, revised the same day after Jørgen's note on the frame. Nothing here is approved or built. Day 1 comes first (GUIDE, Scope). It's written so the day-1 systems in game3d/js/sim.js (periods, schedules, bonds, gifts, taught commands) can grow into it.

Frame (Jørgen, 2026-09-28): Eric is a support engineer, there to keep alive the ancient systems the company refuses to replace. The machines answer to his voice. Nobody explains why, and nobody investigates. ISLAND.md has the machines, the places and the rhythm of days. This doc has the people.

There are two layers:
- **The general layer** works the same for everyone: bond steps, what raises them, and what each step opens.
- **Personal stories** are authored and hung on those steps. There are eight full arcs, and shorter keeper stories for everyone else.

## Part 1: the general layer

### Bond steps

| Step | Name | How you get there | What it opens |
|---|---|---|---|
| 0 | Stranger | | They're in the world on their schedule. You can greet them. |
| 1 | Known | Greet them or be introduced | They're added to People with where they usually are, and they greet you first. |
| 2 | Friendly | 6 points | Talk at their open times. Their likes show in People as you notice them. They send one small personal ticket. |
| 3 | Trusted | 14 points, then their turn beat | A command or a word. Their place (a key, a badge line, an invitation). Their machine's insides: the casing, the manual, the quirk. |
| 4 | Close | 24 points, then their payoff beat | A perk, and for the romanceable cast a reward picture (private mode only, GUIDE). |
| 5 | Partner or friend | The romance beat, before February | Romance or lasting friendship. Both keep paying: more scenes, a bigger perk, their help in other stories. |

Points only bring you to a threshold. **Crossing into steps 3, 4 and 5 always takes a scene.** At 1 to 2 points a day, step 2 takes about a week of attention and step 3 three to four weeks. You can be close to maybe six people by March, so you have to choose.

**Dated events happen anyway.** The festival, the audit, the ekiden and month-end come on their dates whatever the bonds are. The bond decides Eric's part: at step 2 or more he's inside the scene with that person, and below that he's in the crowd, and the beat comes back at a later, smaller event.

### What raises a bond

| Source | Points | Limits |
|---|---|---|
| First greeting of the day | 1 | Only until step 1. After that it's manners. |
| Talking at an open time | 1 | Once a day, only when they have something new |
| A gift they like | 1 | One per person per week counts |
| A gift that answers a need | 3 | Each person says one need out loud somewhere. Listening is how you find them. |
| A ticket for them, or on their machine | 2 | The main source |
| Doing it their way | +1 | Quietly for Mori, fast for Rei, by hand when Saki is watching |
| Using their word or register | 1 | Casual to Mio, polite to Mori. The wrong one gets a reaction (Mio: 「なんで敬語？」) and blocks nothing. |

The cap is 3 points per person per day. Neglect doesn't lower a bond, it just holds it where it is.

### Open times, schedules, gifts

- Each person has a place for each period (commute, morning, lunch, afternoon, evening, night), a weekend pattern, and one or two **open times**: Mio when a build finishes, Mori at three o'clock tea, Kuro after 23:00. The world shows who's open (headphones off, a cup in hand), so there's no talk menu.
- Weekly fixtures: Mio at her mother's on Wednesday night and on the Thursday train back (day 1 is that train). Tsubasa runs at six. The bar is loud on Fridays.
- Gifts are small and local: canned coffee, corn soup, milk tea, melon bread, Goro's tomatoes. Each person has two likes, one dislike and one current need. The Give button shows when someone is near, as on day 1.

### Japanese as shared language

English is always shown and nothing tests recall (GUIDE), so Japanese works as shared language:
- Each person has an English level: Emi native, Mio good, Rei fine for business, Kenji a few words, Mori and Ishibashi none. For people with little English, steps past 2 need a handful of words you've been **taught** in play, from their world. Being taught is enough. Mio and Emi are the early friends, and everyone else opens up as your words grow.
- Register rises with the calendar: casual first, polite with Sales and Legal, keigo on the executive floors.
- Each person has an address ladder. Mio goes from 外人, to エリック when they're alone, to エリック in front of the team. Nanami goes from お客様 to エリックさん to a message without です.

### Commands and words

Twelve commands in the whole game, easy verbs in the て form, each taught at step 3 by someone who uses it at work: the day-1 five (待って, 開けて, 動いて, 止まって, 入れて), then 出して (Kenji), 休んで (Mori), 送って (Rei), 温めて (Kaori), 回って (Goro), 動かないで (Kanae), 消えて (Kuro). People without a command teach a **word** that changes any command: ゆっくり (slowly, Sumi), もう一回 (again, Tsubasa), 全部 (all of them, Aoi), 少し (a little, Saki). How words and commands work on machines is in ISLAND.md.

### Perks at step 4

Perks give time back or open doors early. Mio takes one tech ticket a week off the board. Nanami adds a floor to your card without the form. Kaori keeps a table, so you can lunch with two people. Mori's binders explain one machine quirk a week.

**Romanceable, with full arcs now:** Mio, Emi, Rei, Kaori, Yuzuki, Nanami, Kuro. **Romanceable, with keeper stories now and full arcs later if wanted:** Aoi, Tsubasa, Kanae, Sumi, Saki. **Friendship routes:** Mori, Kenji, Kiyoko, Ishibashi, Goro, Jun. All characters are adults.

## Part 2: eight full arcs

`[n]` is the step a beat needs. The turn takes them to 3, the payoff to 4, and the romance beat (before February) to 5. A command is taught at the turn and first used at the payoff. Every arc was checked against the default version of its role (cliche-transcendence), and each person wants something of their own that runs into Eric's work.

**Mio (25, programmer).** Wants to stay on the island without asking anyone for anything. Secret: she's on a fixed-term contract, renewed every six months for almost five years. Japan's five-year rule (無期転換) lets her demand a permanent contract, so companies often stop renewing just before. Her fifth year ends 31 March, and the claim must be made in writing, in keigo.
1. [1] She fixes his account without being asked. An unopened HR envelope sits on her desk.
2. [2] She starts fixing the Japanese on his ticket forms before he files them, and leaves the corrections in English in the margin.
3. Turn [2]: she drafts her claim and asks him to proofread the keigo, which he can't read. He tries anyway, and she corrects his corrections for an hour.
4. Payoff [3]: she hands it in, and her perk starts that week.
- Romance [4]: the Wednesday train to her mother's town. She asks him along to carry the pickles, and her mother speaks only Japanese.

**Mr. Mori (58).** Wants to hand over thirty years of knowing these machines before he retires. He lost his title at 55 (役職定年) and stayed on the team. Problem: it's all in handwritten Japanese binders from 1996 on, and he has no English.
1. [1] Tea, and good manners to the copier, which works better for him than for anyone.
2. [2] His locker jams. Inside are the binders. He hands Eric the one on the copier, without a word.
3. Turn [2]: Eric uses something from a binder page he could only just read, and it works. Mori sees it. From then on it's one binder a week, and he teaches 休んで, the word he says to the machines at night.
4. Payoff [3]: the machine room's yearly check (年次点検) in January, every machine at once and by hand, the way Mori has always done it. He runs it one last time and gives Eric the key.

**Emi (35, B2's team lead).** Day 1 hides her. Proposal: she's been at head office arguing for a proper parts budget for the old machines. Wants the 課長 promotion she's been passed over for twice, and that budget is her case. Problem: to win it she rounded up what B2 can do, and head office is sending an auditor.
1. [1] She comes back pleased, and tells the team she's promised head office "a few things".
2. [2] She presents B2's case to the council, and Eric hears numbers he doesn't recognise.
3. Turn [2]: the December audit. The auditor shadows Eric for a week and wants every fix explained. What gets him through is what he learned the slow way: Mori's binders, the logs inside the machines, knowing each keeper. The more of those he has, the better the week goes.
4. Payoff [3]: she tells the board which numbers she rounded. The council vote decides the budget and her promotion, and Eric can sway it through people he knows.
- Romance [4]: the council-hall kitchen after the vote, where she eats the leftover sandwiches from the session and asks him to stay.

**Rei (26, Sales).** Wants Sales to have its own engineer. She's filing a formal request with the council to have Eric on loan to the fifth floor for the last week of every month, which would take him off everyone else's tickets.
1. [1] In the lift she reads his B2 card and treats him as a contractor, politely.
2. [2] Month-end: the fax feeds crooked and the pneumatic tube jams on every floor at once. She times how long he takes.
3. Turn [2]: a trial week on loan, with fast polite Japanese, the fax and the tube. His other keepers notice he's gone. She teaches 送って.
4. Payoff [3]: the council vote on her request. How the week went, and who else he's close to, decide it. Either way she gets a better month-end.
- Romance [4]: 23:00 on the last night of the quarter, when a capsule comes down the tube to B2 with a note in it.

**Kaori (44, canteen).** Wants to keep feeding the night cleaners and agency workers from the production halls, who can't use the staff canteen. Secret: for twelve years she's used a quirk of the 1989 meal ticket machine, a button combination that prints a free ticket.
1. [1] A bigger portion than the man before him, unmentioned.
2. [2] The ticket machine starts eating coins. At 6 a.m. he sees the cleaners use the button.
3. Turn [2]: she opens the casing for him and asks him to keep the button working. She teaches 温めて.
4. Payoff [3]: the December audit counts tickets, and the machine's counter shows twelve years of free ones. With Kenji's vote or Kiyoko's, the canteen gets an official line for staff guests before the auditor reaches the kitchen.
- Romance [4]: 5 a.m. on sports day, four hundred bento, her assistant off sick, and the ovens answering 温めて.

**Yuzuki (31, PR spokeswoman).** Wants a feature on the island TV channel: "the foreign engineer keeping the old island running". She wants Eric on camera, which is the last place he wants to be. Her history: six years ago she read the company's apology (謝罪会見) for someone else's mistake, and she has avoided live TV since.
1. [1] At the plaza she tests the PA with 以上です, and it echoes three times.
2. [2] She follows his round with a camera operator. Every command becomes a problem, so he has to find other ways.
3. Turn [2]: festival day, live. If he kept up the PA's tickets, the PA holds, and what fails is the borrowed power for the stage, which he can bring back quietly while she stalls the crowd. If he didn't, the PA fails as well and it's harder. Either way she's live for the first time in six years. She teaches him the announcement phrases.
4. Payoff [3]: the feature airs. She cut every shot where his lips move near a machine and never says why.
- Romance [4]: the TV studio after the last take, with her make-up still on and the studio lights he rewired.

**Nanami (29, ID card and access desk).** Wants her unpaid overtime (サービス残業) paid. The gate's paper log is the only record of her hours in a dispute with her manager. The printer needs a paper roll nobody makes any more, and her hearing is in December.
1. [1] She issues his card and asks for his staff number.
2. [2] The log printer starts skipping lines.
3. Turn [2]: a parts hunt. Goro has a box of rolls from a scrapped weather station, and Kanae knows how to cut them to width. Hamada, who is late every morning and knows her hours, offers to be her witness.
4. Payoff [3]: the hearing, with a log that has no gaps. The claim is paid.
- Romance [4]: a text at dawn after her first night shift, without です, asking if there's coffee.

**Kuro (27, night reception).** Wants to keep the night mahjong table she runs in the lobby for the security staff, which is against every rule on the island. Problem: one lobby camera has pointed at the ceiling for years, it's on Eric's ticket board, and once fixed it faces her table.
1. [1] Lost property at night. Her name, read like 黒, makes her smirk.
2. [2] She asks which way that camera will face, in a tone that sounds like idle chat.
3. Turn [2]: he can point it at the door, give it a blind spot, or fix it straight and see what happens. She teaches 消えて, for when the night manager comes down.
4. Payoff [3]: a seat at the table. The stakes are canned coffee, and he learns the tiles as words (numbers, winds, colours).
- Romance [4]: the first bus at 5:30 after the table breaks up, the two of them reading the timetable on a cold bench.

## Part 3: keeper stories

Three beats each, around a machine. These are short enough to write fast, and any of them can grow into a full arc.

| Person | Machine | Their story | What they teach |
|---|---|---|---|
| Kenji (21, B2) | Vending machine | A joke council campaign for free drinks wins him a real seat. At the debate Eric interprets for him in English, and gets some of it wrong. | 出して |
| Aoi (intern) | A 1994 cabinet at the arcade | The top score has been Mori's since 1996. She wants it, the machine's joystick sticks, and Mori won't say how he did it. | 全部 |
| Kiyoko (56, old guard) | Her 1997 office terminal | The screen flickers, and it holds twenty years of her private notes on every manager. It has to be repaired in place while she watches. At the end she lets him read one entry, the one about him. | Keigo, by hearing it |
| Tsubasa (27, runner) | Track timing board | It's been broken since spring. It still shows her coach's 1993 record, which she means to break at the New Year ekiden. | もう一回 |
| Kanae (30, photographer) | Darkroom enlarger and fan | Eight hundred portraits for the company's fiftieth-anniversary issue in March, with the fan and the enlarger taking turns to fail. | 動かないで |
| Sumi (24, calligrapher) | General Affairs' pen plotter | Teaching it her brush strokes so it can write the four hundred condolence envelopes a year. His turn at the brush ruins three kana, and she keeps one. | ゆっくり |
| Saki (28, Legal) | The seal machine | It stamps twice when it's cold, so she checks every page by hand at night. | 少し |
| Ishibashi (64, gate) | The gate's voice chip | It went quiet in 2003. Now it gets a new line for every mood he can read on a face, and one morning it asks Hamada if he slept. | Directions and times |
| Goro (61, roof) | Rooftop fans | His banned bees clog the intakes. Turning the fans around saves them, and when Yuzuki makes the honey a PR story he insists the label credits the bees. | 回って |
| Jun (38, payroll and bar) | The 1991 till and taps | He hasn't had a night off in twelve years. Eric runs the bar one Friday, and Jun spends the night as a customer at his own counter. | Drink orders and counts |

Mr. Hamada's story runs through Nanami's and Ishibashi's. The night CCTV operator in the bible fits the production halls' control room once someone designs the character.

## Part 4: how the layers make an open world

No main plot runs through the game. Four things give it shape:

1. **The calendar.** One fiscal half-year, 1 October to 31 March, with key dates spread across it (ISLAND.md). Dated events happen on their dates, and the bonds decide Eric's part in them.
2. **The machines.** Every story leans on one or two machines, and they're the ones he keeps coming back to (ISLAND.md).
3. **Beats as storylets.** Each beat has conditions (a step, a period, an open place, a date, another beat, words taught, a machine's state) and consequences (flags, bond, access, a command). The engine offers what's ready, in no fixed order. That's the shape the day-1 story files already use, and the one the parked procedural idea in TODO.md would generate into later.
4. **Links.** Some beats need another person. Kaori's guest line needs Kenji's or Kiyoko's vote. Nanami's rolls come from Goro and Kanae. Rei's loan week pulls Eric away from his other keepers. The audit touches Emi, Kaori and Mori at once.

**Pacing** (scene-sequencing): at most one big beat a day, followed by a quiet evening. Beats end with a new problem: the PA holds and Yuzuki promises an encore, or Rei's request passes and the canteen's tickets pile up while he's upstairs.

**Suspicion** is local. When someone sees a command work, that person gets curious and their story plays differently. There's no meter and no game over.

## Open questions for Jørgen

1. Is Emi at head office arguing for the parts budget on day 1?
2. Eight full arcs now and short keeper stories for the rest: is that the right split, and are these the right eight?
3. Are the romance and friendship lists right? Kiyoko is friendship only here.
