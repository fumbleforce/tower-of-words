# Independent scale #322 final review

Verdict: source and measured-contact PASS for making the selected 85% size the default. No established runtime blocker. Scoped visual result meets 8/10 for the size, seating, carry, payment and dispenser corrections visible in the supplied evidence. Do not extend this to an all-actions visual-contact certification: tray-return hand contact remains occluded or missed by the diagnostic capture.

Reviewed stable codex-scale-85-default source, tests, diagnostic helpers and notes/character-scale-default-20261007.md. No runtime or metadata edits, browser reruns or broad CPU repeats during this review.

## Source and regression meaning

The shared resolver selects .85 without a query and retains explicit100/67 comparisons. Constructor callsites already scale native avatars, Mio and fallback chibis before seat/stride measurement. No save migration or extra scale layer appears. World roots, navigation, locomotion speed, furniture and shared IK limits are unchanged. Canteen carry now scales its body-relative height/forward offset. Pickup targets remain on the real tray rim; cash and lever targets remain on their supporting surfaces. The lever reach reads the actual object position. Delivery derives its final point from the service edge and worker size. The focused delivery regression covers both85 and100, tightens contact from8cm to2.5cm, and checks clearance; it does not disguise a regression by weakening the solver or acceptance bound.

Native before/default report heights independently inspected: Eric1.416→1.2036, Carina1.3216→1.12336, exactly.85. Their canteen underside contacts remain roughly9.44mm into the cushion at both scales. Current-hips measurement fixes the prior probe's stale-position issue; this evidence supports the reported #323 checker correction, not a claim of new seating runtime behavior.

## Observed evidence

Individually viewed all8 contacts3 seat frames (Carina1366, Eric390: office/train/canteen/pool), Eric forecourt100/default pair, Carina canteen-detail100/default pair, and selected final5 canteen frames: phone payment detail, tray collection detail, return detail, cup-under-outlet detail, water-control detail, sip and spoon; desktop staff placement, collection detail, return placement and water-control detail. Also viewed100 phone collection, water-control and return frames.

Train, canteen and bench poses visibly sit on the furniture; the office desktop/phone desk conceals the cushion, so office contact relies more on the actual mesh measurement. All8 measured seat deltas lie between−8.02mm and−9.52mm. Selected carry frames show the tray supported at its edge; staff placement reaches the service tray without walking through the counter. Phone payment and dispenser details show the palm at the surface/lever, and mouth frames place spoon/cup at the mouth without gross head displacement. The desktop water-control detail has already settled and is not held-contact proof. Smaller default bodies remain identifiable and grounded in the unchanged wide scene.

Independently recalculated supplied JSON: final85 phone25contacts/4985worker samples, desktop25/5076, explicit100 phone25/4979; errors=[] in all three. Every contact passes the existing8cm wrist or3cm lip rule. Largest85 phone wrist distance is7.53cm at return placement; desktop6.23cm. Largest lip gap is1.78cm; neutral head shift stays below0.43mm. These are wrist/target distances, not measurements of the visible palm surface.

Worker trace geometry clearance is10mm with the helper's root-scaled radius. Cross-checking every sample against the actual bodies() envelope (.24*1.18) still passes: minimum3.628mm at85 and52.48mm at100. This makes the current result safe, but the two radii should not be described as identical.

## Nonblocking findings / evidence limits

1. game3d/tools/canteen-meals-check.mjs:22 records .24*root.scale.x, while live movement/shared.js:85 uses BODY*P.charScale. At85 this is.276828 versus.2832. The present route clears both, independently checked above. In a later helper cleanup record the live collision envelope too, or label the current value explicitly as the body-scaled geometric proxy. Avoid claiming10mm native navigation clearance.

2. game3d/tools/canteen-meals-check.mjs:34–43 takes the normal screenshot before pausing/reframing. With a250ms hold, the detail can arrive after release. This is already acknowledged in the note. In particular final5 returnTray-tray-place-contact.png is hidden by the return sign/wall and the phone detail shows a settled standing pose. Thus the7.53cm return wrist gap passes numerically but cannot be independently judged as a convincing palm/rim contact from these frames. A future targeted held-contact frame would close this specific visual gap; do not present the settled frame as proof.

The worker's focused5 tests, broad660/660 and final full-fast runs are supporting reported validation, not independently rerun checks. Synthetic native seat placement proves fit, not every story transition. Existing bag attachment issue#333 remains outside this delta. No whole-canteen art-direction, complete-story contact or hardware-phone performance approval is implied.
