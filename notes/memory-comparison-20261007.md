# Remembered-language comparison (#336)

Remembered Japanese remarks now offer an optional “What I understood then” comparison when current vocabulary changes their readable text. It uses the vocabulary snapshot recorded at the original hearing. Names and original contextual glosses remain readable; learning a new word does not insert it into the historical reading. Legacy saves with a null snapshot receive no invented comparison. Opening the comparison neither teaches vocabulary nor changes conversation eligibility.

The control starts collapsed. Its summary has a 44 px touch target and visible keyboard focus. Tab/Shift-Tab and controller left/right navigate visible log controls; Enter/Space and controller A activate them. Existing up/down scrolling and B/Escape closure remain. Independent review found that Close initially handled only pointerdown; the click handler now covers keyboard/controller activation too.

## Native evidence

`game3d/shots/memory-comparison/round1` through `round5` are retained, with PNGs and reports copied to the main checkout and checked by SHA256. They exercise the real native backlog UI with explicitly stored-remark fixtures, **not a complete authored story progression**. Desktop 1366 × 860 and phone 390 × 844 checks cover before-learning/current/original readings, null legacy history and several remembered remarks. They preserve the recorded vocabulary while the current rendering reveals 行きたい. No horizontal overflow or browser errors were recorded; the summary measured 44 px.

Round 1 legacy captures caught a transition midfade. Round 2 waits for settled opacity. Round 3 adds multiple remarks and controller navigation. Round 4 checks the Close correction with controller-left/A and Shift-Tab/Enter. Round 5 additionally checks Space and captures the complete first entry in the long list. Every attempt remains available; round 5 is the Showcase preview and first section. Mouse, touch and injected standard-gamepad input were exercised. Retained up/down input is source-reviewed, without a separate native scrolling assertion. These runs do not certify physical controller hardware or phone performance.

Independent critic: `game3d/shots/memory-comparison/validation/codex-memory336-review.md` (original `/tmp/codex-memory336-review.md`), PASS after the Close correction, scoped visual 8/10. The critic inspected all 10 round 3 frames and both corrected round 5 long-list frames. Scope is the comparison UI, excluding whole-world art and authored-route progression.

## Validation and retained failures

CPU check `/tmp/codex-memory336-cpu2.log`: 666 tests PASS before the one-line Close correction. After the Close correction, the final commit gate passed all 666 tests and checks (`/tmp/codex-memory336-commit-final.log`). Source commit `8e385a55110b` then passed the exact-commit landing gate and public title boots at 1366 × 860 and 390 × 844 with no errors (`/tmp/codex-memory336-land-final.log`). The worktree and task branch were retired.

Strict native route regression:

- Carina 390: PASS, 72 s, artifacts `game3d/shots/fast/2026-10-07T14-07-54-055Z-3074172`.
- Eric 1366 first attempt: FAIL, 73 s, office sliding detected at t = 364.3 s for 4.8 s; artifacts `game3d/shots/fast/2026-10-07T14-07-52-899Z-3073196` retained unchanged. Root tracks this gait failure under existing issue #319.
- Eric 1366 repeat: PASS, 72 s, artifacts `game3d/shots/fast/2026-10-07T14-10-42-764Z-3100111`. No overlaps/spins and no gait anomaly lasting 2.4 s or more. The successful repeat does not erase the prior failure. Existing performance warnings remain in the logs; no performance improvement is claimed.

Raw route PNG/result/performance files and logs are copied to main with hash verification. Validation logs and the critic live under `game3d/shots/memory-comparison/validation/`. `showcase/memory-comparison-20261007/evidence-sha256.json` records these raw copies; `capture-sha256.json` maps all 46 Showcase PNGs to their originals. R2 upload is restricted to the exact `bible/shots/showcase/memory-comparison-20261007/` prefix, preserving unrelated asset-lock entries. No binary is committed to Git.

The bounded public Showcase check passes at both sizes: 46 unique image IDs and paths resolve, five sections render, round 5 is first, its ten images are present, and the chosen preview decodes after collapsing the entry. No page errors or horizontal overflow. The test uses the existing public Bible renderer with only this Showcase item exposed. Three earlier probe attempts are retained as setup limitations: the direct-entry view intentionally hides its lazy preview, so waiting on that hidden image stalled; the final probe collapses before inspecting the preview. No application change was needed.
