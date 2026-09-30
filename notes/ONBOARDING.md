# Onboarding: the first five minutes

Design brief for the train opening. The shell agent (game3d/js) and the story agent (game3d/story/train.js) build from this. It follows GUIDE.md: the first-screen rule, the playtest rules, no timers, no exposition panels, don't assume VN conventions.

What went wrong (Jørgen, 2026-09-28): the game opened with a goal chip, a bottom hint, pins on seven passengers and a floating action menu all at once. His words: "start off with JUST controls, NO goals, no other clutter. THEN teach how to talk to people", "don't force the player into the story right away, you are stuck from then on", "what is the point of having an open world if you can't explore it", and "did you learn nothing from the studies of other games?"

## (a) What other games do in their first minutes

**A Short Hike.** You walk out of a cabin into a small, safe area with nothing on screen. The one goal (reach the summit to get phone signal) comes from Aunt May in conversation, and gliding is taught with a short line on the path when you first need it. You can ignore the goal and swim the other way, and a beach NPC hands you a side task that pulls you into exploring. Someone who seems lost gets a compass from an NPC, not a waypoint. ([script analysis](https://lonesomealley.tumblr.com/post/188750392131/a-short-hike-in-depth-analysis-and-review-script), [PlayStation Blog on the design](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/), [GDC postmortem](https://www.youtube.com/watch?v=ZW8gWgpptI8))

**Animal Crossing: New Horizons.** Day one is one small verb after another, each asked for by a character (pick a tent spot, find spots for two neighbours, gather branches), and the land you can reach is limited to one safe piece. Most systems stay hidden for days. The camping framing is liked, but day one is widely called thin. ([tutorial guide](https://animalcrossing.fandom.com/wiki/Guide:Tutorial_(New_Horizons)), [Screen Rant on day one](https://screenrant.com/animal-crossing-next-game-camping-start-day-one-op-ed/))

**Stardew Valley.** Robin walks you to the farm, Lewis says hello, and after that nothing is forced. "Introductions" asks you to greet the townspeople, so talking to people is itself the first open-ended task, done in any order and at any pace. ([quests](https://stardewvalleywiki.com/Quests), [getting started](https://stardewvalleywiki.com/Getting_Started), [design principles](https://deeprootdepths.substack.com/p/examining-the-design-principles-of))

**Night in the Woods.** Mae arrives at an empty bus station, nobody is there to pick her up, and she walks home. On the way there are spots where she stops and talks about the town, and every one of them is optional. The setting and her past come out through her lines, never through a text panel. ([Day 1 / bus station](https://nightinthewoods.fandom.com/wiki/Bus_Station), [GDC postmortem](https://www.gdcvault.com/play/1024984/Nuke-Possum-Springs-A-Night))

**Spiritfarer.** Gentle, with the tone set by one character (Gwen). The first hour, though, brings in navigation, fishing, farming, foraging, weaving and ferry upgrades, and some players find it dull until Charon leaves and the open sea begins. ([TheGamer review](https://www.thegamer.com/spiritfarer-review/), [Steam thread](https://steamcommunity.com/app/972660/discussions/0/3111395750249256518/))

**Persona 5 Royal.** A short, playable heist cold open plants a question ("why is he being interrogated?"), and that question carries the player through the long, slow school-life setup that follows. The long tutorial stretch is still its most common complaint. ([Inverse](https://www.inverse.com/gaming/persona-5-royal-cold-open), [GameFAQs thread](https://gamefaqs.gamespot.com/boards/371756-persona-5-royal/80740881))

**Yakuza 0 / Like a Dragon.** One player timed 62 minutes from boot to free control of Kiryu. The story set-up is praised, but the talk during it is called bloated, and the series is known for opening with hours of cutscenes before the city opens up around chapter 3. ([Chamomile's blog](https://chamomilehasa.blog/2023/05/19/yakuza-zero-slow-start/), [ResetEra](https://www.resetera.com/threads/yakuza-0-is-doing-nothing-for-me-so-far-what-am-i-missing-1st-chapter-spoilers.438463/page-3))

**Hades.** You have control within seconds. Story comes as short exchanges with characters in the House between runs, and the game reacts to what just happened to you ("moments where you feel the game is paying attention"). Nobody holds you in a long conversation. ([Game Developer](https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death))

**Unpacking.** No tutorial boxes and no dialogue. You learn the one verb (take out, put down) by doing it. Extra UI such as the floor plan only turns up in the first level that needs it (level 3). ([Game Developer on design pillars](https://www.gamedeveloper.com/design/unpacking-the-design-pillars-of-a-chill-puzzle-game), [Wikipedia](https://en.wikipedia.org/wiki/Unpacking_(video_game)))

**Sea of Stars.** A quick combat tutorial and then long stretches of exposition. Players report over two hours of intro, and one sums it up: "the problem is less the tutorial and more the exposition dump that goes with it." ([Steam thread](https://steamcommunity.com/app/1244090/discussions/0/3817418793962745177/?l=english), [Indie Wavemakers](https://indiewavemakers.com/indie-wavemakers-sea-of-stars-review/))

**Chants of Sennaar.** You walk in, reach a door with a lever and a sign, pull the lever, and the sign's two glyphs now mean "open" and "close". The first person you meet uses a word you just learned. Six words get confirmed before the first check, every word shows up in at least two situations, and you are told to guess and keep exploring, not stop and translate. ([Game Developer](https://www.gamedeveloper.com/design/immersing-players-in-the-culture-of-a-people-with-language-puzzler-chants-of-sennaar), [walkthrough](https://intoindiegames.com/walkthroughs/chants-of-sennaar-walkthrough-part-1/))

The pattern: the well-liked openings give you control almost at once, keep the screen empty, teach each verb at the moment it first matters, and get their first goal out of a character. The disliked ones (Sea of Stars, Yakuza 0, the middle of Persona 5, Spiritfarer's first hour) front-load talk or systems.

## (b) Rules for our opening

1. **Control within five seconds, and the first screen shows only one line about controls.** No goal chip, no pins, no names, no word list, no menu buttons apart from a small settings icon and the build id. (Hades, Unpacking; the Yakuza 0 62-minute counter-example.)
2. **One new verb at a time, taught when it first matters.** Walk first. E only once something is within reach. Q (Say) only at the cat, the first time a word has a use. Tab/Next only once two targets overlap, and never in the first five minutes if we can avoid it. (Unpacking's floor plan in level 3; A Short Hike's glide line.)
3. **A prompt goes away when the player does the thing, never on a timer.** "Walk" goes after about two metres of movement. "E Talk" shrinks to a plain key cap after the first two uses and goes after the fifth. Nothing leaves while unread. (GUIDE: no timers; Chants: learn by doing.)
4. **Markers only show within reach, and only on one target.** The nearest thing within reach gets the ring, the label and the action. Things further away show nothing. No pins on the seven passengers. (A Short Hike and NITW use no waypoints; Jørgen's clutter complaint.)
5. **No goal until talking has been taught.** The first goal line appears only after the player has used E on a person, and it comes out of what someone said. (Jørgen's order; A Short Hike, whose goal comes from Aunt May.)
6. **The first space is small and safe.** The car is enclosed, nothing can go wrong, and nothing is timed. The train doesn't arrive until the player has had the lesson and walks to the doors. (ACNH's one safe piece of land; Unpacking has no fail states.)
7. **Nudges come from people and the world, not from UI.** A passenger points at the free seat. Mio speaks English within earshot. The car lurches. A goal line is the last resort, and it stays up once shown. (A Short Hike's compass NPC; Hades reacting to what the player just did.)
8. **The player starts every story beat.** Nothing plays until the player walks up to someone or presses E. After a beat the player gets control back, standing, with nothing on screen but the goal line. Never leave the player seated, zoomed in or stuck. (Jørgen: "you are stuck from then on"; Stardew lets you do things in any order.)
9. **Beats are short, free play in between is longer, and the player ends the free play.** Aim for 30 to 90 seconds per beat, then free play that lasts as long as the player wants. Mio's lesson is three short beats with free play between them, not one long scene. (The Sea of Stars and Persona 5 complaints; Hades' short exchanges.)
10. **Talking is taught on someone with nothing at stake.** The first E on a person is a passenger who answers with one overheard line and a nod. This teaches that people talk, that talk is short, and that most people here speak Japanese, which is why Mio matters. (Stardew: greeting people is the first open task. NITW: optional talk.)
11. **A word is used again right after it's taught, on something that reacts.** おはようございます goes to Mio first, then the cat, then anyone in the car. The Say menu lists only the words already learned. (Chants: every word in two situations.)
12. **Poking around pays.** Every marked thing gives a short, funny or character line that adds something the screen doesn't already show. No descriptions of the scene. (GUIDE: no narration of what the player can see. A Short Hike rewards off-path curiosity.)
13. **Hide the whole system at the start.** No day clock, no period name, no bonds, no word list, no map in the first five minutes. Each appears the first time it has something in it. (ACNH's locked systems. Spiritfarer shows what happens when six systems land in hour one.)
14. **Every waiting state is visible.** While a line plays, the waiting marker shows. When the game wants a key, the key shows. Clicks fast-forward moves. (GUIDE, playtest 2.)
15. **Hook with a question, not a briefing.** The first thing Mio says is about him ("B2? You're going to B2?"), so the player wants the next line. (Persona 5's cold open; NITW's empty station.)

## (c) Beat by beat: the first five minutes on the train

Controls: WASD or click/tap the floor to walk, E to use or talk to whatever is in reach, Q to Say a word. On a phone, the action button stands in for E and a Say button for Q. The car is one closed car, and no neighbour cars can be walked into. Only one seat is free: seat_far_r, next to Mio. The others have bags on them.

**Beat 0. Load (0:00 to 0:05).** The loading screen names the place in a few words and nothing more. The scene fades in on Eric standing in the aisle near the middle of the car (spawn [-0.2, 0.1]), with the train running and sea light in the windows. The camera frames Eric with the car around him.
- On screen: one line at the bottom, "WASD or click the floor to walk" (phone: "Tap the floor to walk"), the settings icon and the build id. Nothing else.
- Player can: walk anywhere in the car.
- Next: once the player has moved about two metres, the line fades.
- Not shown yet: goal chip, pins, labels, names, word list, Say, Tab/Next, clock, period.

**Beat 1. Free walk (about 0:05 to 0:40, as long as the player wants).** The car moves. Passengers sit as they are: the sleeping man, Aoi on her phone, the man with a book, the girl with headphones, the woman with a bun, the young man, the cat on the seat, and Mio by the window with her laptop and the pickle bag.
- On screen: nothing, until the player comes within reach of something.
- First time anything is in reach: a small ring on that one target, its short label ("Man with a book") and a key cap reading "E Look" for a thing or "E Talk" for a person, next to the target and not in a floating menu. It stays until the player presses E or walks out of reach. The action word always stays; the key cap goes after five uses (docs/game/controls-and-ui.md).
- Things (window, poster, straps, rack, plant, cup) answer with one short line. Straps: Eric grabs one as the car sways. Poster: katakana he can't read, and one thought from him. People answer as described in beat 2.
- Not shown yet: goal, and anything about the story.

**Beat 2. First person: talking is taught (the first E on a passenger).** The first passenger the player talks to answers with one overheard line (blurred text and voice, as in the story rules) and a nod or a small gesture. The line is short, and one click anywhere continues it. The hint "Click anywhere to continue" shows under the first line only.
- The first person talked to (whoever it is, except Mio or the sleeping man) points toward the free seat by the window after the line, with an emote. The narration says what the gesture means in five words or fewer ("She nods at the empty seat."). The young man and the woman with the bun do the same if they're first. If the first person is the man with a book, he taps the book title (the existing line) and the next person does the pointing.
- **Only now the first goal appears:** "Sit down" in the goal line, with a floor ring at the free seat. The goal comes from the gesture, not from a system.
- The player can ignore it and keep exploring. Everything stays open.
- Not shown yet: Say, the word list, Mio's name.

**Beat 3. Mio overheard (a nudge, triggered by distance).** The first time Eric comes within about 2.5 m of Mio, she says a line to herself in plain English, with no dialogue box, only a small caption by her head that stays until he walks away or talks to her. Something like her muttering at the laptop about the Wi-Fi dropping in the tunnel (the story agent writes it in her voice). It's the first clear English in the car, and it pulls the player to her without a marker. If the player walks straight to Mio before talking to anyone, this beat still plays, and E on her works (beat 4); the goal line from beat 2 is skipped because it isn't needed.
- If the player has talked to three passengers and still hasn't gone near Mio, the third one points at her instead of the seat. That is the only extra nudge. No timer.

**Beat 4. The seat and Mio's first conversation (existing nodes `seat` then `sit`, started by the player).** It triggers by walking onto the seat ring or pressing E on Mio. The car lurches and her pickle bag slides to the edge of the seat and stays there, wobbling. It does not fall on a timer. The action shows "E Catch" on the bag. Catching it goes to `caught`. Stepping onto the seat without catching goes to `dropped` (the bag drops as he sits). This replaces the Catch/Let-it-fall buttons with the act itself, and it's the second use of E, the one that carries weight.
- Then `sit`: "B2? You're going to B2?" The choice (I'm Eric / visiting your mum / nod) is the first real choice. Buttons are separate from the text as usual.
- It ends with the camera back to the play view, **Eric still seated but free**: any move key or floor click stands him up. The goal line changes to "Talk to Mio again when you like". No other text.
- Length: about 60 seconds.

**Beat 5. Free play (the player ends it).** Eric can stay seated or walk around the car. Mio types and doesn't press him. A person he talked to before might say a new line now (for example Aoi on her phone, the existing overheard line). The sleeping man has a zzz emote, which sets him up for the arrival. Talking to the sleeping man gives "He is fast asleep." Only a ring on Mio shows, and only when within reach, as with every target.

**Beat 6. The lesson, part 1: おはようございます (`lesson`, started by E on Mio).** About 90 seconds: where he's from, how much Japanese he has, why it matters, the word, typing it. The type box is the first typing. It shows the romaji under the word, and Mio's prompt line says what to do. When it ends, Mio points him at the cat.
- **Q (Say) is taught now, only now:** the goal line reads "Say good morning to the cat". When Eric is in reach of the cat, the action shows "E Pet" and "Q Say" stacked, with Q highlighted this first time. Pressing Q opens the Say menu with one word in it, おはようございます. Saying it to the cat gets the slow blink and Mio's "See? She's fine with it."
- The word list appears for the first time now, holding one word, because it has something in it.
- After this, Say works on anyone. Every passenger has a small reaction (nods, a glance up, the sleeping man stays asleep). Nothing asks the player to try them. It's there to be found.

**Beat 7. Free play again.** The goal line: "Talk to Mio when you like". The player can greet the whole car if they want.

**Beat 8. The lesson, part 2: よろしくおねがいします and the announcement (`lesson3`, started by E on Mio).** About 60 seconds: the sleeping-man setup line, the word, typing, the pickle if she's warmed up, the announcement. Mio: "Go stand by the doors." The goal line: "Wait by the doors", with the floor ring at the doors.
- The train is visibly slowing. The player can still walk around. The arrival (`approach`) starts only when Eric reaches the doors. No clock.

**Beat 9. Arrival (existing `approach`, `arrival`, `platform`).** This is past the five-minute mark and is covered by the story. The onboarding rule that still applies: every new prompt (typing すみません, the doors, 待って) appears as its moment comes, and every step waits for the player.

### What the player never sees in these five minutes

Goal chip at load. Pins on anyone out of reach. Names over people's heads. Tab/Next. The day clock and period. Bonds or relationship UI. A map. Any text panel explaining who Eric is, where he is going or why. Any line that describes what the camera already shows. Any text that disappears on its own.

### Where the player is free

Everywhere in the car, at every point except inside the three short conversations (beats 4, 6 and 8) and the type boxes. Each conversation is started by the player and hands control back at its end.

## (d) Cold-player checklist

A fresh agent with no knowledge of the repo plays at 1366x860 and 390x844 (phone), and a human-speed pass follows. Score each item pass or fail. It passes only with all items marked must passing and at least 18 of 22 overall.

First screen
1. (must) Within 5 seconds of the scene appearing, the player can move Eric.
2. (must) The first screen shows only the controls line, the settings icon and the build id. Count every other element; the count must be zero.
3. (must) No goal text anywhere before the first E on a person.
4. The controls line goes once the player moves, and does not come back.

Teaching verbs
5. (must) The E prompt first appears only when a target is in reach, and next to that target.
6. (must) No more than one target is marked at a time, and nothing out of reach is marked.
7. The cold player can say, after the first passenger, that E talks to people, without being told.
8. The first dialogue line shows how to continue, and one click anywhere continues it.
9. (must) Q/Say is not visible anywhere before Mio sends him to the cat.
10. At the cat, the cold player uses Say on the first or second try.
11. Tab/Next doesn't appear in the first five minutes.

Freedom
12. (must) After every conversation the player can walk within one keypress or click (seated Eric stands up).
13. The player can talk to at least five things or people without starting the story.
14. (must) No story beat starts unless the player walks into it or presses E.
15. Walking straight to Mio first works, with no broken goal or leftover prompt.
16. Ignoring Mio for a long time never locks anything and brings at most one diegetic nudge before a goal line.

Nudges and goals
17. The first goal comes from something a character did or said, and the cold player can say where it came from.
18. (must) At every point after the first goal, the cold player can say what to do next.
19. (must) No text leaves the screen on a timer (goal, hint, caption, prompt).

Story and text
20. (must) No panel or narration explains who Eric is, where he is or why. The cold player can still say, by the end of beat 4, that he's new, going to work in B2 and that Mio is on the same team.
21. No line describes what the camera already shows.
22. Each of the three Mio conversations is under about 90 seconds at reading speed. The cold player never says "when does this end".

Report per item: pass or fail, a screenshot for each on-screen item, and the cold player's own words for 7, 17, 18 and 20.
