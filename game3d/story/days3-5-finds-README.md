# Days 3 to 5 flavor finds

Twelve authored in-place interactions for #231. `days3-5-finds.js` owns the contents and `FINDS` owns their placement descriptors. Each nook is checked against the live place catalog by `node game3d/story/days3-5-finds-check.mjs`. The place lifecycle now consumes eligible entries through `js/flavor-finds/`, which stages ordinary props and the compact translated-note view. `tools/flavor-finds-check.mjs` exercises the live Look, repeat, interrupted Continue and return paths; its screenshots are written to `shots/flavor-finds/`.

Rendered validation (2026-10-06): all twelve entries passed on 390×844 with Eric and 1366×860 with Carina, including date/condition boundaries, repeat use, returning to the entrance and public Continue during the look. Seven protagonist thoughts use the existing approved Eric reference; Carina uses the configured fallback. Neutral prop views are in `showcase/optional-props-1/`.

## Build contract

Filter by `from`, `until` and `if` before creating a target at `at` with the given label. Merge only that eligible entry's node into its place. Dispatch it through an optional Look action; walking past does nothing. These are ordinary objects, without album collection or a reward marker.

`flavorFind: look` frames the person and object, then carries out the entry's `staging` in one short action. Written content is readable paper text, using the game's translated-note presentation; it is not a dialogue subtitle or a new lesson. Do not invent NPC speech or populate an otherwise empty place just for a note. Do not cover the object with a full-screen exposition card.

`putBack` completes the return action specified by that entry before control returns. No umbrella, key, letter, catalogue, cup, book or lunch slip enters inventory. Return the coin flap and saucer to their initial position; leave the bench shim in place. Save only the final seen flag. On Continue after an interrupted look, restore the object and make the interaction available again unless its final flag was saved.

Preserve the telescope's free-use sign and taped payment slot. The old pool key find is day 3 only, for swimming members in the evening, and cannot appear at a winter gym meeting. All other finds remain optional. Do not change the bakery flyer or album totals.

Check both protagonist choices, each date/condition boundary, repeated looks, Continue during a look and the return route on phone and desktop. The structural checker covers data and persistence hooks; it is not rendered verification.
