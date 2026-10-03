# Day 2 story handoff

Full story data for C-0367 / work #192, following the revised [outline](../../../notes/day2-outline.md) and [cold read](../../../notes/day2-outline-coldread.md). These modules use FORMAT.md. They are **not selected by the current loader**; the hook and access work below is still required. Day 1 is unchanged.

`index.js` exports `STORIES`, the new word records and their base-form notes, the open places and trips, and `NEEDS`. `NEEDS` lists proposed additions to the current catalog; it is not a runtime registration. Run `node game3d/tools/day2-story-check.mjs` for structural and branch checks against that combined contract. Existing repository checks continue to cover the shipped day.

## Reading and selection

Start with `dorms.js`, `train.js`, `office.js`, then `shotengai.js`. The other modules provide walks and optional interactions. All state owned by this story starts `d2_`; it reads day-1 lunch, warmth and known-word flags without replacing them. Select the complete set for day 2, including returns to earlier places. Never merge its start nodes into the day-1 route.

The current first-day file selection in facts, voice, story-map and fast-test tooling will also need to select day 2. The new facts are under [docs/game/stories/day2](../../../docs/game/stories/day2/README.md); the dedicated check validates them until the general tooling understands multiple days.

## Access and actors

The exact open area and adjacency are in `index.js`. Both story periods use it. The north-road and pool-approach closures must be visible barriers at the two existing crossings into `sports`, with a readable resurfacing notice; do not let a walk trigger cross and then send Eric back. This keeps the visitable area to the established route plus the shop street, east lane and east coast.

Actor placement and the food source live in [places.md](../../../docs/game/places.md), in the day-2 plans under “Who's there when” and the shop-street party plan. Gate visitors and the arriving train passengers from day 1 do not return for this job. The computer is `computer`, agreed with the room-prop work in C-0370. Its existing `desk_chair` seat and camera hooks handle the optional computer interaction; no extra computer hook is needed.

## Hook contract

| Place / hook | Required behavior |
|---|---|
| Train: `stationSetup`, `companion: boolean` | Load the empty car stationary between runs; Eric enters from the walkway, with Mio present only on the promised branch before the B2 briefing. Keep it stationary and suppress all arrival/departure events. This is idempotent on return/Continue. |
| Train: `doorTest` | In one continuous action, close/reopen the doors and visibly pass the sensor test. Leave the carriage stationary with doors open. A test control and pass indicator must be present before the story can target them. |
| Office: `officeDay2`, `state: arrive/afterWork` | Apply the day-2 actor placements from the current flags. `arrive` must not reset an already-completed shift. Suppress day-1 desk/lunch/end-of-day events. |
| Shop street: `partySetup`, optional `state: gather/pack` | Default restores the current arrangement from flags. `gather` puts Kenji by the bench even if Eric reached it first. `pack` dismisses Mio and Kenji and moves Mori to `shotengai_back_alley` with the leftovers. Move him visibly or restore that placement after a trip, with no duplicate Mori. |
| Shop street: `partyFood`, `state: open/take/sharePickles/drink/offerMore` | The small food setup follows the chosen action; `take` gets `food: riceball/sandwich`. This is food at the gathering, not an inventory puzzle or a new resource system. Repeated offers must not duplicate infinite props. |

Existing `doorsClose`, `doorsHold` and `doorsOpen` stage the optional voice experiment. The held-door motor hum must agree with the narration. Don't reuse the train departure sequence. Existing `cam`, `sit`, `stand`, `walk`, `type`, `period`, `save`, `trip` and `end` retain their FORMAT meanings.

## Word and voice work

Register the two records from `words.js` as phrases, and its `tai` base-form display. They start unknown and are learned only by their typing steps. Kenji models both; the second is optional. Neither commands a machine. The place files provide contextual people replies and honest fallback lines.

Generate and review the spoken lines, both Kenji slow repeats, Eric's `eric-tabetai` / `eric-nomitai`, and Mio's replay clips `word-tabetai` / `word-nomitai`. Add the word voice fields only when those clips exist. Mori's and the guard's lines have `en` subtitles and clear Japanese audio. `miotext` is a read-only message with no voice clip. Assets still follow the existing approval process.

## TODO for Claude's build

- Select this story set for day 2; start inside room 203 with day-1 choices/words preserved, clear transient arrival state, and support saves, Continue and a day-2 summary. On later room returns, complete the walk into the room before running its start/end node.
- Implement the declared trips, catalog additions and visible north closures. Keep both periods' paths home and back to the job reachable.
- Implement the five hook behaviors above, with the approved test indicator/motor sound and food props. Keep the landed computer prop and its `desk_chair` seat.
- Stage the four-person gathering at phone size; use one sea-facing bench for Eric and Mori, with Mio and Kenji at its ends. Sitting and leaving use reachable floor points.
- Register and voice the new words and story set, then extend facts/voice/route tooling to cover both days. Run the small food activity alone, both lunch/guard histories, the optional-test branches, both reports, both foods, skipped visits, and Continue before the two-size day-2 playthrough.
