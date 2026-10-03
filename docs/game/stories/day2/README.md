# Day 2

Authored for C-0367, work #192. Engine integration, voices and staging are pending. The first day remains the current playable story. The complete data set is [game3d/story/day2/index.js](../../../../game3d/story/day2/index.js); the [handoff](../../../../game3d/story/day2/README.md) names the remaining work.

| Storyline | What it covers |
|---|---|
| [The station report](service.md) | The morning job, its report and the B2 conversation. |
| [Welcome food](welcome.md) | The small gathering, the new pattern and its optional second word. |
| [Day-2 visits](visits.md) | Eric's computer, the optional walks, the route home and the end. |

The place set and trips in index.js apply both before work (`morning`) and after work (`evening`). Sitting at Eric's B2 desk advances between them. Accessible places: the room, dorm court, east lane, plaza, forecourt, security room, stationary train, B2, shop street and east coast. The north road and pool approach close the two entrances into the sports area; the office quarter, harbour and works are beyond that area. There is no countdown, missed-party timer or escort failure.

The room starts day 2 with the previous day's choices and words intact. A first visit resets the transient `going_home` flag. The party's goodbye sets it again, while keeping exploration open. A return to the room after the party saves and ends the day; leaving the party does not end it on the promenade.

The new words' spellings and form are in [words.md](../../words.md#day-2-to-build); actor placement and food source are in [places.md](../../places.md). Run `node game3d/tools/day2-story-check.mjs` for authoring validation. A two-size playable QA pass still requires the integration.
