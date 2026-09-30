// The gestures the gate and office mimes need, as simple readable poses (production-requests: "gestures the gate and
// office use that no-op today"). hooks/gestures.js hands these kinds over.
//   Meshy rigs (Eric, Mio): point (turned toward `to`), lift (an invisible case over his head), squeeze (sideways,
//   stomach in), press (turned toward `to`, leaning in, both hands pushing down on something low in front: the train's
//   overfull shopping bag). They are offsets on the arm and spine bones, laid over the idle clip every frame: game.tween runs
//   after the player's and Mio's mixer update in main.js step(), so the clip underneath keeps breathing.
//   Chibi rigs (the guard, Hamada, Kenji): beckon, lift (both arms overhead: Hamada's briefcase hangs from his left
//   hand, so it goes up with it), highfive, fistbump.
import * as THREE from 'three';

export const MESHY_KINDS = new Set(['point', 'lift', 'squeeze', 'press']);
export const CHIBI_KINDS = new Set(['beckon', 'lift', 'highfive', 'fistbump']);

const bell = (k) => Math.sin(Math.PI * Math.min(1, k)) ** 0.7; // 0 -> 1 -> 0, holding at the top
const _pw = new THREE.Quaternion(),
  _r = new THREE.Quaternion(),
  _mq = new THREE.Quaternion(),
  _ax = new THREE.Vector3();

function bonesOf(r) {
  if (r._gbones) return r._gbones;
  const want = ['RightArm', 'LeftArm', 'RightForeArm', 'LeftForeArm', 'Spine', 'Spine01', 'Spine02', 'Head'];
  const found = {};
  (r.model || r.root).traverse((o) => {
    if (!o.isBone) return;
    for (const n of want) if (!found[n] && (o.name === n || o.name === 'mixamorig' + n)) found[n] = o;
  });
  return (r._gbones = found);
}
// turn a bone by `a` radians about one of the body's own axes ('x' side, 'y' up, 'z' forward), in world terms, so
// the rig's bone orientations don't matter
function turn(model, b, axis, a) {
  if (!b || !a) return;
  model.getWorldQuaternion(_mq);
  _ax.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0).applyQuaternion(_mq);
  b.parent.updateWorldMatrix(true, false);
  b.parent.getWorldQuaternion(_pw);
  _r.setFromAxisAngle(_ax, a);
  b.quaternion.premultiply(_pw.clone().invert().multiply(_r).multiply(_pw));
  b.updateMatrixWorld(true);
}

export async function meshyGesture(game, r, kind, { to, face } = {}) {
  const B = bonesOf(r),
    model = r.root; // the body axes: the root faces the way he faces (the model inside may be turned to Y-up)
  if (kind === 'point') {
    if (to && face) {
      await face();
      await game.wait(250);
    }
    // right arm out toward what he means, hand at shoulder height, held a moment
    await game.tween(1.5, (k) => {
      const b = bell(k);
      turn(model, B.RightArm, 'x', -1.35 * b);
      turn(model, B.RightArm, 'y', -0.45 * b); // a little out to his right, so it shows past his body from behind
      turn(model, B.RightForeArm, 'x', -0.1 * b);
    });
  } else if (kind === 'lift') {
    // both arms up and out in a wide V, forearms bent in over his head as if holding a case up there (his arms are
    // too short to reach over the hair, so the V keeps the hands in sight from above); a small lean back
    await game.tween(2.0, (k) => {
      const b = bell(k);
      turn(model, B.Spine, 'x', 0.1 * b);
      turn(model, B.RightArm, 'z', -2.6 * b);
      turn(model, B.LeftArm, 'z', 2.6 * b);
      turn(model, B.RightArm, 'x', -0.2 * b);
      turn(model, B.LeftArm, 'x', -0.2 * b);
      turn(model, B.RightForeArm, 'z', 0.5 * b);
      turn(model, B.LeftForeArm, 'z', -0.5 * b);
    });
  } else if (kind === 'press') {
    if (to && face) {
      await face();
      await game.wait(150);
    }
    // lean in, both hands forward and down, two pushes, back up
    await game.tween(1.7, (k) => {
      const b = bell(k),
        push = Math.max(0, Math.sin(k * Math.PI * 4 - Math.PI / 2)) * b;
      turn(model, B.Spine, 'x', 0.3 * b);
      turn(model, B.Spine02, 'x', 1.2 * b + 0.06 * push);
      turn(model, B.Head, 'x', -1.1 * b);
      for (const [arm, fore, inward] of [
        [B.RightArm, B.RightForeArm, 1],
        [B.LeftArm, B.LeftForeArm, -1],
      ]) {
        turn(model, arm, 'x', -2 * b - 0.06 * push);
        turn(model, arm, 'z', inward * 0.15 * b);
        turn(model, fore, 'x', -0.25 * b);
      }
    });
  } else if (kind === 'squeeze') {
    // a quarter turn sideways, chest back and stomach in, arms up out of the way
    const y0 = r.root.rotation.y;
    await game.tween(2.2, (k) => {
      const b = bell(k);
      r.root.rotation.y = y0 + (Math.PI / 2) * Math.min(1, b * 1.4);
      turn(model, B.Spine, 'x', 0.22 * b);
      turn(model, B.Spine01 || B.Spine02, 'x', 0.12 * b);
      turn(model, B.RightArm, 'x', -1.0 * b);
      turn(model, B.LeftArm, 'x', -1.0 * b);
      turn(model, B.RightForeArm, 'x', -1.3 * b);
      turn(model, B.LeftForeArm, 'x', -1.3 * b);
    });
    r.root.rotation.y = y0;
  }
}

// Short everyday gestures on Meshy rigs (Eric, Mio, the 3D cast): nod, bow, shrug, wave, each about a second, drawn
// the same way as above. Meshy's library clips for these are long (the nod clip is 13 s of talking with his hands, the
// bow 7.7 s) and held the scene until they ended, so the story gestures don't use them. On the side axis a positive
// turn tips the head and spine forward (and swings a hanging arm back).
export const MESHY_SHORT = new Set(['nod', 'bow', 'shrug', 'wave']);
function shortBones(r) {
  if (r._sbones) return r._sbones;
  const want = {
    neck: /^(mixamorig)?neck$/i,
    LeftShoulder: /^(mixamorig)?LeftShoulder$/,
    RightShoulder: /^(mixamorig)?RightShoulder$/,
  };
  const found = {};
  (r.model || r.root).traverse((o) => {
    if (!o.isBone) return;
    for (const [n, re] of Object.entries(want)) if (!found[n] && re.test(o.name)) found[n] = o;
  });
  return (r._sbones = { ...bonesOf(r), ...found });
}
export async function meshyShort(game, r, kind) {
  const B = shortBones(r),
    model = r.root;
  if (kind === 'nod') {
    // two dips of the chin, the first deeper, with a little of the upper back so it reads from behind him
    await game.tween(0.9, (k) => {
      const d = (1 - Math.cos(k * Math.PI * 4)) / 2,
        a = (k < 0.5 ? 1 : 0.6) * d;
      turn(model, B.Head, 'x', 0.38 * a);
      turn(model, B.neck, 'x', 0.14 * a);
      turn(model, B.Spine02, 'x', 0.06 * a);
    });
  } else if (kind === 'bow') {
    // a small bow from the waist, head following
    await game.tween(1.0, (k) => {
      const b = bell(k);
      turn(model, B.Spine, 'x', 0.3 * b);
      turn(model, B.Spine01, 'x', 0.15 * b);
      turn(model, B.Head, 'x', 0.2 * b);
    });
  } else if (kind === 'shrug') {
    // shoulders up, forearms out to the sides with the palms up, head tipped a little
    await game.tween(0.9, (k) => {
      const b = bell(k);
      turn(model, B.RightShoulder, 'z', -0.3 * b);
      turn(model, B.LeftShoulder, 'z', 0.3 * b);
      turn(model, B.RightForeArm, 'x', -1.3 * b);
      turn(model, B.LeftForeArm, 'x', -1.3 * b);
      turn(model, B.RightForeArm, 'y', -0.8 * b);
      turn(model, B.LeftForeArm, 'y', 0.8 * b);
      turn(model, B.Head, 'z', 0.12 * b);
    });
  } else if (kind === 'wave') {
    // the right hand up beside his head, waving side to side twice
    await game.tween(1.0, (k) => {
      const b = bell(Math.min(1, k * 1.1)),
        sw = Math.sin(k * Math.PI * 4) * b;
      turn(model, B.RightArm, 'z', -2.5 * b);
      turn(model, B.RightForeArm, 'z', 0.3 * b + 0.4 * sw);
    });
  }
}

// chibi rigs: arms[] swing forward on x (negative) and out on z; `save` holds their rotations to go back to
// (r.gesturing tells a place's idle loop to leave the arms alone meanwhile: Kenji types at his desk every frame)
export async function chibiGesture(game, r, kind, save) {
  r.gesturing = true;
  try {
    await chibiMove(game, r, kind, save);
  } finally {
    r.gesturing = false;
  }
}
async function chibiMove(game, r, kind, save) {
  const A = r.arms;
  const set = (i, x, z) => A[i].rotation.set(x, save[i].y, save[i].z + z);
  if (kind === 'beckon') {
    // the hand held out, palm up, curling in twice: come here
    await game.tween(1.8, (k) => {
      const out = bell(k),
        curl = Math.max(0, Math.sin(k * Math.PI * 4)) * 0.45 * out;
      set(1, save[1].x + (-1.25 - save[1].x) * out + curl, 0);
    });
  } else if (kind === 'lift') {
    // both arms up over the head (Hamada's briefcase comes up with his left hand)
    const hy = r.torso.rotation.x;
    await game.tween(2.0, (k) => {
      const b = bell(k);
      set(0, save[0].x + (-2.9 - save[0].x) * b, 0);
      set(1, save[1].x + (-2.9 - save[1].x) * b, 0);
      r.torso.rotation.x = hy - 0.08 * b;
    });
    r.torso.rotation.x = hy;
  } else if (kind === 'highfive') {
    // the hand goes up high and open, then a quick slap forward
    await game.tween(1.4, (k) => {
      const up = bell(k),
        slap = k > 0.45 && k < 0.65 ? Math.sin(((k - 0.45) / 0.2) * Math.PI) * 0.5 : 0;
      set(1, save[1].x + (-2.6 - save[1].x) * up + slap, 0.25 * up);
    });
  } else if (kind === 'fistbump') {
    // the fist out in front at chest height, a small push forward, back
    await game.tween(1.3, (k) => {
      const out = bell(k),
        push = k > 0.4 && k < 0.6 ? Math.sin(((k - 0.4) / 0.2) * Math.PI) * 0.18 : 0;
      set(1, save[1].x + (-1.45 - save[1].x) * out - push, -0.1 * out);
    });
  }
}

// ---------- look and cue layers, laid over whatever a chibi's idle wrote this frame ----------
// Idles (the train passengers' act, Kenji's typing) set head and arm angles every frame, so a tween that runs before
// them is wiped out. main.js step() calls stepRigLayers after place.update, so these write last:
//   r.lookTarget ([x, z], the story `look` hook): the head turns toward it, and back when it's cleared.
//   r._cue (chibiCue: a directed `nod` or `point` toward `to`): head and a little of the torso turn to it, the chin
//   dips; for point the arm on that side swings out toward it too.
// Each angle is blended from the frame's own base: what the idle wrote this frame, or, if nothing has touched it
// since our last write, the base seen before. So the idle keeps going underneath and nothing stays bent afterwards.
export const CUE_KINDS = new Set(['nod', 'point']);
const _v = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _qt = new THREE.Quaternion(),
  _qb = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  DOWN = new THREE.Vector3(0, -1, 0),
  clamp = THREE.MathUtils.clamp;

function baseOf(r, id, obj, prop) {
  const S = (r._lay ||= {});
  if (!S[id] || obj[prop] !== S[id].wrote) S[id] = { base: obj[prop], wrote: NaN, obj, prop };
  return S[id].base;
}
function put(r, id, obj, prop, v, on) {
  const s = r._lay[id];
  if (on) obj[prop] = s.wrote = v;
  else {
    obj[prop] = s.base;
    delete r._lay[id];
  }
}
// the angle to [x, z] from the way the rig faces, in its root's frame (as story.js lookAt), -pi..pi
function relYaw(r, p) {
  const o = r.root.position,
    a = Math.atan2(p[0] - o.x, p[1] - o.z) - r.root.rotation.y;
  return Math.atan2(Math.sin(a), Math.cos(a));
}
// the arm swung out toward yaw `a` (root frame) at shoulder height, as a quaternion in the torso frame; at least
// 0.6 rad out to its side, so the hand clears the big head when the camera is behind or above them (the head and
// torso already face the target)
function aimArm(r, a, side) {
  const c = (side ? 1 : -1) * clamp(Math.abs(a), 0.6, 1.5);
  _v.set(Math.sin(c), 0.05, Math.cos(c)).normalize();
  r.root.getWorldQuaternion(_qt);
  _v.applyQuaternion(_qt);
  r.torso.getWorldQuaternion(_qt);
  _v.applyQuaternion(_qt.invert());
  return _q.setFromUnitVectors(DOWN, _v);
}
function stepRig(r, dt) {
  // look: its weight and angle ease in and out
  const on = !!r.lookTarget,
    k = Math.min(1, dt * 6);
  const L = on || r._look ? (r._look ||= { w: 0, a: 0 }) : null;
  if (L) {
    if (on) L.a += (clamp(relYaw(r, r.lookTarget), -1.1, 1.1) * 0.85 - L.a) * (L.w < 0.01 ? 1 : k);
    L.w += ((on ? 1 : 0) - L.w) * k;
    if (!on && L.w < 0.01) {
      L.w = 0;
      r._look = null;
    }
  }
  const lw = L ? L.w : 0,
    c = r._cue,
    b = c && !c.done ? bell(c.k) : 0,
    a = c && c.to ? clamp(relYaw(r, c.to), -1.6, 1.6) : 0;
  const dip = !b
    ? 0
    : c.kind === 'nod'
      ? Math.max(0, Math.sin(c.k * Math.PI * 3 - Math.PI * 0.6)) * 0.32 // the chin dips twice
      : Math.max(0, Math.sin((c.k - 0.35) * Math.PI * 2.5)) * 0.15; // one small dip with the arm out
  // head yaw: the look, then the cue on top; the torso takes a quarter of a cue's turn (the head rides on it)
  let v = baseOf(r, 'hy', r.head.rotation, 'y');
  v += ((L ? L.a : 0) - v) * lw;
  v += (clamp(a * 0.75, -1.1, 1.1) - v) * b;
  put(r, 'hy', r.head.rotation, 'y', v, lw > 0 || b > 0);
  if (!c) return;
  put(r, 'hx', r.head.rotation, 'x', baseOf(r, 'hx', r.head.rotation, 'x') + dip, b > 0);
  put(r, 'ty', r.torso.rotation, 'y', baseOf(r, 'ty', r.torso.rotation, 'y') + a * 0.25 * b, b > 0);
  if (c.kind === 'point' && r.arms) {
    const R = r.arms[c.side].rotation,
      ab = c.done ? 0 : bell(Math.min(1, c.k * 1.15));
    _qb.setFromEuler(_e.set(baseOf(r, 'ax', R, 'x'), baseOf(r, 'ay', R, 'y'), baseOf(r, 'az', R, 'z'), R.order));
    if (ab > 0) r.arms[c.side].quaternion.slerpQuaternions(_qb, aimArm(r, a, c.side), ab);
    put(r, 'ax', R, 'x', R.x, ab > 0);
    put(r, 'ay', R, 'y', R.y, ab > 0);
    put(r, 'az', R, 'z', R.z, ab > 0);
  }
  if (c.done) r._cue = null;
}
// main.js step(): after the place's idles, over every chibi in the place
export function stepRigLayers(people, dt) {
  for (const r of Object.values(people || {}))
    if (r && r.head && r.torso && r.root && !r.meshy && (r.lookTarget || r._look || r._cue)) stepRig(r, dt);
}
// a directed nod or point on a chibi, toward [x, z] (straight ahead without one); the layer above draws it
export async function chibiCue(game, r, kind, to) {
  const side = to && Math.sin(relYaw(r, to)) < 0 ? 0 : 1; // arms[1] sits at +x, the rig's left
  // a cue cut short by the next one: put back what it bent (the look keeps the head's turn)
  if (r._cue)
    for (const [id, l] of Object.entries(r._lay || {}))
      if (id !== 'hy') {
        l.obj[l.prop] = l.base;
        delete r._lay[id];
      }
  const c = (r._cue = { kind, to, side, k: 0 });
  await game.tween(kind === 'nod' ? 1.3 : 1.7, (k) => {
    c.k = k;
  });
  if (r._cue === c) c.done = true;
}
