# Day 2 story handoff

Full story data for C-0367 / work #192, revised after the [story cold read](../../../notes/day2-coldread.md) and C-0379 / work #200, following the revised [outline](../../../notes/day2-outline.md) and [cold read](../../../notes/day2-outline-coldread.md). These modules use FORMAT.md and are selected by the loader for day 2. The runtime contract below also covers returns and Continue. Day 1 is unchanged.

`index.js` exports `STORIES`, the new word records and their base-form notes, the open places and trips, and `NEEDS`. `NEEDS` lists proposed additions to the current catalog; it is not a runtime registration. Run `node game3d/tools/day2-story-check.mjs` for structural and branch checks against that combined contract. Repository checks and the day-2 branch tests cover the selected set.

## Reading and selection

Start with `dorms.js`, `train.js`, `office.js`, then `shotengai.js`. The other modules provide walks and optional interactions. All state owned by this story starts `d2_`; it reads day-1 lunch, warmth and known-word flags without replacing them. Select the complete set for day 2, including returns to earlier places. Never merge its start nodes into the day-1 route.

Facts, voice, story-map and fast-test tooling select day 2. The facts are under [docs/game/stories/day2](../../../docs/game/stories/day2/README.md); the dedicated check also exercises story continuity.

## Access and actors

The exact open area and adjacency are in `index.js`. Both story periods use it. The north-road and pool-approach closures must be visible barriers at the two existing crossings into `sports`, with a readable resurfacing notice; do not let a walk trigger cross and then send Eric back. This keeps the visitable area to the established route plus the shop street, east lane and east coast.

Actor placement and the food source live in [places.md](../../../docs/game/places.md), in the day-2 plans under “Who's there when” and the shop-street party plan. Gate visitors and the arriving train passengers from day 1 do not return for this job. The computer is `computer`, agreed with the room-prop work in C-0370. Its existing `desk_chair` seat and camera hooks stage the optional computer interaction. Both PCs open the shared ticket app described below.

## Hook contract

| Place / hook | Required behavior |
|---|---|
| Train: `stationSetup`, `companion: boolean` | Load the empty car stationary between runs; Eric enters from the walkway, with Mio present only on the promised branch while `!d2_ticket_done`. Keep it stationary and suppress all arrival/departure events. This is idempotent on return/Continue. `state: depart` walks Mio out toward B2 before removing her interaction/body; do not make her disappear in front of Eric. |
| Train: `doorTest` | In one continuous action, close/reopen the doors and visibly pass the sensor test. Leave the carriage stationary with doors open. A test control and pass indicator must be present before the story can target them. |
| Office: `officeDay2`, `state: arrive/afterWork` | Apply the day-2 actor placements from the current flags. On the warm promise history, Mio is absent until `d2_ticket_done`; on the cold history she is at work throughout the morning. `arrive` must not reset an already-completed shift. Suppress day-1 desk/lunch/end-of-day events. |
| Shop street: `partySetup`, optional `state: gather/pack` | Default restores the current arrangement from flags. `gather` puts Kenji by the bench even if Eric reached it first. `pack` has Kenji help collect the boxes, then walks Mio and Kenji out, and moves Mori to `shotengai_back_alley` with the leftovers. Move him visibly or restore that placement after a trip, with no duplicate Mori. |
| Shop street: `partyFood`, `state: open/take/sharePickles/drink/offerMore/passSandwiches/packLeftovers/leftovers` | The small food setup follows the chosen action; `take` gets `food: riceball/sandwich`. `passSandwiches` passes the sandwich tray to Mio. `packLeftovers` shows Mori settling the remaining wrapped rice balls into the existing takeaway boxes in the alley; Eric stands facing him. `leftovers` hands Eric a remaining rice ball to eat there after the party. This is food at the gathering, not an inventory puzzle or a new resource system. Repeated offers must not duplicate infinite props. |
| Coast: `coastVisit`, `state: arrive/clean/offer/view/away` | `arrive` restores Hamada (`kuroda`) by the existing lookout telescope after work only, never on the train or at the gate; morning has only the telescope. `clean` has him wipe the eyepiece; `offer` moves him clear so Eric can use it. `view` moves Eric to the eyepiece and frames the shoreline below from `lookout_view`, with the narrow maintenance steps between the armour rocks visible and the lower steps washed by the water. The steps remain inaccessible from the path. `away` returns Eric to safe standing space. No coin transaction or optical minigame. Restore placements and lens/hand props on Continue; repeat visits never strand someone at the eyepiece. |

Existing `doorsClose`, `doorsHold` and `doorsOpen` stage the optional voice experiment. The held-door motor hum must agree with the narration. Don't reuse the train departure sequence. Existing `cam`, `sit`, `stand`, `walk`, `type`, `period`, `save`, `trip` and `end` retain their FORMAT meanings.

## Ticket app

The global `ticket` and `tickets` hooks use [FORMAT.md](../FORMAT.md). Full request text is in [story/tickets.js](../tickets.js); their story effects and access rules are in [the station report](../../../docs/game/stories/day2/service.md#repair-requests). The first opening teaches selecting a row, with the same saved tutorial state at both PCs.

`shared.js` supplies idempotent queue setup for day 2 and older saves. It records T-0001 as closed and credits that repair once, adds T-0002 only if absent, and starts T-0002 when the station check/report flags already exist. The station test and submit also start T-0002. Nothing in this set closes T-0002. Opening the app waits for the player to close it; that close must not set `d2_shift_done`. At B2 the following explicit notes choice advances the period. The room's inbox returns Eric to standing, and the after-work B2 desk reopens the list without replaying the time advance. Save the read/tutorial state when the app closes.

Check both PCs, deferring the afternoon, returning, and Continue with the app open. The browser route driver must operate the real modal; the story checker records its opening and uses the ticket model for queue effects. Update the voice clip for Emi's revised desk introduction after this story revision lands.

## Word and voice work

Register the four records from `words.js` as phrases, and its `tai` base-form display. They start unknown and are learned only by their typing steps. Kenji models tabetai and optional nomitai; Hamada models optional mitai at the lookout, and Mori models optional ikitai after the party. Only tabetai is required. Declining a teaching offer leaves it available on a later visit. None commands a machine. The place files provide contextual people replies and honest fallback lines.

Generate and review the spoken lines, the slow repeats for all four words, Eric’s four word attempts and the four word replay clips. Add the word voice fields only when those clips exist. Mori's and the guard's lines have `en` subtitles and clear Japanese audio. `miotext` is a read-only message with no voice clip. Assets still follow the existing approval process.

## Integration checks

- Select this story set for day 2; start inside room 203 with day-1 choices/words preserved, clear transient arrival state, and support saves, Continue and a day-2 summary. On later room returns, complete the walk into the room before running its start/end node.
- Implement the declared trips, catalog additions and visible north closures. Keep both periods' paths home and back to the job reachable.
- Implement the six hook behaviors above, with the approved test indicator/motor sound and food props. Keep the landed computer prop and its `desk_chair` seat.
- Stage the four-person gathering at phone size; use one sea-facing bench for Eric and Mori, with Mio and Kenji at its ends. Sitting and leaving use reachable floor points.
- Register and voice the new words and story set, then extend facts/voice/route tooling to cover both days. Run the small food activity alone, both lunch/guard histories, the optional-test branches, both reports, both foods, skipped visits, and Continue before the two-size day-2 playthrough.

## Optional visits and small props

Keep the small card text in these story nodes as its source. Stage the existing cards and signs to match it: shops have preparation cards in the morning and closed-for-today cards after work, while the izakaya has a reserved-evening card and the onsen a boiler-repair card. The shop-street exit `plaza_lane` reads “To the dorm street” for this set and goes to `east_lane`.

The bakery’s existing A-board includes its dorm-delivery notice, the liquor shop’s existing cedar ball has a new-sake tag beneath it, and the existing telescope’s coin slot has a free-to-use strip of tape. Each is readable through its optional interaction, without a new album page or collectible click. Frame the bakery and liquor-shop sign on their respective taps. Frame the lookout’s sea and shoreline, not just Eric’s head. The coast encounter, the alley coda and their optional words are separate from the required food actions. Monday’s boxes/photos exchange is conversation, with no tracked errand.

The shared direction helper preserves the desk objective after the briefing, and the bench objective after meeting Kenji or eating. Tapping the dorm entrance before the final goodbye does not replace the job objective. Test returns and Continue at those states as well as the main route.
