# Canteen meals and diners: final checks

Public work #312, X0715. This is a bounded canteen service and conversation expansion, using existing approved bodies and voices. It does not replace crowd models or add a language lesson.

## Behavior checked

- Actual door marker entry and return to the plaza, both protagonists and screen sizes.
- Canonical prices shown before Pay; actual hand payment, staff route around the counter, tray transfer, carrying, shared-chair sitting, visible bites and tray return.
- Actual title Continue from the paid checkpoint and completed-bites checkpoint: one debit, correct receipt, tray and seated pose.
- Paid checkpoint restored in evening, then next lunch: no invisible worker delivery or second debit. The test changes only saved period/date to exercise this boundary; it does not claim a full intervening-day playthrough. Delivered/parked meals remain collectable.
- Carried meal physically parked before water and normal departure; returning through the ordinary doorway restores collection without charging again.
- Empty cup placed below outlet, control pressed, visible fill, lift/turn/sip/return. Arm-only reach preserves the neutral head pose. Physical-final desktop/phone cup-lip gaps are 0.0049/0.0086 world units; head movement is below 0.0006. These are rendered prop-lip measurements, not wrist-to-mouth distance.
- Staff route uses the real scaled procedural actor capsule. Physical-final captures contain 5,109 desktop and 5,026 phone samples; counter, end shelf and wall remain clear. The narrowest measured margin is approximately 0.024 world units; collision tolerances are unchanged.
- Every diner uses actual supported sitting, has reachable Talk, and performs the stated visible table action. Container lid and wrapper tests use their actual edges. Cardigan first conversation, saved heard remark, later vocabulary knowledge and title Continue unlock the same optional followup. The authored recommendation regression checks her rig and her actual vegetables.
- An intentionally thrown action releases ownership, then a subsequent action succeeds. Leave/re-enter cancels owned motion while retaining the cached room's usable prop instances.

## Evidence

All original attempts, failed traces and final captures remain under `game3d/shots/canteen-meals/` and are hash-verified in main before worktree retirement. Final service pair: `physical-final-{1366,390}`. Native receipt/seat pair: `native3-1366`, `native4-390`. Period recovery: `recovery-final-1366`, `recovery3-390`. Final diners: `diners5-390`, `diners6-{1366,390}`, `recommendation-final-390`. Normal portrait entry: `diners5-390/arrival.png`. Price: `price9-390`; water close view: `water15-390`.

Earlier wide or occluded frames are not acceptance evidence. Retained failed rounds include mouth/head pose, cup reach, staff turn clearance, fallback sitting, container reach, wrapper-centre reach and phone framing. The fixes preserve the original contact/collision bars. The wrapper now has a near-edge grip instead of treating its centre as the grip. The cardigan uses the actual adjacent end chair so both her props and native Talk approach remain reachable.

Both full day-one hardware routes pass in 73 seconds (desktop 12,807 steps; phone 12,731): zero overlaps, spins or sustained gait failures. Each has one short gait advisory. Existing renderer budget warnings remain in unrelated outdoor/dorm places; no thresholds were changed. These broad routes do not substitute for the scoped canteen native checks above.

## Audio and integration

Exact source was cold-read before generation. 53 original new clips plus two receipt-recovery protagonist clips use approved aliases; all selected takes have no fallback. New source checksums: `f8ad933567a25b0dc51144cfd31c67be414c6115eddb1b2bc72ec6192ba7f0fa` and `394725133b5e3947369d52015c26d66a03b7af802f4ba7cc6e64822674ffd727`. Main's existing clip records and timing spans were preserved, including the inherited irete timing limitation. Rebased manifest coverage: 1,685 lines, all with clips and no escapes. This records automated qualification, not an independent human listening verdict.

Root performed repeated source and visual reviews. Final independent review identified a wrong recommendation referent; it is corrected and protected by an actual authored-flow test. The independent reviewer reported no further concrete blocker. Rebased full CPU gate passed 617 tests. Durable Showcase images use `bible/shots/showcase/canteen-meals-1/` with scoped uploaded asset-lock entries.
