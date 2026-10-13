Historical handoff preserved on 2026-10-13. Its task status, worktree paths and restart instructions describe the date below; check current Git and work issues before acting.

# Codex karaoke contacts restart handoff — 2026-10-08

User requested restart preparation: all work stopped, no new jobs or commit. Agent `/root/izakaya_detail`; parent `/root`; independent reviewer `/root/review_rollout`.

## Exact WIP

- Issue #349, running: inherited karaoke receipt and microphone pickup/handoff contact failures.
- Worktree `/home/jorgen/repo/japanese/.claude/worktrees/codex-karaoke-contacts`.
- Branch `wt/codex-karaoke-contacts`, base HEAD `9a53313daaef29042c251215bc3f4408e4596093`. Main advanced independently; parent handles rebase/land/release, asset hydration if needed.
- **No commit started or created. Nothing landed/pushed.** Preserve worktree and every capture.
- Own exactly six files: `game3d/js/places/ongoing/karaoke-hands.js`, `karaoke-actions.js`, `karaoke-stage.js`, `karaoke-props.js`; `game3d/tools/karaoke-stage-check.mjs`; new `game3d/test/unit/karaoke-hands.test.mjs`.
- Untracked hydrated `art/parts/*` directories are assets, not authored changes. Do not stage them.
- Claims main inbox X-0930 (helper/actions/checker/tests), X-0934 (stage), X-0954 (receipt pivot + sequence, corrects duplicate X-0951). X-0955 reserved worker release. Root owns contacts Showcase under X-0936.
- Exact current six-file SHA256 manifest: `game3d/shots/karaoke-contacts-20261008/final-source-sha256.txt` in MAIN, refreshed at shutdown.

## Current implementation

The four original limits remain pickup `< .05`, handoff `< .075`.

- Arm-first local CCD: at most 40 iterations, first 20 arm-only, next 20 allow the three actual torso joints; total torso lean remains .75 radians (.25 each); .002 convergence break. Temporary bone rotations and original update function restore on dispose/cancel.
- Native rigs have rigid hands without finger bones. Temporary wrist-axis alignment puts the actual palm against the prop shaft; held props follow actual wrist.
- Player walker sync happens before authored facing so it no longer resets the handoff orientation.
- Microphone pickup uses the correct shoulder side at [-1.41,-2.13]; carry target lowered to y.55, .18 forward.
- Quarter-turn handoffs place inward hands at shared [.76,.48,-.85], give heads/forearms room; handoff hold remains original650ms at runtime. Both protagonists validated.
- Receipt uses upper-corner grip: mesh local y -.13 and resting root z -2.26. A unit invariant verifies every original front/back world corner is unchanged (size/artwork unchanged).
- Receipt stays flat while Hamada steps from [.44,-2.12] to [.82,-2.12], moves forward outside body, then folds downward into reading pose [.73,.55,-1.86]. Flip takes place in open floor. Set-down reverses fold/motion to tabletop, then restores resting orientation. `follow` carries wrist target with walking root. Story/save fields unchanged.
- Checker captures actual pickup endpoint and shared handoff with temporary diagnostic holds/reframing, original four limits, player facing, held snapshot restoration, original update cleanup, actual quicksave/title Continue UI, leave cancellation. New tabletop check tests every vertex .55<y<.57 and >90% horizontal sheet area supported by actual tabletop bounds. This permits ordinary paper overhang; do NOT describe it as full containment.

## Current passing evidence

All paths below are MAIN `/home/jorgen/repo/japanese/game3d/shots/karaoke-contacts-20261008/`.

- **Authoritative native final: `final-2/1366/` and `final-2/390/`, 41 original PNGs each.** Logs `final-2-1366.log`, `final-2-390.log`; both `KARAOKE_STAGE ... true`. Reports pass:true, errors[], blocked[], actual Continue saved held receipt and side, cleanup and placeLeave pass.
- Desktop contact gaps: receipt pickup .00177871; mic pickup .00175675; Kenji→Hamada .00656931; Hamada→Eric .02180721.
- Phone Carina: receipt .00187258; mic .00172540; first handoff .00654273; second .02314226.
- Full CPU **PASS**: `final-cpu-2.log`. Earlier `final-cpu.log` failed checker lint (`__game` unqualified), corrected to `globalThis.__game`. This checker-only qualification happened while final-2 captures ran; predicates and browser runtime were unchanged. Do not claim the running Node checker byte hash matched after that qualification; behavioral equivalence is explicit.
- Focused unit **11 PASS**: `final-unit.log` (two native-chain-shaped left/right reach/restore tests + original stage tests + pivot corner invariant).
- Strict fast exact runtime **PASS no overrides**: `top-grip-fast-1366.log`74s and `top-grip-fast-390.log`73s. Public scope receipts in corresponding `top-grip-fast-1366/` and `top-grip-fast-390/`: 708 fetched runtime hashes each, failures[]. Existing plaza/dorm perf warnings.
- Fast originals safely outside worktree: MAIN `game3d/shots/fast/2026-10-08T20-34-47-447Z-1980561` and `2026-10-08T20-34-48-664Z-1982431`.
- `git diff --check` passed before checker lint qualification (only replacement since then).

## Review status and remaining actions

1. **Finish final visual/source review; do not commit before acceptance.** Reviewer accepted all32 `receipt-top-grip` + all6 `receipt-return-side` originals: previous table/head intersection P2 closed, bounded8/10, stylized grip and high return arm acceptable. Mic/handoffs were already accepted in candidate6. Reviewer was inspecting final-2 at shutdown; ask root/reviewer for latest result before redoing work.
2. Worker personally inspected ALL41 final-2 desktop originals. Phone first16 through selectNumber inspected: start motion/end, queue motion/end/dialogue, clearQueue motion/end, receiptFront motion/pickup endpoint/pickup side/end, receiptBack motion/end/dialogue, selectNumber motion/end. **Remaining25 phone originals (mic pickup/carry, both handoffs, group states/dialogues, Continue,last) still need worker inspection.** Original full files, not contact sheets.
3. Phone receiptFront/end and receiptBack/end place Hamada at far right before dialogue in direct invoked-hook harness; receiptBack dialogue centers full actor and paper clearly. Reviewer notified. No global-camera edits proposed. Assess this honestly; actual activity dialogue is readable, but intermediate direct-hook screenshot is not complete body proof.
4. Reviewer must inspect revised supported-area assertion and failed `final/` originals. Parent agreed full containment was wrong criterion for ordinary overhang. Do not widen original hand contact limits.
5. After accepted review, commit ONLY six owned files, title/body identify **Codex**, `Fixes #349`, `Facts: none` (unless genuine facts edit becomes needed). No land/push by worker. Send SHA to root. Parent handles final landing/rebase/head boot.
6. Complete scratch Showcase entry (root owns docs commit): generator `make-entry.py` and `entry.json` in shots root. **583 surviving PNG originals now exist**, across24 attempts; current entry was generated before final-2 completed and is stale (531 count at last generation). Regenerate after review and update final-2 caption/preview and overall caption to accepted status, preserving every failed/invalid/interrupted attempt. Do not stage entry in runtime commit. Captions must say invoked native activity with scripted walking approaches; actual title Continue UI; held/reframed diagnostic endpoints. Not manual story-trigger traversal.
7. Update issue next step/claim release after commit, coordinating with root. X-0955 reserved.

## Failed attempts / why preserved

`final/1366` and `final/390` stopped at newly added full-containment assertion: paper maxx .23649/.23680 vs tabletop trim .232 (4.5–4.8mm ordinary overhang), y~.555 above top. The pause-heavy targeted run had allowed more convergence (.228 maxx). No runtime fix was warranted. Parent approved replacing this NEW too-strict assertion with supported area/height; original four hand tolerances untouched. Both failed logs and17 originals each retained.

Earlier candidate1 numeric pass rejected head/forearm collision; candidate2 widened stance failed contact; candidate3 rejected facing/palm/receipt hair; candidate4 interrupted server/process; candidate4-retry numerical pass but visual defects; candidate5 improved handoffs but receipt hair; candidate6 numerical/CPU/fast passes but receipt through table/chin. `receipt-clearance` was invalid direct pose probe outside active action and is labeled invalid. Every surviving original stays.

Attempts in capture-time order: candidate-1(70), pose-probe(3), pose-armfirst(3), pose-centered(3), pose-stagger(3), candidate-2(36), candidate-3(74), candidate-4(19), candidate-4-retry(41), receipt-clearance(3), player-contact-probe(4), receipt-clearance-2(3), receipt-shoulder-probe(3), player-shoulder-probe(4), quarter-contact-probe(4), receipt-forward-probe(3), quarter-contact-near(4), candidate-5(41), candidate-6(82), receipt-sweep(28), receipt-top-grip(32), receipt-return-side(6), final(34), final-2(82). Counts sum583. Numeric diagnosis JSON-only folders also retained.

## Process state at shutdown

**No active worker browser, check, commit or shell job remains.** Confirmed process-list scan showed no karaoke-stage-check, receipt scripts, fast or check/run process (only scanning shell).
- Final canonical handles99204,95499 exited0.
- Final CPU41755 exited0.
- Prior final attempts42529,11904 exited1 (new containment assertion; retained).
- Fast91734,83060 exited0.
- Targeted81172,78850 exited0.
- Prior CPU2043 exited0;28418 exited1 lint (retained).
- Main server8771 is PARENT-owned (last known parent handle1528, `/tmp/codex-rollout-continue4-server.log`); do not kill it. Revalidate parent server after restart.

## Commands for continuation (only if new changes justify rerun)

Canonical from MAIN:
`BASE=.claude/worktrees/codex-karaoke-contacts/game3d OUT=/home/jorgen/repo/japanese/game3d/shots/karaoke-contacts-20261008/<new-round>/1366 node .claude/worktrees/codex-karaoke-contacts/game3d/tools/karaoke-stage-check.mjs 1366`
(and390). Always unique folder; do not overwrite successful captures.

Fast from MAIN uses existing `--import ./game3d/shots/caption-clearance-20261008/public-loader.mjs`, `BASE=.claude/worktrees/codex-karaoke-contacts/game3d`, optional `CODEX_239_EVIDENCE=<new-evidence-dir>`, `node ... game3d/tools/fast.mjs 1366 860` /390844. All browsers withBrowserJob/scopedRoute publicOnly/privateMode:false. No wake binding for subagent. Runtime formatting uses tools/check/format-runtime.mjs formatOptions + assertSameSyntax, not bare Prettier defaults.
