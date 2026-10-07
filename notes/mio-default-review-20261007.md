# Independent Mio #335 review

Verdict: PASS for the bounded selected-model integration and inspected native contacts. No blocking source finding remains in the runtime state frozen by the worker on 2026-10-07. Scoped visual score: 8/10. Integration/rebase, final broad checks and exact-head boot remain the implementer/root's responsibility.

Reviewed worktree: `/home/jorgen/repo/japanese/.claude/worktrees/codex-mio-default-335`, runtime delta from `9918ebc8`. The newer main contains the approved85% default; native evidence here uses explicit85/100 queries. This is not approval of the whole train/office environment, scene writing, normal camera composition or phone hardware performance.

## Source findings resolved during review

1. **Laptop ownership and saved coordinates.** The initial root-child attachment would have carried the laptop with Mio and interpreted older car-relative transforms incorrectly. Final `game3d/js/places/train-laptop.js:25` keeps the prop under the car, derives position from actual seated thigh support and updates support during busy beats. Hands use the existing solver only when idle. Native stand/reparent evidence reports no attachment to Mio and zero prop movement after moving her body.
2. **Actual legacy seated-save migration.** Legacy and native bodies have different sitAt root contracts. `train.js:1434` now records `mioBody`; `train.js:1588` queues migration only for legacy/absent markers restored into seated native Mio. `train-laptop.js:36` applies it once on the next update, after saved-place decorators, and preserves restored visibility. Selected snapshots and standing roots are outside the migration condition. The full legacy100-to-selected85 snapshot run tests the outer Sunday actor restore too.
3. **Contact evidence timing/occlusion.** Generic lunch screenshots were sometimes taken after the named contact or had the hand hidden by a wall. They were insufficient for visual certification. The final held-detail captures pause the actual action contact through its next wait, before release, and move only the diagnostic camera. I individually inspected all six final85-desktop/100-phone cable pickup, cable hook and bento pickup images. These expose actual palm/prop geometry and close the evidence gap. Earlier frames remain retained; do not present them as clear contact proof.

## Source acceptance

- `chibi.js:286` defaults to approved mio2 and preserves `?mio=legacy`. The optional chibi look remains separate.
- `avatar.js:266` supports `extra:'phone'`, while preserving existing boolean all-extra callers. The retargeted phone pose has13 upper-body tracks; approved mesh, texture and locomotion are unchanged.
- Shared keyboard geometry is extracted without a replacement art kit. Mio's existing desk keyboard moves onto its reachable near edge. Seated work uses two existing hand solvers, excludes Spine from their chains and exposes actual physical targets; solver limits are unchanged.
- Native lip coordinates are specific to mio2; legacy mouth coordinates remain. Cable and bento targets lie on their prop rims/sides.
- Current diff has no whitespace errors. Reviewer made no runtime changes and did not repeat broad CPU checks.

## Independently inspected native evidence

All relative paths below are beneath the worktree's `game3d/shots/`.

- `mio-default/final85b-1366/{train,office}-side.png` and earlier matching final85 views; `final100b-390-390/{train,office}-side.png`; corresponding100-detail views from final100-390. Laptop rests at thigh height, palms reach keyboard, desk keyboard remains supported. The earlier floating laptop/prayer-hands defects are absent in these inspected contacts.
- `mio-default/final85-1366/phone-side.png`, `final100-390/phone-{front,side}.png`, and latest `final100b-390-390/phone-side.png`: phone pose loads and visibly holds the upright device. Some diagnostic views crop the body or prop edge; they are not normal gameplay framing approval.
- `mio-lunch/mio335-100-1366-final/1366-2-bite-mouth.png` and `mio335-85-390-final/390-2-bite-mouth.png`: food tip reaches the visible mouth.
- `mio-lunch/mio335-85-1366-held/1366-3-{cable-pickup,cable-hook,bento-pickup}-held-detail.png` and `mio335-100-390-held/390-3-{cable-pickup,cable-hook,bento-pickup}-held-detail.png`: fingers/palms meet the visible loop or box edge. Bone-target gaps are1.5–3.4cm; these are bone-origin measurements, not surface gaps. The actual low-poly hand surfaces visibly meet the props.
- `mio-default/legacy-upgrade85-final-1366/report.json`: real legacy100 actor root migrates to native85 root exactly, seatGap0, laptop gap4.8e-11, hiddenPreserved=true, selectedPoseGap0, follows0 after actual stand/reparent. I inspected both helper implementation and result. My separate public-only actor/prop legacy85 probe also passed with errors[], but deliberately does not claim full decorator coverage: `/tmp/codex-mio335-save-probe-final.json`.
- `mio-default/legacy85-390/report.json`: explicit original adapter still loads, seats and completes its comparison cases without errors.
- `mio-lunch/mio335-85-390-continue/390-2.json`: actual Save/Continue recorded continued=true and errors[], final interaction complete. This is distinct from direct train snapshot restore coverage.

Latest numeric work-contact reports show85 desktop train wrist gaps about0.32/0.51mm and office3.6/3.9mm;100 phone train0.50/0.73mm and office0.95/1.79mm. Both held lunch runs finish their real Talk step3 sequence without errors. I inspected sustained-motion data:155 samples each (95walk,60run), about4m travel and nonzero late-half leg variation for both phases. This supports continued animation beyond the first step; it does not independently certify every frame against foot sliding.

## Visual score and limits

Scoped to changed character/prop integration: A coherence/material compatibility8, B character grounding/pose8, C contact staging8, D contact readability/light8, G legibility8, H finish8; E/F normal UI/gameplay-camera scoring is outside these diagnostic captures. Weighted scoped result8. No cap-triggering floating prop or detached hand found in the accepted contact views. Low-poly hands and selected hair proportions remain the approved model.

Idle typing evidence does not claim keyboard contact during authored busy-dialogue gestures; support correction still runs while busy. Full scene art, broad performance, all phone devices and every future authored pose are not certified by this review. The worker reported661 broad tests passing before final packaging; final rebased tests and exact-head verification must be reported separately.
