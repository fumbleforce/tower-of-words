# Day 4 cold read, 6 October

Scope: source and generated branch transcripts, with C-0472 and the landed day 3 as the reference. This is an independent reader's review followed by author corrections. Japanese outside learned words, names and loanwords must remain blurred; English alone is not treated as a translation of everything spoken.

The reader reported four should-fixes:

- A nonmember talking to Aoi first saw Rei's name without an introduction. The branch now calls Rei's introduction before she explains joining; the checker exercises this order.
- Kuro assumed the player held a cup. She now offers the sheltered end of the seat.
- The store line assumed an unshown purchase. The player now considers trying a small carton.
- The shoe exchange needed a physical action. The final build contract specifies Aoi loosening a lace and rubbing her heel before the question.

The reader found no additional blocker in the main tennis branches or new repair requests. Both tennis choices, lesson/skip, first/known names, deferral/retry, both fan methods, the court repair and no-work Sleep pass the authoring check (165 contextual nodes). Focused ESLint passes. The checker rejects dialogue-level `en` and Japanese-only speakers without blur or a taught-word line. It also expands Eric and Carina tokens.

The independent reader rechecked all four corrections and reported no remaining blocker or should-fix from that targeted pass.

Pending: Claude's sample read, physical implementation, voiced lines and rendered phone/desktop checks. Hook records prove the requested sequence exists; they do not prove its staging has been built.

## Recovery validation, 6 October

The interrupted files were copied into `wt/codex-story-recovery` without changing the main checkout's WIP. The saved day drafts already contained the C-0472 rewrite and the reader corrections above. The recovery preserves them, reconnects the revised optional packs through explicit exports, and adds game facts. The Monday guard greeting no longer asks whether the player has the day off.

The complete `npm run check` passes in this checkout. Day 4's 165 contextual nodes, day 5's 167 nodes, twelve flavor finds and the personal pack's 27 offers / 194 branches pass their authoring checks. Baseline day-1 fast playthroughs pass at 390×844 and 1366×860. Days 4 and 5 remain disabled; these runs verify the existing game still plays, not the new staging or voices. New scenes need their build contracts implemented before rendered acceptance.

Fresh independent review by `codex/dorm_recovery` covered both days, all milestone transcripts with staging cues, flavor finds and integration contracts against C-0472 and the voice sheet. It found one membership inconsistency: Rei offered a spare racket after the display repair even to a nonmember. Her branch now checks tennis membership and directs a nonmember to the plaza board. Both member/nonmember paths were added to the authoring check. The reviewer rechecked this and the Monday greeting correction and reported no remaining blocking authoring findings. This acceptance covers text and branch logic; it does not approve unbuilt visuals, voices or minigame callbacks.
