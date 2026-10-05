# Day 3

Saturday 3 October, a free day. Written by Codex (C-0462, X-0546, X-0548; #229), built in #229. It plays after day two: day two's end has Start day three, the title's Days entry has Day 3, and `?day=3` starts it straight away ([systems.md](../../systems.md), The clock and Saving). The story set is [game3d/story/day3/](../../../../game3d/story/day3/index.js) and the swimming club's first session is in [game3d/story/clubs.js](../../../../game3d/story/clubs.js); Codex's [handoff](../../../../game3d/story/day3/README.md) has the state and branch contract and what the build needed.

| Part | What it covers | Story |
|---|---|---|
| The room | Mio's messages (which name the two new repair requests), the requests on the computer, the chair that moves the clock (one period, or rest until evening), and Sleep at the bed in the evening, which ends the day. | dorms.js |
| The board | The club posters, Aoi's first proper introduction, and the map's word koko. | plaza.js |
| The station | The witnessed final door check and the guard's signature (T-0002, any morning), and his monitor (T-0003, mornings). | gate.js, train.js |
| The gym desk | The reception counter in the gym's entrance lobby: Eric, who has the request from Mio's text, tells the attendant he's from IT support; the frozen booking terminal on the counter and the printer behind it (T-0004, daytime). | gym.js |
| The swimming club | The last outdoor swim at the pool in the evening, for members: swim, carry the bags, watch, or leave; the goggles on the fence. | clubs.js, pool.js |
| Walks | Short looks and people across the open places. | the other place files |

Open places and ways: the room, dorm court, east lane, plaza, forecourt, security room, the stationary train, B2 (its computer; nobody is in on Saturday), shop street, karaoke box and booth, east coast, dorm common room, the sports ground, the gym corner and the pool deck. The office street west of the gym is closed by a barrier. Who is where in each period is in [places.md](../../places.md) (each place's Who's there when, Day 3) and game3d/js/places/day3/plan.js.

The requests pay once when closed (tickets model); nothing has a deadline, and anything unfinished stays open for a later morning or day. Checks: `node game3d/tools/day3-story-check.mjs` (Codex's authoring checks plus the engine registrations; part of `npm run check`), `DAY=3 node game3d/tools/fast.mjs` (a route through the whole day, game3d/js/testmode-day3.js), and `npm run check:routes:day3` (every authored day-3 choice, payments counted once).
