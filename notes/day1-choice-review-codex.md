# Day-1 choice review

Reviewed 2026-09-29 by Codex subagent `choice_review`, against HEAD `f6cc3ae` and the working tree. These are source findings; two were reproduced with CPU-only stubs around the actual runner and gift function. No game files changed. Root Codex handles the handoff.

The gate and lunch choices already carry consequences worth preserving. The social gate route sets `hamada_friend`, which produces the afternoon crackers; the magic route sets `gate_magic`, which changes the afternoon and evening reactions. Lunch chooses a different teacher and command, an afternoon echo, and Mio's evening address. Small expressive choices also enter the People panel through `js/bonds/day1.js`. Convergence alone is not a problem here.

## 1. A declined repeat gift disappears from inventory

**P2, confirmed logic finding.** In `game3d/js/main.js:287`, `give()` calls `take(item)` and sets `gave_<item>_<person>` before triggering the story. `game3d/story/office.js:94` routes an already-gifted Mio to `gift_again`; Mori and Kenji do the same at lines 96 and 98. The `gift_again` node at line 531 says they have already had one and grants nothing. `game3d/js/sim.js:260` removes the item immediately.

Player trace: buy corn soup, give it to Mori, buy another, then try giving it to Mori again. The second can vanishes while the scene declines the repeat gift. The player loses a purchased item without a corresponding acceptance or relationship change.

Minimal correction: have gift acceptance decide whether the item is consumed. A refusal should keep the item and leave the `gave_...` record alone. Avoid inferring acceptance merely from the existence of a story handler, since refusals have handlers too.

Test all three recipients: first accepted gift consumes one item; repeat attempt retains inventory and bonds; an unsupported recipient also retains the item. Include a different drink on the second attempt so both exact and wildcard handlers are covered.

## 2. Buying again dispenses a can while the machine is still stuck

**P2, confirmed runner finding.** `game3d/story/office.js:477` through line 480 guard the first purchase with `!vend_tried`. `vend_stuck` immediately sets `vend_tried` and `vend_stuck`, but `talk:vending` at line 66 always reopens the ordinary buying menu. Every later purchase therefore reaches `buy` and `vendingDrop` while `vend_stuck` remains true.

Player trace: choose coffee, read that the coin went in and nothing came out, interact again, choose corn soup. A can is dispensed without using 動いて; the stuck-machine goal remains active and the original coffee is still pending. The machine's output contradicts its unresolved fault, weakening the command reuse moment.

Minimal correction: while `vend_stuck` is true, route interaction back to the unresolved fault and retain the pending selection. Resume ordinary purchases only after `vend_ugoite` clears the state. Keep the main task available while this side task is unresolved.

Test first purchase, second attempted purchase before the command, command use, then a successful later purchase. Check that only one item is pending, the command produces that selection once, and the side goal clears. Repeat with each drink.

## 3. The mum question can precede its setup

**P2, source continuity finding.** In `game3d/story/train.js:143`, `mio_catches` only has Mio catch the bag and apologise. It then goes to `sit`, whose unconditional choice at line 178 offers “Were you visiting your mum?” The mother/visit setup exists in `caught` at line 154; `dropped` mentions the mother at line 160. Neither node runs when the player talks to Mio during `bag_wobble`.

Player trace: start the seat beat, talk to Mio instead of catching the bag, then read the introduction. Eric can ask a personal follow-up based on information neither he nor the player has received. Selecting it also increases `mio_warm` and records the family conversation.

Minimal correction: mark when the mother's food has been mentioned and condition the existing family option on that flag. The introduction and nod options remain available. This preserves the approved lines and avoids adding exposition.

Test all three bag outcomes. The family option should require its setup; choosing it should still update warmth and the People panel once.

## Evidence and limits

Skills applied: story-analysis for setup and continuity, interactive-fiction for perceivable consequences and state consistency, humanizer for the review prose. No new dialogue or future-day content was drafted.

The CPU check evaluated the actual `Runner` with `office.js`, replacing UI and physical hooks with logging stubs. First coffee purchase produced `vend_want: 1`, `vend_tried: true`, `vend_stuck: true`, and no inventory item. A second corn-soup purchase produced one inventory item and one dispense hook while all three flags remained unchanged. Separately, the extracted current `give()` function consumed a stub inventory's corn soup and set `gave_cornsoup_mori` before resolving to `gift_again`.

These checks establish branch order and state changes, not browser presentation, audio timing, collision or persistence across reloads. Reviewed current `story/*.js`, runner, gift/inventory code and day-1 bond moments. Checked existing review/request notes and collaboration inboxes through C-0005; the findings above were not already recorded there. Existing world/staging issues stay in [day1-world-review-codex.md](day1-world-review-codex.md).

Source SHA-256 prefixes: train `422fa250`, gate `59ae3790`, office `01ccb923`, main `ca087f1d`, sim `1b43cde3`. Recheck these findings against concurrent changes before implementing.
