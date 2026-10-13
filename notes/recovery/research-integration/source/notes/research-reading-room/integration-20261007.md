# Held Research integration on current character scale — 2026-10-07

Mechanical QA only. This work remains uncommitted and unlanded in `codex-research-integration`, based on `c76b40bb61b1378807fd774ba7c508280802e774`. Claude's actual story/voice review X-0745 remains held until the weekly limit resets on 9 October at 07:00 Europe/Oslo; that reset will not itself constitute approval. No authored lines were changed, voices generated, or assets uploaded by this integration.

## Source preservation and merge

The original `codex-research-reading-room` worktree, based on `b6ad8e9e`, is untouched. All 133 files in the earlier recovery manifest were hash-verified. Four later public helper/metadata revisions and the added recovery note were preserved, giving 134 current original-source files, in main at `game3d/shots/research-reading-room/integration-20261007-source/`. Its `source-sha256.json`, `tracked.patch`, `base.txt`, and `integration-base.txt` identify the exact inputs. The earlier `recovery-20261007-before/` archive remains intact.

The tracked changes were applied with Git's base-aware three-way application. Two conflicts were resolved: retain the current `deskKeyboard` import in `js/props.js`; retain current module ceilings and lower the extracted office module's ceiling. New source was copied only from the owned manifest. Newer main's `office-crt-check.mjs` and `notes/office-crt-20261007.md` supersede their held copies. Current 85% default, selected Mio, keyboard/laptop support, and saved-goal restoration files remain byte-identical to the integration base.

The Research `scenes/works/props.js` delta only exports `station(p, mesh)`. It does not include or replace the separate pending #337 Works service details. Main's later gait commit `01bc08b8` is outside this integration base. This is a preserved candidate for future merge, not an exact-current-head release result.

## Mechanical corrections

Native testing exposed reach failures with the current 85% characters. Existing reach thresholds and shared IK were kept unchanged.

- Mori's old-paper pointing target moved to the near edge of the same sheet. His offer was lowered and brought nearer, and the player's approach moved 5 cm left and 7 cm toward the desk. Phone offer and receipt surface gaps are 4.7 mm and 11.0 mm; rendered hand bounds remain separated by 99.7 mm.
- The shelf approach moved from x = 2.67 to 2.75. Actual use now takes that coordinate from the shared room plan.
- Book take/place targets use a point 17 cm toward the reader from the cover centre, previously 13 cm. This is still on the 40 × 44 cm cover. It fixes the end-chair placement failure without moving the chair, page or table. Final phone sampled pickup/return gaps are 17.7, 8.1 and 15.2 mm; desktop is 6.3, 2.5 and 3.1 mm. The existing 65 mm guard remains active.

`research-continue-check` and `research-office-continue-check` now install a public-only route themselves and assert the actual visible goal after the loading/title veil clears. The helper waits for opacity to settle instead of mistaking the goal's fade-in for absence. Console errors are recorded, and failed book actions report their contacts promptly. The extra-seat helper also records console errors. Optional `DETAIL=1` freezes the actual carried pose for two diagnostic camera views before resuming the normal save/Continue test.

## Evidence and results

Every attempt, including failures, is retained in main under `game3d/shots/research-reading-room/integration-20261007/`, with per-folder SHA-256 manifests. Browser runs used public-only routing and the shared GPU queue. Current-scale tests use Eric at 1366 × 860 and Carina at 390 × 844. These are native browser viewport checks, not physical-phone performance tests.

| Evidence folder | Result and scope |
| --- | --- |
| `seats-integration85-seats1` | All four player seats and the reader's seat supported at both sizes; player cushion gap about −9.5 mm within unchanged limits. Eight native images inspected. |
| `office-continue-integration85-office5` and `office-continue-integration85-office6` | Phone/desktop actual paper handoff, normal completion, Quickslot Continue, one copy, released hands, ordinary camera restoration and visible saved goal pass. Foreign/unowned camera ownership checks pass. |
| `continue-integration85-continue8` and `continue-integration85-continue9` | Final near-edge grip: actual pickup, carried volume, table/window use, bookmark/page state and normal Quickslot Continue pass at both sizes; saved goal visibly returns. All carry detail images inspected. |
| `extra-seats-integration85-extra2` and `extra-seats-integration85-extra3` | Actual book transfer/use and Quickslot Continue at side/end seats pass at both sizes. Exact state, page, bookmark, support and cleared loading veil checked; all four detail images inspected. Together with the preceding test, covers all four seats. |
| `cancel-integration85-cancel1` | Leaving during actual paper offer and book carry cancels cleanly; no copy grant, no active hands, books restored to shelves. Taken before the final 4 cm grip-target shift; cancellation ownership code is unchanged. |
| `sender-integration85-sender1` | Current selected Mio: decline, remembered line, comparison, automatic delivery, normal Continue, desk payoff and late language-order route pass, errors empty. Native keyboard, remark, payoff and Continue images inspected. |
| `sender-keyboard-main1` and `sender-keyboard-integration1` | Bounded actual Sender screen action confirms a pre-existing visual limitation: wrist-to-target gap 60.09 mm on both main and integration; hand floats above/behind the keys. No Research regression and no visual contact approval claimed. |

Earlier failed office approaches (`office1`–`office4`), the goal fade capture (`continue1`), failed shelf pickup (`continue2`–`continue3`), failed end-seat placement (`extra1`), and intermediate successes/details remain available in chronological attempt folders. No failed attempt was replaced.

Final 14 focused Research unit tests pass (`unit3.log`). Focused ESLint passes after qualifying browser globals in the support helper. The four changed runtime modules match the repository's exact formatting options, with syntax equivalence checked. `git diff --check` passes. No broad CPU gate, commit gate, full story route replay or landing boot was run for this held integration.

## Remaining gates and limitations

Claude's story/voice review remains mandatory. The original authored content, recorded speech and full arc have not been approved by this integration QA. No voice generation was attempted. Future landing requires current-main merge, independent review, required commit/landing gates, and a fresh final-head boot.

Sender's existing keyboard insert needs its own contact correction; its state-route PASS is not a grip PASS. Book detail views show the actual attached volume and cover-edge grip, with the simplified hand partly obscured by the cover/sleeve; they do not establish finger articulation. The office handoff close-up is a contact insert, not a claim that the entire conversational pair fits that insert. This work does not certify all Research dialogue cameras, all ongoing-day routes, all character scales, or performance on hardware phones.
