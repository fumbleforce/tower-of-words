# Rei rig recovery

Rei's selected mesh and texture stay unchanged. The saved `rerig2.py` corrects the donor-to-host bone directions before copying Emi's walk, run and sit. It preserves the previous custom rig's exact weight arrays, including the ponytail's head/neck blend.

Saved WIP is preserved in commit `956b0d30`. All earlier renders and both original custom rig and auto-rig attempts remain in Review `rei-meshy-1`. No new paid generation was used during recovery.

Evidence in `posture-recovery.json` samples 61 frames per native clip. Both knees bend forward throughout repaired walk, run and sit. Position, normal, UV and index arrays match the selected model exactly; the texture is identical. Weight sums differ from one by at most 1.2e-7.

`probe-recovery-out.json` uses the game's motion loader. Walk slip improves from 0.81 to 0.15 (Emi 0.15, Kuro 0.14); thigh splay improves from 18.7° to 7.8°. Run slip is 0.35 (Emi 0.24, Kuro 0.25; current cast range 0.24–0.49). The probe's idle block includes the transition from a preceding gait, so it is not a settled-idle range.

Actual scripted movement in the current game: median stride/travel ratio Rei 0.99, Emi 1.00, Kuro 1.01. Each has one bad transition window and no sustained gait report. Evidence: `art/parts/rei-rig-2/game-walk-recovery/report.json`. The close walking frames pass behind foreground foliage; the isolated viewer provides the unobstructed silhouette check.

Train QA preserves the native seat and laptop setup by skipping only the story's subsequent `placeMio` handoff in the test page. Rei is seated with the laptop attached to `rei.lap`. Desktop and phone captures and measured anchor positions are under `art/parts/rei-rig-2/train/`; no page errors. No train or cast runtime code is changed.

`npm run check` passed in the recovery worktree. Integrated fast-day and independent review belong to the final landing alongside the main agent's shared idle/gait repair.

Idle: the generic native-rest export is preserved as `game/idle-native.json`. The installed idle maps the corrected Emi idle through the same donor-frame convention as the repaired clips (`donor_idle.py`); `install.sh` rebuilds it after the shared exporter has baked Emi. The comparison is saved as `viewer/idle-trial-side.png` and `idle-trial-front.png`. Both versions remain in the Review item. Head-minus-hips joint angles are not a face or torso tilt measurement: Rei’s head joint sits behind her face. Final joint angle -6.81° to -1.74°, knees forward 0.131/0.165 leg lengths, feet within 0.057 leg lengths of directly under the hips.
