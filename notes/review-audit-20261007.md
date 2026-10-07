# Review follow through audit for 7 October 2026

The initial audit found six Review decisions or revisions requiring follow-through. It covered all 132 public Review items then present and read every saved response, including option comments: 107 items had responses. After correcting three statuses, 88 items were decided, 42 superseded and two open. A decided Review records a choice; its linked work issue can still be running, blocked or waiting to start. The update below records what has since landed.

## Follow-through update

The later check contains 133 public Reviews: 88 decided, 43 superseded and 2 open, with 107 saved responses. No public-site answers are waiting to import and the current list reports no unread public feedback. The inventory below preserves the earlier 132-item audit snapshot.

- Character backgrounds round 1 is now superseded. All 23 rewritten proposals and the cold read are in [round 2](http://127.0.0.1:8771/bible/#review/character-backgrounds-2), landed in `910a2187`; #327 is waiting for Jørgen. They remain proposals.
- The window correction landed in `36e5cc45`. #321 remains waiting for Jørgen's judgment of the optional street trial.
- The selected 85% character default and required canteen contacts landed in `8e8d1c89`; #322 is complete. The related stale seating diagnostic was corrected under #323 without a runtime seating change.
- The selected Mio default landed in source `3bc8df23`, with evidence `d92ea0c2`. #335 is complete after native phone, laptop, keyboard, lunch-contact and legacy-save checks, strict desktop/phone routes and landed title boots. The local build at this checkpoint is `1007-1423-d92ea0c2`.
- Showcase bag feedback is fixed in `2cca1ef9` under #333: native/procedural grip anchors and supported seated totes, with all 336 attempts retained. Final CPU and landed title boots passed; new NPC model production remains a separate item.
- The language-history follow-up landed in `8e385a55` under #336. Remembered remarks can compare current comprehension with their recorded original vocabulary. Native desktop/phone checks, 666 CPU tests and final title boots passed. An intermittent office gait failure from the initial full-route test remains open under #319; its successful repeat was retained alongside the failure.
- #328 still awaits Meshy model-trial capacity for the three approved everyday crowd sources; source approval alone is not installed geometry. #320 still needs the corrected karaoke phrase and listening check.
- The latest work check reports 33 stale items across teams. This is a broader work-tracker backlog, not 33 unread Review answers. Those issues were not silently marked complete or refreshed without action.

## Findings at the initial audit

| Review | Work | Current disposition |
| --- | --- | --- |
| [Street style](http://127.0.0.1:8771/bible/#review/diorama-street-1) | [321](https://github.com/fumbleforce/tower-of-words/issues/321) | The optional street trial is on main. The newer Showcase comment identifies repeated black window rectangles. A separate agent is correcting the glass atlas and comparing native daytime, evening and oblique views. The overall style trial remains open. |
| [Character backgrounds](http://127.0.0.1:8771/bible/#review/character-backgrounds-1) | [327](https://github.com/fumbleforce/tower-of-words/issues/327) | The 14:25 response rejects the first draft. The issue is running again; a writer is reworking all 23 proposals and preserving the previous reader. A new cold read is required. These proposals have not become canon. |
| [Character size](http://127.0.0.1:8771/bible/#review/character-scale-1) | [322](https://github.com/fumbleforce/tower-of-words/issues/322) | The selected 85% size is recorded as decided. The default rollout is in progress; native tests exposed canteen hand contacts requiring correction before landing. |
| [Everyday crowd](http://127.0.0.1:8771/bible/#review/crowd-everyday-1) | [328](https://github.com/fumbleforce/tower-of-words/issues/328) | The three source pictures are approved for model trials. Shape, texture and rig production is blocked by the last verified Meshy balance of zero. The two earlier approved office crowd models are already installed. |
| [Mio replacement](http://127.0.0.1:8771/bible/#review/mio-meshy-2) | [335](https://github.com/fumbleforce/tower-of-words/issues/335) | A missed follow-up: the selected mio-2 still requires the preview query parameter. Created an implementation issue to make it the default after sustained animation, seat, phone and laptop checks. |
| [Karaoke song](http://127.0.0.1:8771/bible/#review/karaoke-song-1) | [320](https://github.com/fumbleforce/tower-of-words/issues/320) | Take A has a preferred tone. The full-phrase correction and final listening check are still required; the response does not approve a finished song. |

## Tracking corrections and source checks

- Aoi and Emi round-two models are enabled in `game3d/js/cast3d.js`; installation commit `9502d90f` is on main. Closed stale issue #224 with that receipt.
- Kuro's selected model and cheek correction landed in `f3534fd5`. Reconciled closed issue #222, which still carried a todo state; its Aoi/Emi follow-up is #224.
- The five selected photo collectibles are loaded by `game3d/js/finds/prints.js` and placed by `finds/spots.js`. Closed stale issue #219 with `5a0b9666`.
- The Kotodama review's tap controls, machine visuals and game integration exist. Closed stale decision follow-up #244 with integration receipt `b2abbcf9`; machine refinements are also recorded in `246fd2df` and `61ab7bce`. This closes that review request, not every possible minigame expansion.
- Dropped #151's rejected character-style set and #171's superseded earlier Mio direction. The selected replacement has its own current issue, #335.
- Mori's selected photograph is loaded in `game3d/js/places/commons.js`; #301 records `b6ad8e9e`. Pool outfits are loaded by `places/day3/pool-outfits.js`; #296 records `f103c7a8`.
- `game3d/js/crowd/approved-models.js` loads the approved native Meshy models and textures. Rejected projected-eye attempts remain history; #232 records `6f5fd2dc`.
- Read flags were reconciled only after reading their comments and checking a disposition. Rejected attempts and feedback history remain intact. A read flag does not mean the implementation is complete.

The public-site import check found no waiting answers. Every hash recorded as a completion receipt in the inventory below resolves to an ancestor of main. Historical receipts establish that a reported change landed; they do not substitute for a fresh playthrough of each old feature. The specific current source checks above are separate from those historical records. Older closed items without a commit receipt are explicitly labelled below.

## Inventory

This is a dated audit snapshot. Review JSON and linked work issues remain the live records. “No saved response” means the current feedback file is absent or empty; a decision can still have been recorded from chat. The 25 such items are included so the full inventory can be reconciled.

| Review | Review state | Saved response | Work state and receipt |
| --- | --- | --- | --- |
| [aoi-edge-2](http://127.0.0.1:8771/bible/#review/aoi-edge-2) | decided | Yes | [#146](https://github.com/fumbleforce/tower-of-words/issues/146) done; historical closure without commit receipt |
| [aoi-meshy-1](http://127.0.0.1:8771/bible/#review/aoi-meshy-1) | decided | Yes | [#224](https://github.com/fumbleforce/tower-of-words/issues/224) done; `9502d90f` |
| [architecture-plan](http://127.0.0.1:8771/bible/#review/architecture-plan) | decided | Yes | [#19](https://github.com/fumbleforce/tower-of-words/issues/19) done; `42e65dd` |
| [asset-storage](http://127.0.0.1:8771/bible/#review/asset-storage) | decided | No saved response | [#20](https://github.com/fumbleforce/tower-of-words/issues/20) done; `fea5305` |
| [bible-in-git](http://127.0.0.1:8771/bible/#review/bible-in-git) | superseded | Yes | Superseded history |
| [camera-plan-1](http://127.0.0.1:8771/bible/#review/camera-plan-1) | decided | Yes | [#265](https://github.com/fumbleforce/tower-of-words/issues/265) done; `24a44a6b` |
| [carina-faces-1](http://127.0.0.1:8771/bible/#review/carina-faces-1) | decided | Yes | [#266](https://github.com/fumbleforce/tower-of-words/issues/266) done; `710c84e3` |
| [carina-faces-2](http://127.0.0.1:8771/bible/#review/carina-faces-2) | decided | Yes | [#267](https://github.com/fumbleforce/tower-of-words/issues/267) done; `710c84e3` |
| [carina-meshy-1](http://127.0.0.1:8771/bible/#review/carina-meshy-1) | superseded | Yes | [#268](https://github.com/fumbleforce/tower-of-words/issues/268) done; `65d2281a` |
| [carina-meshy-2](http://127.0.0.1:8771/bible/#review/carina-meshy-2) | decided | Yes | [#268](https://github.com/fumbleforce/tower-of-words/issues/268) done; `65d2281a` |
| [carina-portrait-1](http://127.0.0.1:8771/bible/#review/carina-portrait-1) | superseded | Yes | Superseded history |
| [carina-portrait-2](http://127.0.0.1:8771/bible/#review/carina-portrait-2) | superseded | Yes | Superseded history |
| [carina-portrait-3](http://127.0.0.1:8771/bible/#review/carina-portrait-3) | superseded | Yes | Superseded history |
| [carina-portrait-4](http://127.0.0.1:8771/bible/#review/carina-portrait-4) | superseded | Yes | Superseded history |
| [carina-portrait-5](http://127.0.0.1:8771/bible/#review/carina-portrait-5) | superseded | No saved response | Superseded history |
| [carina-portrait-6](http://127.0.0.1:8771/bible/#review/carina-portrait-6) | decided | No saved response | [#256](https://github.com/fumbleforce/tower-of-words/issues/256) done; `710c84e3` |
| [carina-portrait-7](http://127.0.0.1:8771/bible/#review/carina-portrait-7) | superseded | No saved response | Superseded history |
| [carina-portrait-7b](http://127.0.0.1:8771/bible/#review/carina-portrait-7b) | superseded | No saved response | Superseded history |
| [carina-situations-1](http://127.0.0.1:8771/bible/#review/carina-situations-1) | superseded | Yes | Superseded history |
| [carina-voice-1](http://127.0.0.1:8771/bible/#review/carina-voice-1) | decided | Yes | [#277](https://github.com/fumbleforce/tower-of-words/issues/277) done; `abb4521f` |
| [cast-faces-1](http://127.0.0.1:8771/bible/#review/cast-faces-1) | decided | No saved response | [#95](https://github.com/fumbleforce/tower-of-words/issues/95) done; `027eac05` |
| [char-face-1](http://127.0.0.1:8771/bible/#review/char-face-1) | decided | Yes | [#164](https://github.com/fumbleforce/tower-of-words/issues/164) dropped |
| [char-mio-clean-1](http://127.0.0.1:8771/bible/#review/char-mio-clean-1) | decided | No saved response | [#171](https://github.com/fumbleforce/tower-of-words/issues/171) dropped |
| [char-mio-facets-1](http://127.0.0.1:8771/bible/#review/char-mio-facets-1) | decided | Yes | [#171](https://github.com/fumbleforce/tower-of-words/issues/171) dropped |
| [char-mio-gen3d-1](http://127.0.0.1:8771/bible/#review/char-mio-gen3d-1) | superseded | Yes | [#171](https://github.com/fumbleforce/tower-of-words/issues/171) dropped |
| [char-mio-i2i-1](http://127.0.0.1:8771/bible/#review/char-mio-i2i-1) | decided | No saved response | [#164](https://github.com/fumbleforce/tower-of-words/issues/164) dropped |
| [char-mio-parts-1](http://127.0.0.1:8771/bible/#review/char-mio-parts-1) | superseded | Yes | [#171](https://github.com/fumbleforce/tower-of-words/issues/171) dropped |
| [char-style-1](http://127.0.0.1:8771/bible/#review/char-style-1) | decided | Yes | [#151](https://github.com/fumbleforce/tower-of-words/issues/151) dropped |
| [char-vrm-1](http://127.0.0.1:8771/bible/#review/char-vrm-1) | decided | Yes | [#171](https://github.com/fumbleforce/tower-of-words/issues/171) dropped |
| [character-backgrounds-1](http://127.0.0.1:8771/bible/#review/character-backgrounds-1) | open | Yes | [#327](https://github.com/fumbleforce/tower-of-words/issues/327) running |
| [character-scale-1](http://127.0.0.1:8771/bible/#review/character-scale-1) | decided | Yes | [#322](https://github.com/fumbleforce/tower-of-words/issues/322) running; `e219d05e` |
| [codex-contest-start](http://127.0.0.1:8771/bible/#review/codex-contest-start) | decided | No saved response | [#21](https://github.com/fumbleforce/tower-of-words/issues/21) done; historical closure without commit receipt |
| [creator-astra-1](http://127.0.0.1:8771/bible/#review/creator-astra-1) | decided | Yes | [#130](https://github.com/fumbleforce/tower-of-words/issues/130) dropped; `86b0f1fe` |
| [creator-base-1](http://127.0.0.1:8771/bible/#review/creator-base-1) | superseded | Yes | Superseded history |
| [creator-base-2](http://127.0.0.1:8771/bible/#review/creator-base-2) | superseded | Yes | Superseded history |
| [creator-base-3](http://127.0.0.1:8771/bible/#review/creator-base-3) | decided | Yes | [#22](https://github.com/fumbleforce/tower-of-words/issues/22) done; historical closure without commit receipt |
| [creator-base-4](http://127.0.0.1:8771/bible/#review/creator-base-4) | superseded | Yes | Superseded history |
| [creator-base-5](http://127.0.0.1:8771/bible/#review/creator-base-5) | decided | Yes | [#3](https://github.com/fumbleforce/tower-of-words/issues/3) done; `886bbba` |
| [creator-base-6](http://127.0.0.1:8771/bible/#review/creator-base-6) | superseded | No saved response | [#3](https://github.com/fumbleforce/tower-of-words/issues/3) done; `886bbba` |
| [creator-base-7](http://127.0.0.1:8771/bible/#review/creator-base-7) | superseded | No saved response | [#77](https://github.com/fumbleforce/tower-of-words/issues/77) done; `5f96d10` |
| [creator-base-8](http://127.0.0.1:8771/bible/#review/creator-base-8) | superseded | Yes | Superseded history |
| [creator-base-overlay](http://127.0.0.1:8771/bible/#review/creator-base-overlay) | superseded | No saved response | Superseded history |
| [creator-blender-1](http://127.0.0.1:8771/bible/#review/creator-blender-1) | decided | Yes | [#96](https://github.com/fumbleforce/tower-of-words/issues/96) dropped |
| [creator-idle-neutral](http://127.0.0.1:8771/bible/#review/creator-idle-neutral) | superseded | Yes | Superseded history |
| [creator-idle-neutral-2](http://127.0.0.1:8771/bible/#review/creator-idle-neutral-2) | superseded | Yes | Superseded history |
| [creator-idle-neutral-3](http://127.0.0.1:8771/bible/#review/creator-idle-neutral-3) | decided | Yes | [#3](https://github.com/fumbleforce/tower-of-words/issues/3) done; `886bbba` |
| [creator-parts](http://127.0.0.1:8771/bible/#review/creator-parts) | superseded | Yes | Superseded history |
| [crowd-everyday-1](http://127.0.0.1:8771/bible/#review/crowd-everyday-1) | decided | Yes | [#328](https://github.com/fumbleforce/tower-of-words/issues/328) blocked |
| [crowd-pilot-1](http://127.0.0.1:8771/bible/#review/crowd-pilot-1) | decided | Yes | [#232](https://github.com/fumbleforce/tower-of-words/issues/232) done; `6f5fd2dc` |
| [crowd-pilot-2](http://127.0.0.1:8771/bible/#review/crowd-pilot-2) | superseded | No saved response | Superseded history |
| [crowd-pilot-3](http://127.0.0.1:8771/bible/#review/crowd-pilot-3) | superseded | Yes | [#232](https://github.com/fumbleforce/tower-of-words/issues/232) done; `6f5fd2dc` |
| [crowd-pilot-4](http://127.0.0.1:8771/bible/#review/crowd-pilot-4) | decided | Yes | [#232](https://github.com/fumbleforce/tower-of-words/issues/232) done; `6f5fd2dc` |
| [crowd-pilot-5](http://127.0.0.1:8771/bible/#review/crowd-pilot-5) | decided | Yes | [#232](https://github.com/fumbleforce/tower-of-words/issues/232) done; `6f5fd2dc` |
| [day1-frames](http://127.0.0.1:8771/bible/#review/day1-frames) | decided | No saved response | [#4](https://github.com/fumbleforce/tower-of-words/issues/4) done; `a7cb1f5` |
| [day1-simplify](http://127.0.0.1:8771/bible/#review/day1-simplify) | superseded | Yes | Superseded history |
| [diorama-street-1](http://127.0.0.1:8771/bible/#review/diorama-street-1) | open | Yes | [#321](https://github.com/fumbleforce/tower-of-words/issues/321) running |
| [dorm-floor-1](http://127.0.0.1:8771/bible/#review/dorm-floor-1) | decided | Yes | [#85](https://github.com/fumbleforce/tower-of-words/issues/85) done; `417ccca` |
| [dorm-route-1](http://127.0.0.1:8771/bible/#review/dorm-route-1) | decided | Yes | [#70](https://github.com/fumbleforce/tower-of-words/issues/70) dropped |
| [emi-meshy-1](http://127.0.0.1:8771/bible/#review/emi-meshy-1) | decided | Yes | [#224](https://github.com/fumbleforce/tower-of-words/issues/224) done; `9502d90f` |
| [eric-canvas-1](http://127.0.0.1:8771/bible/#review/eric-canvas-1) | decided | Yes | [#18](https://github.com/fumbleforce/tower-of-words/issues/18) done; historical closure without commit receipt |
| [eric-expressions-1](http://127.0.0.1:8771/bible/#review/eric-expressions-1) | decided | Yes | [#23](https://github.com/fumbleforce/tower-of-words/issues/23) done; `b22ab5e` |
| [eric-portrait-ancient](http://127.0.0.1:8771/bible/#review/eric-portrait-ancient) | superseded | Yes | Superseded history |
| [eric-portrait-anime-2](http://127.0.0.1:8771/bible/#review/eric-portrait-anime-2) | superseded | Yes | Superseded history |
| [eric-portrait-anime-3](http://127.0.0.1:8771/bible/#review/eric-portrait-anime-3) | superseded | Yes | Superseded history |
| [eric-portrait-anime-4](http://127.0.0.1:8771/bible/#review/eric-portrait-anime-4) | superseded | Yes | Superseded history |
| [eric-portrait-anime-5](http://127.0.0.1:8771/bible/#review/eric-portrait-anime-5) | decided | Yes | [#24](https://github.com/fumbleforce/tower-of-words/issues/24) done; `4a5b53e` |
| [eric-portrait-final](http://127.0.0.1:8771/bible/#review/eric-portrait-final) | decided | Yes | [#25](https://github.com/fumbleforce/tower-of-words/issues/25) done; `c2c101b` |
| [eric-portrait-final-2](http://127.0.0.1:8771/bible/#review/eric-portrait-final-2) | decided | Yes | [#26](https://github.com/fumbleforce/tower-of-words/issues/26) done; `ac6764e` |
| [eric-portrait-final-3](http://127.0.0.1:8771/bible/#review/eric-portrait-final-3) | decided | Yes | [#27](https://github.com/fumbleforce/tower-of-words/issues/27) done; `ac6764e` |
| [eric-portrait-style](http://127.0.0.1:8771/bible/#review/eric-portrait-style) | superseded | Yes | Superseded history |
| [eric-voice](http://127.0.0.1:8771/bible/#review/eric-voice) | decided | No saved response | [#28](https://github.com/fumbleforce/tower-of-words/issues/28) done; `158ee8f` |
| [gaijin-line](http://127.0.0.1:8771/bible/#review/gaijin-line) | decided | Yes | [#29](https://github.com/fumbleforce/tower-of-words/issues/29) done; `ea705ec` |
| [game-facts-docs](http://127.0.0.1:8771/bible/#review/game-facts-docs) | decided | Yes | [#30](https://github.com/fumbleforce/tower-of-words/issues/30) done; `7b0c48e` |
| [gate-location](http://127.0.0.1:8771/bible/#review/gate-location) | decided | Yes | [#31](https://github.com/fumbleforce/tower-of-words/issues/31) done; `312f884` |
| [group-portrait-1](http://127.0.0.1:8771/bible/#review/group-portrait-1) | decided | No saved response | [#79](https://github.com/fumbleforce/tower-of-words/issues/79) waiting-jorgen |
| [guard-meshy-1](http://127.0.0.1:8771/bible/#review/guard-meshy-1) | decided | Yes | [#249](https://github.com/fumbleforce/tower-of-words/issues/249) done; `b7336eaa` |
| [island-half-1](http://127.0.0.1:8771/bible/#review/island-half-1) | decided | No saved response | [#173](https://github.com/fumbleforce/tower-of-words/issues/173) running |
| [island-map-1](http://127.0.0.1:8771/bible/#review/island-map-1) | superseded | No saved response | Superseded history |
| [island-map-2](http://127.0.0.1:8771/bible/#review/island-map-2) | decided | Yes | [#32](https://github.com/fumbleforce/tower-of-words/issues/32) done; historical closure without commit receipt |
| [island-map-3](http://127.0.0.1:8771/bible/#review/island-map-3) | decided | Yes | [#33](https://github.com/fumbleforce/tower-of-words/issues/33) done; `d6a15bf` |
| [island-map-4](http://127.0.0.1:8771/bible/#review/island-map-4) | decided | No saved response | [#50](https://github.com/fumbleforce/tower-of-words/issues/50) done; `977c334` |
| [island-places](http://127.0.0.1:8771/bible/#review/island-places) | decided | Yes | [#34](https://github.com/fumbleforce/tower-of-words/issues/34) done; `499d060` |
| [karaoke-song-1](http://127.0.0.1:8771/bible/#review/karaoke-song-1) | decided | Yes | [#320](https://github.com/fumbleforce/tower-of-words/issues/320) todo |
| [kenji-concept](http://127.0.0.1:8771/bible/#review/kenji-concept) | superseded | Yes | Superseded history |
| [kenji-concept-2](http://127.0.0.1:8771/bible/#review/kenji-concept-2) | superseded | Yes | Superseded history |
| [kenji-concept-3](http://127.0.0.1:8771/bible/#review/kenji-concept-3) | decided | Yes | [#35](https://github.com/fumbleforce/tower-of-words/issues/35) done; `a21712d` |
| [kenji-expressions-1](http://127.0.0.1:8771/bible/#review/kenji-expressions-1) | decided | No saved response | [#51](https://github.com/fumbleforce/tower-of-words/issues/51) done; `9f724cd` |
| [kenji-meshy-1](http://127.0.0.1:8771/bible/#review/kenji-meshy-1) | decided | Yes | [#269](https://github.com/fumbleforce/tower-of-words/issues/269) done; `e7184343` |
| [kuro-body-1](http://127.0.0.1:8771/bible/#review/kuro-body-1) | decided | Yes | [#134](https://github.com/fumbleforce/tower-of-words/issues/134) done; historical closure without commit receipt |
| [kuro-meshy-orig-1](http://127.0.0.1:8771/bible/#review/kuro-meshy-orig-1) | superseded | Yes | Superseded history |
| [kuro-meshy-orig-2](http://127.0.0.1:8771/bible/#review/kuro-meshy-orig-2) | decided | Yes | [#221](https://github.com/fumbleforce/tower-of-words/issues/221) done; `13f9ea51` |
| [kuro-meshy-orig-3](http://127.0.0.1:8771/bible/#review/kuro-meshy-orig-3) | decided | Yes | [#222](https://github.com/fumbleforce/tower-of-words/issues/222) done; `f3534fd5` |
| [kuro-voice-2](http://127.0.0.1:8771/bible/#review/kuro-voice-2) | decided | Yes | [#258](https://github.com/fumbleforce/tower-of-words/issues/258) done; historical closure without commit receipt |
| [kuroda-meshy-1](http://127.0.0.1:8771/bible/#review/kuroda-meshy-1) | decided | Yes | [#255](https://github.com/fumbleforce/tower-of-words/issues/255) done; `1f7908db` |
| [lobby-plan-1](http://127.0.0.1:8771/bible/#review/lobby-plan-1) | decided | Yes | [#270](https://github.com/fumbleforce/tower-of-words/issues/270) done; `59b739c2` |
| [mainjs-edits](http://127.0.0.1:8771/bible/#review/mainjs-edits) | decided | Yes | [#36](https://github.com/fumbleforce/tower-of-words/issues/36) done; `477b5f5` |
| [minigames-1](http://127.0.0.1:8771/bible/#review/minigames-1) | superseded | Yes | Superseded history |
| [minigames-2](http://127.0.0.1:8771/bible/#review/minigames-2) | superseded | Yes | Superseded history |
| [minigames-3](http://127.0.0.1:8771/bible/#review/minigames-3) | decided | Yes | [#244](https://github.com/fumbleforce/tower-of-words/issues/244) done; `b2abbcf9` |
| [minimap-plan-1](http://127.0.0.1:8771/bible/#review/minimap-plan-1) | decided | Yes | [#261](https://github.com/fumbleforce/tower-of-words/issues/261) done; `8eca31a` |
| [mio-meshy-2](http://127.0.0.1:8771/bible/#review/mio-meshy-2) | decided | Yes | [#335](https://github.com/fumbleforce/tower-of-words/issues/335) todo |
| [mio-phone](http://127.0.0.1:8771/bible/#review/mio-phone) | superseded | Yes | Superseded history |
| [mio-phone-2](http://127.0.0.1:8771/bible/#review/mio-phone-2) | superseded | Yes | Superseded history |
| [mio-phone-3](http://127.0.0.1:8771/bible/#review/mio-phone-3) | superseded | Yes | Superseded history |
| [mio-phone-4](http://127.0.0.1:8771/bible/#review/mio-phone-4) | superseded | Yes | Superseded history |
| [mio-phone-5](http://127.0.0.1:8771/bible/#review/mio-phone-5) | decided | Yes | [#37](https://github.com/fumbleforce/tower-of-words/issues/37) done; `f48eb11` |
| [mori-3d](http://127.0.0.1:8771/bible/#review/mori-3d) | decided | Yes | [#38](https://github.com/fumbleforce/tower-of-words/issues/38) done; historical closure without commit receipt |
| [mori-meshy-1](http://127.0.0.1:8771/bible/#review/mori-meshy-1) | decided | Yes | [#250](https://github.com/fumbleforce/tower-of-words/issues/250) done; `df8ad0c2` |
| [mori-photo-1](http://127.0.0.1:8771/bible/#review/mori-photo-1) | decided | Yes | [#301](https://github.com/fumbleforce/tower-of-words/issues/301) done; `b6ad8e9e` |
| [npc-base-1](http://127.0.0.1:8771/bible/#review/npc-base-1) | decided | Yes | [#7](https://github.com/fumbleforce/tower-of-words/issues/7) done; `e1bc957e` |
| [office-perf](http://127.0.0.1:8771/bible/#review/office-perf) | decided | Yes | [#11](https://github.com/fumbleforce/tower-of-words/issues/11) done; `44b4744` |
| [openviking-trial](http://127.0.0.1:8771/bible/#review/openviking-trial) | decided | Yes | [#39](https://github.com/fumbleforce/tower-of-words/issues/39) done; `b4b21a8` |
| [pages-switch](http://127.0.0.1:8771/bible/#review/pages-switch) | decided | No saved response | [#40](https://github.com/fumbleforce/tower-of-words/issues/40) done; historical closure without commit receipt |
| [photos-1](http://127.0.0.1:8771/bible/#review/photos-1) | decided | Yes | [#219](https://github.com/fumbleforce/tower-of-words/issues/219) done; `5a0b9666` |
| [pool-swimwear-1](http://127.0.0.1:8771/bible/#review/pool-swimwear-1) | decided | Yes | [#296](https://github.com/fumbleforce/tower-of-words/issues/296) done; `f103c7a8` |
| [productivity-review](http://127.0.0.1:8771/bible/#review/productivity-review) | decided | Yes | [#17](https://github.com/fumbleforce/tower-of-words/issues/17) done; `339e1fa` |
| [push-publish](http://127.0.0.1:8771/bible/#review/push-publish) | decided | Yes | [#41](https://github.com/fumbleforce/tower-of-words/issues/41) done; `1caacab` |
| [r2-setup](http://127.0.0.1:8771/bible/#review/r2-setup) | decided | No saved response | [#42](https://github.com/fumbleforce/tower-of-words/issues/42) done; historical closure without commit receipt |
| [refactor-next](http://127.0.0.1:8771/bible/#review/refactor-next) | decided | No saved response | [#43](https://github.com/fumbleforce/tower-of-words/issues/43) done; `42e65dd` |
| [rei-body-1](http://127.0.0.1:8771/bible/#review/rei-body-1) | decided | Yes | [#220](https://github.com/fumbleforce/tower-of-words/issues/220) done; `71dcb9b2` |
| [rei-meshy-1](http://127.0.0.1:8771/bible/#review/rei-meshy-1) | decided | Yes | [#271](https://github.com/fumbleforce/tower-of-words/issues/271) done; `c1b64414` |
| [rei-portrait-1](http://127.0.0.1:8771/bible/#review/rei-portrait-1) | decided | No saved response | [#214](https://github.com/fumbleforce/tower-of-words/issues/214) waiting-jorgen |
| [source-of-truth-audit](http://127.0.0.1:8771/bible/#review/source-of-truth-audit) | superseded | No saved response | Superseded history |
| [style-align-1](http://127.0.0.1:8771/bible/#review/style-align-1) | decided | Yes | [#86](https://github.com/fumbleforce/tower-of-words/issues/86) done; `e1bc957e` |
| [style-avenues](http://127.0.0.1:8771/bible/#review/style-avenues) | decided | Yes | [#44](https://github.com/fumbleforce/tower-of-words/issues/44) done; `9923393` |
| [style-avenues-room](http://127.0.0.1:8771/bible/#review/style-avenues-room) | decided | Yes | [#45](https://github.com/fumbleforce/tower-of-words/issues/45) done; `9923393` |
| [style-in-game](http://127.0.0.1:8771/bible/#review/style-in-game) | decided | Yes | [#46](https://github.com/fumbleforce/tower-of-words/issues/46) done; `9923393` |
| [style-rough](http://127.0.0.1:8771/bible/#review/style-rough) | superseded | Yes | Superseded history |
| [test-runs-parallel](http://127.0.0.1:8771/bible/#review/test-runs-parallel) | decided | Yes | [#47](https://github.com/fumbleforce/tower-of-words/issues/47) done; `7ad650c` |
| [train-discoveries-1](http://127.0.0.1:8771/bible/#review/train-discoveries-1) | decided | Yes | [#6](https://github.com/fumbleforce/tower-of-words/issues/6) done; `3011a9ff` |
| [voice-input-ui](http://127.0.0.1:8771/bible/#review/voice-input-ui) | decided | Yes | [#48](https://github.com/fumbleforce/tower-of-words/issues/48) done; `950452b` |
| [writing-contest-day2](http://127.0.0.1:8771/bible/#review/writing-contest-day2) | decided | Yes | [#14](https://github.com/fumbleforce/tower-of-words/issues/14) done; `52c168d` |
