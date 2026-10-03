# Progression

How the game opens up after day 1: which system comes in on which day, what moves the story forward, and how scripted events and free days fit together. Systems and structure only; what happens in the story is Codex's ([collab/PROTOCOL.md](../../collab/PROTOCOL.md)). Nothing here is built unless it says so. What exists today (the clock, bonds, the Words panel, saving, the crowd) is in [systems.md](systems.md).

Jørgen, 2026-10-03:

> "we would want to build out systems gradually from day two. It should gradually be adding more systems like task or ticket management. Maybe in day two, you get your first glimpse at the Windows 95 simple ticketing system with two tickets. We want the story and the game to gradually introduce you to new systems that build over time so that in day three, day four, and the next weeks, you have increasing amounts of freedom to pursue directions you want, like sub-stories relating to various characters, to pursue clubs, like a swimming club or a tennis club, maybe a language or programming club. This is just some ideas to explore subplots, maybe improve your room, upgrade your room, visit the other characters in their homes. Because the main storyline progression should perhaps revolve around the tickets and going to the office. But as this is not a super efficient company, you don't necessarily have to go to the office every day. You don't need to complete the ticket every day. You just use those as levers to progress the story. And some events like the welcome party could be just scripted to certain days or conditions, like the relationship events are also determined by how far you've come into the relationship with the different characters."

## The principle

- One new system per day at most, and none on a day that already has a lot going on. Day 1 teaches moving, talking and words; day 2 adds tickets; each later system gets a day of its own.
- Each system is taught the first time it shows up, by a person or by using it once, with one interaction and no tutorial screens (GUIDE, Learning rules and Visual design).
- The first time is small. Day 2's ticket app holds two tickets, a club starts with one session, a room upgrade with one thing to buy.
- Freedom grows a day at a time. Days 1 and 2 are mostly guided. From day 3 the player picks what to do with a period. By the second week most periods are open, and the story waits until the player picks it up.
- Nothing new is required on the day it appears, apart from the one interaction that teaches it.

## The core loop: tickets and the office

The tickets are how the main story moves. Each ticket is a repair request with a place and a person attached. Working one sends Eric somewhere on the island, gives him a reason to talk to people, and often puts an old machine in front of him (the kotodama, [setting.md](setting.md)). Closing a ticket, or the right ticket, is what unlocks the next stretch of story.

- The ticket app is a small Windows 95-style program on Eric's computers: the one in room 203 and the one at his B2 desk. Day 2 shows it for the first time, with two tickets. The app, its data and its hook are being built now (claude-agent:tickets, C-0383); its facts go in [systems.md](systems.md) when it lands.
- The office is optional on any given day. Amakawa is not an efficient company: nobody checks the hours, and a ticket can sit open for days. Going in is how the player picks up new tickets and sees the B2 team.
- A ticket has no deadline and no fail state. An open ticket only waits. Some tickets are story tickets: the story stays where it is until one is closed. Others are small jobs that give bond points ("A repair request for them or on their machine", [systems.md](systems.md), Bonds), memory lines and the odd new word.
- On a day Eric skips work, the clock moves through the periods as the player picks activities (see the events below), people keep to their schedules, and the evening is open. Someone from B2 may send a message about a ticket, but there is no penalty and no nagging after the first one.

## Events

Three kinds of thing can happen on a day, checked in this order when a period starts:

| Kind | Triggered by | Example |
|---|---|---|
| Story event | A day, or a condition (a ticket closed, a flag, a place first visited) | The day-2 welcome party ([stories/day2](stories/day2/README.md)) |
| Relationship event | A person's bond step plus where they are that period | The turn, payoff and last scenes that bonds steps 3 to 5 wait for ([systems.md](systems.md), Bonds) |
| Free period | Nothing above is due | Clubs, shopping, visits, exploring, a ticket |

- A story event that is due takes its period, and the player is told the day before or that morning, through someone saying so or a message. It never fires in the middle of something else.
- A relationship event is offered: the person is somewhere sensible, with a marker, and the player can walk past. If ignored it stays available for a few days.
- At most one story event and one relationship event a day, so free periods stay free.
- Days 1 and 2 are entirely story events. From day 3 at least one period a day is free, and from the second week most are.

## Order of systems

Proposed; days after day 2 are not fixed. Places are from [island.md](island.md) and [places.md](places.md); each system leans on the Japanese hooks already listed there.

| System | First day | Places | Japanese it practises |
|---|---|---|---|
| Tickets | Day 2 (two tickets, a glimpse) | Room 203 and the B2 desk (`dorms`, `office`); then wherever a ticket points | Short labels on a request slip: 修理依頼, 故障, 場所, 完了; place names |
| Free periods and the week | Day 3 | The whole open half | Days and times: 曜日, 時, 午前, 午後 |
| Clubs: swimming | Week 1 | `pool`, the club board in `gym` | Rules signs (飛び込み禁止, 男子, 女子), counting lengths, 泳ぐ and ～たい |
| Clubs: tennis | Week 1 | `tennis_courts`, `gym` | Numbers and keeping score; short calls between players |
| Clubs: language | Week 2 | `dorm_commons` or `training_centre` | Self-introduction, asking and answering simple questions; a place where the grammar minigames ([game3d/minigames](../../game3d/minigames/README.md)) can live |
| Clubs: programming | Week 2 | `server_hall` or `research_lab` | Katakana loanwords (プログラム, エラー, ファイル), which also trains Jørgen's weak katakana |
| Room upgrades | Week 1 | Room 203 (`dorms`); `store`, `bakery`, `liquor_shop`, `bike_shop` | Shopping at a counter: 円, いくらですか, 袋いりますか; names of household things |
| Home visits | Week 2 | Where each person lives ([cast.md](cast.md), Home; most are still to decide): `dorm_blocks`, `family_flats`, `north_residence` | Visiting phrases: お邪魔します, いらっしゃい, 失礼します; the genkan and slippers |
| Character sub-stories | Week 1 onward, per person as their bond allows | Each person's own places and routine | Each person's own register ([cast.md](cast.md)) and the commands they teach |

Clubs meet on fixed evenings (the gym's booking sheet), one session a week each, and joining is a short conversation. Each club has its own people, who are new cast or existing ones with a reason to be there. Room upgrades are visible changes to room 203 bought with salary, starting with things the room obviously lacks.

## What the engine needs

Per system, short. Paths are in game3d/.

- Tickets: being built (C-0383). Later it needs tickets arriving by day or condition, a ticket that points to a place and a thing (a goal pin, as goals do now), and closing a ticket as a story condition (a flag, which `if:` in FORMAT.md already reads).
- Free periods and the week: today js/days.js plays one fixed story set per day. It needs a day built from conditions: which storylines are due, the week's weekdays and weekend, and a way for the player to end a period by choosing an activity (the clock still moves only on a choice, never on a timer). A sixth period (night) is already listed as to build in systems.md. Schedules across places and the week (to build in systems.md) are needed here.
- Events: a small scheduler that, when a period starts, picks the due story event, then a due relationship event, from conditions on day, flags and bond steps. js/bonds/gates.js already holds the scene gates for steps 3 to 5, and js/story.js runs the nodes.
- Clubs: a club is a storyline with a meeting schedule (place, weekday, period), membership as a flag, and one short activity per session. The pool and the courts are built from the outside (chunks `sports` and `east_coast`); the pavilion and the court gate need insides or a playable area.
- Money and salary: Eric has ¥1000 and the vending machine ([systems.md](systems.md), Gifts). Room upgrades need a payday, shop counters (the konbini, bakery and liquor shop are fronts only) and buying more than drinks.
- Room upgrades: room 203 (js/places/dorms.js) needs slots where an item can be placed, the item list in data, and the room's state in the save (the save already keeps flags and the Bag).
- Home visits: an interior per home. Reuse one dorm-room layout with different furniture where it fits; each home is entered only on invitation (a flag from a relationship event).
- Sub-stories: storyline files as now ([stories/](README.md#storylines)), each with its trigger, plus the People panel showing where a thread stands without giving away what comes next.

## Open questions for Jørgen

1. Is the week the right pace for a new system (one a day in week 1, then slower), or should later systems wait until the player asks for them, for example by reading the club board?
2. Should skipping work ever have a cost, such as a ticket going to someone else or Emi mentioning it, or is it truly free?
3. Do clubs need their own small game (counting lengths, a rally), or is a short scene with people and a word each session enough?
4. Salary: a weekly payday, or money earned per closed ticket?
