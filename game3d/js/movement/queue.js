import { bodies } from './shared.js';
import { isPassing } from './crowd.js';

// One step of a set route (the lobby's commuters) that doesn't walk into anyone: with another passer-by right in front
// they wait (a queue at the reader) for up to 2 s, then carry on and softSeparate eases them round. Eric and the
// story's people have right of way: no step that comes closer to one of them once within arm's reach, however long
// it takes (Kuroda stood on the spot a commuter was heading for, and after 2 s the commuter walked into him).
// Returns 0 when there, 1 after a step, 2 while waiting.
export function queueStep(game, rig, tx, tz, speed, dt) {
  const p = rig.root.position,
    d = Math.hypot(tx - p.x, tz - p.z);
  rig._walk = d >= 0.04;
  if (!rig._walk) return 0;
  const fx = (tx - p.x) / d,
    fz = (tz - p.z) / d,
    list = bodies(game),
    me = list.find((b) => b.root === rig.root);
  const ahead = list.find((b) => {
    if (!me || b === me || isPassing(rig.root, b.root)) return false;
    const bx = b.x - me.x,
      bz = b.z - me.z,
      bd = Math.hypot(bx, bz) || 1e-4;
    return bd < b.r + me.r + 0.08 && (bx * fx + bz * fz) / bd > 0.5;
  });
  rig._queue = ahead ? (rig._queue || 0) + dt : 0;
  if (ahead && (rig._queue < 2 || !ahead.crowd)) return 2;
  const s = Math.min(d, speed * dt),
    nx = p.x + fx * s,
    nz = p.z + fz * s;
  const inWay = (b) => {
    if (b.crowd || b === me || isPassing(rig.root, b.root)) return false;
    const near = Math.hypot(b.x - nx, b.z - nz);
    return near < b.r + me.r + 0.08 && near < Math.hypot(b.x - me.x, b.z - me.z);
  };
  if (me && list.some(inWay)) return 2;
  p.x = nx;
  p.z = nz;
  return 1;
}
