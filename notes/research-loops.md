# Day loops, rewards and pacing

Research for Amakawa, written 2026-09-26. Jørgen asked how the RPGs he likes, built around day loops, rewards, progression and story, keep things interesting: how they pace things, and how much work leads to a reward. That includes the adult RPGs that are good games in their own right. This note collects what those games do, with numbers and links, and ends with a proposal for our game (section 11) and changes to the current slice, legacy/island/content/storyboard.md (section 12).

Five research agents and I read wikis, developer interviews, GDC talks, postmortems, reviews and papers. For Daily Lives of My Countryside, which Jørgen named as one of the best RPGs he has played, I also read the data files of his copy of the game. Fandom wikis and GameFAQs refused direct reading, so some numbers come from search-engine extracts of those pages, and the session's search budget ran out near the end. "Unverified" marks a number no source confirmed. "Derived" marks my own arithmetic from cited numbers. Adult games are described by structure only.

## The short version

- The good day-loop games make one in-game day about one sitting. Stardew Valley's day is 14 real minutes, Fields of Mistria's 12.5, Persona 4 Golden's about 12 and Persona 5 Royal's about 20 (the Persona figures are derived). One Amakawa day can fit a 10 to 15 minute train ride.
- In Daily Lives of My Countryside the clock never runs by itself. Most actions cost an hour, each relationship stage asks for 10 more points while actions give 1 to 5, and an illustrated scene comes every two or three stages. Five or more relationships run in parallel, so something moves on most days.
- Rewards come at regular steps the player can see: a heart every 250 points in Stardew, a rank per meeting in Persona 5 Royal when you play well, a photo at four of Crush Crush's nine tiers. The player always knows how far away the next one is.
- The best rewards change the game as well. Persona 5's teacher gives you evenings back, Karryn's Prison's passives change the heroine's stats, and Stardew's Community Center rooms open new places.
- New systems arrive every one to three days in the first week (Stardew: fishing on day 2, the mines on day 5), and the first free choice comes early. Persona's slow first month, full of cutscenes, is a common complaint.
- The common traps are energy crunches, losing a day when you quit, waiting for the right weekday, real-time locks, hard deadlines, relationships run on gifts, busywork between the good parts, unlock conditions nobody can see, and too many characters.
- Duolingo's streaks raise its retention numbers, and they work through fear of losing something. A rested bonus, requests that wait for you and a visible next step bring people back without that pressure.
- Spaced review works best when a word comes back because something in the game needs it, a little later than feels necessary, and when the player has to produce it himself.
- The proposal: an action clock, five slots in a weekday, a fixed set of things every session gives, weekdays with their own character, one new grammar form a week in the first month, ten-level relationship ladders with a Japanese task at levels 3, 5, 7 and 9, and reward pictures at the even levels.

## 1. Daily Lives of My Countryside

A free adult life sim by Milda Sento, made in RPG Maker MV and paid for through Patreon and SubscribeStar pledges. Development goes back to 2020 (v0.1.7 came out at Christmas that year) and is still going: v0.3.2.1 in June 2025, v0.3.3 in October 2025 ([itch.io](https://itch.io/blog/1093967/daily-lives-of-my-countryside-v033)) and v0.3.5.3 on 4 September 2026 ([Game Update Notifier](https://gameupdatenotifier.com/g/daily-lives-of-my-countryside)). A young man moves to a farm in the countryside for his studies. The household, the school, two neighbouring farms, a town, a forest and a beach supply the cast. The readme says every character is 18 or older.

I read the data of Jørgen's copy (v0.3.2.1) with read-only scripts: System.json, CommonEvents.json, the map files, the plugin settings, the quest log, the change logs and the developer's hint files. I didn't run the game or copy anything, and this section covers structure only. It's big: 105 maps, 2,297 events with 6,353 event pages, 36 affection or friendship meters, 43 progress counters, 89 quests (66 main, 17 side, 2 crafting, 4 chores) and about 5,700 picture files.

### The day

- The clock never runs by itself. The time plugin's speed is set to 0, and it also stops during events and dialogue. Time moves when an action finishes: 144 places in the scripts add one hour, and 9 add two or three. Classes, club sessions, dates and night events set the clock to a fixed hour instead (9, 11, 13, 15, 17, 18, 19, 21, 22 or 23). Minutes stay at zero, so a day is a row of hour slots.
- A day starts at 6:00. The scripts check the hour most often at 15 (75 checks), 13 (62), 6 (57), 19 (47), 12 (34), 18 (31) and 9 (24), so a weekday has six or seven slots that matter: early chores, class, lunch, the afternoon club, dinner, the evening at home, and night.
- Breakfast, lunch and dinner (6:00, 12:00 and 18:00) each take an hour and restore 30 energy, and lunch and dinner give +1 affection with the people at the table. Dinner is also where many story steps fire, and its menu gains options once a relationship passes set progress values.
- At midnight, if you're indoors, the game puts you to bed. Sleep restores 70 energy, or 30 if you went to bed after midnight.
- Energy (the MP bar) only limits work on the land and outdoors: a tool swing costs 3, milking or picking fruit 2, a forest search 10, a dive 60. Talking, helping and scenes cost hours and never energy.
- About 75 flags reset every morning (53 switches and 22 event switches), so most helping and chatting can be done once a day.
- The data can't show how long a day takes in real minutes. That depends on how many scenes you watch.

### The week and the month

- Seven days. Weekdays have school and weekends have other events, and some weekdays have fixed events of their own. Friday matters most: 45 script checks and 63 event pages depend on it (the weekly test, laundry day, pool cleaning). Monday, Tuesday and Thursday each carry fixed events too (a swimming competition, a class, an outdoor lesson).
- The month has 30 days, and the holidays repeat every month: the Christmas events fall on the 24th and Halloween on the 30th.
- Each morning has a 1 in 3 chance of rain, unless you watched the TV forecast the night before, which fixes tomorrow's weather to the forecast. Rain-only events can be planned.
- The weekly test: studying at the laptop takes an hour, once a day, and Friday's test turns the week's study into a grade. Both grades lead somewhere: an F starts one character's story line and an A moves another's on. The Halloween chase works the same way, with one scene for losing and another for winning.

### Progress and relationships

- Each character has two numbers, affection points and a progress value. The hint files write a stage as "7(11)": the stage the phone shows, then the progress value. The big ladders are long: Kate 48 progress values, Daisy 46, Anna 44, Maleena 41, Emmi 34, Elphaba 32, Mabel 31.
- Each stage asks for 10 more affection than the one before. Daisy's thresholds run 20, 30, 40 and so on to 160; Anna's and Kate's go to 230.
- Affection comes in small amounts: +1 for a meal, +2 or +3 for daily help (barn work, the cornfield, cleaning the pool), +5 for most story events, rarely +10 or +15. Bad choices take away 1 to 10.
- So a stage costs its story event (+5) plus two or three days of that character's daily actions. My estimate from these numbers: a player who concentrates on one character clears a stage every one to three in-game days, slower when a stage also needs a weekday, an hour or rain. With five or six ladders going at once, something moves most days.
- Affection is rarely the only condition. Stages also ask for a time and place (1 PM on weekdays at the pool, 6 AM at the dojo), a day of the week, rain, money (100 to 3,000 gold), an item bought or crafted, a skill trained by repetition (sculpting level 15, swimming level 5, a minigame score of 66 or more three times), a wait (a flower grows for 7 days), or another character's stage. One character's first stage needs five other characters at set stages.
- Some events, once seen, come back on a random third of days, so a routine visit sometimes turns into a repeat.

### Rewards and cadence

- About 185 event pages start an illustrated scene, spread over 29 scene groups. The main characters have 13 to 17 each, about one illustrated scene per two or three progress values (Anna 17 over 44, Daisy 15 over 46, Mabel 13 over 31, Maleena 13 over 41). Kate's line is the exception, with 8 over 48 and more plain story steps.
- Between scenes the rewards are small and frequent: a new option in a daily routine (dinner, the evening, bedtime), a new outfit, a place, a skill point, a shop item.
- Many scenes are interactive. Two meters run: one rises toward the scene's end, and the other is the danger of being caught, which rises with each bolder action (+2 to +10), warns at 60 and ends the scene at 100. The player decides how far to push.
- Some repeats cost a consumable bought in a shop, which ties replays back to money and work.
- The gallery is a dream. At bedtime you can dream instead of sleeping, which opens a replay room with 90 entries. Dreaming restores less energy (30 instead of 70), a small cost inside the fiction.
- A phone lists every character's events with their conditions and schedules, calls a character for a repeatable date, travels anywhere, skips to a chosen hour and shows the weather. In the world, 58 event pages put a marker over a person or place when an event is ready there.

### How new things arrive

- Day 1 begins with the arrival at 1 PM, and dinner is at 7 PM. Days 1 to 4 stay on the farm with the household: chores, meals, the barn and the first affection steps.
- Day 5 is the first school day, a scripted sequence that opens the second hub with its own cast of teachers, classmates and clubs. Since v0.1.9.1 it can be skipped, and the skip still hands out the starting affection.
- The forest's story starts after the first school day, and the neighbours' after you learn to farm. Later places (a beach house, another family's house, ruins with a dungeon) open through character progress.
- The change logs show the order the systems came in over five years: the farm, then the school with event markers, quests, the phone with farming and the gallery, crafting, weather, and simple turn-based fights.

### What keeps it from repeating

- Parallel ladders: on any day, five or more characters have a next step somewhere.
- Routines that change: the same dinner, evening or morning scene gains options and variants as a relationship grows, so repeating it shows how far you've come.
- The calendar: fixed weekdays, weekend outings, monthly holidays, and weather on top.
- Minigames and trained skills: hide and seek, a chase, a stream crossing, pool cleaning, a kicking game, punching-bag combos, sculpting, diving, and since v0.3.2 turn-based fights in the ruins.

### Story and rewards together

- Each stage is a short story scene first, and the reward comes out of it: a favour, a problem to solve, a date. Relationships move in small steps, each with a reason.
- Story lines hand off to each other. One character's problem needs another's help (a blueprint from the craftsman, herbs from the forest guide), which makes the cast feel like a village.

### Where it struggles, and what the developer changed

- Players leaned on the phone's checklist. In v0.3.2 the developer added character questlines so the hero works things out in the story, with players "not just checking the phone every 5 seconds" (his words). He also wrote the quest hints in the hero's voice, added arrows to show open paths, and let players skip the morning wake-up scenes.
- Conditions that sit in another character's story are hard to see. Players stall without knowing that someone else's stage is what they need, and several fixes in the change logs are about exactly that.
- The cast grew to 36 meters, and the v0.3.2 notes say no new faces from now on "unless it really matters".
- The phone has a cheat mode that sets any affection, stage, day or weather. That it's built in suggests players feel the grind.
- Early updates broke old saves several times.

### What we take from it

- The action clock: time moves when you finish something, which suits a train ride you might have to cut short.
- Separate budgets: hours for people, and something else (or nothing) for work.
- Small, steady affection against thresholds that rise evenly, a story step at every stage, and an illustrated scene every two or three stages.
- Routine scenes that gain options as a relationship grows.
- Fixed weekdays, monthly events that come round quickly, and a forecast to plan with.
- A gallery inside the fiction, with a small cost.
- Failure that leads to its own scenes.
- Interactive scenes with a risk meter, close to our eye marker and suspicion count.
- Hints in the hero's voice, and markers in the world where something is ready.

And three things to avoid: conditions hidden in another character's story, a phone checklist that replaces playing, and too many characters.

## 2. Life sims

Most of the good ones are farming games, and ours isn't one. For each game, this keeps the loop mechanics that carry over to company life on an island and leaves out the crops.

### Stardew Valley

The day
- 10 in-game minutes take 7 real seconds, so a full day from 6:00 to 2:00 is 14 real minutes. In single-player the clock stops during cutscenes, dialogue and menus ([wiki](https://stardewvalleywiki.com/Day_Cycle)).
- Energy starts at 270 and a basic tool use costs 2, which allows about 135 uses on day 1 (derived; [Energy](https://stardewvalleywiki.com/Energy), [Tools](https://stardewvalleywiki.com/Tools)). Bed by midnight restores all of it, bed at 1:00 about 75%, and 2:00 half. Passing out away from home costs 10% of your gold, up to 1,000.
- The game saves only when the day ends. Quitting in the middle loses the day ([Saves](https://stardewvalleywiki.com/Saves)).
- Seasons have 28 days, and the year has 12 festivals and 34 birthdays. The Traveling Cart comes on Fridays and Sundays. The TV gives tomorrow's weather and luck every day, and a new recipe every Sunday ([Calendar](https://stardewvalleywiki.com/Calendar), [Traveling Cart](https://stardewvalleywiki.com/Traveling_Cart), [Television](https://stardewvalleywiki.com/Television)).

Effort per reward
- A heart is 250 points. Friends go to 10 hearts, a spouse to 14. Talking gives 20 a day. Gifts give 80 (loved), 45 (liked) or 20 (neutral), with a limit of one a day and two a week, and eight times as much on a birthday. Friendship decays by 2 a day when you don't talk ([Friendship](https://stardewvalleywiki.com/Friendship)).
- Talking every day plus two loved gifts a week comes to about 300 points a week: 8 hearts in about 45 days and 10 in about 57. Talking alone takes about 100 days to reach 8 hearts (derived from the same page). One player's rule of thumb is about a heart a week ([forum](https://forums.stardewvalley.net/threads/is-there-a-certain-amount-of-days-for-1-heart.36248/)).
- Marriage candidates have heart events at 2, 4, 6, 8, 10 and 14 hearts, each tied to a place and a time window, sometimes to weather ([Abigail](https://stardewvalleywiki.com/Abigail)). Other villagers get one or two cutscenes and some recipes by mail (Clint at 3 and 6 hearts, Willy at 6) ([Clint](https://stardewvalleywiki.com/Clint), [Willy](https://stardewvalleywiki.com/Willy)).

How new things arrive
- Day 1: greet the town and plant a crop. Day 2: Willy's letter and fishing, and the daily Help Wanted board starts, with two days to finish each request. Day 5: the mines open by letter, and the Community Center scene can fire: six rooms and 30 bundles, each room unlocking something ([Quests](https://stardewvalleywiki.com/Quests), [The Mines](https://stardewvalleywiki.com/The_Mines), [Bundles](https://stardewvalleywiki.com/Bundles)).
- Later: the Egg Festival on day 13, the railroad on summer 3, special orders on fall 2, and Grandpa's evaluation at the start of year 3.

One more day
- The money for what you shipped, level-ups and new professions all arrive overnight ([Shipping](https://stardewvalleywiki.com/Shipping), [Skills](https://stardewvalleywiki.com/Skills)), and the TV shows tomorrow.
- "There's never enough time in a single Stardew day to do everything you want to do" ([Pixelated Playgrounds](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-stardew-valley)). Eric Barone talks about "a relaxed pace in terms of like when you accomplish goals, when you acquire rewards" ([KPBS](https://www.kpbs.org/news/2025/01/24/the-legacy-and-future-of-the-farming-game-stardew-valley)).

What keeps it fresh: seasons, festivals, birthdays, weather, rare overnight events (about 1% each, [Random Events](https://stardewvalleywiki.com/Random_Events)), the cart's random stock, and villagers whose schedules change by weekday, season and rain.

Criticism: the early energy crunch ("the day in the game is too short", [forum](https://forums.stardewvalley.net/threads/i-do-not-have-time-for-anything.20279/)); an empty late game once money stops mattering ([forum](https://forums.stardewvalley.net/threads/endgame-post-2nd-year-suggestions.8449/)); relationships run on presents (Yahtzee: the spouse becomes "just another labour-saving device on the farm that you feed with presents", [Escapist](https://www.escapistmagazine.com/stardew-valleys-relationships-are-really-rather-off-putting/)); and losing the day if you quit.

For us: a day the size of a session, the overnight payoff with a look at tomorrow, the daily request board with a short window, capped friendship points with an event every two hearts, and a restoration project room by room (the basement as our Community Center).

### Story of Seasons and Harvest Moon

- Friends of Mineral Town (2019 remake): 10,000 points per heart colour, and 60,000 (red) to marry. Talking gives 200 a day and a favourite gift 800. Events come at 0, 5,000, 10,000, 20,000, 40,000 and 50,000. Talking and a favourite gift every day reach red in about 60 days (derived; [fogu friendship](https://fogu.com/sos3/basics/friendship.html), [marriage](https://fogu.com/sos3/marriage/index.html)). About 16 festivals a year.
- Back to Nature: 18 festivals a year, and rivals can marry the candidates from year 3, so content can be lost for good ([guide](https://www.harvestmoonbacktonatureguide.com/girls.html), [ranchstory](https://ranchstory.miraheze.org/wiki/Festivals_(Harvest_Moon:_Back_to_Nature))).
- Pioneers of Olive Town: one event per heart, with no wrong answers. The dating pendant needs 6 hearts and the first five events. 10 hearts take about 37 days with a loved gift every day (derived; [ranchstory](https://ranchstory.miraheze.org/wiki/Friendship,_Dating_&_Marriage_(Story_of_Seasons:_Pioneers_of_Olive_Town))).
- A Wonderful Life tells a life in six chapters over several game years. Nintendo Life: it takes "at least a year and a half in-game before you've built up enough momentum" ([review](https://www.nintendolife.com/reviews/nintendo-switch/story-of-seasons-a-wonderful-life)).

For us: events at set thresholds, and festivals as anchors in the calendar. To avoid: content you can lose forever, and slow starts.

### Rune Factory 4 and 5

- RF4 lets you hold one request at first, two after you've finished three, and three after eleven. Requests, talking (1 a day) and fights earn Prince Points, which you spend (1,000 each) to add festivals to the calendar ([requests](https://wikiwiki.jp/rf4/依頼), [events](https://wikiwiki.jp/rf4/イベント開催)).
- RF4's town events roll at the change of day, one or two days apart, never on a festival day or the day before ([wikiwiki](https://wikiwiki.jp/rf4/サブイベント)). Main-story beats often wait until the next day.
- RF5's friendship levels unlock activities: at 3 you can spend time together, at 5 villagers send birthday gifts, at 7 you can date, at 10 marry. Talking, food gifts, dates and requests count once a day each. Only one romance story can be active at a time, with three dates per character ([Game8 friendship](https://game8.co/games/Rune-Factory-5/archives/373354), [dates](https://game8.co/games/Rune-Factory-5/archives/373700)).

For us: a request board that grows as you prove yourself, a town currency that buys events, a story scheduler with gaps between beats, and relationship levels that open activities.

### Fields of Mistria, Coral Island, Potion Permit, My Time at Portia

- Fields of Mistria: a day is 12.5 real minutes by default, with longer options. Talking gives 7 points and a loved gift 20, one gift a day, with no decay. Heart events come at 2, 4, 6, 8 and 10, and at 8 you choose a romantic or a friendly path. About 42 days to level 8 (derived). Dates happen at weekends, once a week per partner. Something new arrives on days 1, 2, 4, 5 and 6: greetings, then the museum and a pickaxe, bug catching, the Friday inn, and a letter about the mines, which open at Town Rank 10 ([Time](https://fieldsofmistria.wiki.gg/wiki/Time), [Relationships](https://fieldsofmistria.wiki.gg/wiki/Relationships), [Dating](https://fieldsofmistria.wiki.gg/wiki/Dating), [Quests](https://fieldsofmistria.wiki.gg/wiki/Quests), [Renown](https://fieldsofmistria.wiki.gg/wiki/Renown)). One reviewer found the days too short ([Wikipedia](https://en.wikipedia.org/wiki/Fields_of_Mistria)).
- Coral Island has over 70 characters, 25 of them romanceable ([Steam](https://store.steampowered.com/app/1158160/Coral_Island/)), heart events at most heart levels, and a main story that moves with the town's rank ([Wikipedia](https://en.wikipedia.org/wiki/Coral_Island_(video_game))).
- Potion Permit raises a relationship through that person's own quests: the first quest gives level 2, the second level 3, the third opens romance ([guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2870083124)).
- My Time at Portia has no penalty for running out of stamina or staying up. Reviewers said "waiting around for things to happen can get old pretty fast" ([Wikipedia](https://en.wikipedia.org/wiki/My_Time_at_Portia)).

For us: relationship levels earned through that person's requests (for us, asking and doing things in Japanese), a town rank that opens places, no decay, and a choice between romance and friendship.

### Animal Crossing: New Horizons

- Real time, with daily limits on rocks, fossils (4 a day) and bottles, and buildings that finish overnight ([Rock](https://nookipedia.com/wiki/Rock), [Fossil](https://nookipedia.com/wiki/Fossil)).
- In a run where every request is done at once: Blathers on day 2, the shop and house plots on days 3 to 6, Resident Services on day 8, K.K. Slider and the credits on day 13 ([Nookipedia](https://nookipedia.com/wiki/Project_K)).
- Reviewers had "little to do in the beginning", and critics burned out around week six ([Wikipedia](https://en.wikipedia.org/wiki/Animal_Crossing:_New_Horizons)). The New Leaf directors wanted the game to "accommodate players' schedules" ([Nintendo interview](https://www.nintendo.co.jp/3ds/interview/egdj/vol1/index2.html)).

For us: changes that happen overnight, and tomorrow as the reason to come back. To avoid: tying the story to real days.

## 3. Calendars and time loops

### Persona 3, 4 and 5

The day and the calendar
- Persona 5 Royal gives two free slots on most days (after school and evening), plus a free action on the train: you read a book on the commute. Dungeon days use up the evening. There are 414 free slots in about 301 days, so about 69% of the calendar is yours (derived; [calendar](https://megamitensei.fandom.com/wiki/Calendar/Persona_5), search extract).
- About 102 hours for the main story works out to about 20 real minutes per in-game day. Persona 4 Golden's 70 hours come to about 12 (derived; [TheGamer P5R](https://www.thegamer.com/persona-5-royal-playtime-how-many-hours/), [TheGamer P4G](https://www.thegamer.com/persona-4-golden-hltb/)).
- Most confidants only appear on certain weekdays, and some need a social stat first ([Push Square](https://www.pushsquare.com/guides/persona-5-royal-confidants-guide-where-to-find-all-confidants-and-how-to-rank-up-fast)).

Effort per reward
- Confidants have ranks 1 to 10. In Persona 5 Royal, Ryuji needs 20, 30, 20, 30, 45, 45, 60 and 60 points for ranks 2 to 10. A rank-up scene with the best answers and a matching persona gives 21 to 103 points, so a careful player ranks up at every meeting: Ryuji went from rank 1 on 12 April to rank 10 on 2 August in nine meetings and one invitation ([walkthrough](https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html)). A matching persona multiplies points by 1.5 (fandom, search extract). I found no reliable average for casual play.
- There are 23 confidants, and their ranks change the game. The teacher's rank 5 frees evenings and rank 10 gives more free time; the doctor gives discounts and better items ([gametruth](https://www.gametruth.com/guides/persona-5-royal-confidant-guide-all-ranks-and-abilities/)). Romance is chosen at rank 9.
- Five social stats with five ranks each open confidants (Ann needs Kindness 2, Makoto Knowledge 3), and maxing one takes roughly 20 to 50 activities (derived; [Game Rant](https://gamerant.com/persona-5-royal-p5r-how-unlock-every-confidant/), [ludo.guide](https://www.ludo.guide/guide/persona-5-royal/social-stats)).

How new things arrive
- Persona 5 Royal starts on 9 April. The first dungeon and two confidants come on 12 April, the first real free choice on 18 April (day 10), the first part-time job on 22 April, the first deadline on 2 May, Mementos on 7 May and exams on 11 to 13 May ([TheGamer April](https://www.thegamer.com/persona-5-royal-april-walkthrough-guide/), [May](https://www.thegamer.com/persona-5-royal-may-walkthrough-guide/)). TheGamer's summary: "April is the month of cutscenes"; in May "the game gradually stops holding your hand."
- Persona 3 Reload's first fully free day is 21 April, and then a new social link opens almost every day from 22 to 29 April ([Game Rant](https://gamerant.com/persona-3-reload-p3r-calendar-guide-walkthrough-what-to-do-everyday/)).

Story spacing
- Persona 3's full moons come about every 30 days ([AltChar](https://www.altchar.com/guides/persona-3-reload-list-of-all-full-moon-events-aoA9h4l8lPI7)). Persona 4's fog deadlines are announced by rain on the TV forecast ([XboxAchievements](https://www.xboxachievements.com/game/persona-4-golden/guide/persona-4-golden-key-dates-list), search extract). Persona 5 Royal's seven dungeons each have a window of 19 to 26 days ([Gfinity](https://www.gfinityesports.com/article/persona-5-royal-palaces)). School events (trips, festivals) fill the middle of each stretch.

Why people keep going
- Director Katsura Hashino wanted "the sense of fun you get over the course of a single week" to "change depending on what sorts of plans you make and how your goals are coming along". His team built a calendar simulator to set "the timing for schedule hints, when to trigger Social Links, and also which stretches of time were ultimately unnecessary", and cut the planned three school years to under one because "we'd be asking a lot of the players" ([interview, translated](https://dimensionslip.tumblr.com/post/85581763787/katsura-hashino-on-developing-and-fine-tuning)).
- "A year is a long time, but not long enough for everything" ([Espe, Game Developer](https://www.gamedeveloper.com/business/time-and-choice-in-persona-3)).
- Variety: rain turns off most confidants but opens rain-only events, and confidant ranks open new places.

Criticism: slow openings ("rightfully criticized" in Persona 4, and Persona 5 "takes almost as much time to set the table", [Prismatic](https://prismatictyrant.substack.com/p/persona-5-retrospective-part-2)), the length, guides for a "perfect schedule", and a game over when you miss a deadline. Persona 3's links can break if you neglect them. One player finished Persona 3 Reload because "You don't have to go to Tartarus every night" ([Eyes on the Clock](https://pompandpixels.substack.com/p/eyes-on-the-clock)).

For us: two free choices a day in a year that's too short for everything, a rank-up at most meetings, ranks that give time back, stats that open people, deadlines you can see coming, and a main beat about once a month. To avoid: a long start full of cutscenes, and deadlines that end the game.

### Majora's Mask

- Three in-game days take 54 real minutes. The Bombers' Notebook tracks 20 people and shows when each of them is available. Masks, songs and upgrades survive the reset; quests don't ([Wikipedia](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask)).
- The cycle began as a week and was cut to three days because repeating a week felt like too much ([Nintendo Life on Iwata Asks](https://www.nintendolife.com/news/2015/02/iwata_asks_returns_for_the_legend_of_zelda_majoras_mask_3d)).
- The time pressure put some critics off; one "nearly abandoned the game". The 3DS remake added permanent saves and worked from Eiji Aonuma's list of unreasonable moments in the original ([3DS remake](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask_3D)).

For us: a notebook of people, their schedules and open leads, a short loop, and ways to skip dead time.

### Fire Emblem: Three Houses

- One chapter a month: lessons during the week, a free day at the end, and a mission at the end of the month ([Calendar](https://fireemblemwiki.org/wiki/Calendar)). The activity points you get on a free day grow from 1 at the lowest teaching level to 10 at the highest ([Professor level](https://fireemblemwiki.org/wiki/Professor_level)).
- Support ranks: C at 101 points, B at 301, A at 601. A shared meal gives 10 to 30, tea 5 to 30, choir 30, so C takes 4 to 10 meals (derived; [Support](https://fireemblemwiki.org/wiki/Support)).
- The social side went through "multiple unsatisfactory builds" until someone suggested the calendar and activity points ([Wikipedia](https://en.wikipedia.org/wiki/Fire_Emblem:_Three_Houses)).

For us: a daily budget that grows as you rise in the company, and a monthly mission as the rhythm.

### Boku no Natsuyasumi, Tokimeki Memorial, Princess Maker 2

- Boku no Natsuyasumi covers the 31 days of August 1975. The clock moves when you walk from one screen to the next. Each day has fixed points (morning exercises, breakfast, dinner at 17:00, bed at 22:00) and ends with an entry in a picture diary ([Wikipedia](https://en.wikipedia.org/wiki/Boku_no_Natsuyasumi), [ja.wikipedia](https://ja.wikipedia.org/wiki/ぼくのなつやすみ)).
- Tokimeki Memorial covers three school years in 5 to 10 hours, planned a week at a time. Its autumn school festival branches into 1,497 patterns and uses about 40% of the game's text, so one set piece pays off many earlier choices ([ja.wikipedia](https://ja.wikipedia.org/wiki/ときめきメモリアル)). I couldn't confirm the details of its "bomb" for neglected girls.
- Princess Maker 2 splits each month into three periods (about 288 decisions over eight years) and has 74 endings. It was criticised for a routine of training and rest ([Wikipedia](https://en.wikipedia.org/wiki/Princess_Maker_2)).

For us: time that moves as you walk, a diary as the ritual at the end of the day, a season with a known end, and set pieces that pay off earlier choices.

## 4. Work loops and runs

### Recettear

- A day has four slots (morning, afternoon, evening, night). A dungeon trip uses two slots plus one to get back ([wiki](https://recettear.fandom.com/wiki/Time_Management), search extract; [guide](https://www.writeups.org/recettear-strategy-guide-tips/)).
- The 820,000 pix debt is paid in five weekly bills: 10,000 on day 8, 30,000 on day 15, 80,000 on day 22, 200,000 on day 29 and 500,000 on day 36, each about two and a half to three times the last ([Steam thread](https://steamcommunity.com/app/70400/discussions/0/864975632524481659/)).
- Missing a bill sends you back to day 2 with your items and merchant level ([wiki](https://recettear.fandom.com/wiki/New_Game_%2B), search extract). Siliconera: "you just start at the beginning of the month with everything you had still intact" ([Siliconera](https://www.siliconera.com/recettear-playtest-run-your-own-item-shop/)). Merchant level opens item fusion at 5 and the first shop expansion at 12 ([wiki](https://recettear.fandom.com/wiki/Merchant_Level), search extract).

For us: a weekly goal you can see coming that grows each week, and failure that keeps your progress.

### Moonlighter

- Time moves only when you sleep, open the shop, or enter or leave a dungeon ([Steam](https://steamcommunity.com/app/606150/discussions/0/3335371283878678399/)).
- Customers react to a price in four ways, and a notebook records which price caused which reaction, so you learn prices by watching people ([analysis](https://www.cmshymansky.com/MoonlighterBayesianBanditsPricing/), [Siliconera](https://www.siliconera.com/moonlighter-gouging-customers-just-right/)).
- The director wanted players to "think about the shop when they were in the dungeons and vice versa" ([MCV](https://mcvuk.com/development-news/when-we-made-moonlighter/)). Reviewers found the pricing rote after a while and the story thin ([Gaming Trend](https://gamingtrend.com/reviews/the-daily-grind-moonlighter-review/)).

For us: learning from how people react, kept in a log (people reacting to your Japanese), and two halves of the day that feed each other.

### Hades

- A run takes 20 to 45 minutes, and the story lives in the house you return to after each death ([estimate](https://thelockoftime.world/blog/how-long-to-beat-hades)).
- Each character has pools of lines, and each line has conditions (what you've seen, who you've met, how you died). Lines are picked by priority and weight; when several story events qualify, the highest plays and the rest wait, and general lines fill the gaps ([analysis](https://www.christi-kerr.com/post/how-the-dialogue-system-in-hades-rewards-failure), [GeekDad](https://geekdad.com/2019/10/narrative-and-early-access-supergiants-greg-kasavin-discusses-hades-development/)). There are over 300,000 words and about 21,000 voiced lines ([Cultured Vultures](https://culturedvultures.com/supergiant-hades-word-count-dialogue/)). Greg Kasavin: "before any of it repeats, you would have to have looped through the game like 20 or 30 times".
- The goal was "to take the pain out of dying and having to restart" ([Game Developer](https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death)). There are no login bonuses; players return "only for intrinsic reasons such as wanting to see more of the story" ([Vice](https://www.vice.com/en/article/how-hades-made-a-genre-known-for-being-impossibly-hard-accessible/)).
- Relationships: the first bottle of nectar you give someone returns a keepsake, and after five or six, the next step waits behind a favour for that character ([Fextralife](https://hades.wiki.fextralife.com/Nectar)). The credits need 10 escapes.

For us: a new line every time you come back, a relationship step that waits behind a favour (for us, a request in Japanese), and failure that moves the story on.

### Dave the Diver

- A day is two dives and a sushi service, 30 to 60 minutes ([estimate](https://delayedrespawnse.com/blog/dave-the-diver-what-to-prioritize-in-30-to-60-minutes/)).
- The director: "throwing in a minigame when the fun starts to drop acts as a refresh", but "if you just keep throwing things in, you end up with a random collection of minigames, so pacing becomes crucial" ([Inven](https://www.invenglobal.com/articles/22913/mintrocket-head-hwang-jae-ho-dave-the-diver-in-the-jungle-dlc-will-offer-a-different-gameplay-experience-from-the-main-game), [Automaton](https://automaton-media.com/en/interviews/dave-the-divers-in-the-jungle-expansion-is-basically-dave-the-diver-1-7-says-director-even-players-who-usually-skip-dlc-should-give-it-a/)). Players complained about constant tutorials and story that interrupted play ([Steam reviews](https://steamcommunity.com/app/1868140/negativereviews/?l=english)).

For us: a new activity when the fun dips, as long as it doesn't push the core aside.

### Graveyard Keeper, Cozy Grove, Atelier, Spiritfarer

- Graveyard Keeper has a six-day week in which each important character is around on one day only. Missing one costs a week, 45 to 54 real minutes: "You have to wait up to 6 days for an NPC to return sometimes" ([Steam](https://steamcommunity.com/app/599140/discussions/0/594024287509182488/)).
- Cozy Grove runs on real days with a daily ration of story. One player took 66 days to see the credits, and playing more each day didn't get there faster ([Steam reviews](https://steamcommunity.com/app/1458100/negativereviews/?l=english&browsefilter=toprated)).
- Atelier Rorona gave you 12 assignments over three years, and failing one ended the game; GameSpot said the "confining deadlines… undermine the fun". Sophie dropped the limits, later games mostly kept them off, and Ryza became the series' best seller, though that's only a correlation ([series](https://en.wikipedia.org/wiki/Atelier_(video_game_series)), [Rorona](https://en.wikipedia.org/wiki/Atelier_Rorona:_The_Alchemist_of_Arland)).
- Spiritfarer is 94% positive out of 18,895 reviews, and the common complaint is "blind & tedious grinding to get to the next emotional high point" ([Steam](https://store.steampowered.com/app/972660/), [reviews](https://steamcommunity.com/app/972660/negativereviews/?l=english&browsefilter=toprated)).

## 5. Games where knowledge is the progress

- Outer Wilds: a 22-minute loop in which only the ship's log survives. Learning is the only progress, and the log is an evidence board of what you know and what's still open ([Wikipedia](https://en.wikipedia.org/wiki/Outer_Wilds)).
- Return of the Obra Dinn: 60 fates, confirmed only in sets of three ([Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)).
- Heaven's Vault: over 1,000 words of an invented language. Your translations are guesses the story uses, and they get confirmed the way a crossword does: "you only found out you got it wrong at the moment you got it right" ([devblog](https://heavens-vault-game.tumblr.com/post/163140143360/getting-things-wrong)). A review quoted by the studio: "I can't over emphasise how wonderful it is when you begin to recognise words without the game helping you" ([inkle](https://www.inklestudios.com/heavensvault/)).
- Chants of Sennaar: the meaning you guess for a glyph shows above it the next time you see it, and a notebook page confirms a group once all its matches are right. The designer starts "with the simplest (basic, concrete, easily identifiable) words" ([Wikipedia](https://en.wikipedia.org/wiki/Chants_of_Sennaar), [Game Developer](https://www.gamedeveloper.com/design/deep-dive-the-visual-tapestry-of-i-chants-of-sennaar-i-)).

Our notebook, gates and rule unlocks already work this way. Two things to add: confirming in groups (a rule clicks after a few examples, which the karaoke already does), and a moment that shows him he recognised something without help.

## 6. Adult RPGs

Structure only. Several well-known titles were left out because we couldn't confirm that every character in their scenes is an adult (VNDB tags or the games' own descriptions raised doubts): the Rance games, Dohna Dohna, Evenicle, Kamidori Alchemy Meister, Monster Girl Quest Paradox, Summer Memories, Brave Alchemist Colette, Holy Knight Ricca, Summertime Saga and Lessons in Love. Steam review figures were read from Steam's review API on 2026-09-26 and cover all languages.

### Karryn's Prison (Remtairy, 2021)

- 95.5% positive out of 4,547 reviews ([Steam](https://store.steampowered.com/appreviews/1619750?json=1&language=all&purchase_type=all&num_per_page=0)). About 17 hours for the main story ([ITAD/HLTB](https://isthereanydeal.com/game/karryns-prison/info/)); the store says 100 to 200 hours or more to see every ending and title.
- A day runs through the office (edicts that repair areas, keep order and open functions), patrols, side jobs, and sleep. The prison has five levels, each ending in a boss ([guide](https://gamepretty.com/karryns-prison-empress-ending-general-tips/)).
- Every adult scene happens inside the battle system, so the reward track and the combat track are the same thing. Willpower and desire are opposing meters, and desire has to pass thresholds before certain things can happen ([guide](https://gameplay.tips/guides/karryns-prison-masochistic-journey-guide.html)).
- Over 400 passives unlock from counters: the first time something happens, or after 5 or 25 times. They change her stats, her thresholds and her skills ([passives list](https://gameplay.tips/guides/karryns-prison-ultimate-passives-list.html)). The art is almost 10,000 pieces put together according to her current state ([dev post](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1619750&count=1&maxlength=0&enddate=1639008000)).
- Resisting is a real route: one ending needs her desire kept low ([guide](https://gamepretty.com/karryns-prison-empress-ending-general-tips/)).
- The developer removed a choice players always made even when it wasn't the fun one (the longest side-job shift) and a memorising chore ([patch notes](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1619750&count=1&maxlength=0&enddate=1670803200)). Negative reviews mention grind and using cheats to skip it, and players keep their own trackers for titles and passives.

### Kagura Games: Fallen ~Makina and the City of Ruins~ and Treasure Hunter Claire

- Fallen Makina (2018): 84.7% positive out of 2,012 reviews, about 7 hours ([Steam](https://store.steampowered.com/appreviews/791330?json=1&language=all&purchase_type=all&num_per_page=0), [ITAD](https://isthereanydeal.com/game/fallen-makina-and-the-city-of-ruins/info/)). A hub city and ruins cleared floor by floor, with a quick-levelling shop and teleports to cut grinding. A depravity stat rises through story events. The recollection room is a place in the game that tells you how to unlock each scene, and after the story a lever opens all of them. Endings return you to just before the ending, so one save sees them all ([walkthrough](https://gameplay.tips/guides/2275-fallen-makina-and-the-city-of-ruins.html)).
- Treasure Hunter Claire (2018): 88.3% positive out of 2,377, about 12 hours ([Steam](https://store.steampowered.com/appreviews/828070?json=1&language=all&purchase_type=all&num_per_page=0)). The heroine's shyness stat is also her power, so the lewd track is a build choice with a combat payoff ([store reviews](https://www.kaguragames.com/product/treasure-hunter-claire/)).

### HuniePop 1 and 2

- 95.6% positive out of 31,669 (HuniePop) and 91.1% out of 9,397 (HuniePop 2) ([Steam](https://store.steampowered.com/appreviews/339800?json=1&language=all&purchase_type=all&num_per_page=0), [Steam 2](https://store.steampowered.com/appreviews/930210?json=1&language=all&purchase_type=all&num_per_page=0)).
- The day has four time slots. A date is a match-3 puzzle with 20 moves. Three successful day dates open a night date. Each success pays a photo, four per girl ([wiki](https://huniepop.miraheze.org/wiki/Date), [Wikipedia](https://en.wikipedia.org/wiki/HuniePop)). Over the 9-hour main game that's about one photo every 15 to 20 minutes (derived).
- HuniePop 2 adds a new complication after each bonus round, and you can nap to jump to the time slot you want ([guide](https://gameplay.tips/guides/9789-huniepop-2-double-date.html), [Locations](https://huniepop.miraheze.org/wiki/Locations)). Hardcore Gamer called the first "a shockingly good puzzle game".

### Crush Crush and Blush Blush (Sad Panda Studios)

- Crush Crush: 88.8% positive out of 28,555 and over 10 million downloads ([Steam](https://store.steampowered.com/appreviews/459820?json=1&language=all&purchase_type=all&num_per_page=0), [publisher](https://www.phoenixgames.com/our-studios/sad-panda-studios/)). An idle game: jobs earn money, hobbies raise stats, gifts and dates raise affection, and progress continues while you're away.
- Nine named tiers per girl: Adversary, Nuisance, Frenemy (gifts open), Friendzoned (dates open, first photo), Awkward Besties, Crush, Sweetheart (photo), Girlfriend, Lover (photo). Eight photos per girl, four from tiers and four from the first date of each type ([wiki](https://crush-crush.fandom.com/wiki/Relationship_Levels), search extract). About one photo per 28 minutes of logged time (derived, and idle time inflates it).
- In Blush Blush each guy starts as a cursed animal and becomes human through the relationship, so the character himself is the progress bar ([wiki](https://transformation.miraheze.org/wiki/Blush_Blush)).

### Treasure of Nadia (NLT Media, 2022)

- 92.9% positive out of 6,564, about 31 hours ([Steam](https://store.steampowered.com/appreviews/1737100?json=1&language=all&purchase_type=all&num_per_page=0)). Explore an island, dig up relics, sell them, solve temple puzzles, upgrade the house.
- Negative reviews: "85% of their time running back and forth", items released "in separate batches at specific times", and no fast travel ([reviews](https://store.steampowered.com/appreviews/1737100?json=1&language=english&review_type=negative&filter=all&num_per_page=50&purchase_type=all)).

### Last Evil and Subverse

- Last Evil (2020): 94.0% positive out of 3,662. A deckbuilder in which lust is a resource that carries over between fights. 30 or more scenes over about 13 hours, one every 25 minutes or so (derived). Its main complaint is that it's too short ([Steam](https://store.steampowered.com/appreviews/823910?json=1&language=all&purchase_type=all&num_per_page=0)).
- Subverse (2024) is the counterexample: 66.8% positive out of 16,082, with 239 scenes over 20 or more hours, one every 5 minutes (derived). Despite all those scenes, players found the loop too repetitive to replay ([Steam](https://store.steampowered.com/appreviews/1034140?json=1&language=all&purchase_type=all&num_per_page=0)).

### What the well-reviewed ones share

1. The reward comes out of the main loop. Karryn's scenes happen in her battles, HuniePop pays a photo per puzzle won, and Daily Lives puts a story scene at every relationship stage. Without the art there's still a game.
2. Rewards change the game state: passives change stats, Claire's shyness is her power, and HuniePop 2 adds a complication after each reward.
3. Meters are visible and thresholds are named, so the distance to the next step is always known: desire gauges, depravity 60 and 70, nine named tiers, Daily Lives' stages.
4. Long ladders of small steps, with the biggest reward last.
5. Resisting is a real choice with its own ending, which gives the rewards weight.
6. The character shows the progress: Blush Blush's animals turning human, Karryn's layered art.
7. The gallery is a place in the world and tells you how to fill it (Makina's room, Daily Lives' dream).
8. Branches don't cost time: endings rewind, and everything opens after the story.
9. Friction gets patched out: the dull dominant choice, the memorising chore, HuniePop 2's nap.
10. Difficulty is separate from content: Karryn's easiest mode includes cheats.

## 7. Short sessions and hooks

### How long a session is

- Mobile benchmarks from GameAnalytics (2025 data, 16,000 games): the median session is about 3 minutes, 3.8 sessions a day, about 12 minutes a day. The top 10% of games have sessions of about 8 minutes, 9.6 a day ([GameAnalytics](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)). A 10 to 15 minute train ride is three or four median sessions in a row.
- Successful games size one unit of play to fit: a Clash Royale battle is 3 minutes plus up to 2 of overtime ([wiki](https://clashroyale.fandom.com/wiki/Basics_of_Battle)); Into the Breach battles last about five turns, and its designers cut FTL's two-to-three-hour commitment by letting players choose how many islands to play ([Game Developer](https://www.gamedeveloper.com/business/how-subset-games-made-the-jump-from-i-ftl-i-to-i-into-the-breach-i-)); Wordle asks for "three minutes a day, and that's it" ([Kotaku](https://kotaku.com/wordle-creator-doesnt-want-his-popular-game-to-take-ove-1848316642)).
- Adam Telfer on session design: get the player back to the good part in a few taps, show where things stand on return, no difficulty spike after a break, exits between levels. "If your game can't adapt to a player's life then a player won't adapt their life to play your game." He prefers rewards that taper with more play over hard caps ([Easy In, Easy Out](https://mobilefreetoplay.com/mobile-session-design/), [Flexible Sessions](https://mobilefreetoplay.com/mobile-session-design-flexible-sessions-2/)).
- Phones kill suspended apps at any time. Godot's docs say to save on the pause notification, and iOS gives about 5 seconds ([Godot](https://docs.godotengine.org/en/stable/tutorials/inputs/handling_quit_requests.html)).
- Dan Cook separates loops, which get better as you practise them, from arcs, which are used up once seen; games built mostly on arcs end up on a "content treadmill" ([Loops and Arcs](https://lostgarden.com/2012/04/30/loops-and-arcs/)).

### Streaks

What Duolingo has published:
- A 7-day streak made a learner 2.4 times as likely to come back the next day (2020), and 3.6 times as likely to finish the course (2022). When one lesson became enough to keep a streak, 14-day retention rose 3.3% ([2020](https://blog.duolingo.com/improving-the-streak), [2022](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).
- Weekend Amulet users were 4% more likely to return a week later, and "learners who binge on Duolingo lessons were much more likely to abandon the app" ([2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)).
- In June 2026, 15.4 million people restored a lost streak of 30 days or more by doing three lessons in one sitting ([report](https://dontburythelede.substack.com/p/duolingo-brought-back-154-million)).

The criticism:
- An intact streak in a log makes people more likely to continue (66% against 58% after a break), and the authors trace the effect to how the log displays the behaviour. It's stronger when people blame themselves for a break. Almost half would watch an ad to keep or repair a streak. The authors advise not showing broken streaks, using weekly streaks, and allowing repair ([Silverman and Barasch 2023](https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414)).
- Duolingo's own numbers show the streak rewards showing up, even for a trivial lesson. Critics describe streaks as "sources of anxiety and shame" ([UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)).
- Expected tangible rewards for simply doing a task reduce people's own motivation for it (d = -0.40 across 128 studies), and positive feedback raises it (d = 0.33) ([Deci, Koestner and Ryan 1999](https://doi.org/10.1037/0033-2909.125.6.627)).

### Hooks that reward coming back

- World of Warcraft's rested XP: while you're away you bank a bonus (10% of a level per 16 hours at an inn, up to 150% of a level) that doubles the experience from kills. The story goes that beta testers hated a penalty for playing too long, and the same numbers were turned into a bonus for resting ([wiki](https://warcraft.wiki.gg/wiki/Rest), [Psychology of Games](https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/)).
- Hearthstone holds up to three daily quests, and a new one arrives only when there's room, so missing two days costs nothing ([wiki](https://hearthstone.wiki.gg/wiki/Quest)).
- Appointment mechanics punish absence: FarmVille's crops withered at 2.5 times their growing time, with a paid "unwither", and Jonathan Blow said it was "designed to create an atmosphere of negativity" ([Wikipedia](https://en.wikipedia.org/wiki/FarmVille)).
- An open task: a 2025 meta-analysis found no memory advantage for unfinished tasks, but a general tendency to go back to them ([Ghibellini and Meier](https://doi.org/10.1057/s41599-025-05000-w)). Curiosity before an answer predicted better recall a week or two later ([Kang 2009](https://doi.org/10.1111/j.1467-9280.2009.02402.x)).
- A known next reward: people bought coffee faster as a free one came closer, and a 12-stamp card with two stamps already filled was finished faster than a 10-stamp card ([Kivetz 2006](https://doi.org/10.1509/jmkr.43.1.39), [Nunes and Drèze 2006](https://doi.org/10.1086/500480)).
- Self-determination theory: in games, feeling free to choose and feeling competent predicted enjoyment, and with other players, feeling connected did too ([Ryan, Rigby and Przybylski 2006](https://link.springer.com/article/10.1007/s11031-006-9051-8)).

## 8. Spacing and repetition inside a game

- The best gap between two practices depends on how long you want to remember. For a test a week away it's about 20% of that time; for a year, 5 to 10%. A gap that's too long costs less than one that's too short ([Cepeda et al. 2008](https://doi.org/10.1111/j.1467-9280.2008.02209.x), [2006](https://doi.org/10.1037/0033-2909.132.3.354)).
- Waiting a little before the first test helped long-term memory most; the later gaps mattered less ([Karpicke and Roediger 2007](https://doi.org/10.1037/0278-7393.33.4.704)). For vocabulary, growing gaps and even gaps tied after 8 weeks, and growing gaps kept recall higher along the way ([Kang et al. 2014](https://doi.org/10.3758/s13423-014-0636-z)).
- Recalling beats rereading after a delay ([Roediger and Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x)). Once a word could be recalled, more study did nothing for later recall and more testing helped a lot ([Karpicke and Roediger 2008](https://doi.org/10.1126/science.1152408)).
- Mixing types of practice scored 61% against 38% for practising one type at a time in a preregistered study of 54 classes ([Rohrer et al. 2020](https://doi.org/10.1037/edu0000367)).
- A target of about 85% success is a useful heuristic for training difficulty ([Wilson et al. 2019](https://doi.org/10.1038/s41467-019-12552-4)).
- Vocabulary: after about ten meetings in context, "sizeable learning gains may occur", and full knowledge of a word takes more ([Webb 2007](https://eric.ed.gov/?id=EJ757328)). Across 26 studies, repetition correlates with incidental word learning at r = .34, and spacing changes the effect ([Uchihara, Webb and Yanagisawa 2019](https://doi.org/10.1111/lang.12343)).
- Producing a word is harder than recognising it ([Laufer and Goldstein 2004](https://doi.org/10.1111/j.0023-8333.2004.00260.x)); if only one way is used, productive practice may teach more ([Webb 2009](https://doi.org/10.1177/0033688209343854)); generating an item beats reading it (d = .40 over 86 studies, [Bertsch et al.](https://doi.org/10.3758/BF03193441)). One caution: making learners write sentences with brand-new words "can inhibit word form learning" ([Barcroft 2004](https://doi.org/10.1191/0267658304sr233oa)), so a new word should first go into a known frame.
- Schedules in use: Pimsleur (5 s, 25 s, 2 min, 10 min, 1 h, 5 h, 1 d, 5 d, 25 d, 4 months, 2 years), SM-2 (1 day, 6 days, then times 2.5), WaniKani (4 h, 8 h, 1 d, 2 d, 1 wk, 2 wk, 1 month, 4 months), and FSRS, which Anki uses with a default target of 90% recall ([SuperMemo history](https://supermemo.guru/wiki/History_of_the_optimization_of_repetition_spacing), [WaniKani](https://knowledge.wanikani.com/wanikani/srs-stages/), [Anki](https://docs.ankiweb.net/deck-options.html)). Duolingo's half-life regression predicted recall with 45% less error than the older methods and raised daily engagement 12% in a live test ([Settles and Meeder 2016](https://doi.org/10.18653/v1/P16-1174)).
- Learning inside the core mechanic: children learned more from the version of Zombie Division where the maths was the core mechanic, and given free choice they played it seven times longer ([Habgood and Ainsworth 2011](https://doi.org/10.1080/10508406.2010.508029)). In a meta-analysis of game-based vocabulary learning, results varied with game design, and adventure games did better ([Chen et al. 2018](https://doi.org/10.1111/bjet.12526)).

## 9. Patterns across the good games

1. One day is one sitting. Stardew 14 minutes, Fields of Mistria 12.5, Persona 4 Golden about 12, Graveyard Keeper 7.5 to 9, Persona 5 Royal about 20 (derived).
2. The clock waits for the player. Daily Lives moves time only when an action ends, Moonlighter only on sleep and doors, Boku no Natsuyasumi on walking between screens, and Stardew stops the clock in dialogue and menus.
3. There's more to do than time to do it. "Never enough time in a single Stardew day"; about 69% of Persona 5 Royal's calendar is free and still not enough; Daily Lives has six or seven slots a day and dozens of open steps. Because time runs short, every choice costs something else.
4. Relationship steps are small, steady and visible: 250 points a heart in Stardew, 10 more affection per stage in Daily Lives, 20 to 67 points a rank in Persona 5 Royal, 101 points for a C support in Three Houses.
5. There's a scene at regular steps and a bigger one every other step: events at every second heart in Stardew and Fields of Mistria, an illustrated scene every two or three stages in Daily Lives, photos at four of nine tiers in Crush Crush.
6. Rewards change the game: time given back (Persona's teacher), stats (Karryn's passives), places (Community Center rooms), a bigger daily budget (Three Houses' activity points).
7. New systems arrive every one to three days in the first week, then bigger goals take over: Stardew (days 2 and 5), Fields of Mistria (days 1, 2, 4, 5, 6), Animal Crossing (days 2 to 13), Daily Lives (the second hub on day 5).
8. Weekdays have characters: Daily Lives' Friday, Stardew's cart and TV days, Fields of Mistria's Friday inn and weekend dates, Persona's weekday confidants.
9. A main beat about once a month: Persona 3's full moons, Persona 5's 19 to 26-day windows, Three Houses' monthly mission, Daily Lives' monthly holidays; plus a festival every 9 or 10 days in Stardew and Rune Factory.
10. Routines grow. Daily Lives' dinner gains options, Hades gives a new line on every return, and Rune Factory spaces town events a day or two apart.
11. Failure continues the story: Hades' deaths, Recettear's restart that keeps your items, Daily Lives' F on the test, Heaven's Vault's wrong translations.
12. The day ends with a ritual and a look at tomorrow: Stardew's overnight tally and forecast, Boku no Natsuyasumi's diary, Persona's evening texts, Daily Lives' TV forecast.
13. What you know is the progress, kept in a log: Outer Wilds' ship log, Chants of Sennaar's notebook, the Bombers' Notebook.
14. Schedules and hints live in the world: the Bombers' Notebook, Daily Lives' markers and hero-voice hints, Makina's gallery that says how to unlock each scene.

## 10. Traps

1. Energy crunches and days that feel too short: Stardew's early game, one review of Fields of Mistria.
2. Losing progress when you stop: Stardew saves only at night.
3. Waiting for the right day or the right person: Graveyard Keeper's six-day wait, Daily Lives' conditions hidden in other characters' stories.
4. Real-time locks: Animal Crossing's slow start, Cozy Grove's 66 days to the credits however much you play.
5. Deadlines with a game over: Atelier Rorona, Persona's missed deadlines, Majora's Mask's time pressure. The GUIDE already rules out stressful deadlines.
6. Slow openings heavy with tutorials: Persona's "month of cutscenes", Spiritfarer's two to three hours before the game opens up, Dave the Diver's constant tutorials.
7. Relationships run on gifts: Stardew's spouse "that you feed with presents".
8. A late game with nothing to do: Stardew after year two, Moonlighter's pricing once it's worked out.
9. Busywork between the good parts: Spiritfarer's "blind & tedious grinding", Treasure of Nadia's running back and forth, the grind Karryn's players skip with cheats, the cheat menu built into Daily Lives' phone.
10. Rewards in place of a loop: Subverse's 239 scenes didn't save it.
11. Unlock conditions nobody can see, so players turn to trackers and guides: Karryn's titles, Persona's perfect schedules, Daily Lives' phone checklist.
12. Too many characters: Daily Lives' 36 meters, Coral Island's 70 characters.
13. Loss framing: streaks that shame a break, FarmVille's withering crops.
14. Content you can lose forever: Back to Nature's rivals marrying, Persona 3's broken links.
15. Minigames that dilute the core: Dave the Diver's "random collection of minigames".

## 11. A proposal for Amakawa

This builds on direction 1 in notes/directions.md (a year on the island), on the slice plan, and most of all on Daily Lives of My Countryside. Every number is a starting point for playtests.

### 11.1 The clock and the day

Time moves only when you finish something, as in Daily Lives, and never while you read, type or look at the phone. The slice plan already says this. A weekday has five slots:

| Slot | Clock | What happens | Minutes at his level |
|---|---|---|---|
| Morning | 8:00 to 9:00 | The dorm and the phone (one to three messages, the board with up to three requests, the weather), the walk in, Ishibashi at the gate, the lift | 1.5 |
| Work 1 | 9:00 to 12:00 | One request from the board: a machine or a person to deal with. The day's main knowledge gate is here | 3 to 4 |
| Lunch | 12:00 to 13:00 | The canteen: choose who to sit with (a relationship step) and read Kaori's menu | 1.5 to 2 |
| Work 2 | 13:00 to 18:00 | A second request, an optional gate, or somewhere new to explore | 3 to 4 |
| After work | 18:00 to 22:00 | One choice: a person, a club or minigame, the bar, or an early night. Then the dorm: the day page, a save, and a message about tomorrow | 2 to 4 |

That's 11 to 16 minutes, one train ride, built from loops of 2 to 4 minutes that each end at a safe place to stop. A weekend day has three free slots (morning, afternoon, evening) and no board. At home the day is the same, and a session just runs longer: two to four days, longer evening scenes, and private mode.

The limit is the slots. The board holds three requests and the day has two work slots; the day has two free slots and more people than that. You can't see everyone every day, which is what gives the lunch and evening choices weight. A request that waits never fails: the person asks again tomorrow, or someone else does it and you miss that reward.

Commands cost nothing. Every command typed is practice, and an energy bar would ration the thing the game most wants him to do. (Direction 1 in directions.md made casting cost "voice", an energy for the day; this proposal drops that.) The cost of the magic is being seen: eye markers, the suspicion count, the camera. Daily Lives does the same with its energy bar, which never touches people.

The game saves after every slot and when the phone pauses the app, so a ride that ends in the middle of the day loses nothing.

### 11.2 What every 10 to 15 minute session contains

1. At least one gate passed with a sentence he wrote himself, or a word used alone for the first time. The notebook shows the tick.
2. At least one relationship step he can see on the phone.
3. One new thing: a word, a form, a place, a photo or an item, or an old word used a new way.
4. Two to four words that are due for review, placed inside the day's lines, requests and signs.
5. The day page: what moved, counted up the way Stardew's overnight screen does, and one line about tomorrow.

No streaks, no timers, no daily login rewards, and nothing decays or rots while he's away. The calendar shows the days he played without ever showing a break. Coming back after a gap earns a small bonus (section 11.7).

### 11.3 The week

| Day | What makes it different |
|---|---|
| Monday | 朝礼, the morning meeting, and the week's project on the board, such as bringing one room of the basement back |
| Tuesday | An ordinary day |
| Wednesday | ノー残業デー, a no-overtime day as many Japanese firms have. Work ends early, which gives an extra evening slot for clubs and people |
| Thursday | An ordinary day |
| Friday | 週報, the weekly report to Emi, then the bar or a team night out |
| Saturday and Sunday | Free days with three slots each: outings, dates, minigames. Sunday night brings a message about the week ahead |

Friday's report is the weekly check, built like Daily Lives' Friday test. Emi asks about three things from the week. He answers by doing (handing over the right document, pointing at the right photo) or with a short sentence. A good report and a poor one both lead to scenes: praise and a small bonus, or Emi helping and a different conversation, with those words coming back the next week.

People keep weekly habits, as in Persona and Daily Lives (for example Mio at the arcade on Thursdays, and Rei in the lift every morning), and the phone shows them, like the Bombers' Notebook. Nobody can be met on one day of the week only.

With three train days a week plus sessions at home, he'll play about five to seven sessions a week, so the game's week roughly keeps pace with his.

### 11.4 The first month

The company year starts on 1 April, as at most Japanese firms, whose accounts follow the April to March fiscal year ([Wikipedia](https://en.wikipedia.org/wiki/Fiscal_year)). Golden Week (29 April to 5 May, [Wikipedia](https://en.wikipedia.org/wiki/Golden_Week_(Japan))) closes the first month with a holiday. Day 1 is Monday 1 April in the game's calendar.

| When | New system | New place | New people | Grammar |
|---|---|---|---|---|
| Day 1 | The command bar, catching words, the notebook, the eye, the rule unlock, the day page | Plaza, lobby, lift, B2, karaoke, dorm | Emi, Mio, Rei, Ishibashi | The command form; を with a counter; 〜をください; 歌って as a request |
| Day 2 | The request board and the first daily routine (the coffee maker) | Canteen, kitchenette | Kaori | A command made from a new verb (入れろ); casual て requests |
| Day 3 | The lunch choice and the contacts page with relationship steps | Rooftop garden | Goro | Practice, nothing new |
| Day 4 | Markers over people who have something for you | The Sales floor | Rei's team | 〜てください to seniors and staff |
| Day 5 | The weekly report; the bar | The bar | Jun | 〜な in use, learned from the song on day 1: 閉まるな keeps a door open |
| Days 6 and 7 | Free weekend slots; yen and shops; the first level-2 pictures | Shopping street, the beach | Tsubasa or Kanae | Practice, nothing new |
| Week 2 | The team's hanami after work (the new hire holds the spot from morning), with its event picture | The park | One more | 〜よう, let's: group commands (みんな、動こう wakes a whole room) |
| Week 3 | The first dates at the weekend; calligraphy with Sumi (a kanji switches from kana to kanji everywhere) | Calligraphy room | Sumi | 〜ない？ and 〜ませんか, invitations |
| Week 4 | Automation; the month-end review and the first step up in rank | An upper floor | Someone from upstairs | 〜たら: 朝になったら、動け starts a machine by itself every morning |
| Golden Week | Holiday trips, the first big event pictures | Onsen or beach | | No new form: a review week |

The pace follows the research: something new every day in the first week (Stardew, Fields of Mistria), then one form and one or two places a week. The first free choices come on day 2 (the board) and day 3 (lunch), where Persona 5 Royal waits until day 10. Each form arrives with a place or event that needs it, and each form changes what every verb he owns can do, the way the karaoke's rule does on day 1. Automation in week 4 is the sprinkler of this game: machines he has mastered start doing their jobs by themselves, requests drop off the board, and he gets time back.

Cast: about ten named people by the end of the month, with five deep ladders (Emi, Mio, Rei, and two of Kaori, Tsubasa and Kanae) and the rest light (Ishibashi, Goro, Jun, Sumi). After that, at most one new deep ladder a month. Daily Lives' 36 meters are the warning.

### 11.5 Rewards

What the references cost:

| Game | One step | What it takes |
|---|---|---|
| Stardew Valley | A heart (250 points) | About a week of daily talk plus two loved gifts; an event every second heart |
| Persona 5 Royal | A rank (20 to 67 points) | One meeting when you play well |
| Fire Emblem: Three Houses | A C support (101 points) | 4 to 10 shared meals |
| Fields of Mistria | Level 8 | About 42 days |
| Daily Lives | A stage (10 more affection) | Two to four actions over one to three days; an illustrated scene every two or three stages |
| HuniePop | A photo | One won date, about 15 to 20 minutes (derived) |
| Crush Crush | A photo | About 28 minutes of logged time (derived) |
| Subverse | A scene | About 5 minutes (derived), and it didn't help |

For Amakawa:
- Every session: at least one relationship step, one or two small rewards (a message, a new option in a routine, an outfit, a photo, a place), one notebook tick, and the day page.
- A relationship has ten levels. Levels 1 to 5 take two or three meetings each, and levels 6 to 10 take three to five. A meeting is a lunch or an evening slot with that person, or a request done for them (as in Potion Permit and Rune Factory). Level 6 and up also wait for the story (from month 2), and level 9 and up for later months, so relationships last the year.
- Every level has a short scene. Levels 2, 4, 6, 8 and 10 have a reward picture. From level 4 up, each picture has a private version that gets bolder with the level, within the GUIDE's line. Emi's stay warm and romantic.
- Set pieces (the karaoke, the hanami, Golden Week, the summer festival) have event pictures of their own.
- Pictures earned on the train show as a locked card in the phone's album, marked for home. At home, in private mode, they open. The train earns them and home shows them, which also keeps discreet mode free of anything he has to hide.

How that plays out:
- A player who gives one of his two free slots a day to one person reaches level 2 around day 3 or 4 and level 4 around day 8 to 10.
- A player who spreads his time sees a level-up in most sessions and a reward picture every two or three sessions (30 to 45 minutes of play).
- Private pictures: the first on day 1 (the karaoke photo), then about one every four to six sessions in the first month (the hanami, the first level-4 scenes, Golden Week). That's six to eight in the first 25 to 30 sessions.

Relationships also pay in play, as Persona's confidants do. Some examples: Emi at level 3 takes one request off the board each week, which gives time back. Mio at level 3 teaches tech words, which become new commands. Rei at level 5 brings Sales requests that pay rank. Kaori at level 3 keeps a table for him, so he can sit with two people at one lunch. Ishibashi at level 3 lets him through at night without a check.

### 11.6 Relationship ladders and knowledge

Each main character is a source of one kind of Japanese, as the slice plan says (Mio: tech words and slang; Emi: office phrases; Rei: polite forms). Their ladder asks for it back. Levels 1 and 2 need only points. Levels 3, 5, 7 and 9 each need a Japanese task as well as points, built from words that person has given him at earlier levels. Friendship gives knowledge, and knowledge opens the next step of the friendship.

Examples, for the content team to replace:

| Level | Mio | Rei | Emi |
|---|---|---|---|
| 3 | Ask her something in plain casual Japanese, no keigo | A polite request she accepts (〜てください) | Follow one of her instructions with no help, by doing it |
| 5 | Invite her to the arcade on a Saturday (〜ない？) | Invite her for a drink after work (〜ませんか) | Invite her to dinner |
| 7 | Act on a line of her slang with no help | Get a Sales figure right: numbers and counters | Use office phrases in the right places |
| 9 | A request in her own words | Keep up when she drops into casual speech | Understand a long line of hers at natural speed |

Rules for the ladders:
- The phone shows each person's level, the points to the next, and what the next step needs, in that person's voice. Daily Lives' developer moved to hints in the hero's voice so players could follow their progress without the checklist, and Makina's gallery tells you how to unlock each scene.
- If he can't do the task yet, points still build, and the hints grow as they do at machines: first the notebook lights up the words he owns that fit, then someone nearby says a line with the missing piece, then the chips offer the frame with one gap. A pass with help counts, and the notebook records it as "with help". The best version of a scene (the better photo) needs the sentence done alone, as with the coffee and the karaoke photo in the slice.
- A condition that sits in another person's story shows on both people's pages, so nobody stalls on something they can't see.
- At level 8 he chooses romance or friendship, as in Fields of Mistria. Rewards continue on both paths.
- Nothing decays and nothing can be lost for good.

### 11.7 Story beats and hooks

- Every day has one main-story line (a message, a sighting, a short scene) and ends on something open: a message that night, the day page's last line about tomorrow. People tend to go back to unfinished things.
- One main-story beat per session at most. Beats wait in a queue by priority with a gap of a day or two between them, as in Hades and Rune Factory, so a long session at home doesn't get them all at once and a short one always has one.
- Everyday lines come from pools per character with conditions, Hades style, so he hears a new line most times he passes someone. The due review words go into these lines.
- Weekly: Friday's report moves the closure plot on one step, and Sunday night sets up the week.
- Monthly: a set piece, and a month-end review that can raise his rank (and later his room).
- The year follows the company's quarters (June, September, December, March), with the decision on Planning 7 at the end of the fiscal year on 31 March.
- Deadlines are soft. A missed one changes what happens and never ends the game.

Coming back:
- After two or more real days away, the first meeting with each person counts double, up to their next level, and the team has saved him an easy request. The idea is WoW's rested bonus.
- Requests wait on the board, up to three, as Hearthstone's quests do.
- At most one reminder, if he turns them on, and only about content ("Mio sent you a message").

### 11.8 Spaced review inside the day

The notebook already tracks each word through caught, used with help, used alone, and used alone again on a later day. The research adds these:
- Keep a word in rotation after "used alone again", at growing gaps: later the same session, next session, then about 1, 3, 7, 21 and 60 days. Measure the gaps in real time and in sessions both, and when unsure, wait longer.
- Each morning the day builder picks two to four due words and puts them where the game needs them: a request on the board (he has to produce the word), a line someone says (he has to understand it), a sign or a menu (he has to read it), a machine's routine (a form he has to use).
- Don't ask for a word right after he catches it. The first time he has to use it should come a slot or two later.
- Bring a new word in through a known frame first (the chips offer 「＿を十部出せ」), then the whole sentence, then a new frame.
- Aim for about 85% success by moving the hints earlier or later. A miss moves the word back by one stage only.
- Mix old words with new forms: this week's form on last week's verbs.
- Plan ten or more meetings with each focus word across speech, signs and requests.
- Pick the due words with a memory model per word (FSRS or half-life regression) aimed at about 90% predicted recall.
- Show progress as things he can now do: a machine that runs itself, a word that turns to kanji on every sign. Review counts stay out of sight.
- Never put a timer on typing.

## 12. What to change in the current slice

legacy/island/content/storyboard.md, screen ids as in that file. These are proposals for Jørgen's call.

1. Add a stopping point at the end of the morning, after V02 (about 12 minutes in): an autosave and a short card with what moved. Day 1 runs 24 to 26 minutes, which is two train rides, and each should end with something in hand. Stardew's rule of saving only at night is the trap to avoid.
2. Make relationships visible. The slice plan keeps friendship as hidden numbers. Show a contacts page with levels and a small step when one moves (Mio after the coffee, Emi after 「……もう？」), and put the steps on the day page. Playtest 4 found choices without stakes, and part of that is that their results can't be seen.
3. Make the day-2 morning a sample of a normal day. Day 1 is a special day, and the game lives on the ordinary ones. Put the board in D01 with two requests (Mio's coffee maker and one small request that reuses a day-1 word, such as a few copies to take upstairs) and one free choice before D02. Then the slice tests the loop as well as the opening.
4. Keep D01's coffee maker and treat it as the first daily routine, answering the story editor's flag about repetition. From day 2 it's there every morning and asks a little more each week, until 〜たら automates it in week 4. Repeating a routine with a new twist is how Daily Lives and Stardew work.
5. Show what's still out there. On H02 the album shows the karaoke photo he earned and a locked slot for the one he didn't. The night's messages set up the next reward (Emi mentions the hanami). Makina's gallery and Crush Crush's album do this.
6. Keep the real-time lock on day 2 ("Day 2 opens tomorrow") only as the slice's test of whether he comes back, and leave it out of the game. Animal Crossing and Cozy Grove show what real-time gating does to someone who wants to play longer at home.
7. Lighten the first ten minutes. A02 to C05 teach about eleven new interactions (the phone, help, walking, keeping words, fading words, showing an item, the lift panel, dialogue and replies, the command bar, command results, the eye), with "Other ways" as a twelfth if he gets stuck. Make the card check in G02 happen by itself, which drops one. The rest are small and each is needed where it is.
8. Turn H03's journal into the day page: count up what moved (words used alone, gates, relationship steps, what's running in the basement), then end on one line about tomorrow. This is Stardew's overnight screen and Boku no Natsuyasumi's diary, and it's where "things that were hard became easy" (playtest 4's missing feeling of mastery) gets shown.
9. Treat the lift as Rei's daily routine spot, where each morning brings a new line and later levels bring new options.
10. Add a question to the slice's goals and to the rating card: would he play another normal day like the day-2 morning? Log the minutes each slot takes, so the 12 to 15 minute day can be checked against real play.
