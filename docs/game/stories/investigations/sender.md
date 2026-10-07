# Mio’s timesheet sender

Source: `game3d/story/investigations/sender.js`, merged into shared conversations on every suitable office visit. Cast: Mio, Mori and the selected protagonist. Available after the first work report or the actual remembered day-two complaint, only while both colleagues are present. There is no day-number deadline.

The player may decline, investigate without learning Japanese, or ask Mio to model `mada` (“still; not yet”). Only successful typing learns it. Mori’s exact remark, “そちらには、{mada}残っていますよ。”, is recorded through ordinary spoken-line memory. Knowing the word either before or afterward opens a tentative question about retained output. That question does not identify the faulty item.

The two failure records show 24 acknowledged and 25 started before a restart; the next attempt starts 25 and restarts. Selecting the two occurrences of 25 pins the comparison. The player may hold one pending item and Retry; another hold replaces it without loss. Holding 25 lets 26 and 27 receive acknowledgments. Holding 26 or holding nothing reaches 25 and restarts. Acknowledged 24 never resends. Logs, the comparison, pending output and held item survive Continue and revisits.

Mio uses her existing desk keyboard to show the live queue. After “Show me”, the door opens and Mori indicates the real cart through the doorway. The player chooses whether to visit it. Mori and Mio approach the cart separately, then return to their desks; the final thanks occurs with both Mio and the protagonist visibly back at her desk, after she places a small 25 note. The cart’s magnified display retains its text until input, with a single automatic Retry sequence.

This delivers the unaffected items. It does not repair 25, fix all payroll, award money, advance a period or change a relationship milestone. Mio explicitly keeps the original for further investigation; that deeper follow-up is not implemented.

## Words taught

| Word | By | Node |
|---|---|---|
| `mada` | `mio` | `sender_practice` |

## Validation

`sender-model.test.mjs` checks comparison order, incorrect matches, one-slot replacement, conservation, serializable output checkpoints and invalid imports. `sender-state.test.mjs` checks global persistence without adding synthetic flags to ordinary legacy saves. `sender-lab-check.mjs` exercises real phone/desktop controls and reload during automatic delivery. Native staging and complete story/Continue tools retain separate output directories for every attempt.


## Arrival regression

The office owns Mori's `chief_desk` chair completion. Ordinary and resumed mesh walks call that completion only after actual arrival, with place, parent and cancellation token still matching. The mesh sits at the existing cushion surface, y=0.245; the procedural pose keeps its original offset. The Continue assertion retains exact destination, seated state and cleared saved walk. Its obsolete procedural root-height check is replaced by rendered skinned body support against the actual chair cushion, strictly -0.012 through 0.001 metres. Missing body/chair geometry throws.

## Native evidence

All attempts, including rejected framing, failed geometry probes and deferred GPU runs, are retained in `game3d/shots/sender-investigation/` in the main checkout. Each attempt has its original numeric suffix. These are diagnostic artifacts rather than a curated claim that every attempt passed.

- CPU suite before final camera refinement: 575 tests and all repository checks pass (`codex-sender-cpu-6.log`).
- Full day one passes at 1366×860 and 390×844. The archived runner differs from the repository fast runner only by the isolated server port, 8786.
- Actual story routes use native choices, console buttons, typing and title Autosave Continue after acknowledgement 26. They cover both protagonists, knowledge before/after the remembered remark, declining the initial invitation, successful 26/27 delivery, retained 25 and returning 25 before the desk payoff.
- Lab phone/desktop runs exercise the real persistent screen and reload during automatic delivery. Pure reducer tests cover wrong holds, replacement, failed attempts, record comparison and conservation.
- Arrival attempt 12 proves ordinary/resumed visual and saved-position parity plus cancellation safety. Generic Continue runs 2 and 3 together pass all twelve existing cases; run 3 repeats the moving case with the ordinary close camera so the rendered rig is visible for strict contact measurement.
- Fresh approved-clone generation adds exactly 32 MP3s. The retained batch contains rejected takes and full-schema sources. Existing voice keys, records and timing tuples are preserved; 17 existing recognition surfaces gain only the optional mada markup/timing. The scoped upload report and main binary SHA checks are retained with the evidence.
