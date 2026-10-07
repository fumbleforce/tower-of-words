# Selected Mio integration (#335)

The selected `mio-2` from Review mio-meshy-2 becomes the native default. The approved mesh, texture and native walk/run/sit/relaxed idle remain unchanged. `?mio=legacy` retains the prior model; the optional chibi look stays separate. The prior phone pose is retargeted with the existing helper into thirteen upper-body tracks in characters/mio2/phone.json.

## Physical contacts

The train laptop used a fixed seat-relative height. It now rests on the selected model's actual seated thigh surface; both wrists reach the real laptop keyboard through the existing hand solver during free idle. Authored busy gestures retain control of her arms. The laptop remains a car-space prop when Mio stands or leaves. Old seated train saves migrate once to the selected rig after saved-place actor decorators finish; the new mioBody marker preserves future selected-rig poses and hidden visibility. Mio's office keyboard moves toward her desk's near edge, still fully supported by the same desk. Both hands solve against its physical key banks. The shared solver and limits are unchanged. The separate prop helpers reduce the existing modules' size ceilings.

Lunch retains its approved sequence. Cable pickup holds the loop rim, so the hand stays above the hook as it hangs the coil. Bento pickup uses the near box side. The new head's bone coordinates differ from the legacy rig: its lower lip was calibrated from native face ray hits near texture UV (0.215,0.97), instead of reusing the legacy head-local point. The unchanged native mesh and texture are the reference.

## Capture staging

Train day-1 seated Mio works with a laptop on her thighs. The original game view is retained, followed by diagnostic oblique/front and side views inside the car looking across the bench at her lap and hands. Floor, cushion, thighs and laptop establish support. Open water belongs outside the side windows. Day-2 office fixture sets d2_ticket_done and invokes officeDay2 arrive: Mio sits at her own desk beside the protagonist. Diagnostic cameras look past the keyboard toward her hands and monitor; other desks remain behind her. Camera targets are the body centre, offset 0.5 units upward and approximately 1.8 units away, 42-degree lens. These frames do not change the gameplay camera.

Standing phone detail shows the native phone held upright. Sustained walk/run samples occur on reachable forecourt paving after putting the phone away. Lunch captures use the existing native action cameras and real Talk/choice sequence, including neutral lip, cable, bento and checklist contacts. Desktop is 1366×860; phone is 390×844. Explicit charscale=85/100 tests isolate size compatibility before integration with the new default. Public-only interception is enabled for all new native helpers.

## Retained attempts

round1/round2 retain the loader/phone integration and original floating laptop/raised hands. contacts3/4 caught stale skin-bind inverses during thigh sampling before the scene opened; contacts5/6 establish laptop support and expose the distant desk keyboard; contacts7/8 verify the corrected keyboard at both sizes. Earlier lunch85 attempts retain the too-low cable target and old head-local mouth point; step3's first attempt retains the box-centre pickup miss. No failed attempt was substituted or deleted.

## Validation

The first full source check passed all gates and 661 tests. Native default85 desktop and explicit100 phone cover train/office contacts, thirteen phone tracks and sustained walk/run. Both keyboard wrists remain within 4 mm of their target. The legacy query also loads and runs its seated poses. A full snapshot captured from legacy100 is restored into selected85 through actual restoreState: native seat position gap 0, supported prop gap below 1e-9, hidden actor visibility preserved, and a later selected-rig save retains its displaced position. Actual stand and reparent do not carry the laptop away. This is a complete native place snapshot migration probe, not a replay of an external user's save file.

Lunch step2 passes at 85 and 100 on both viewports. Step3 passes at 85 desktop and 100 phone. Actual Save/Continue during the bite passes at 85 phone. Named action captures from older probes sometimes arrive after contact or are occluded; the separate held-detail cable pickup/hook and bento pickup frames freeze the native action at its next wait before release. Their camera is diagnostic, and their geometry and pose are unchanged. The mouth frame shows food at the selected mesh's lip.

Phone clip upload is content-addressed and HEAD-verified. Final evidence packaging and integrated default85 regression results accompany the Showcase entry.
