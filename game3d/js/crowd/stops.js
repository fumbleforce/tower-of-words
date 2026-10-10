// Walkers who stop on the way (crowd/index.js): a step to the side of the path, then a look at a phone, a look in a
// shop window, bending down to a shoe, or (two walking together) turning to each other to talk, and on again. A few
// stand a good while (lingerers). Only where the path is wide enough for the others to pass, never in a scene.
//
//   planStop(b, R, share, L)      at launch: whether and how far along (b.stopAt, in place units walked) they stop
//   wantStop(b, ctx)              each frame while walking: time to stop here? (wide paving, away from Eric and doors)
//   startStop(b, R, ctx, with)    stop now (with: the walking companion, who stops too, facing them)
//   stopStep(b, dt, ctx)          each frame while stopped: the step aside (clear of ctx.list, bodies(game)), the turn,
//                                 the small life; true when over
//   endStop(b)                    back to walking
import { standPose, idleLife, stride } from './motion.js';
import { turnToward, BODY } from '../movement/shared.js';
import { clearAt } from './paths.js';

export function planStop(b, R, share, L) {
  b.walked = 0;
  b.stopAt = b.gait !== 'jog' && R() < share ? L * (0.2 + R() * 0.55) : Infinity;
}

// the walker is far enough along, on paving wide enough to step aside, away from Eric, the ends and the doors
export function wantStop(b, { g, K, eric, ends }) {
  if (b.walked < b.stopAt || b.stopped || b.lead) return false;
  const p = b.r.root.position;
  if (clearAt(g, p.x, p.z) < 0.9 * K) return false;
  if (eric && Math.hypot(eric.x - p.x, eric.z - p.z) < 3 * K) return false;
  if (Object.values(ends).some((e) => Math.hypot(e.at[0] - p.x, e.at[1] - p.z) < 3 * K)) return false;
  return true;
}

// the nearest wall, fence or shopfront within reach (to look at), or null
function faceWall(g, x, z, K) {
  let best = null;
  for (let a = 0; a < 8; a++) {
    const yaw = (a / 8) * Math.PI * 2;
    for (let d = 0.5; d < 3.2 * K; d += 0.25)
      if (clearAt(g, x + Math.sin(yaw) * d, z + Math.cos(yaw) * d) < 0.05) {
        if (!best || d < best.d) best = { yaw, d };
        break;
      }
  }
  return best && best.yaw;
}

export function startStop(b, R, { g, K }, mate) {
  const r = b.r,
    p = r.root.position,
    yaw = r.root.rotation.y;
  // over to the right-hand edge of the way they were going (the walking lanes keep off it), at most a few steps;
  // two together stay where they are, turned to each other
  const rx = -Math.cos(yaw),
    rz = Math.sin(yaw);
  let to = [p.x, p.z];
  if (!b.mate && !mate)
    for (let o = 0.2 * K; o < 2.5 * K; o += 0.1 * K) {
      const x = p.x + rx * o,
        z = p.z + rz * o;
      if (clearAt(g, x, z) < 0.34) break;
      to = [x, z];
    }
  let mode = 'chat',
    face = yaw;
  if (!b.mate && !mate) {
    const x = R();
    mode = x < 0.5 ? 'phone' : x < 0.85 ? 'window' : 'shoe';
    if (mode === 'window') face = faceWall(g, ...to, K) ?? yaw + (R() < 0.5 ? 1.4 : -1.4);
  }
  // most for a few seconds; one in five lingers a good while
  const dur = R() < 0.2 ? 14 + R() * 14 : mode === 'shoe' ? 3 + R() * 2 : 3.5 + R() * 6;
  b.stopped = {
    mode,
    to,
    face,
    dur,
    t: 0,
    life: {
      r,
      mode: mode === 'chat' ? 'chat' : 'stand',
      phone: mode === 'phone',
      talker: !mate,
      t: 0,
      ph: R() * 10,
    },
  };
  r._walk = false;
  return b.stopped;
}

// the companion stops beside them, the two turned to each other, for as long as the first one stands
export function stopBeside(m, lead, R, ctx) {
  const s = startStop(m, R, ctx, lead);
  s.dur = lead.stopped.dur;
  s.with = lead;
  return s;
}

export function stopStep(b, dt, { place, eric, K, list = [] }) {
  const s = b.stopped,
    r = b.r,
    p = r.root.position;
  s.t += dt;
  // the walk aside (with steps), never toward Eric
  const dx = s.to[0] - p.x,
    dz = s.to[1] - p.z,
    d = Math.hypot(dx, dz);
  r._walk = d > 0.02;
  if (r._walk) {
    const st = Math.min(d, 0.8 * K * dt),
      x = p.x + (dx / d) * st,
      z = p.z + (dz / d) * st;
    const closer =
      eric &&
      Math.hypot(x - eric.x, z - eric.z) < Math.hypot(p.x - eric.x, p.z - eric.z) &&
      Math.hypot(x - eric.x, z - eric.z) < 1.5 * K;
    if (!closer && (!place.nav || place.nav.free(x, z)) && !into(list, r, x, z, p, K)) {
      p.x = x;
      p.z = z;
      r.root.rotation.y = turnToward(r.root.rotation.y, Math.atan2(dx, dz), dt, 5);
      b.moved = st / Math.max(dt, 1e-4);
      stride(b, dt, true);
      return false;
    }
    s.to = [p.x, p.z];
    r._walk = false;
  }
  if (!s.still) {
    s.still = true; // there: stand
    standPose(r);
  }
  // turned the way they look: the shop window, the companion, or still the way they were going
  let face = s.face;
  const w = s.with || b.mate;
  if (s.mode === 'chat' && w) face = Math.atan2(w.r.root.position.x - p.x, w.r.root.position.z - p.z);
  r.root.rotation.y = turnToward(r.root.rotation.y, face, dt, 2.5);
  if (s.mode === 'shoe') {
    // bent down to a shoe
    const k = Math.min(1, s.t * 2, (s.dur - s.t) * 2);
    r.torso.rotation.x = 0.75 * k;
    r.head.rotation.x = 0.35 * k;
    r.arms[0].rotation.x = -0.9 * k;
    // Raise the carrying hand while bending so the bag stays above the paving.
    r.arms[1].rotation.x = (!r.meshy && r.carryPose ? -1.1 : -0.8) * k;
    r.carryPose?.();
  } else if (s.mode === 'window') {
    s.life.t += dt;
    r.head.rotation.y = Math.sin((s.life.t + s.life.ph) * 0.3) * 0.35;
    r.head.rotation.x = 0.05;
  } else idleLife(s.life, dt);
  return s.t >= s.dur;
}

// a step to (x, z) that goes into someone (anyone in bodies(game), seated or standing): they stop where they are.
// The step aside was only checked against Eric and the walls, so a stop toward someone standing pressed into them (#182)
function into(list, r, x, z, p, K) {
  const me = BODY * K;
  for (const o of list) {
    if (o.root === r.root) continue;
    const d = Math.hypot(x - o.x, z - o.z);
    if (d < o.r + me && d < Math.hypot(p.x - o.x, p.z - o.z)) return true;
  }
  return false;
}

export function endStop(b) {
  standPose(b.r);
  b.stopped = null;
  b.stopAt = Infinity;
  b.legAt = -1; // a fresh start for the stall check
  b.best = Infinity;
  b.held = 0;
}
