# Recovery checks, 2026-10-06

The selected carina-2 has the requested waist texture repair, head and hair scaled
uniformly to 0.85 about the neck, and denim trousers. Source geometry audit found
maximum error 3.93e-7 m against that transformation; body vertices are unchanged.
The alternate grey texture and every saved prior rig/render remain in the review.
No paid generation was run during recovery. The saved native sit clip used three
Meshy credits before recovery, recorded in review 1's ledger.

Use the native Meshy rig, with the saved repaired weights. Full-cycle joint checks
found backward knee bending in the earlier fitted rig: minimum sagittal knee
offset from the hip–ankle line was -0.0777/-0.1287 leg lengths in walking. Native
clips give +0.046/+0.0438 throughout walking and +0.107/+0.0244 throughout running.
`posture-results.json` contains all candidate results (61 frames per clip, using
the sibling Mio posture.py diagnostic). This measurement supersedes the original
preference for the fitted rig's smaller sliding error.

The native rig's saved probe reports walk mesh slip 0.23 and run mesh slip 0.35
(relative to body speed); fitted rig values were 0.21/0.27. The native animation
has more foot lift. These are disclosed residual motion limitations, not hidden
by slowing the preview. The runtime derives stride speeds from these clips.
The approved relaxed-3 idle remains shared with the cast and leans backward;
root is investigating that source pose separately. Do not use the old fitted
rig to avoid that shared idle issue.

Checks and artifacts:

- Full repository CPU checks passed for the model/refinements and viewer fix.
- Real-time native walk/run/idle ran for 6.4 seconds each, plus sitting, on desktop
  and phone; later bone poses continued changing with no page errors.
- Real-time Mio viewer regression: walk/run/idle for 6.3 seconds each, both old/new
  models at 1366x860 and 390x844, correct states and repeated pose changes.
- Before the rig swap, full day-1 fast checks passed at both sizes with the
  disclosed VOICE_WARN=1 override (30 missing Carina voice lines). The native rig then passed focused train/gate seating at 1366x860; its
  seating geometry is independent of viewport. Earlier fitted-rig seat tests
  passed at both viewport sizes after the diagnostic correction.
- Seat checker now uses the named cushion height to choose its ray hit, so an
  adjacent train armrest cannot replace the cushion. Three regression tests
  preserve detection of actual sinking and the unnamed-seat fallback.

Durable local evidence is under main game3d/shots/carina-recovery/native/ and
main game3d/shots/mio-preview-recovery/. The continuous WebM files and sample JSON
prove sustained movement; stills are only framing and appearance evidence.
