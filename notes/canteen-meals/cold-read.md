# First cold read, 2026-10-07

Root accepted the bounded first/repeat/busy shape, prices and hours, with these required corrections before voice:

- Bringing rice for lunch did not follow from not wanting to cook after work. The diner now prefers home-cooked rice but finds buying sides here easier.
- A counter recommendation must remain true when hot service is closed. The line now explicitly says the dish can be bought at lunch.
- A completed rice-container action cannot remove the side dish that a later line points at. The empty rice container and side dish have distinct state; after the side is cleared, pointing uses the real service display.
- The learned order reply now says “これ、{tabetai}です。” with an actual dish pointer. Unknown-word ordering remains valid.
- Both choices state canonical prices before payment; an outstanding paid tray cannot be overwritten or charged again on replay.

At this checkpoint the draft was updated before generation. Root subsequently approved the materialized spoken source and the two receipt-recovery lines; see qa.md for generation checksums and final evidence.

Second exact-source review corrected the first-meeting seat question: after the player has already sat at the shared chair, the diner greets with a nod and no permission question, and the redundant Sit choice is hidden. Curry commentary requires the real curry tray in the player's hands or uneaten on that shared table, not merely an outstanding paid receipt. Water while carrying a tray will first stage a safe physical set-down on the collection counter, preserving the paid meal entitlement before switching hand ownership to the cup. No new spoken line is added.
