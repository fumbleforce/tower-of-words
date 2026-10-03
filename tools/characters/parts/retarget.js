// Retarget a playing clip from one rig onto another by bone name: each source bone's change in world direction since
// its rest pose is copied onto the target bone (aligned once at rest). Used by the parts viewer (live) and by
// tools/characters/chibi-bake.mjs (baked into game clips). Mixamo names, and Meshy's auto-rig names (its spine is
// numbered the other way round: Hips > Spine02 > Spine01 > Spine > neck), map to one set.
import * as THREE from 'three';

const DIR_CHILD = {
  Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head',
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase',
  RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase',
};
const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
const PARENT_OF = { Head: 'Neck', LeftHand: 'LeftForeArm', RightHand: 'RightForeArm', LeftToeBase: 'LeftFoot', RightToeBase: 'RightFoot' };
export const LEGS = new Set(['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']);
export const UPPER = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']);
const MESHY = { Spine02: 'Spine', Spine01: 'Spine1', Spine: 'Spine2', neck: 'Neck' };
const NO_TURN = new THREE.Quaternion();

// bones of a rig under the shared names
export function bones(root) {
  const m = {};
  let meshy = false;
  root.traverse((o) => { if (o.isBone && o.name === 'Spine02') meshy = true; });
  root.traverse((o) => {
    if (!o.isBone) return;
    const n = o.name.replace(/^mixamorig:?/, '');
    m[(meshy && MESHY[n]) || n] = o;
  });
  return m;
}
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());

// Both rigs must stand in their rest pose, facing the same way, when this is called.
export function bindRetarget(srcRoot, model) {
  const S = bones(srcRoot), T = bones(model);
  srcRoot.updateMatrixWorld(true);
  model.updateMatrixWorld(true);
  const map = [];
  const A = {};
  for (const n of ORDER) {
    if (!S[n] || !T[n]) continue;
    const c = DIR_CHILD[n];
    let a = new THREE.Quaternion();
    if (c && S[c] && T[c]) {
      const ds = wp(S[c]).sub(wp(S[n])).normalize(), dt = wp(T[c]).sub(wp(T[n])).normalize();
      a.setFromUnitVectors(dt, ds);
    } else if (PARENT_OF[n] && A[PARENT_OF[n]]) a = A[PARENT_OF[n]].clone();
    A[n] = a;
    map.push({ n, s: S[n], t: T[n], sRest: wq(S[n]), tRest: wq(T[n]), tLocal: T[n].quaternion.clone(), a });
  }
  const feet = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'].map((n) => T[n]).filter(Boolean);
  const sFeet = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'].map((n) => S[n]).filter(Boolean);
  const feetRest = Math.min(...feet.map((f) => wp(f).y));
  const sHipsRest = wp(S.Hips);
  const sFloor = Math.min(...sFeet.map((f) => wp(f).y));
  // the source's hip height over its feet, against ours: hips that follow the source are scaled by this
  const k = (wp(T.Hips).y - feetRest) / (sHipsRest.y - sFloor);
  return { map, S, T, feet, feetRest, sHipsRest, k, hipsLocal: T.Hips.position.clone(), hipsWorld: wp(T.Hips) };
}

// Pose the target from the source's current pose. turn: the turn both models were given since bind (a
// quaternion, or none). legShare: share of the leg bones' rotation that is kept (short chibi legs take smaller
// steps; 1 = all of it); upperShare the same for the hips, spine, neck and head (a chibi's big head makes the walk's
// lean read as a stoop). hips: 'ground' keeps them in place at the height that puts the lower foot on the floor;
// 'follow' moves them with the source's hips, scaled to our hip height (sitting: the hips drop onto the seat).
export function applyRetarget(rt, { turn = NO_TURN, legShare = 1, upperShare = 1, hips = 'ground' } = {}) {
  rt.S.Hips.parent.updateMatrixWorld(true);
  rt.S.Hips.updateMatrixWorld(true);
  const q = new THREE.Quaternion(), pw = new THREE.Quaternion();
  for (const b of rt.map) {
    const delta = wq(b.s).multiply(b.sRest.clone().invert());
    if (legShare !== 1 && LEGS.has(b.n)) delta.slerp(NO_TURN, 1 - legShare);
    if (upperShare !== 1 && UPPER.has(b.n)) delta.slerp(NO_TURN, 1 - upperShare);
    q.copy(turn).multiply(delta).multiply(b.a).multiply(b.tRest);
    b.t.parent.getWorldQuaternion(pw);
    b.t.quaternion.copy(pw.invert().multiply(q));
    b.t.updateMatrixWorld(true);
  }
  rt.T.Hips.position.copy(rt.hipsLocal);
  rt.T.Hips.updateMatrixWorld(true);
  if (hips === 'follow') {
    const p = wp(rt.S.Hips).sub(rt.sHipsRest).multiplyScalar(rt.k).applyQuaternion(turn).add(rt.hipsWorld);
    rt.T.Hips.position.copy(rt.T.Hips.parent.worldToLocal(p));
    return;
  }
  const low = Math.min(...rt.feet.map((f) => wp(f).y));
  const p = wp(rt.T.Hips);
  p.y += rt.feetRest - low;
  rt.T.Hips.position.copy(rt.T.Hips.parent.worldToLocal(p));
}

export function resetPose(rt) {
  for (const b of rt.map) b.t.quaternion.copy(b.tLocal);
  rt.T.Hips.position.copy(rt.hipsLocal);
}
