# Relationships

Design doc from the relationships agent, 2026-09-28. Nothing here is approved or built. Day 1 comes first (GUIDE, Scope). This is for later days, written so the day-1 systems in game3d/js/sim.js (periods, schedules, bonds, gifts, taught commands) can grow into it without a rewrite. Places, access and the daily rhythm are in notes/ISLAND.md.

There are two layers:
- **The general layer** works the same for everyone: bond steps, what raises them, and what each step opens.
- **Personal arcs** are short authored stories, one per main cast member, hung on those steps.

## The frame

From STORY.md: the island's old systems, installed in the nineties, answer to Eric's voice, and nobody knows why. His contract is to upgrade the island's IT. **Every system he migrates counts toward his contract and leaves one fewer thing that answers him.** Nobody on the island knows about that tension.

- His contract runs from 1 October to 31 March. The quota is 30 of the island's 45 old systems migrated by March, which gets the contract renewed and, around New Year, a staff offer. Missing it ends the contract, and nothing else. The game plays on to March either way.
- Keeping a system on the old network needs a **waiver** (例外申請), signed by someone at bond step 3 who has authority over that place (Mori for B2, Kaori for the canteen, and so on). Each waiver is one system off the quota, so there's a real budget of about 15 to spend.
- The cast want different things from the upgrade, and most of them have never thought about it. The magic's origin stays a mystery (GUIDE).

## Part 1: the general layer

### Bond steps

| Step | Name | How you get there | What it opens |
|---|---|---|---|
| 0 | Stranger | | They're in the world on their schedule. You can greet them. |
| 1 | Known | Greet them or be introduced | They're added to People with where they usually are, and they greet you first. |
| 2 | Friendly | 6 points | Talk at their open times. Their likes show in People as you notice them. They send one small personal ticket. |
| 3 | Trusted | 14 points, then their arc's turn beat | A command or a useful phrase. Their place (a key, a badge line, an invitation). They can sign waivers. They address you differently. |
| 4 | Close | 24 points, then their arc's payoff beat | A perk, and for the romanceable cast a reward picture (private mode only, GUIDE). |
| 5 | Partner or friend | The romance beat, before February | Romance or lasting friendship. Both keep paying: more scenes, a bigger perk, their help in other arcs. |

Points only bring you to a threshold. **Crossing into steps 3, 4 and 5 always takes a scene** from that person's arc. At 1 to 2 points on a normal day, step 2 comes in about a week of attention and step 3 in three to four weeks. You can be close to maybe six people by March. You have to choose, and that's the point.

### What raises a bond

| Source | Points | Limits |
|---|---|---|
| First greeting of the day | 1 | Only until step 1. After that it's manners. |
| Talking at an open time | 1 | Once a day, and only when they have something new to say |
| A gift they like | 1 | One gift per person per week counts. The same gift twice gets a comment. |
| A gift that answers a need | 3 | Each person says one need out loud somewhere (Mio mutters that the coffee's out). Listening is how you find them. |
| A ticket for them | 2 | The main source |
| Doing it their way | +1 | Quietly for Mori, fast for Rei, by hand when Saki is watching |
| Using their word or register | 1 | Casual to Mio, polite to Mori. The wrong one gets a reaction (Mio: 「なんで敬語？」) and no point, and never blocks anything. |

The cap is 3 points per person per day. Bonds don't drop from neglect, they stall.

### Open times, schedules, gifts

- Each person has a place for each period (commute, morning, lunch, afternoon, evening, night), a weekend pattern, and one or two **open times**: Mio when a build finishes, Mori at three o'clock tea, Kuro after 23:00. Outside those they greet you and carry on. The world shows who's open (headphones off, a cup in hand), so there's no talk menu.
- Weekly fixtures: Mio spends Wednesday night at her mother's and takes the Thursday train back (day 1 is that train). Tsubasa runs at six. The bar is loud on Fridays.
- Gifts are small and local: canned coffee, corn soup, milk tea, melon bread, Goro's tomatoes. Each person has two likes, one dislike and one current need. The Give button shows when someone is near, as on day 1.
- People talk about you to their friends, along the links in Part 3.

### Japanese as shared language

English is always shown and nothing tests recall (GUIDE), so Japanese works here as shared language:
- Each person has an English level: Emi native, Mio good, Rei fine for business, Kenji a few words, Mori and Ishibashi none.
- For people with little English, steps past 2 need a handful of words you've been **taught** in play, from their world (tea and thanks for Mori, times and floors for Ishibashi). Being taught is enough. That makes Mio and Emi the early friends, and everyone else opens up as your words grow.
- Overheard talk gets clearer as you learn (GUIDE). Some beats below are found that way.
- Register rises with the calendar: casual first, polite with Sales and Legal, keigo on the executive floors.
- Each person has an address ladder you hear as the bond grows. Mio goes from 外人, to エリック when they're alone, to エリック in front of the team. Rei is polite, then casual when her team isn't around. Nanami goes from お客様 to エリックさん to a message without です.

### Commands

GUIDE asks for a command here and there, so there are **12 in the whole game**: easy verbs in the て form, each taught at step 3 by someone who uses it at work, and each working only on old systems. Everyone else teaches a useful phrase instead.

| Command | From | Works on |
|---|---|---|
| 待って, 開けて, 動いて, 止まって or 入れて | Day 1 (Mio, Hamada, Mori) | Doors, machines, alarms, the thermos |
| 出して dashite | Kenji | Dispensers, trays, the vending machine |
| 休んで yasunde (rest) | Mori | Powers a machine down gently |
| 送って okutte (send) | Rei | Fax, mail, the pneumatic tube |
| 温めて atatamete (warm up) | Kaori | Ovens, boilers, the dorm bath |
| 回って mawatte (turn) | Goro | Fans, vents, pumps |
| 動かないで ugokanaide (don't move) | Kanae | The first negative: holds anything still |
| 消えて kiete (go out) | Kuro | Lights, screens |

(The lunch choice on day 1 teaches one of 止まって and 入れて, and the other comes later from the same person.)

### Perks at step 4

Perks give time back or open doors early. Mio takes one tech ticket a week off the board. Nanami adds a floor to your card without the form. Kaori keeps a table, so you can lunch with two people. Jun lets you into the bar after hours.

**Romanceable:** Mio, Emi, Rei, Aoi, Kaori, Yuzuki, Tsubasa, Kanae, Sumi, Saki, Nanami, Kuro. **Friendship routes** (commands, perks, no reward pictures): Mori, Kenji, Kiyoko, Ishibashi, Goro, Jun. All characters are adults.

## Part 2: personal arcs

Each arc gives a want, a secret or problem, and the beats. `[n]` is the step a beat needs. The turn takes them to 3, the payoff to 4, and the romance beat (before February) to 5. A command is taught at the turn and first used at the payoff. Every arc was checked against the default version of its role (cliche-transcendence), and each one has its own business that runs into Eric's work.

### The B2 team

**Mio (25, programmer).** Wants to stay on the island without asking anyone for anything. Secret: she's on a fixed-term contract, renewed every six months for almost five years. Japan's five-year rule (無期転換) lets her demand a permanent contract, so companies often stop renewing just before. Her fifth year ends 31 March, and the claim has to be made in writing, in keigo.
1. [1] She fixes his account without being asked. An unopened HR envelope sits on her desk.
2. [2] She asks him, sideways, to take his time migrating B2's mail server, and doesn't say why.
3. Turn [2]: she drafts the claim and asks him to proofread the keigo, which he can't read. He tries anyway, and she corrects his corrections for an hour. Mori signs a waiver for the mail server if Eric asks.
4. Payoff [3]: she hands it in. Her perk starts that week.
- Romance [4]: the Wednesday train to her mother's town. She asks him along to carry the pickles, and her mother speaks only Japanese.

**Mr. Mori (58).** Wants to see the upgrade through. He asked for it every year for ten years and lost his title at 55 (役職定年) just before it was approved. Secret: he installed the 1996 systems himself and keeps every manual in his locker.
1. [1] Tea, and good manners to the copier.
2. [2] His locker jams. The 1996 binders are in his handwriting. He asks Eric to shred them, then asks for them back.
3. Turn [2]: he proposes a 供養 for the retired machines, the old ceremony of thanks for used-up things, and asks Eric to help set it up. He teaches 休んで.
4. Payoff [3]: the ceremony in the machine room. Eric says 休んで to each machine, and each one powers down gently in front of the whole team. Only Eric knows why that went so smoothly.

**Kenji (29, engineer).** Wants free drinks from the B2 vending machine. Problem: he ran for the staff council as a joke candidate on that one promise, and he's winning.
1. [1] He borrows Eric's chair and hands him a one-line campaign flyer.
2. [2] Mio builds him a campaign page as a prank, and it becomes the most-read page on the intranet.
3. Turn [2]: the candidates' debate has a reformer from head office who speaks only English. Eric interprets for Kenji with the words he has, and gets some of them wrong, to the room's delight. Kenji teaches 出して.
4. Payoff [3]: Kenji wins, and finds out the seat comes with a vote on the island's budget. The basement now has a vote in the council, and other arcs use it.

**Emi (32, B2's team lead).** Day 1 hides her. Proposal: she's been at head office selling the upgrade, and her return is her first beat. Wants the 課長 promotion she's been passed over for twice, and the upgrade is her case. Problem: she promised the board a date, and Eric's speed (the magic) makes her raise it every week.
1. [1] She comes back pleased with his first-week numbers, and moves the deadline up.
2. [2] She presents B2's progress to the council, and he watches her round his numbers up.
3. Turn [2]: the numbers don't add up. She thinks he's been holding back. The player's pace decides how bad it is.
4. Payoff [3]: she tells the board the real date. The council vote decides her promotion, and Eric can sway it through people he knows.
- Romance [4]: the year-end party, the last train home, and she doesn't get off at her stop.

### Around the island

**Rei (26, Sales).** Wants first place on the monthly sales board, which is her ticket to head office in Tokyo. Secret: Sales's old fax stamps orders with its own clock, which she set forty minutes slow two years ago. Late orders on the last night of the month count toward her month. The migration will fix the clock.
1. [1] In the lift she reads his B2 card and treats him as a contractor, politely.
2. [2] In the council she argues against migrating Sales first, and gives no reason.
3. Turn [2]: a month-end night ticket puts Eric at the fax at 23:50 while an order comes in. He can see the clock. She teaches 送って.
4. Payoff [3]: next month-end. He can fix the clock, leave it, or tell her he knows. Whatever he picks, she tells him the story of the first month she was top, and it isn't flattering.
- Romance [4]: the client visit on the mainland in polite Japanese, and the last monorail back is cancelled for wind.

**Aoi (intern).** Wants a placement she earned. Secret: she's a 縁故 hire (a family connection), since her great-uncle sits on the board. People who find out treat her like glass, so she takes the worst rotations.
1. [1] 1 October is the 内定式 for next year's hires. She's running it alone and late, and shouts katakana at him while he fixes the microphone.
2. [2] Her rotation brings her to B2 for a month. She's good at it.
3. Turn [2]: a ticket at the ID desk puts her record on his screen, with a surname he has seen on the board list. She sees him see it. He tells no one. She teaches him arcade slang, which the arcade's machines don't answer to.
4. Payoff [3]: she asks for B2 in the placements, on her own record. Kenji is jealous of her desk.
- Romance [4]: the claw machine on the arcade street, after closing, with Jun's key.

**Kaori (44, canteen).** Wants to keep feeding people who aren't on the payroll. Secret: the night cleaners and agency workers from the production halls can't use the staff canteen. For twelve years she has used a bug in the nineties meal ticket machine (a button combination that prints a free ticket) and taught it to them.
1. [1] A bigger portion than the man before him, unmentioned.
2. [2] Eric's ticket: replace the ticket machine with card payment.
3. Turn [2]: at 6 a.m. he sees the cleaners use the button. He can migrate it, ask her to sign a waiver, or take it to the council. She teaches 温めて.
4. Payoff [3]: with Kenji's vote or Kiyoko's, the canteen gets a line for staff guests. She's annoyed at the fuss.
- Romance [4]: the dorm bath, last in, after midnight, when the boiler has failed again.

**Kiyoko (56, head of the old guard).** Wants to retire in March with her faction intact. Problem: the new system logs managers in with a photo, and the only photo of her in company records is from 1998. She won't sit for a new one and won't say why.
1. [1] Eric sets up her terminal. She sends him away in keigo he can't follow.
2. [2] Her login has been failing for a month and her secretary is out of excuses. She asks for "the technician who can't gossip in Japanese".
3. Turn [2]: he can file a waiver she signs herself, or bring Kanae up with her camera. She listens to Kanae for exactly one minute.
4. Payoff [3]: the photo, which she approves on the third print. Her faction's vote goes where she decides, and she remembers who didn't mention it. (Her history with Kaori stays off-screen, in overheard talk at Jun's bar. It resurfaces as a sharp note about the Thursday bento.)

**Yuzuki (31, PR spokeswoman).** Wants never to bow on camera again. Six years ago she read the company's apology (謝罪会見) for someone else's mistake, and the clip still goes round.
1. [1] At the plaza she tests the PA with 以上です, and it echoes three times.
2. [2] The switch-over for the plaza screen and PA lands on the anniversary festival weekend. She asks Eric to move it, and Emi says no.
3. Turn [2]: the switch-over goes wrong live. He has thirty seconds to fix it quietly while she stalls the crowd. She teaches him the set phrases for announcements.
4. Payoff [3]: she gets through it without a bow and forgets to say 以上です.
- Romance [4]: the karaoke room after the festival crew leaves, where she sings badly on purpose.
- If he isn't at step 2 by the festival, the switch-over just works, and the arc moves to the year-end party with a smaller version of the same risk.

**Tsubasa (27, ekiden runner, General Affairs).** Wants to stop running and work in the office full time; she loves spreadsheets. Problem: the coach who recruited her from high school has built the team around her, and she can't tell him.
1. [1] She hands Eric a stopwatch at the 6 a.m. track and has him call her splits.
2. [2] She asks him, quietly, to set up her General Affairs account so it looks like she's been there for years.
3. Turn [2]: the coach finds her in a pivot table. Eric can cover for her or leave it. She teaches him numbers the fast way.
4. Payoff [3]: the New Year ekiden on 1 January, her last race. She asks him to hold her watch and not tell her the time.
- Romance [4]: the first Monday she spends at a desk, and the lunch she doesn't know how to take.

**Kanae (30, newsletter photographer).** Wants to finish a film portrait of everyone on the island before the newsletter goes online. Secret: the Tokyo agency she says she's joining turned her down in summer.
1. [1] She shoots him for the new-staff page. The print goes up in the canteen.
2. [2] The migration plan puts the new server room in her darkroom. Eric picks the site.
3. Turn [2]: he can take the darkroom or the B2 storeroom, which is where Mio naps (a cost with Mio). She teaches 動かないで while making him hold a pose.
4. Payoff [3]: the exhibition in the lobby, eight hundred portraits. She says she's staying, and admits why.
- Romance [4]: twenty minutes in the darkroom with the red light on and the door answering only to him.

**Sumi (24, calligrapher, General Affairs).** Wants to stop writing four hundred condolence envelopes a year and study design at the island's university. Problem: her grandmother, a known calligrapher, got her the job.
1. [1] She writes his desk nameplate.
2. [2] His ticket: a printer with a brush font for certificates. The prints look dead, and people complain to her.
3. Turn [2]: they make the font from her strokes on a scanning tablet. His turn at the brush ruins three kana, and she keeps one of his in the font as a joke. She teaches him the words for writing and stroke.
4. Payoff [3]: university enrolment day. The letter to her grandmother comes out of the printer in her own hand.
- Romance [4]: the festival street, where she painted every lantern.

**Saki (28, head of Legal).** Wants a holiday. She has forty days of unused paid leave (有給), and only she may use Legal's seal. Problem: she has no idea what to do without work.
1. [1] She's in the copy room when he fixes the copier. He does it by hand.
2. [2] She asks for e-signatures to go first on his plan.
3. Turn [2]: e-seals are live and she's on leave, and she keeps logging in. She asks him to lock her out of her own account until Monday, and he does. She teaches him the polite phrases Legal expects.
4. Payoff [3]: she comes back from two days off and says it was fine. She has booked another week.
- Romance [4]: a weekday at the empty company beach. She asks him to show her how to do nothing, and she's bad at it.

**Nanami (29, ID card and access desk).** Wants her unpaid overtime (サービス残業) paid. Secret: the old gate log is the only proof of her hours in a dispute with her manager, and the new access system starts with an empty history.
1. [1] She issues his card and asks for his staff number.
2. [2] His ticket: install the new access system.
3. Turn [2]: she asks him to keep the old log alive until her claim is heard. He can sign it into a waiver through Ishibashi or export the log first (a longer ticket). Hamada, who is late every morning and knows her hours, offers to be her witness.
4. Payoff [3]: the claim is paid. She spends it on a coat that isn't pink.
- Romance [4]: a text at dawn after her first night shift, without です: is there coffee.

**Kuro (27, night reception).** Wants to keep the night mahjong table she runs in the lobby for the security staff, which is against every rule on the island. Problem: the reception kiosk on Eric's install list has a camera that faces it.
1. [1] Lost property at night. Her name, read like 黒, makes her smirk.
2. [2] She asks which way the kiosk camera will face, in a tone that sounds like idle chat.
3. Turn [2]: he can point it at the door, add the table to the kiosk's blind spot, or install it and see what happens. She teaches 消えて, for when the night manager comes down.
4. Payoff [3]: a seat at the table. The game is played for canned coffee, and he learns the tiles as words (numbers, winds, colours).
- Romance [4]: 3 a.m., the table packed away, and the lobby lights out.

**Mr. Ishibashi (64, gate guard).** Wants to keep knowing who's having a bad day. He knows every face on the island and counts the good mornings. Problem: the new face gate works perfectly, and it can't tell who's had a rough night.
1. [1] Day 1: good morning matters to him.
2. [2] Eric installs the face gate. It lets Hamada through asleep on his feet, and Ishibashi hates that it didn't notice.
3. Turn [2]: he dictates extra lines for the gate's voice, one per mood he can read on a face, and Eric has to get them past the vendor. He teaches him phrases for directions and times.
4. Payoff [3]: a morning when the gate asks Hamada if he slept. Ishibashi pretends to read his clipboard.

**Goro (61, rooftop garden).** Wants to keep his bees. He grew up in the fishing village the island was built over, and his hives forage the cherry trees planted on it. After a sting complaint, bees were banned. The hives are behind the water tanks, and Kaori's honey dessert comes from them.
1. [1] A tomato, and a request not to use the left-hand roof door.
2. [2] His ticket: the air intake keeps clogging, with bees.
3. Turn [2]: Eric can report the hives or tell the intake fans to turn the other way when the bees fly. Goro teaches 回って.
4. Payoff [3]: Yuzuki turns the honey into a PR story. Goro hates the fuss and gets his bees back officially.

**Jun (38, payroll by day, the bar by night).** Wants one night off. He hasn't had one in twelve years. Problem: nobody else can run the bar.
1. [1] He pours Eric's drink without asking, and it's the right one.
2. [2] His ticket: the till is on the old system and freezes every month-end.
3. Turn [2]: he asks Eric to run the bar for one Friday. Orders come in fast Japanese: counts, sizes, names of drinks. The taps answer 入れて, and nobody should see them do it.
4. Payoff [3]: Jun spends his night off sitting at his own bar as a customer, and tips.

Mr. Hamada's story runs through Nanami's and Ishibashi's. The night CCTV operator in the bible is a good fit for the production halls (ISLAND.md) once someone designs the character.

## Part 3: how the layers make an open world

No main plot runs through the game. Four things give it shape:

1. **The calendar.** One fiscal half-year, with each arc's key dates spread across it: the 内定式 in October, the festival in November, the year-end party in December, the ekiden on 1 January, the romance beats by February, and transfers, claims and retirement in March. A missed date never ends the game. The arc moves to a later, smaller moment, or ends as a friendship.
2. **The migration map.** He picks which district to upgrade next, and every arc touches one or two. Accounts before the gate helps Nanami, and the darkroom as the server site costs Mio. The quota and the waiver budget make every choice cost something.
3. **Arcs as storylets.** Each beat is a scene with conditions (a step, a period, an open place, a date, another arc's beat, words taught) and consequences (flags, bond, access, a command). The engine offers what's ready, in no fixed order. This is the shape the day-1 story files already use, and the one the parked procedural idea in TODO.md would generate into later. Authored arcs stay authored.
4. **Links between people:**

| Link | What moves |
|---|---|
| Kaori, Kenji, Kiyoko | The staff-guest line needs a council vote |
| Nanami, Hamada, Ishibashi | The gate log, the witness, the face gate |
| Kiyoko, Kanae | The photo |
| Kiyoko, Mori | Hired the same year; he lost his title and she rose |
| Mio, Kanae | The server room site |
| Goro, Kaori, Yuzuki | The honey |
| Emi, Rei | Emi trained her in Sales; Rei doesn't bring it up |
| Emi, Kenji | Council votes |

**Pacing** (scene-sequencing):
- At most one big beat a day, followed by a quiet evening.
- Beats end with a cost: the waiver is signed, and the quota is one short.
- Every day offers one ready beat or one new place. When nothing is ready, the small things fill in: ambient talk, needs, someone at an open time.
- Early weeks lean on the English speakers and the casual places. People with no English open up as he learns, so the second half feels different from the first.

**Suspicion** is local. If someone sees a command work, that person gets curious and their arc plays differently. Nothing is shared between them, there's no meter, and no game over.

## Open questions for Jørgen

1. Is the upgrade that erases the magic the spine you want? It follows from STORY.md, but it's a proposal.
2. Is Emi at head office on day 1?
3. Is a six-month contract (October to March) with a quota of 30 of 45 right, or should it be longer?
4. Are the romance and friendship lists above right? Kiyoko is friendship only here.
