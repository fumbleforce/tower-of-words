// How the ambient crowd moves and idles (crowd/index.js): one walking step that gives way to everyone (they slide
// round people, follow whoever walks ahead the same way, and give Eric and the story's people a wide berth), the
// walk and run cycles, sitting on a bench, and the small life of people standing about (talking, a phone, a nod).
import { HIP, walkPose } from '../train/people.js';
import { turnToward } from '../movement/shared.js';
import { stepGait, stopGait, paceCap, walking, codeStride } from '../movement/gait.js';
import { slideStep, followSpeed, press, isHard, isPassing } from '../movement/crowd.js';

// someone with right of way walking through in fixed choreography (a trip's glide), whom the crowd steps aside for
export const gliding = (b) => !!(b.rig && b.rig._noAvoid && b.rig._walk && !b.rig.ambient);

const ME = 0.24; // a body's radius before the place's character scale (movement/shared.js BODY)

// one step along w.line toward its next point. list: bodies(game) this frame; eric: his entry in it;
// wide: the extra room Eric gets (a scene is playing). Returns true at the end of the line.
export function walkStep(game, w, dt, list, eric, wide) {
  const r = w.r,
    p = r.root.position,
    P = game.place,
    K = P.charScale || 1,
    me = ME * K;
  // while a scene plays, nobody heads for a door Eric is at or going to (the dorm hall's stairs): they wait,
  // stepping out of his way, until the scene is over
  if (wide && eric && w.toDoor) {
    const [dx, dz] = w.tail[0];
    if (Math.hypot(eric.x - dx, eric.z - dz) < 3 * K) {
      w.best = Infinity; // waiting is not being stuck (stalled())
      w.moved = 0;
      r._walk = false;
      const ex = p.x - eric.x,
        ez = p.z - eric.z,
        ed = Math.hypot(ex, ez) || 1e-4,
        want = eric.r + me + wide;
      if (ed < want) {
        const push = Math.min(want - ed, 1.2 * K * dt);
        p.x += (ex / ed) * push;
        p.z += (ez / ed) * push;
      }
      return false;
    }
  }
  const [tx, tz] = w.line[w.i];
  const d = Math.hypot(tx - p.x, tz - p.z);
  if (d < 0.3 * K) {
    w.i++;
    return w.i >= w.line.length;
  }
  let fx = (tx - p.x) / d,
    fz = (tz - p.z) / d;
  let speed = Math.min(w.speed, paceCap(r)); // no faster than a chibi's steps can go
  const ox = p.x,
    oz = p.z;
  // someone right ahead: follow them at their pace when they walk the same way, slow down to go round otherwise
  let ahead = null,
    ad = 1e9;
  for (const b of list) {
    if (b.root === r.root || isPassing(r.root, b.root)) continue;
    const rx = b.x - ox,
      rz = b.z - oz,
      bd = Math.hypot(rx, rz) || 1e-4;
    const room = b.r + me + (b === eric ? 0.35 + wide : 0.25);
    if (bd < room && (rx * fx + rz * fz) / bd > 0.55 && bd < ad) {
      ahead = b;
      ad = bd;
    }
  }
  if (ahead) {
    const lead = followSpeed(ahead, fx, fz, ad - ahead.r - me);
    speed = lead !== null ? Math.min(speed, lead) : speed * 0.5;
  }
  // wait: Eric is at the door they're going to, in a scene, or closer than the room a scene gives him
  const crowded = !!(wide && eric && Math.hypot(ox - eric.x, oz - eric.z) < eric.r + me + wide);
  const s = w.wait || crowded ? 0 : Math.min(d, speed * dt);
  let x = ox + fx * s,
    z = oz + fz * s,
    by = null;
  for (const b of list) {
    if ((w.ghost && b.rig?.ambient) || b.root === r.root || isPassing(r.root, b.root)) continue;
    // Eric, the story's people and anyone seated are hard: the crowd goes round them and never leans in
    const crowd = b.rig && b.rig.ambient;
    const rr = b.r + me + (b === eric ? wide : 0);
    const [sx, sz] = slideStep(ox, oz, x, z, b, rr, fx, fz, s, !crowd || isHard(b));
    if (sx === x && sz === z) continue;
    by = b;
    x = sx;
    z = sz;
  }
  // out of the way of whoever has right of way however they move: Eric while a scene plays (a scripted walk doesn't go
  // round people), and anyone in fixed choreography walking through (a trip's glide goes round nobody: Eric walking
  // out along the forecourt's lane went straight through a passer-by coming the other way)
  for (const b of list) {
    const extra = b === eric && wide ? wide : gliding(b) ? 0.3 * K : -1;
    if (extra < 0 || b.root === r.root) continue;
    const want = b.r + me + extra;
    // no step that comes closer to them once near: stay put (the push below moves them off)
    if (
      Math.hypot(x - b.x, z - b.z) < Math.hypot(ox - b.x, oz - b.z) &&
      Math.hypot(ox - b.x, oz - b.z) < want + 0.4 * K
    ) {
      x = ox;
      z = oz;
      w.best = Infinity; // giving way is not being stuck (stalled())
    }
    const ex = x - b.x,
      ez = z - b.z,
      ed = Math.hypot(ex, ez) || 1e-4;
    if (ed < want) {
      const push = Math.min(want - ed, Math.max(w.speed, 1.2 * K) * 2 * dt);
      // aside rather than ahead of someone walking at them: half away, the rest across their way, on the side they're on;
      // failing that the other side, if it takes them no nearer; failing both, they wait. Each step aside must be clear
      // of everyone else too: pushed after the collisions above, it put a walker inside a staff member beside them (#198)
      const v = b.root.userData.walkVel,
        vl = v ? Math.hypot(v[0], v[1]) : 0,
        ux = ex / ed,
        uz = ez / ed;
      const sides = [];
      if (vl > 0.1) {
        const sx = -v[1] / vl,
          sz = v[0] / vl,
          side = ex * sx + ez * sz >= 0 ? 1 : -1;
        sides.push([ux * 0.5 + sx * side, uz * 0.5 + sz * side], [ux * 0.5 - sx * side, uz * 0.5 - sz * side]);
      } else sides.push([ux, uz]);
      for (const [dx, dz] of sides) {
        const l = Math.hypot(dx, dz) || 1,
          cx = x + (dx / l) * push,
          cz = z + (dz / l) * push;
        if (Math.hypot(cx - b.x, cz - b.z) < ed || !clearOf(list, b, r, w, me, x, z, cx, cz)) continue;
        x = cx;
        z = cz;
        break;
      }
    }
  }
  const nav = P.nav;
  if (nav && w.onGrid && !nav.free(x, z) && nav.free(ox, oz)) [x, z] = nav.collide(x, z, ox, oz);
  p.x = x;
  p.z = z;
  // no headway against another passer-by for a while: slip past (the movement check lets passing pairs through); never
  // through Eric or the story's people, whom they wait for or go round (stalled() and rejoin)
  press(game, r, r.root, by && by.crowd ? by : null, Math.hypot(x - ox, z - oz), s, dt, 1.2);
  const mx = x - ox,
    mz = z - oz,
    moved = Math.hypot(mx, mz);
  r._walk = true;
  // face the way they actually move, smoothly; not on tiny nudges, which flipped headings back and forth
  if (moved > s * 0.3 && moved > 1e-4) r.root.rotation.y = turnToward(r.root.rotation.y, Math.atan2(mx, mz), dt, 5);
  w.moved = moved / Math.max(dt, 1e-4);
  return false;
}

// a step aside from (x, z) to (cx, cz) clear of everyone but the one given way to (b): outside each body, or no
// nearer one they already touch. A passer-by who walks through others (w.ghost) only minds those who aren't.
function clearOf(list, b, r, w, me, x, z, cx, cz) {
  for (const o of list) {
    if (o === b || o.root === r.root || (w.ghost && o.rig?.ambient) || isPassing(r.root, o.root)) continue;
    const rr = o.r + me,
      d = Math.hypot(cx - o.x, cz - o.z);
    if (d < rr && d < Math.hypot(x - o.x, z - o.z)) return false;
  }
  return true;
}

// no nearer the next point for STALL seconds (the point moving on resets it)
const STALL = 1.5;
export function stalled(w, dt) {
  const p = w.r.root.position,
    t = w.line[Math.min(w.i, w.line.length - 1)],
    d = Math.hypot(t[0] - p.x, t[1] - p.z);
  if (w.i !== w.legAt || d < w.best - 0.05) Object.assign(w, { legAt: w.i, best: d, held: 0 });
  else w.held += dt;
  return w.held > STALL;
}

// the walk (or run) cycle, by the distance covered: the walk, and a chibi's run, timed to the ground they really
// cover (movement/gait.js stepGait: standing while held up or given way to); a code-built jogger by its own swing
export function stride(w, dt, visible) {
  const r = w.r,
    run = w.kind === 'jog';
  if (!run || r.meshy) {
    if (!visible) return;
    stepGait(r, w.moved * dt, dt, { run });
    if (!r.meshy && r.arms[1].children.length > 2) r.arms[1].rotation.x *= 0.35; // a bag: that arm hardly swings
    return;
  }
  if (!visible) return;
  const { amt } = walking(r, w.moved * dt, dt);
  w.ph += (w.moved * dt) / (r.root.scale.x || 1) / codeStride(r, r.root, jogPose, '_strideJog');
  jogPose(r, w.ph, amt);
}

// a code-built jogger at phase ph, amt of the swing
function jogPose(r, ph, amt) {
  const sn = Math.sin(ph),
    c = Math.cos(ph);
  r.legs[0].rotation.x = sn * 0.85 * amt;
  r.legs[1].rotation.x = -sn * 0.85 * amt;
  r.knees[0].rotation.x = Math.max(0, -c) * 1.1 * amt + 0.2;
  r.knees[1].rotation.x = Math.max(0, c) * 1.1 * amt + 0.2;
  r.arms[0].rotation.x = -0.9 - sn * 0.6 * amt;
  r.arms[1].rotation.x = -0.9 + sn * 0.6 * amt;
  r.arms[0].rotation.z = 0.15;
  r.arms[1].rotation.z = -0.15;
  r.hips.position.y = HIP + Math.abs(c) * 0.05 * amt;
  r.torso.rotation.x = 0.12;
  r.head.rotation.x = -0.08;
}

// standing still, every joint back where it rests
export function standPose(r) {
  stopGait(r);
  if (r.meshy) {
    r.seated = false;
    r.root.position.y = 0;
    if (r._ph) r.phone((r._ph = false) || '');
    return r.setState('idle');
  }
  walkPose(r, 0, 0);
  r.hips.position.y = HIP;
  r.torso.rotation.set(0, 0, 0);
  r.torso.position.y = 0.02;
  r.head.rotation.set(0, 0, 0);
  for (const k of r.knees) k.rotation.x = 0;
  for (const l of r.legs) l.rotation.set(0, 0, 0);
  for (const a of r.arms) a.rotation.set(0, 0, 0);
  r.root.position.y = 0;
  r.seated = false;
}

// on a bench whose seat top is at seatY (place units), facing yaw
export function benchSit(r, x, z, yaw, seatY) {
  standPose(r);
  r.seated = true;
  if (r.meshy) return r.sitAt(x, seatY, z, yaw);
  r.root.position.set(x, seatY - (HIP - 0.075) * r.root.scale.y + 0.012, z);
  r.root.rotation.y = yaw;
  for (const l of r.legs) l.rotation.x = -1.5;
  for (const k of r.knees) k.rotation.x = 1.4;
  r.legs[0].rotation.z = 0.05;
  r.legs[1].rotation.z = -0.05;
  for (const [i, a] of r.arms.entries()) {
    a.rotation.x = -0.7;
    a.rotation.z = (i ? -1 : 1) * 0.25;
  }
}

// the small life of someone not walking, by what they're doing. s: { mode, t, ph, phone, talker }
export function idleLife(s, dt) {
  const r = s.r;
  s.t += dt;
  // a chibi idles by its own clip; a phone held up while it looks at one
  if (r.meshy) {
    if (r._ph !== !!s.phone) r.phone((r._ph = !!s.phone) ? 'look' : '');
    return;
  }
  const t = s.t + s.ph;
  r.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.7);
  if (s.phone) {
    // looking down at a phone in the right hand, now and then up at the street
    r.arms[1].rotation.x = -1.25;
    r.arms[1].rotation.z = -0.1;
    r.head.rotation.x = 0.4 - Math.max(0, Math.sin(t * 0.35)) * 0.45;
    r.head.rotation.y = Math.sin(t * 0.21) * 0.25;
    return;
  }
  if (s.mode === 'chat') {
    // the two take turns: the one talking moves a hand and their head, the other nods now and then
    const talking = Math.sin(t * 0.45 + (s.talker ? 0 : Math.PI)) > 0;
    r.arms[0].rotation.x = talking ? -0.55 - 0.25 * Math.sin(t * 3.1) : 0;
    r.arms[0].rotation.z = talking ? 0.25 : 0;
    r.head.rotation.x = talking ? 0.05 * Math.sin(t * 4.2) : 0.08 + 0.1 * Math.max(0, Math.sin(t * 2.6) - 0.6);
    r.head.rotation.y = talking ? 0.12 * Math.sin(t * 0.9) : 0;
    return;
  }
  // sitting or waiting: looking about
  r.head.rotation.y = Math.sin(t * 0.27) * 0.45;
  r.head.rotation.x = 0.05 + Math.sin(t * 0.19) * 0.06;
}
