# Day 2

Authored for C-0367, work #192; built in C-0378. It plays after day one: day one's end has Start day two, and `?day=2` starts it straight away ([systems.md](../../systems.md), Saving). Its voice clips are registered in the voice manifest; changed lines need regeneration when a story revision lands. The complete data set is [game3d/story/day2/index.js](../../../../game3d/story/day2/index.js); the [handoff](../../../../game3d/story/day2/README.md) has the hook contract.

| Storyline | What it covers |
|---|---|
| [The station report](service.md) | The morning job, its report and the B2 conversation. |
| [Welcome food](welcome.md) | The small gathering, the new pattern and its optional second word. |
| [Day-2 visits](visits.md) | Eric's computer, the optional walks, the route home and the end. |

The place set and trips in index.js apply both before work (`morning`) and after work (`evening`). Choosing to read Mori’s notes for the afternoon at Eric’s B2 desk advances between them; browsing repair requests does not. Accessible places: the room, dorm court, east lane, plaza, forecourt, security room, stationary train, B2, shop street and east coast. The north road and pool approach close the two entrances into the sports area; the office quarter, harbour and works are beyond that area. There is no countdown, missed-party timer or escort failure.

The room starts day 2 with the previous day's choices and words intact. A first visit resets the transient `going_home` flag. The party's goodbye sets it again, while keeping exploration open. A return to the room after the party saves and ends the day; leaving the party does not end it on the promenade.

The new words' spellings and form are in [words.md](../../words.md#taught-on-day-2); actor placement and food source are in [places.md](../../places.md). Run `node game3d/tools/day2-story-check.mjs` for authoring validation; `DAY=2 node game3d/tools/fast.mjs` plays the day, and `node game3d/tools/fast-routes.mjs --day 2` its branches.
