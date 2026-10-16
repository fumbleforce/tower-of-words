// Where a seated Meshy body's shins and feet go (#601). The train's benches are 40 cm deep, and these bodies are short in
// the leg: the sit clip folds the shins back under the cushion, so the feet and lower legs sank into the seat. Here the
// thighs keep the clip's pose (they clear the cushion already) and each shin turns about its knee so the ankle points
// at a spot in front of the seat's lip, low, where the foot hangs in front of the bench. The shin keeps its length and
// the foot keeps the orientation the clip gave it. avatar.js calls this after the clip and the sit hold.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const LIMBS = new WeakMap();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();

// the leg bones of a rig, by their names ("LeftLeg", "mixamorigRightFoot" ...); only a complete leg counts
function limbsOf(model) {
  if (LIMBS.has(model)) return LIMBS.get(model);
  const found = {};
  model.traverse((o) => {
    if (!o.isBone) return;
    const n = o.name
      .replace(/^mixamorig/i, '')
      .replace(/[^a-z]/gi, '')
      .toLowerCase();
    const m = /^(left|right)(upleg|leg|foot)$/.exec(n);
    if (m) (found[m[1]] ??= {})[m[2]] = o;
  });
  const limbs = [];
  for (const side of ['left', 'right']) {
    const f = found[side];
    if (f?.upleg && f.leg && f.foot) limbs.push({ thigh: f.upleg, shin: f.leg, foot: f.foot });
  }
  LIMBS.set(model, limbs);
  return limbs;
}

// Turn `bone` about its own origin so that the world direction `from` (its child, as it is) points along `to`.
function aim(bone, from, to) {
  if (from.lengthSq() < 1e-12 || to.lengthSq() < 1e-12) return;
  const turn = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  bone.getWorldQuaternion(_q).premultiply(turn);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q));
  bone.updateWorldMatrix(false, true);
}
const at = (bone) => bone.getWorldPosition(new THREE.Vector3());

// legs: { ahead, height } in metres. Each ankle's target is `ahead` in front of the body's hips (its facing) and `height`
// above the floor, the floor being the seat's parent (the car). rig: a Meshy person (avatar.js) seated with its root at
// the hips.
export function solveSeatLegs(rig, { ahead, height }) {
  const { model, root } = rig;
  const limbs = limbsOf(model);
  if (!limbs.length) return;
  root.updateMatrixWorld(true);
  const hips = root.getWorldPosition(new THREE.Vector3());
  const facing = root.getWorldDirection(new THREE.Vector3());
  facing.y = 0;
  if (facing.lengthSq() < 1e-9) return;
  facing.normalize();
  const across = new THREE.Vector3().crossVectors(UP, facing).normalize(); // the body's left, in the place's space
  const floorY = root.parent ? root.parent.getWorldPosition(_p).y : 0;
  const footAt = new THREE.Vector3(hips.x + facing.x * ahead, floorY + height, hips.z + facing.z * ahead);
  for (const { thigh, shin, foot } of limbs) {
    const footQ = foot.getWorldQuaternion(new THREE.Quaternion());
    // each foot keeps its side of the hips
    const side = at(thigh).sub(hips).dot(across);
    const target = footAt.clone().addScaledVector(across, side);
    const knee = at(shin);
    aim(shin, at(foot).sub(knee), target.sub(knee));
    foot.parent.getWorldQuaternion(_pq);
    foot.quaternion.copy(_pq.invert().multiply(footQ));
    foot.updateWorldMatrix(false, true);
  }
  // the skin reads the bones' matrices at the frame's skeleton update, which came before this step
  model.traverse((o) => {
    if (o.isSkinnedMesh) o.skeleton.update();
  });
}
