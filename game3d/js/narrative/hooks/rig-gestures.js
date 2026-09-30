// The gestures the gate and office mimes need, as simple readable poses (production-requests: "gestures the gate and
// office use that no-op today"). hooks/gestures.js hands these kinds over.
//   Meshy rigs (Eric, Mio): point (turned toward `to`), lift (an invisible case over his head), squeeze (sideways,
//   stomach in). They are offsets on the arm and spine bones, laid over the idle clip every frame: game.tween runs
//   after the player's and Mio's mixer update in main.js step(), so the clip underneath keeps breathing.
//   Chibi rigs (the guard, Hamada, Kenji): beckon, lift (both arms overhead: Hamada's briefcase hangs from his left
//   hand, so it goes up with it), highfive, fistbump.
import * as THREE from 'three';

export const MESHY_KINDS = new Set(['point', 'lift', 'squeeze']);
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
