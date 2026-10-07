# Character scale trial

Work #322; [Review character-scale-1](../reviews/character-scale-1/review.json). User request: [in-game feedback](feedback-game/2026-10-07_091301/text.md).

`?charscale=67` makes human bodies 67% of their existing size. Other values and an absent query retain the current size. The trial does not persist a setting. It covers Meshy/chibi cast, both protagonists, crowd and code-built fallback bodies. Approved source models, environment geometry and furniture are unchanged. Relative body heights remain unchanged. Cats and other creatures retain their existing size.

The multiplier runs before Meshy seat contact and stride measurement. Code-built bodies keep their existing scale chain and seat formulas. Trial person pins follow the head rather than their previous fixed world height; object markers and touch target sizes stay unchanged. Character roots and world movement coordinates retain their original units.

## Native evidence

Captures and JSON measurements live in `game3d/shots/character-scale/`. Lossless Review copies live under `bible/shots/reviews/character-scale-1/`. The tool is `game3d/tools/character-scale-check.mjs`. Quality is 2, desktop 1366×860 and phone 390×844. Every rendered attempt is retained in the Review, in order.

- Rounds 1–3 stopped at the day-two morning phone/ticket/choice UI; these were harness failures, with no captures produced. Logs are retained. Round 4 corrected the driver to advance the actual UI.
- `round4-1366`: first full desktop pairs at the dorm room, bicycle street, canteen end seat and plaza.
- `round5-390`: full phone pairs, with the shared table and native camera close-up.
- `round6-1366`: final full desktop pairs and shared-table close-ups.
- `interaction7-390`: actual resident pin click and the resulting conversation, at both sizes. Eric stands and approaches the seated resident through the existing interaction code.
- `carina8-390`: Carina dorm comparison.
- `crowd9-1366`: visible commuters on the office street. The camera and player position match; live walkers have different positions as their pace and capture timing differ.

Measured Eric model height is 1.416 → 0.94872 world units; Carina is 1.3216 → 0.885472. Named Meshy and crowd holder scales change by exactly 0.67. Same-camera matrix assertions pass within 0.015 per component (the normal eased follow camera); canteen seated underside stays about 9.45 mm into the 0.34-high cushion at both sizes. Native runs reported no console or page errors.

The opt-in full day-one magic route passed on desktop (73 seconds) and phone (100 seconds), with no long gait stalls or slides. The fast checks reported performance warnings against older stored baselines; these are not hardware-phone benchmarks. CPU checks pass 634 tests and the repository gates. Final source/visual review is pending.

## Remaining work before a default change

This is a sizing comparison. Outside wide shots make characters smaller on screen; furniture now reads larger, and seated feet may dangle. Existing contact scripts that use fixed world points for tableware, carried props, doors or handoffs need a separate visual audit if this size is selected. Shared-table seating and actual conversation were checked, not every story interaction in the game. No default change or broad staging-completion claim is made.

The playable links currently point to the local trial worktree. They must change to the landed query URL before this worktree is retired. The environment is the main baseline, independent of the sunny street trial.
