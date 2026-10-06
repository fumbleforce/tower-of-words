# Day 2 story and runtime contract

Select the complete day-2 set from index.js. The factual scene/word/state descriptions live in [docs/game/stories/day2](../../../docs/game/stories/day2/README.md). Japanese dialogue follows day 1: known words and names remain clear, with meaning conveyed through action or an available interpreter. No English replacement subtitles.

## Request and language progression

The room opening shows Mio's request before the player accepts it. Both computers share the ticket app. Reading never spends the afternoon or closes the station ticket. The station compares two normal passing tests, then the spoken-word effect; report choice follows that evidence. Three required words are distributed through testing, reporting and the meal: mouichido, daijoubu and tabetai. Kanpai, oishii, yasumi, nomitai, mitai and ikitai are optional conversations. All nine are typed in context. Explicit word records provide protagonist pronunciation keys, while word replay uses the existing slow model clips.

## Place hooks

| Place / hook | Contract |
|---|---|
| train / stationSetup | Stationary empty carriage. Mio accompanies only the promised history while the report is unfinished. Depart walks her out before removing her. Continue and return restore the same state. |
| train / doorTest | A visible control runs one full close/open cycle and displays a passing sensor result. Story calls it twice for comparison. |
| train / doorsClose, doorsHold, doorsOpen | Stage the spoken experiment without departure; the held motor hum agrees with the visible doors. |
| office / officeDay2 | Restore working cast and Mio desk activity. AfterWork clears the department after the explicit request-review choice, not after merely opening the app. |
| shotengai / partySetup | Kenji waits beside the restaurant entrance until the player joins dinner. No outdoor meal or duplicate dinner cast. |
| izakaya / partySetup | Restore the five-person table. Gather seats colleagues; pack walks Mio and Kenji out while Mori and Emi remain for the translated coda. The player has a reachable chair and a continuous entrance/exit aisle. |
| izakaya / partyFood | open, take, toast, drink, sharePickles, offerMore, passVegetables, packLeftovers and leftovers use visible food and hand contact. take selects yakitori or vegetables. No hidden prop teleport or unperformed handoff. Repeated offers cannot multiply props. |
| east_coast / coastVisit | After-work Hamada cleans the telescope then yields it. view frames the real shoreline steps and water. away returns the player to safe standing space. No coin transaction. |

## Continue and verification

Day-2 starts restore progress and route goals without repeating lessons. saves/day2.js migrates the old outdoor-party checkpoints to the restaurant and discards obsolete script indices at a safe place boundary, preserving durable progress. New saves carry the content revision. Test an unfinished meal, old typing checkpoint, completed-party street walk and station report before/after Continue.

Run game3d/tools/day2-story-check.mjs for branches and registration, then actual native routes at both sizes and both protagonist choices. Cover both sensor reports, all histories, both foods, optional words, the table without first talking to doorway Kenji, leaving/re-entering, old-save migration and actual word audio. Voice production and native staging must pass before this rebuild is called complete.
