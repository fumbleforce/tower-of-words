// Movement and facing for everyone who walks:
//   SmoothWalker   the player (engine.js Walker + acceleration, braking, a turn rate, rounded corners, a gait value,
//                  steering round other people, and the tap feedback: path preview, destination ring, "can't go" mark)
//   walkRig        a scripted walk for anyone (routed over the place's walk grid, smooth turns, steers round people,
//                  never ends on top of someone, settles into idle)
//   glide          the straight-line move the trips use (doors, lifts), with the same smooth start, stop and turn
//   approachSpot   where to stand to talk to someone: a talking distance in front of them, on free floor
//   pickPerson     which person a tap meant: a capsule round the whole body, generous, before any floor tap
//
// Facing has one owner per character. Only the walker writes the player's facing, and it adopts any turn or
// move made by someone else (a trip, a sit) instead of turning back to an old target afterwards. NPC moves never
// touch the player's facing (the old glide wrote every mover's heading into the player's walker, which made Eric
// spin on the spot whenever Mio walked during a scene).
//
// Numbers (measured on the Meshy clips): Eric's walk clip covers about 0.44 body units / s at time scale 1, his run
// clip about 1.1; Mio's 0.47 and 0.77. The avatars blend walk and run by the gait value (setGait) so feet don't slide.
// Public facade retained for places, story staging and tooling.
export { turnToward, bodies } from './movement/shared.js';
export { isPassing, softSeparate, personStep } from './movement/crowd.js';
export { SmoothWalker } from './movement/walker.js';
export { walkRig, faceRig, standOut, glide } from './movement/scripted.js';
export { detourPoint, standOff, approachSpot, pickPerson } from './movement/targets.js';
export { PathPreview } from './movement/preview.js';
export { startMoveCheck } from './movement/checks.js';
