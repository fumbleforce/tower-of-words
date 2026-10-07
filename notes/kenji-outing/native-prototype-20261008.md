# Kenji outing: held native QA handoff · 2026-10-08

Worktree: `/home/jorgen/repo/japanese/.claude/worktrees/codex-kenji-outing`.
Artifacts: `/home/jorgen/repo/japanese/game3d/shots/kenji-outing/`.
Base HEAD: `ad07d1efa3e2b748f1cee3922e86120cbcdaa332`.

Final native runs r46/r47 pass the actual arcade story controls on desktop Eric and phone Carina, including Quickslot/Continue while Runner choices are open, Stay, Chat reentry and Keep walking. Both bodies are visible in the final spoken/menu/reentry frames. Final measurements show zero heading error toward the actual frontage, no queued aside, no movement during the sampled settled choice phase, and all 18 HTTP source receipts match current files. This worker made no commit, landing, deployment, dialogue or voice generation.

## Release state

Keep the candidate uncommitted in the isolated worktree. Root reports full CPU r9 passes 725 tests. Strict desktop and phone fast checks stop before the browser because 28 voice clips are missing; no override was used. The Claude story-reader attempt produced no review because its weekly allowance was exhausted (reset October 9 at 07:00 Europe/Oslo). Story approval, subsequent voices, fresh strict fast checks and release remain held. Native interaction checks do not approve those gates.

Root separately preserved 40 owned public source files and a patch under `held-source-20261008/`; its manifest owns that archive. No more QA source edits are pending. Its copies of both native tools match the worktree.

## Passing native receipts

All paths below are relative to the main artifact directory.

| Rounds | Coverage |
|---|---|
| r13 Eric desktop, r14 Carina phone | Prototype invite, ordinary follow, real paid/collected milk, paid Continue, shop return, plaza/east_lane/coast walking route, actual bench pair, seated Continue, keep walking |
| r15 desktop, r19 phone | Actual arcade arrival and callback; Quickslot while Kenji physically walks home; Continue completes that saved departure |
| r16, r35 phone | First paid/collected visit and paid Continue; second empty-handed visit/return stays active with one drink receipt and unchanged yen/inventory. r35 has fully enabled choice captures |
| r18 desktop | Real office_lane marker departure; saved leaving snapshot paused with Kenji visible; Continue reaches forecourt paused with Kenji released |
| r20 phone | Real period pause, resume, Continue, physical finish. r8 preserves the earlier desktop state pass and original finish disappearance |
| r22 desktop | Coast sitting, real afternoon pause, Quickslot Continue retains the matching seated player pose while Kenji stays released |
| r23/r24, r31/r32 | Actual Chat UI invite/route/arcade, full walking route to coast, bench controls, seated Chat, stand and physical finish. Earlier visual defects are retained below |
| r38 phone | Prototype invite/fast native coast arrival, then actual Chat → Sit → first Kenji line → Stay → seated Chat → Get up, after the duplicated pre-seat question was cut |
| r42/r43, r44/r45 | Live arcade Runner-choice Continue restores the same menu, one arcade receipt and bound visible companion without replaying spoken opening; r44/r45 also verify corrected player heading. These precede the final scoped reentry camera |
| r46 desktop, r47 phone | Final frozen source: actual invite, arcade spoken/menu, heading/aside checks, live Runner-choice Continue, Stay, Chat reentry and Keep walking. No browser camera override |

Independent reviewer `resume_briefcase` inspected all 32 final r46/r47 frames and reported no remaining findings within this native visual scope. This does not provide Claude story or voice approval.

Final reports: `prototype-r46/1366-eric-storyarcade.json` and `prototype-r47/390-carina-storyarcade.json`. Key frames use suffixes `dialogue-5`, `dialogue-6`, `ui-arcade-complete`, `ui-arcade-choice-continue`, `ui-arcade-stay`, `ui-arcade-chat-reentry`, and `ui-arcade-keep-walking`.

Bench reference: `prototype-r38/390-carina-storybench-ui-bench-controls.png`. Enabled transaction references: r35 `paid-uncollected`, `paid-continue`, and `collected`. All earlier screenshots remain, including failed candidates.

## Physical and restoration findings

The approved player/Kenji models remain unchanged. Real terrace surface y is 0.340000004. Before/after seated Continue, rendered support gaps are approximately -9.48 to -9.50 mm for Eric/Carina and -8.03 to -8.06 mm for Kenji, within the existing 3 cm tolerance. No rig or contact threshold was reshaped. Stationary marker anchors after seating/Continue and completed parting track the displayed actor (under .3 m xz).

Native QA found and drove these repairs:

- Mechanics retained real bench/occupancy checks and found reachable bench-end approaches using shared body clearance.
- Root fixed day-cast lazy adoption of the traveller after shop Continue. Kenji returns at his saved wait position rather than jumping to scheduled home.
- This worker added a matching-place seated player capsule after native floor normalization/final setup, including paused saves independently of companion activation. Focused tests cover walking/other-place/legacy saves and zero paused actor activation.
- Root repaired actor marker rebinding and physical, persisted departure instead of an immediate visible disappearance.
- Arcade tangent/outward placement exposed a queued Walker sidestep. r41 records Kenji's scripted approach calling makeRoom at player [.456676, -11.241728], assigning aside [1.999674, -11.287593] toward the doorway. Other visible named actors were stationary. Root added scoped player ownership during paired placement, both-arrival validation and correct facing after release; no global movement rewrite.
- Final scoped cameras show the physical pair: arcade yaw -2.65, elevation 42°, fov 55, min distance 3, half-width 1.1, height .25; seated coast yaw .6, elevation 30°, fov 45, min distance 4, half-width 1.15, height .15. Arcade Chat reentry uses its view only near the actual frontage.

Own runtime scope was lifecycle install/attach/enter/travel seams, schedule clock/ownership handling, final Continue restoration and narrow seated-player attachment restoration. Root owns controller, actors, movement repair, story and cameras. Own attachment/lifecycle regression rerun: 7/7 pass (`native-logs/outing-owned-final-tests.log`); the earlier combined attachment/controller/lifecycle run passed 18. Root owns final whole-suite and independent source review evidence.

## Retained failures and camera attempts

| Rounds | Failure or limitation |
|---|---|
| r1, r12 | Native transition removed a pin before its queued click; helper now recognizes departure again after settling |
| r2, r5, r7 | No actual free/reachable coast pair; repaired reachable end approaches and exact shared clearance |
| r4 | Phone tap before its 900 ms input guard; action waits now respect the guard |
| r9, r11 | Diagnostic found zero skinned support vertices; refresh bind inverses before measuring real contact |
| r10 | Active seated Continue normalized player to entrance; capsule restoration repaired |
| r17 | Unsupported-travel fixture omitted actual pin click; now performs the native action |
| r21 | Paused seated Continue omitted player capsule; repaired and r22 passes |
| r28 | Touch target read while camera moved after sit; Chat waits before reading coordinates |
| r23/r24 | Control flow passes; arcade frontage and phone bench panel obscured physical actors |
| r25/r26 | Four browser-only arcade views exposed Kenji inside doorway; tangent placement repaired |
| r27/r29 | Browser-only bench views; view 3 clears both sizes, negative/frontal variants have tree occlusion |
| r30 | Transaction state passes, but captures still caught dim input guard; r35 recaptures enabled choices |
| r31/r32 | Full UI route passes; arcade camera still behind opposite awning after tangent staging |
| r33/r34 | Browser-only narrow-aisle views; trial 0 clearest, but actual portrait state still required verification |
| r36/r37 | Actual spoken/menu portrait overlap and obscured Chat reentry; Stay captures were still in release motion |
| r39/r40 | Browser-only lower-height trial: phone horizontal clipping, player still displaced back to door |
| r41 | Instrumented actual story identifies successful scripted makeRoom/aside assignment; preserved stack and samples |
| r42–r45 | Mechanical/Continue passes before final facing/reentry source. Loaded source versions retained, including reloads |

An interaction PASS never erases a recorded visual failure. `native-attempt-index.json` indexes all retained rounds and assertion failures.

## Protection, reproduction and provenance

Every browser context installs `scopedRoute({publicOnly:true})` before navigation and forces `privateMode:false` on startup and Continue. No private content was inspected. Native travel uses ordinary Walker navigation and rendered marker/action controls; transactions use real choices; Continue uses F5/the phone Quickslot and title UI. `withBrowserJob` owns GPU admission and a 295-second cap per attempt.

From the worktree, with the shared public server on 8771:

```
ROUND=prototype-next MODE=storyarcade STORY_CONTINUE=1 CHECK_FACING=1 MOVE_DIAG=1 node game3d/tools/outing-check.mjs 390 carina
```

Modes also include `full`, `repeatshop`, `clock`, `arcade`, `unsupported`, `pausedseat`, `story`, `storybench`, `arcadeview`, and `benchview`. `story`/`storyarcade` use actual Chat/choice controls. `storybench` seeds prototype travel, then uses actual bench UI. View modes and TRIAL_HEIGHT are explicitly browser-only diagnostics, never final authored-scene evidence.

Starting r33, captures wait for fade overlays, `.chips.arming` removal, computed choice opacity 1 and settled conversation camera velocity, recording button state and camera pose. Later Stay/KeepWalking captures also wait for release settling. MOVE_DIAG wraps makeRoom to record successful assignments without changing its result.

`native-final-verification.json` verifies final heading, pose stability and HTTP source hashes. `native-source-sha256.txt` hashes final source/test/tool files. `native-evidence-sha256.txt` hashes all native round files, native logs and native handoff/metadata except itself; the root-owned held-source and validation directories have separate ownership/manifests. The older camera freeze receipt remains as historical disk-hash evidence. r46/r47 additionally record actual HTTP hashes for place cameras. No captures or failed attempts were discarded.
