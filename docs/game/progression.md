# Progression

The bible’s [Story timelines](../../bible/#story-timeline) compares character progression by relationship stage and by opening day. It reads the existing character plans, story documents, day-three authored actors and written milestone descriptors, with their distinct implementation states; a scripted milestone is not treated as playable merely because its file exists.

How the game opens up after day 1: which system comes in on which day, what moves the story forward, and how scripted events and free days fit together. Systems and structure only; what happens in the story is Codex's ([collab/PROTOCOL.md](../../collab/PROTOCOL.md)). Nothing here is built unless it says so. What exists today (the clock, bonds, the Words panel, saving, the crowd) is in [systems.md](systems.md).

Jørgen, 2026-10-03:

> "we would want to build out systems gradually from day two. It should gradually be adding more systems like task or ticket management. Maybe in day two, you get your first glimpse at the Windows 95 simple ticketing system with two tickets. We want the story and the game to gradually introduce you to new systems that build over time so that in day three, day four, and the next weeks, you have increasing amounts of freedom to pursue directions you want, like sub-stories relating to various characters, to pursue clubs, like a swimming club or a tennis club, maybe a language or programming club. This is just some ideas to explore subplots, maybe improve your room, upgrade your room, visit the other characters in their homes. Because the main storyline progression should perhaps revolve around the tickets and going to the office. But as this is not a super efficient company, you don't necessarily have to go to the office every day. You don't need to complete the ticket every day. You just use those as levers to progress the story. And some events like the welcome party could be just scripted to certain days or conditions, like the relationship events are also determined by how far you've come into the relationship with the different characters."

## Decisions

Jørgen, 2026-10-03, answering this doc's open questions:

> "Let's keep it simple. There's no consequence for not completing the tickets. It's just you're not progressing in the story. Maybe you could get paid by tickets. That's quite neat. Since you're a contractor, that also would make sense. You're paid per task. And it's very simple to relate to. The clubs, no, you don't need a game. You don't need a mini game. It's just a social space where you can get to know certain people. Maybe some of the cast are also in some of these clubs. You get specific storylines. You get progression in these social clubs; they have special events and markers and things to discover that you can only find in these clubs. And the pace: there shouldn't be that many systems, it's mainly the ticket system and clubs, so let's not make it too difficult. Notice board is not a bad idea, both for single events and club memberships. So let's consolidate those into just a notice board."

Clubs (2026-10-03, his words: "Skip lang and programming. art and something else"): swimming, tennis, art and karaoke.

Applied below: skipping and pay in the core loop, the notice board under Order of systems, and Clubs.

## The principle

- One new system per day at most, and none on a day that already has a lot going on. Day 1 teaches moving, talking and words; day 2 adds tickets; each later system gets a day of its own.
- Each system is taught the first time it shows up, by a person or by using it once, with one interaction and no tutorial screens (GUIDE, Learning rules and Visual design).
- The first time is small. Day 2's ticket app holds two tickets, a club starts with one session, a room upgrade with one thing to buy.
- Freedom grows a day at a time. Days 1 and 2 are mostly guided. From day 3 the player picks what to do with a period. By the second week most periods are open, and the story waits until the player picks it up.
- Nothing new is required on the day it appears, apart from the one interaction that teaches it.
- Room upgrades, home visits and character sub-stories are content that comes through tickets, clubs, pay and bonds, not systems of their own (Content, below).

## The core loop: tickets and the office

The tickets are how the main story moves. Each ticket is a repair request with a place and a person attached. Working one sends Eric somewhere on the island, gives him a reason to talk to people, and often puts an old machine in front of him (the kotodama, [setting.md](setting.md)). Closing the relevant story ticket unlocks the next stretch of that thread, and every closed ticket pays Eric. Work in progress can still produce a finding or a conversation; those local responses do not require closing the ticket. Other available threads and free activities remain open while it waits.

- The ticket app is Amakawa's in-house repair web tool on Eric's computers: the one in room 203 and the one at his B2 desk. Day 2 shows it for the first time, with two tickets. The app is built; its appearance is in [controls-and-ui.md](controls-and-ui.md), and its runtime rules are in [systems.md](systems.md#tickets).
- On the later free days, the office is optional on any given day. Day 2 still includes its authored B2 conversation. Amakawa is not an efficient company: nobody checks the hours, and a ticket can sit open for days. Going in is how the player picks up new tickets and sees the B2 team.
- A ticket has no deadline, no fail state and no cost for leaving it. An open ticket only waits. Some tickets are story tickets: the story stays where it is until one is closed. Others are small jobs that give bond points ("A repair request for them or on their machine", [systems.md](systems.md), Bonds), memory lines and the odd new word.
- Pay is per closed ticket, since Eric is a contractor. The ticket app shows what a ticket pays, and the money is added to what Eric has. Small jobs pay a little, story tickets more.
- On a day Eric skips work, the clock moves through the periods as the player picks activities (see the events below), people keep to their schedules, and the evening is open. Nothing is lost.

## Events

Three kinds of thing can happen on a day, checked in this order when a period starts:

| Kind | Triggered by | Example |
|---|---|---|
| Story event | A day, or a condition (a ticket closed, a flag, a place first visited) | The day-2 welcome party ([stories/day2](stories/day2/README.md)) |
| Relationship event | A person's bond step plus where they are that period | The turn, payoff and last scenes that bonds steps 3 to 5 wait for ([systems.md](systems.md), Bonds) |
| Free period | The player chooses a free activity | A club, shopping, a visit, exploring, a ticket |

- A due story event becomes available, announced the day before or that morning through a conversation or message. The player chooses to start it before it spends a period. It never starts in the middle of another activity.
- A relationship event is offered: the person is somewhere sensible, with a marker, and the player can walk past. If passed over, it waits for a later eligible meeting. An invitation only expires when its scene makes the time limit clear; a pending relationship step is never silently discarded.
- Budget at most one substantial story scene and one substantial relationship scene a day. Brief messages, responses to the player’s actions and incidental conversations fit around them without consuming another period.
- Days 1 and 2 have guided beats with optional exploration around them. Day 2 also leaves its evening walks open around the gathering. From day 3 at least one period a day is free, and from the second week most are.

## Order of systems

Proposed; days after day 2 are not fixed. Places are from [island.md](island.md) and [places.md](places.md); each one leans on the Japanese hooks already listed there.

| System | First day | Places | Japanese it practises |
|---|---|---|---|
| Tickets | Day 2 (two tickets, a glimpse) | Room 203 and the B2 desk (`dorms`, `office`); then wherever a ticket points | Glossed Japanese nouns in the requests and learnable interface labels with readings and English; see [words.md](words.md#labels-on-the-ticket-system) |
| Free periods and the week | Day 3 | The whole open half | Days and times: 曜日, 時, 午前, 午後 |
| Notice board | Day 3 | The plaza's `noticeboard` ([places.md](places.md), Fountain plaza), which already carries day 2's posters | Posters: 募集, 日時, 場所, 入会 |
| Clubs: swimming | Week 1 | `pool`, `gym` | Rules signs (飛び込み禁止, 男子, 女子), counting lengths, 泳ぐ and ～たい |
| Clubs: tennis | Week 1 | `tennis_courts`, `gym` | Numbers and keeping score; short calls between players |
| Clubs: art | Week 2 | `dorm_commons` or the shotengai (a room above a shop), sketching trips to the harbour and coast | Colours, shapes and things you draw; 描く, きれい, ～てみる |
| Clubs: karaoke | Week 2 | The karaoke place on the shotengai | Song lyrics and their kana, cheering and thanks (上手, もう一回, ありがとう), choosing a song |

The notice board is the one place to find what's on (built; its rules are in [systems.md](systems.md#notice-board)). It stands at the south of the fountain plaza, which Eric passes between the office and the dorms. It lists single events (a party, a festival, a trip) with day, time and place, and each club's poster. Joining a club means taking its slip from the board; nothing else is needed.

## Clubs

A club is a social space for getting to know people. There are no minigames: a session is a scene with the club's people and a word or two of Japanese. Clubs meet on fixed evenings, one session a week each. The mechanism is built (who meets when and where, joining, sessions, progress: [systems.md](systems.md#clubs)); the sessions themselves are placeholders until Codex writes them.

- Some of the cast belong to clubs, alongside new people with a reason to be there.
- Each club has its own storylines and its own progression as Eric keeps going.
- Each club has special events, markers and things to find that exist only in that club.

## Content

These come through the systems above rather than as systems of their own.

- Room upgrades: things for room 203 bought with ticket pay at the shops (`store`, `bakery`, `liquor_shop`, `bike_shop`), starting with what the room obviously lacks. Japanese: shopping at a counter (円, いくらですか, 袋いりますか).
- Home visits: relationship events. A person invites Eric home once the bond allows; homes are in [cast.md](cast.md), Home. Japanese: お邪魔します, いらっしゃい, 失礼します, the genkan and slippers.
- Character sub-stories: storylines that open per person as their bond allows, through tickets, clubs and relationship events, each in that person's own register ([cast.md](cast.md)).

## What the engine needs

Per system, short. Paths are in game3d/.

- Tickets: the app and saved queue are built. Later it needs tickets arriving by day or condition, a ticket that points to a place and a thing (a goal pin, as goals do now), and closing a ticket as a story condition (a flag, which `if:` in FORMAT.md already reads).
- Free periods and the week: today js/days.js plays one fixed story set per day (day 3 is a test skeleton for the clubs, [systems.md](systems.md#the-clock), with the room-203 chair's period choices built). It needs a day built from conditions: which storylines are due, the week's weekdays and weekend, and a way for the player to end a period by choosing an activity (the clock still moves only on a choice, never on a timer). A sixth period (night) is already listed as to build in systems.md. Schedules across places and the week (to build in systems.md) are needed here.
- Events: a small scheduler that, when a period starts, offers eligible story and relationship events from conditions on day, flags and bond steps, keeping deferred events pending for a later eligible meeting. js/bonds/gates.js already holds the scene gates for steps 3 to 5, and js/story.js runs the nodes.
- Notice board: built ([systems.md](systems.md#notice-board)).
- Clubs: built ([systems.md](systems.md#clubs)): a schedule per club, membership as a flag, a progress count, and its own events, markers and finds. Its sessions need writing (Codex).
- Pay: Eric has ¥1000 and the vending machine ([systems.md](systems.md), Gifts). Closing a ticket adds its pay to the wallet. Room upgrades need shop counters (the konbini, bakery and liquor shop are fronts only) and buying more than drinks.
- Room upgrades: room 203 (js/places/dorms.js) needs slots where an item can be placed, the item list in data, and the room's state in the save (the save already keeps flags and the Bag).
- Home visits: an interior per home. Reuse one dorm-room layout with different furniture where it fits; each home is entered only on invitation (a flag from a relationship event).
- Sub-stories: storyline files as now ([stories/](README.md#storylines)), each with its trigger, plus the People panel showing where a thread stands without giving away what comes next.

