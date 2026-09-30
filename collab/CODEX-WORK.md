# Codex work log

Historical log, through 2026-09-30. Current tasks and parked work live in [GitHub work issues](https://github.com/fumbleforce/tower-of-words/issues?q=label%3Awork), maintained with tools/work.py. Ownership and messages use [PROTOCOL.md](PROTOCOL.md).
Queued pointers through C-0140 are handled: skip without reply or verification, per Jørgen. Only reply to C-0143 and later.
After handing off a task, take the next independent item. Review-pending work does
not stop the queue. Only the root Codex session edits this log; subagents report
their results to it.

| Task | Owner | State | Deliverable / next action |
| --- | --- | --- | --- |
| Exported base topology and skinning validation | codex-tui | Handed to Claude | [Validator](../tools/creator/validate_base.py), [tests](../tools/creator/test_validate_base.py); X-0006 and X-0008, acknowledged C-0004 |
| Day-1 fixes code review | codex-tui | Handed off | X-0005; Claude assigned audit and gaijin audio fixes in C-0004 |
| Chibi idle orientation diagnosis | codex-agent:creator_animation | Handed to Claude | X-0011; [measurements](../notes/creator-animation-audit.md), [CPU diagnostic](../tools/creator/inspect_animation.mjs) |
| Day-1 world and staging review | codex-agent:world_review | Handed to Claude | X-0012; [four bounded improvements](../notes/day1-world-review-codex.md) with evidence and acceptance checks |
| Welded skin-weight consistency | codex-tui | Handed to Claude | X-0008; 11 tests pass; both regenerated base1 exports pass |
| Review evidence provenance | codex-tui | Verified | Validator output records the exact input hash; invalid-export exit code and hash checked |
| Bound creator render jobs and fail on page errors | codex-tui | Committed and released | `fdc6c17`, C-0025; bounded load polling, four signals, uncertain-close retention; SIGKILL recovery unsupported |
| Stable creator preview | codex-tui | Committed and released | Claude approved C-0006; commit `dc14c7b`; auto-turn off on load; logic and syntax checked |
| Day-1 choices and consequences | codex-agent:choice_review | Handed to Claude | X-0016; [three reproduced/traceable findings](../notes/day1-choice-review-codex.md) |
| Neutral idle candidate | codex-agent:creator_animation | Captured; review pending | [Generator](../tools/creator/make_neutral_idle.mjs); source assets unchanged; [measurements](../notes/creator-animation-audit.md) |
| Neutral idle before/after and review | codex-tui | Committed 69bf119; awaiting Jørgen | New round `creator-idle-neutral-2`: playing old/new idles, both bodies, orbit/zoom and idle-to-walk transition |
| Creator rebuild resource cleanup | codex-tui | Committed and released | Claude review C-0011; `0b721dd`; disposal/race/failure/null-colour tests pass; X-0024 |
| Day-2 competition: station thread | codex-agent:contest_station | Submitted | `contest/day2/codex/1.md`; X-0023; no commits before judging |
| Day-2 competition: B2 thread | codex-agent:contest_office | Submitted | `contest/day2/codex/2.md`; cold-reader and root review complete |
| Day-2 competition: island evening and final edit | codex-agent:contest_evening / codex-tui | Submitted | `contest/day2/codex/3.md` and `notes.md`; X-0023; organizer handles blind presentation |
| Source-of-truth audit | codex-agent:source_truth_audit | Superseded by user direction | C-0015; findings feed Claude's authored game-facts docs; no audit cleanup packages applied |
| Smooth chibi bases | codex-agent:smooth_base_builder | Committed 69bf119; awaiting Jørgen (C-0026) | C-0017 / X-0027; `clean-*-v14`: 398 vertices / 792 triangles; 91 captures and 14 versions preserved |
| Animated clean-base deformation | codex-agent:base_motion_check | v14 clear in both modes: 264 sampled poses | `notes/clean-base-deformation.md`; dense walk/neutral checks, inherited floor contact issue remains |
| Creator recipe save/load | codex-tui | Committed and released; Claude skim requested X-0135 | `75d1c22`; portable JSON, paste/apply, restored tint controls and invalid-import recovery; CPU and desktop/phone round trip pass |
| Candidate review viewer | codex-tui | Implemented and verified | `tools/creator/base/preview.html`; phone/desktop, motion/layer toggles, rapid switching and failed-load retry pass |
| Candidate round presentation | codex-tui | Published and checked | [Review creator-base-2](http://127.0.0.1:8771/bible/#review/creator-base-2); Archive links resolve; feedback overwrite refused |
| Eric stubble segmentation | codex-agent:layer_fit_review | Diagnosis complete; next candidate queued | [Measured source contamination and projected patch plan](../notes/creator-stubble-diagnosis.md); X-0048 |
| Separate garment/hair fitting | codex-agent:layer_fit_review | Bounded fit2 complete, not ready | Fit1 and fit2 captured; fit2 preserves weights and avoids reversed faces but retains material intersections |
| Optional host-rest retarget correction | codex-agent:base_motion_check | Committed and released | `1730c4b`, Claude C-0021; default unchanged, normalization and clipsFor order tests pass |
| Base anatomy/normal validation and pipeline review | codex-agent:base_validation | Tests and review ready | Optional source envelope and normal checks; `notes/base-pipeline-review-codex.md`; root reviewing |
| Train bag scene simplification | codex-tui | Committed 7864fc6; isolated phone check passes | C-0031: two steps, no clicking the box; directly describe the lunchbox sliding off the rack |
| Live idle comparison preparation | codex-agent:base_motion_check | Complete, read-only | C-0027: use recipe/buildCharacter and candidate idle-neutral.glb; original idle needs live playback instead of held frame; keep retarget setting identical in both panels; extend existing orbit/zoom controls |
| Stage 4 hook extraction map | codex-agent:architecture_review | Preparation complete | Six modules: targets, movement, presentation, gestures, kotodama, progression; move flag owners and update asset metadata readers; root remains sole editor |
| Architecture and code-quality plan | codex-tui / read-only agents | Stages 0–5 committed; freeze released X-0128 | Through `42e65dd`; evidence in notes/refactor-progress.md; Claude stage 5 skim passed C-0081 |

Current creator reviews and evidence: [creator-comparisons.md](../notes/creator-comparisons.md). Base-4 and idle-3 await Jørgen; earlier rounds remain available there.

Refactor stages 0–5 are committed through `42e65dd`; freeze released X-0128 and Claude's stage 5 skim passed C-0081. Evidence: [refactor-progress.md](../notes/refactor-progress.md).

Lunchbox: `7864fc6` implements two steps; `f5abe82` supplies Claude's merged voice clip. CPU and isolated phone prompt→reply checks pass (no page errors); screenshots: game3d/shots/lunchbox-two-steps/. Desktop full-day run timed out after the lunchbox, at train `use:door_l:1` / Wait by the doors, with zero movement overlaps/spins. Phone passed the train doors and timed out at the gate lift after 8 Say prompts; no movement overlaps/spins. Both full-route runs used software GL under heavy shared CPU load and are not passes. X-0133 hands full-route validation to Claude’s engine integration pass. Files released. No push.

Current creator acceptance checks have one home:
[creator-next.md](../notes/creator-next.md). The base pipeline was released to Codex under C-0012. Diagnostics can run independently without the GPU or browser.

Continue fix: idle and unfinished-scene restoration implemented; CPU, full-day desktop/phone, save/load, nested-scene, transition and recovery checks pass. Claude accepted C-0055/C-0056; committed as `882ccce`. Evidence, fixes and the next declaration guards are in [refactor-progress.md](../notes/refactor-progress.md).

Current checkpoint implementation and remaining acceptance checks: [refactor progress](../notes/refactor-progress.md#mid-scene-checkpoints-working-tree-not-yet-accepted). Crawler directive patch is committed as `526d97a`.

Marker/Say skim: complete, X-0136. Claude pin builder owns the pointer-events regression; shadow exclusion and Say guard have no findings. Extra lunchbox reply capture timed out waiting for reply text; no new passing capture is claimed. Existing isolated flow evidence stands; no further capture loop.

Creator fit controls: committed f29af5a and released X-0138; Claude skim requested. CPU gate, desktop/phone edit→save→reset→load and geometry checks pass. Phone preview stays visible while adjusting fields. Screenshots inspected in art/parts/shots/fit-controls/. Base selection and asset integration still await Jørgen.

Creator GLB export: committed 4e82750, released X-0141; Claude skim requested. CPU and desktop/phone download/reload pass; both source libraries, palette/texture colours, rig, held Idle, in-place Walk, fit and height exercised. Standard PBR lighting differs from Lambert; README documents limits.

C-0085 / X-0140: v15 selection led to the completed base-4 comparison below.

Base-4: committed `8ee2ac9`; evidence and all attempts in [creator-base-4](../reviews/creator-base-4/review.json). Released X-0142, Claude skim requested. Clothing defects remain visible and documented.

C-0086 and C-0087 implementation records follow below.

C-0086 completed as candidate review in `3fbcd6b`; [idle round 3 evidence](../notes/creator-comparisons.md#relaxed-idle-round-3). C-0087 committed `557b73e`; CPU gate and three focused slot tests pass. Actual idle capture used GPU slot 1; two-browser smoke deferred on machine load, so simultaneous hardware rendering remains unverified. Both released X-0144, Claude skim requested; GUIDE/PROTOCOL wording handed to Claude in X-0143. C-0089 metrics review is active with codex-agent:checkpoint_compat_review, CPU/source only.

C-0089 review complete, X-0145: exact budgets accepted and reporting checks pass 9/9. One concurrent renderer.info sampler conflict handed to Claude's metrics owner. GUIDE slot wording landed in Claude's `86392a4`. No Codex worker or browser remains active.

Active follow-through X-0146: creator/run.mjs moves to shared GPU admission; lifecycle harness adapts to slot leases. The deferred two-browser smoke now passes on NVIDIA Vulkan simultaneously, and both current review pages load all images. Log: /tmp/codex-gpu-slots-smoke-followup.log. The real cut-page capture also passes via GPU slot 2; inspected /tmp/codex-creator-cut-helper.png.

X-0146 follow-through complete: `562a312`, released X-0147. CPU gate, actual cut-page capture, page-error/no-write and updated lifecycle checks pass. Simultaneous NVIDIA Vulkan smoke now resolves the earlier C-0087 validation gap. All own browser/test handles are terminal; capture fixture removed. Base/idle review decisions and Claude's metrics fix remain with their owners.

Creator handoff refreshed and versioned in `458c0d7`, released X-0149. [Current acceptance work](../notes/creator-next.md) is authoritative for the next creator pass. Base-4 and idle-3 are the only open creator decisions; no new feedback at the latest inbox/review check. X-0148 requests the next independent assignment from Claude and reconciliation of his in-progress TODO changes. No live Codex jobs remain.

C-0090 day-1 proposal: `f3db494`, released X-0152. [Overview and per-scene edits](../reviews/day1-simplify/proposal.md), four regional review picks; no story implementation until Jørgen picks. Three subagents audited train, gate/lift and office. CPU passed on exact landed commit; focused review-page check passes: four options, all four documents rendered, desktop and phone screenshots inspected. No runtime changed; no full-day browser rerun needed. Productivity section reconstructed and committed alongside it.

C-0091 asset-hook skim: two findings sent in X-0151; fixes owned by Claude. C-0091 campus maps: active, Codex owns reviews/island-map-1/ and art/candidates/island-map-1/. Planning subagent completed a shared layout brief at /tmp/codex-island-map-brief.md; root renders and posts candidates next. Apartment interiors follow layout approval.

Island-map-1: eight renders saved locally; leafy campus-03 and denser town-06 each have overview/west/east views. Labelled viewer and full prompts are committed on wt/codex-island-map-1 as 3a6fcb4; landed on main as 3a6fcb4 and released X-0155. Focused browser controls and image checks pass on desktop/phone. Claude C-0093 scored the leafy set 7/10; denser revision addresses density/housing and was sent in X-0154 for a skim. All decisions remain open.

Next independent task, C-0092: amend day1-simplify proposal for Claude’s nine cold-reader findings. Priorities: hint must match mime menu, preserve/explicitly explain machine-door akete access, restore spoken ticket phrasing and closing request gag, restore Mio’s echo and hedge, join chair request naturally, make phone buzz legible and prompt the Hamada choice. Recount affected office route totals. No story implementation before Jørgen picks.

C-0092 complete: `519c4c9`, released X-0157. All nine findings are folded into [day1-simplify](../reviews/day1-simplify/proposal.md); counts revised, door-command path and ticket beats retained. CPU gate and exact live-document check pass. Runtime implementation awaits the review picks. Next map assignment is C-0094/C-0095 in the inbox; no map-2 work claimed yet.

C-0094/C-0095 active, X-0158: island-map-2 candidates and labelled viewer. Root owns renders/staging, viewer delegated. Island-places has no feedback at start.

C-0094/C-0095 complete as candidate review: `e93d901`, released X-0161. [Island-map-2](../reviews/island-map-2/review.json) has overview/west/east, full prompts and every attempt; previous round superseded. Viewer agent and visual critic finished; evidence and limitations in [QA](../art/candidates/island-map-2/qa.md). CPU, desktop/phone viewer and live bible checks pass. No live Codex jobs or locks remain. Layout choice and island-places feedback remain open; interiors follow layout approval.

Follow-through: TODO status reconciliation in wt/codex-todo-sync. Asset-hook follow-up complete X-0163, no findings, existing focused tests 3/3. Read-only feedback-window review delegated to codex-agent:feedback_window_review under X-0164. Creator, day1-simplify and map choices still have no answers.

Priority change C-0098/C-0100/C-0099: creator_overlay builds the overlay acceptance tool in its own worktree; root investigates source-derived exposed face/body geometry. approved_idle integrates approved relaxed-3 separately. C-0097 preserved uncommitted in wt/codex-day1-routes: 33 named routes and Fast QA integration drafted; first complete run has failures, no coverage pass claimed. Map-3 follows overlay.

Overlay committed `fea236e`, focused desktop/phone source-alignment checks pass; Claude review requested X-0172 before landing. Source-derived replacement is not yet implemented. Idle integration is built with isolated exact-motion/blend proof; final viewport checks and cross-team review pending. Routes committed `9f09733` but C-0101 found five false-pass gaps; same agent owns correction before landing. Map-3 staging/render begins in wt/codex-island-map-3 under X-0171.

Map-3: three images, full prompts/staging and viewer ready; independent critic 8/10 each, desktop/phone controls pass. Text-only commit blocked by shared Eric portrait/lock update; Claude owns sync (C-0104). C-0105 accepts corrected routes 9fe9840; landing waits same committed lock. Idle 2ff609e committed, cross-team skim pending. Moved idle review screenshots to candidate context media under X-0178 to avoid treating motion evidence as approved portrait assets; Claude commits that review with his decision.

C-0102: train_picked implements only #1/#5/#7/#9; preserves flavour. Root owns contextual frame UI in wt/codex-day1-frames, frame_review_data owns exact proposed before/after data. Source_base_geometry located original separate head cores; now retains real skull/face rather than guessed radii. Source1 diagnostic restores exposed faces/sleeves but is not a finished nude base; kept for evidence.

Routes landed 5c670ef after C0105 follow-up; train changes72602d1 additionally adapt door routes to settle in gate. Overlay08dd19d cleared C0111 and landing. Idle83ffbcb cleared C0111; grounding/yaw corrected with focused proof and both fast viewports. Frame review29 decisions implemented and browser-checked; Claude skim requested X0180. Map3 C0106 caught roof-on-shops; corrected attempt07 now has two rows around a covered street, plus fixed coastal path and izakaya. Updated district renders08/09 underway; all earlier attempts retained. C0107 new-place picks queued round4, C0110 performance queued behind day1. Geometry source8 retains full-precision head/neck/ears/hands with animated0delta and original outfit plus gap patches; still under clearance review.

Landed follow-through: overlay `17dc801`, approved native idle `2dbca38`, train selected edits `d64b4b4`, map-3 `3e5133f`. Map-3 live review and images resolve, final desktop/phone inspected; C-0115 open points included and round 4 waits for Jørgen. Train voice request is with Claude (X-0185). Frame UI revision `52a34d8` is committed in wt/codex-day1-frames, awaiting Claude rescore X-0188. Source10 dressed samples passed independent critic; bare wrists require actual topology repair, still owned by source_base_geometry. source_overlay_motion adds synchronized animation to the acceptance view in the same WT with separate file ownership. Office performance investigation begins under X-0189 after day-1 implementation.

C-0116 frame review complete and live: `f5225db`, released X-0194. Claude scored the inline viewer 8/10 desktop/phone; sticky Save/count and selected states added, focused checks passed. Old simplification review retains train decision and points to new editor. Claude voice commit `3861e91` supplies the two merged train clips; lock cleanup `d6a15bf` allowed landing. C-0119 removes diagnostic-only creator review from user queue; next candidate must include the actual new source-derived model. Source15 wrist/forearm candidate awaits final render. C-0117 approves island-03 as the basis for map4; new brief is in the inbox and setting.md. Office integration X-0193 is under Claude review and both fast runs; source geometry and animation viewer remain separately owned in source-base WT.

Closeouts: separated frame options landed `1a1bf3f` after C0124; sticky Save and all29 complete passages retained. Office batching landed `6c15d84` after C0121/C0124; CPU and both fast viewports pass, remaining budget/hitch limits in notes/PERF.md. Creator source15 landed `30cb99e` under C0120; actual moving candidates in creator-base-5, motion/evidence limits and all attempts in its links. Released X0199/X0200. No runtime model replacement.

C0123 active: short office-to-dorm trip and dorm visuals, before map4. Planned entries and staging drafted in art/candidates/dorm-route-1/brief.md; two layout options from focused dorm_route_layout subagent in layout-options.md. Claude holds places.md pending structured diagram entries (C0125). Root owns reviews/dorm-route-1 and candidate images; three attempts retained so far. No full runtime build until layout review. C0110 lower-detail phone and load hitches remain queued behind this.

Dorm route proposal committed `99bc825`: planned path/dorm entries, return lift trips, four retained image attempts, full prompts and staging. Current Codex option uses muted exterior04 and room02; independent critic8/10 each and Claude C0128 room/layout skim accepted before the requested palette correction. CPU/facts and desktop/phone static review checks pass; screenshots inspected. X0206 releases places.md. Review remains not-ready pending Claude's independent complete option (C0128). No full runtime location built.

C0110 next: read-only phone cost investigation complete at /tmp/codex-office-phone-next.md. Focused office_clip_isolation now owns lift-material sharing fix in wt/codex-office-clip, X0205. Root retains review integration. Geometry reductions, q0 outline work and preparation hitches remain queued; no savings beyond landed batching claimed.

Lift-material isolation candidate `5187612` committed, CPU/source ownership/disposal regressions pass; Claude C0129 code skim clears after GPU checks, including landing hover/word-glow cutaway. GPU owner claude-dorm-route prevents the paired/fast runs; agent stopped after one admission failure, no loop/browser/lock left. Do not land until visual/picking and both fast runs pass.

Loading hitch attribution completed without product changes: game3d/shots/place-preparation/cpu-stages.json and probe.mjs. Software-GL CPU instrumentation measured office build218ms, lift16ms, look279ms; batching initial scan below1ms. Main-thread construction/lighting remain synchronous despite timer-based preparation. Not a mobile/GPU timing benchmark. Two initial probe attempts missed versioned module URLs and produced no evidence; final wildcard route captured phases with zero page errors. All root browser jobs reaped and locks released. X0208 relays findings.

Train passenger drafts committed `8dbbf40`: six complete current/proposed encounters, C0133 content correction followed; not-ready pending Claude cold read X0227. Shared review widget reuse is with source_overlay_motion, focused checks only. No runtime story or voice changes.

Dorm alternatives posted `ebb8dc1`; Jørgen rejected dorm-b and requested full island map first (C0135), so no dorm/gate runtime implementation. Root inspected Claude's five finals; original attempts remain. C0134 station-security decision is being documented with the shared outdoor routes. Map4 layout brief delegated, root renders using island03 as the geographical basis.

Lift material isolation landed `f1745b4` after Claude manifest released. CPU and both fast viewports pass; paired calls phone576→433, desktop912→700. Evidence and retained first desktop overlap failure live in game3d/shots/office-clipping/. Remaining phone budgets, synchronous load work and existing glow-overlay artifact are not fixed. All clipping browser jobs/locks released.

Map4 posted `ca82eeb`, picked by Jørgen in C0140. New top task: playable forecourt→plaza→dorm_court→room chunks in existing muted style, each landed and pushed. Runtime gate becomes station security; first chunk connects outside to head-office lift. Docs split written first, architecture helper tracing first integration. Train draft revised `3298cdc` and C0138 cleared opening; UI agent finishing.

Creator6 parked for C0140. WT codex-creator-custom preserves approved idle loader/overlay edits and numerical proof (no visual/CPU/commit yet), plus source16-repair.md and four source15 diagnostic captures. Geometry not yet changed; source16 not exported. Root had not started customizer or eyes. Hair paint on retained head UVs and Eric separate neck cap diagnosed. No creator jobs/locks remain. Resume after outdoor priority.

C0142 changes the active split: Claude owns the entire outdoor build and integration. Codex stopped forecourt agents, preserving the partial chunk in wt/codex-forecourt with a handoff note and pending preservation commit. Codex now handles writing, reviews and requested detail passes; creator6 stays parked until requested. See X0237 and the handoff release that follows for state and ownership.

Train discoveries UI landed `bf40c3b`; six encounters are open for picks after C0138. Desktop/phone focused checks passed, including saved drafts and the existing day1 widget. Runtime story and voices await those choices. [Review](http://127.0.0.1:8771/reviews/train-discoveries-1/).

Outdoor handoff released X0238: 27 staged files in wt/codex-forecourt, no commit because the asset scanner raises KeyError forecourt before CPU. Exact contract/state/limitations: notes/forecourt-handoff.md in that worktree. Claude owns completion, validation, landing and push. Train review opening committed `86aa00a`, CPU passed. Creator claims released; parked files preserved, resume only on request.

C0143 complete: `0c2b0f4` replaces the three dorm look-at stand-ins with Eric's evening remarks. One story file, unchanged triggers. Cold read and commit CPU gate passed; supplied room capture inspected. Released X0268; no new review round, voices or browser run.

C0144 detail/review candidate `9a5a525`, wt/codex-town-detail, ready to land/push. Scope, single camera finding, paired visual/performance evidence and checks are in X0272. No new dialogue or dorm geometry; final fountain coins visible. Claude skim requested; root owns landing/push/cleanup.

C0144 landed and pushed `9a5a525`, build `0930-0101-9a5a525`. All claims released X0273. Camera/Continue focused checks, both full-day viewports, three evening branches, CPU and independent visual checks passed; evidence/limits in game3d/shots/town-detail/review.json. Claude skim X0272 remains pending. Worktree retained; no active Codex browser job or lock.

C0145–C0147 complete: `38755d9` landed/pushed, build `0930-0524-38755d9`. Live seat hint/goal name the lunchbox; Aoi original kept. Bun's undecided review proposal shortened to a bag-closing gesture and one thank-you. Review stays open, feedback preserved, other proposals unimplemented. CPU, phone/desktop fast runs, focused review-page checks and cold read pass; Claude cleared landing/push C0147. All claims and own browser resources released. Evidence: game3d/shots/train-seat-c0145/.

C0162 creator handoff confirmed X0278: Claude owns creator6, no unwritten source16 repair or active Codex claims. C0157/C0164 writing pass in wt/codex-small-writing: Kuro arrival/departure greetings, Mori's clock reaction, two shortened Mio goals. Exact five pending voice keys/text in notes/voice-small-writing.json; voice-manifest currently omits forecourt, relayed X0280. Cold read and three focused browser routes pass; full-day phone/desktop PASS WITH VOICE_WARN (voices queued). Seat gesture and optional Sales gaze need actual engine support, handed to Claude in X0281/X0282; no fake no-op steps added. Commit initially hit the topdown asset-lock race, now resolved by merging 977c334. CPU/commit rerun in progress; source-data count fixture updated for new lines. New Work tracker not landed yet.

C0157/C0164 writing landed/pushed `41fba80`, build `0930-0907-41fba80`. Checks and scope in X0284; claims released X0285. Five voice clips are listed, not generated. Directed seat gesture and optional Sales gaze remain assigned to Claude's staging builder via X0281/X0282; current narration kept until gestures work. Creator6 takeover recorded X0278. Tracker not yet landed; migrate these remaining items when available. No active Codex jobs/locks. Focused evidence: game3d/shots/small-writing/routes.json.

C0193 active (#87): final evening writing and author-decided train Review committed/pushed e2db5bd; no player Review, no spoilers. Runtime integration is in wt/codex-evening-discoveries, including reviewed silent office staging fix d2445bf (#90), story nodes and the seated save exit fix. Direct Claude worker owns outdoor hooks in wt/claude-evening-stage; main Claude owns bath/audio and the new dorm hall. Cold reads are done; isolated runtime checks are catching physical-state and interaction issues before the combined day run. X0304–X0310 record claims and handoffs. #87 remains running until runtime is landed and pushed; #6 train runtime remains queued after it.

C0193 shipped: evening discoveries and Claude’s dorm route landed/pushed in `165fbd6` (runtime `17ee1a1`), build `0930-1816-165fbd6`; Pages payload `ab99636` pushed. Spoiler-free Showcase evening-walk-1; no Review. Claude C0201 final skim, CPU, exact landed title boot, strict voices, both full-day runs, and separate optional-interaction/Continue checks pass. #85/#87/#90 close against the delivery; X0315 releases all claims and records the remaining draw-call warning. No active Codex browser, model job or GPU lock. #6 train runtime remains queued.

Evening shipment public verification: Pages run 36757395739 succeeded; public build.json serves `0930-1816-165fbd6`. #85/#87/#90 are done; no active Codex resources.

C0201 follow-up: `932f697c` documents required paired evening checks, their actual pre-land evidence, unchanged baselines and the under-200 phone limit. Observed forecourt median175/peak241; performance attribution/fix assigned to Claude in #94 and X0318. Commit also captured concurrently staged portrait facts; X0319 reports this without rewriting shared main. No new runtime tests or active Codex jobs.

C0206 active: wt/codex-train-discoveries integrates builder commits as `378f2b98`/`8ae99637`, selected story `e89ece5c`, and C0209 cuts plus #110 noun clarification in `a1aeeb92`. Actual-story checks pass both sizes including first hints, repeats and title Continue; fresh code/visual reviews clear. Voices requested X0326 (10 clips); combined day checks active. #6/#89/#110 remain pending shipment. #106 concrete writing/body audit in notes/contextual-talk-draft.md, X0327 requests cold read and exact engine IDs.

C0206 update: final train integration has passed both optional-route suites and both full-day sizes (voice warnings only). Rebased onto ad474982; Music now uses the short nod, 9 new voices remain (#111 owned by Codex). C0216 press sign confirmed against Eric's skeleton and corrected; mid-press captures follow the voice batch. The first voice run failed on missing worktree reference transcripts and auto-fell back; those unshipped clips are outside runtime, references repaired, local rerun active. Tool fix request #126. #106 contextual Talk draft is cold-read and awaits its builder contract. Plaza notice/flyer copy is cold-read, handed to Claude's finds builder in X0337 for integration; native photo subjects retained with short titles. Lift reset regression found in review is #125. No train release yet.

C0206 final landing preparation: train integration is rebased through 847aaac8; all CPU gates and combined phone/desktop days pass again (77/84 s, one missing voice warning). Press-only contact correction passed independent paired visual review; Music short nod and Continue pass both sizes. Eight checked local Qwen clips are uploaded/locked; ln-1hdwfkl kana retry belongs to Claude jp-pronunciation under C0223. Commit gate correctly blocks until its asset is delivered. #106 approved contextual story, Talk-menu extras fix and fixtures are staged; runtime smoke prepared but deferred under the GPU/load guard. Plaza text landed unchanged in dc9a3eb4; final paired capture paths requested X0351 after its worker tree was removed.

C0206 shipped: train package landed/pushed 3011a9ff; public Pages build 0930-2024-3011a9ff verified (run 36772400548 success). Exact landed title boot passes both sizes. #6/#89/#110/#111 complete. #106 is rebased onto this build and awaits only its generated-voice handoff plus focused runtime check. Showcase: train-discoveries-1. All final train captures remain in the retained WT.

#106 runtime ready: all 16 contextual Talk cases pass via real Talk controls (desktop + corrected phone harness). No engine issue in the initial phone timeout; the test hit the 250 ms advance guard. Story/fixtures/facts and extras Talk fix are staged on 3011a9ff. Seven generated clips/spans still await Claude delivery (C0230/X0356); do not mark #106 shipped. Plaza finds review completed: paired finds-check PASS; all final text visible. Root and helper browser/model resources closed.

#106 shipped: b6a55267 is live in public build 0930-2041-5fcaa255 (Pages run36774460060 success). Seven local clips/six spans, all16 actual Talk cases and both full days pass; 223 voiced lines and landed title boot pass. Claude scanner fix superseded the duplicate Codex fix; no bypass. Claims released X0365. #130 Astra creator challenge is active with independent model builder and root comparison viewer; own paths only, one final Review creator-astra-1.
