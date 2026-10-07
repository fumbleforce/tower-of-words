# Day 5

Monday 5 October. Monday is playable through the normal Days menu and Sunday’s end screen, with voiced scenes and saved physical actions. The [story set](../../../../game3d/story/day5/index.js) includes weekday routine, two requests and a voluntary B2 demonstration. The [build contract](../../../../game3d/story/day5/README.md#build-contract-for-claude) and [Kotodama adapter data](../../../../game3d/story/day5/kotodama.js) specify the bridge. Monday completes the five opening days. Sleep continues into the recurring week, preserving progress; the [day loader](../../../../game3d/js/days.js) selects the ongoing routes after day 5. Those recurring activities do not imply that later character arcs are complete.

## Cast

`eric`, `mio`, `kenji`, `mori`, `emi`, `kuro`, `aoi`, `rei`, `guard`, `kuroda`, `tama`, `attendant`.

## Beats

The morning greeting acknowledges only closed requests. Kenji invites the player for drinks after six; a text preserves that invitation if earlier B2 visits were skipped. At lunch Mori sets out art materials in the common room and Kenji checks the karaoke booth. Their actual club meetings remain Tuesday and Wednesday.

Kuro asks for help with the visitor-label printer. Its narrow layout and wider saved preview are shown before the player chooses the wider format and prints a full name for her to check. At Monday lunch Kenji asks for help with a selector held down by a songbook. The player holds the stop key or uses a known command, then moves the book and lets Kenji select a single row. T-0007 and T-0008 pay once on confirmation; the requests have no deadline.

In the evening, Kenji and Mori are introduced if needed before the player offers a delivery by speaking. Mio asks privately whether the player wants them to see; ordinary drinks leave the demonstration available. On agreement, Kenji pockets his phone and Mori clears a landing space after Mio's Japanese explanation. The guided melon-soda delivery is the first reveal. It pauses for reactions and both witnesses' agreement to keep it within B2 before any optional rounds. Emi is absent. Lunch's selector command does not grant knowledge of this reveal.

## Choices and flags

| Flag | Set by / read by |
|---|---|
| `d5_reveal_agreed` | Agreement to watch; does not mean a delivery happened. |
| `d5_delivery_seen` | The adapter only after the first impossible delivery; Continue resumes reactions. |
| `d5_team_witnessed` | After Kenji and Mori agree to keep the event private; later visits skip the first reveal. |
| `d5_reveal_done` | Every exit after the witnessed reveal, including first-delivery exit, rounds exit and later ordinary-drink departure. Deferral and pre-delivery cancellation leave it unset. |
| `d5_last_recipient` | Actual final successful delivery in the latest optional run, or empty; determines the exit response. |
| `d5_label_done`, `d5_selector_done` | Verified repairs and physical restoration; separate from the reveal. |

## Words taught

No new word record. If unknown, `dashite` is taught through a separate typed printer lesson before entry; the ordinary print has already finished. Guided play introduces `ni` and `o` one tap at a time and glosses the polite form.

## Nodes

| File | Nodes |
|---|---|
| `day5/dorms.js` | Room routine, requests, invitation and Sleep. |
| `day5/office.js`, `day5/reveal.js` | B2 introductions and routine; `d5_drinks`, `d5_first_reactions`, `d5_first_exit`, `d5_rounds_exit`, `d5_drinks_free`. |
| `day5/reception.js` | `d5_label` and repair/confirmation branches. |
| `day5/karaoke_booth.js` | `d5_selector` and both repair methods. |
| `day5/dorm_commons.js` | Art setup, Aoi's seat and the shelf sketch, without an album addition. |
| Other files in `day5/` | Routes, deferred requests and optional place conversations. |

The player can skip every job and demonstration and still Sleep. Exiting Kotodama keeps the same B2 evening and changes no world wallet, ticket, bond or period. The [optional packs](../early-optional/README.md) remain independent of the reveal. The Monday modules in `game3d/js/places/day5/` supply the schedule, label and selector repairs, B2 gathering, printer practice, common-room actions and the embedded Kotodama callback. The embedded session retains only its delivery result when returning to the live world; its score and hearts do not write world resources. Continue restores physical props, camera staging, the held reception label and selector motion. The approved voice pipeline supplies 114 additional clips; Carina retains the configured Eric voice fallback, including six name-dependent lines. The browser route suite covers 21 branches for each protagonist, including real guided delivery, save/reload boundaries, cancellation, replay isolation, all actual recipients, both repair methods, one-time payments and no-job Sleep. Full fast routes pass at 1366×768 and 390×844; physical actions are inspected at both sizes. Shared optional-find and milestone dispatch remains a separate integration.
