# Held Kenji outing candidate

This work implements the outing selected in [game-additions-1](../../reviews/game-additions-1/review.json), tracked by #339. It remains an unvoiced candidate in `codex-kenji-outing`; it has not been released or deployed.

## Story review

The earlier prose contract is at main commit `7c283271`. The playable candidate is `game3d/story/conversations/outing.js`; it is merged through the existing shared conversations and Kenji’s secondary Chat action. His primary story interactions and earlier arcade topics remain available.

`node game3d/tools/outing-story-check.mjs eric` and the same command with `carina` record 33 Runner branches each. These use the actual Runner and outing model with controlled physical hook outcomes; they do not certify rendered staging. The independent story reader found and rechecked recovery menus after failed movement, the repeat-stop stay response, shop-entry wording, truthful callbacks and both protagonist identities. No blocking findings remained. One optional nuance in the arcade callback remains blurred Japanese; choices and actions do not depend on it.

Claude’s configured story-reader was invoked read-only on October 8, but returned its weekly limit notice (reset October 9, 07:00 Europe/Oslo). It produced no review. X-0828 records this limitation. Required Claude story review and voices remain outstanding.

## Mechanical verification

[Native QA continuation](native-prototype-20261008.md) records individual routes, exact saved-state repairs, protected browser setup and artifacts. Every attempted capture remains under main `game3d/shots/kenji-outing/`, including rejected camera views and failures. New movement was tested separately before conversation integration.

The registered hooks validate invitations against actual schedules, perform actual frontage/shop/bench movement, preserve paid versus collected shopping state, and restore both actor identity and seated player position. Physical repeated stops cannot add another receipt. Parting walks Kenji to his saved local approach or a real departure edge before release. No word, bond or reward is granted.

Later integration repairs add actual waiting/seating/completed-stop flags, outing-owned side goals that clear on pause/finish, and Continue ordering that prevents a completed saved departure from resurrecting its old goal. A regression checks that another activity’s replacement goal survives.

## General save checks

The initial candidate run reproduced two existing generic-check failures on unchanged main. The separate QA-only repair landed as `ad07d1ef`: an exact office initializer expectation, an actual paused braking save, and the current forecourt lift fixture. Its rejected and passing evidence lives in main `game3d/shots/save-checks-20261008/`. Candidate registration, all 12 Continue cases, five scene checkpoints and all five transitions then passed in `/tmp/codex-outing-browser-checks-r3.log`.

CPU round r7 passed 721 tests and all gates after preserving the existing Continue UI refresh order. Round r8 passed 724 tests and all gates after the arcade movement ownership repair. Final round r9 includes the further cancellation regression and scoped Chat reentry camera: all 725 tests and all CPU gates pass (`/tmp/codex-outing-check-r9.log`).

Initial `/tmp/codex-outing-fast-{1366,390}.log` runs accidentally used the default main URL. They are baseline evidence only. The subsequent explicitly targeted candidate runs `/tmp/codex-outing-candidate-fast-{1366,390}.log` passed at both sizes with protected-route interception. Final strict desktop and phone runs both stop before opening the browser because 28 spoken lines have no clips (`/tmp/codex-outing-final-fast-{1366,390}.log`; the earlier desktop receipt counted 29 before a duplicated bench question was removed). No voice-check override was used. These are held-candidate failures, not passing final fast tests.

## Arcade movement and camera correction

Native round r41 identified the displacement: Kenji’s routed arrival called `makeRoom` after the player had already reached the aisle. `walker.sync()` retained that queued aside movement, which pushed the player back into the doorway. The repair holds scripted player movement for both collision-aware routed placements, clears prior autonomous aside movement, and verifies both final arrivals before recording completion. Cancellation releases only its own hold. It preserves the successful frontage-facing target after Walker resynchronization.

Independent code review found two issues in the first repair: resynchronization erased the desired player heading, and a cancelled first walk could resynchronize a newer scene’s Walker. Both were fixed; 17 controller regressions pass. The independent actual-code facing proof turns the player from 1 to 0 radians without changing position. Its evidence and the prior aside-motion proof are in the main artifact directory.

Rounds r42/r43 show clear arcade spoken/menu frames and successful real Quickslot/Continue from the live Runner choice. They preserve the same choices, exactly one completed arcade stop, visible companion binding and no replayed opening speech. Rounds r44/r45 add actual frontage-facing assertions. The phone’s ordinary Chat reentry still placed Kenji behind the menu, so the candidate now requests the existing scoped pair view on Chat; the shop-street view applies only near the physical frontage. Final r46/r47 pass on the frozen source. All 18 HTTP-loaded source hashes in each run match the candidate; both runs report no errors, zero heading error and no displacement in the sampled settled choice phase. The independent visual reviewer inspected all 32 final frames at native size: A–H 8 each, total 8. This includes spoken lines, completion and Continue menus, Stay, Chat reentry and Keep Walking. The earlier failing phone reentry remains in the r42/r43 receipt.

## Remaining acceptance

Final scoped native and independent visual checks are complete; the unvoiced runtime remains uncommitted in its isolated worktree because strict fast checks cannot pass yet. Request cross-team review on the preserved source snapshot; after story review and voices, pass strict desktop/phone fast checks, commit, and verify exact-commit boot before landing. Obtain Claude’s story review before generating approved-voice clips. Complete a fresh phone cold-player check and Showcase entry before claiming a playable release. Do not treat the prototype API tests or unvoiced candidate as that release.


## Preserved candidate for review

The 40 owned public source files are copied under main `game3d/shots/kenji-outing/held-source-20261008/source/`. `manifest.json` records their SHA-256 hashes and base `ad07d1efa3e2b748f1cee3922e86120cbcdaa332`; `candidate.patch` reconstructs the runtime, tests, tools and game facts changes against that base. Its SHA-256 is `e47e35e629828dbc76b82cb0cc86595bf9c342ddc907a5c11356bfc6a6defae7`. These are review artifacts, not a committed or accepted build. The working copy remains in `codex-kenji-outing`.

Independent final review receipts: main `game3d/shots/kenji-outing/validation-20261008/outing-independent-visual-r46-r47.json` and the retained `outing-independent-visual-r42-r43.json`. Native pose/source checks are in `native-final-verification.json`. Cross-team review is requested in X-0830.
