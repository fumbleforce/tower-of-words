// How the ambient crowd moves and idles (crowd/index.js): one walking step that gives way to everyone (they slide
// round people, follow whoever walks ahead the same way, and give Eric and the story's people a wide berth), the
// walk and run cycles, sitting on a bench, and the small life of people standing about (talking, a phone, a nod).
import { HIP, walkPose } from '../train/people.js';
import { turnToward } from '../movement/shared.js';
import { slideStep, followSpeed, press, isHard, isPassing } from '../movement/crowd.js';

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
  let speed = w.speed;
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
  const s = w.wait ? 0 : Math.min(d, speed * dt); // wait: Eric is at the door they're going to, in a scene
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
  // while a scene plays, out of Eric's way however he moves (a scripted walk doesn't go round people)
  if (wide && eric) {
    const ex = x - eric.x,
      ez = z - eric.z,
      ed = Math.hypot(ex, ez) || 1e-4,
      want = eric.r + me + wide;
    if (ed < want) {
      const push = Math.min(want - ed, Math.max(w.speed, 1.2 * K) * dt);
      x += (ex / ed) * push;
      z += (ez / ed) * push;
    }
  }
  const nav = P.nav;
  if (nav && w.onGrid && !nav.free(x, z) && nav.free(ox, oz)) [x, z] = nav.collide(x, z, ox, oz);
  p.x = x;
  p.z = z;
  // no headway against someone for a while: slip past (the movement check lets passing pairs through)
  press(game, r, r.root, by, Math.hypot(x - ox, z - oz), s, dt, 1.2);
  const mx = x - ox,
    mz = z - oz,
    moved = Math.hypot(mx, mz);
  r._walk = true;
  // face the way they actually move, smoothly; not on tiny nudges, which flipped headings back and forth
  if (moved > s * 0.3 && moved > 1e-4) r.root.rotation.y = turnToward(r.root.rotation.y, Math.atan2(mx, mz), dt, 5);
  w.moved = moved / Math.max(dt, 1e-4);
  return false;
}

// no nearer the next point for STALL seconds (the point moving on resets it)
const STALL = 2.5;
export function stalled(w, dt) {
  const p = w.r.root.position,
    t = w.line[Math.min(w.i, w.line.length - 1)],
    d = Math.hypot(t[0] - p.x, t[1] - p.z);
  if (w.i !== w.legAt || d < w.best - 0.05) Object.assign(w, { legAt: w.i, best: d, held: 0 });
  else w.held += dt;
  return w.held > STALL;
}

// the walk (or run) cycle, by the distance covered
export function stride(w, dt, visible) {
  const r = w.r,
    run = w.kind === 'jog';
  w.ph += (w.moved * dt * (run ? 5.2 : 7.6)) / (r.root.scale.x || 1);
  if (!visible) return;
  const amt = Math.min(1, w.moved / (w.speed * 0.6 || 1));
  if (!run) {
    walkPose(r, w.ph, amt);
    if (r.arms[1].children.length > 2) r.arms[1].rotation.x *= 0.35; // a bag: that arm hardly swings
    return;
  }
  const sn = Math.sin(w.ph),
    c = Math.cos(w.ph);
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
