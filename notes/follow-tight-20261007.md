# Tight follow-camera transition (#331)

The inherited room 203 camera hid the player below 1.15 times the place's
character scale, then immediately restored the whole model. The doorway fix
(#325, main 02116a65) left that camera behavior outside its acceptance scope.

The camera now uses the same centered 50-degree lens, mouse yaw/pitch, movement
frame and five-ray wall collision. A small helper fades only the local player's
rendering over 160 ms. It starts hiding below 1.9 times the place scale and
requires more than 2.1 times the scale to return. An obstruction that suddenly
puts the lens below 1.4 times the scale hides the player immediately, avoiding a
frame of hair against the lens. Close activation starts hidden. There is no
persistent translucent state.

Partial fades use private copies of the local materials. Every simulation step
restores the originals before authored rendering; leaving follow mode disposes
the copies. Shared NPC materials, original visibility, original opacity,
alpha-test and depth-write state remain intact. Character normal, tint and
lighting shader hooks are preserved on the fade copies. Solid walls, ceilings, nav and
character scale are unchanged.

## Evidence

Originals, recordings, reports and logs are under
`game3d/shots/follow-tight/`. The Showcase entry retains every captured attempt,
including rejected probes and failed test fixtures. Its video links preserve the
transition timing; still images alone do not establish a smooth fade.

- `probe1` and `probe2`: invalid composition fixtures; entry had not settled.
- `probe3`: invalid fixture; follow enclosure was not active before pausing.
- `probe4`: valid collision-cleared height/shoulder studies, rejected visually.
- `probe5` and `probe6`: valid shoulder and wide-lens studies, independently
  judged 5/10. The jamb and head left too little useful view. These are paused
  geometry probes with forced player visibility, never proposed runtime behavior.
- `candidate1`: valid north fade; native mouse recapture timed out before south.
- `candidate2`: Eric crossed both ways; screenshot cadence delayed key release
  beyond the test's precise endpoint assertion.
- `candidate3`: Eric crossed all four sequences; the precise south endpoint
  assertion still failed after native key-up latency. The later test asserts
  arrival within the usable room zone and releases keys independently of captures.
- `candidate4`: Eric and Carina at explicit 100%, native north W, north-facing
  retreat S, repeated north W, then south W. Both pass. Full recordings and
  per-render samples include fade-in and fade-out.
- `candidate5-85`: the same sequences pass for both protagonists at explicit 85%.
- `sanity1`: phone overview in 203 and four native look headings in the train and
  karaoke booth. The phone retains the overview and visible player. Ceiling and
  wall compression remain in the desktop views.
- `baseline1`: matching native sequences against main with the old hard hide.

Reproduce with `URL=<candidate>/game3d OUT=<fresh path> node
game3d/tools/follow-tight-check.mjs`. `SCALE=85` checks the smaller characters;
`SANITY=1` runs the three additional places; `PERF=1` disables video and screenshots
for a bounded performance comparison; `RECORD_ONLY=1` retains video without
concurrent screenshots. All browser requests use the public-only
route guard and the normal GPU queue. The input is real relative mouse motion and
native W/S key events in a 1366×860 desktop viewport.

## Checks and limits

The focused camera suite passes 17 tests, including hysteresis, obstruction
jumps, initial compression, shared materials, material arrays, disposal and
restoring an authored invisible root. The full CPU run passes 655 tests and all
other gates; an unqualified browser RAF in the new native helper failed lint on
the first run, was corrected, and its lint rerun passes. Full fast desktop and
phone pass without override flags. Final precommit repeats the CPU gate.

The video runs include encoding, screenshot and shared-GPU overhead. Their frame
medians cannot be used to infer a runtime regression. Full-frame median draw
calls stay around 230–232; peaks are 299–337. The sequential no-video pair gives Eric baseline/candidate median 16.7/16.7 ms,
p99 50.1/50.0 ms; Carina median 16.8/16.7 ms, p99 66.7/50.0 ms. Median draw calls
are 232/230 and 231/231; candidate peak337 equals baseline peak337. These are
local RTX3080 measurements including room entry. They are not low-end hardware
results. Reports are `perf-baseline/report.json` and `perf-candidate/report.json`.

Independent review found that Three's clone omits character shader hooks. The
helper now carries both callbacks explicitly, with a focused regression.
`candidate6-record` and `candidate7-record-85` verify the hook correction and
native routes, but a remaining capture-loop guard still took screenshots. Their
name does not make them screenshot-free evidence. `candidate8-video` corrects
that guard and records both actors at both 100% and 85%, with no PNG capture
while walking. Its published stills are extracted video frames, with timestamps
in `candidate8-video/extracted-frames.json`.

Final independent review passes the scoped change at 8/10. It inspected the
rendered transitions frame by frame and confirmed several visible transparency
steps for both actors in the final video. The room/lens remain steady through
the fade. Source review verified the shader-hook correction and private-material
lifecycle. Report: `game3d/shots/follow-tight/independent-review.md`.

Final full fast tests after the shader-hook correction pass at 1366×860 and
390×844 with no overrides. Their raw artifacts were copied to main and hash
checked. `sequence-validation.json` verifies all 16 final recorded movement
sequences: one visibility transition each, constant 50-degree lens and yaw,
and the lens below the 1.55 room ceiling.
