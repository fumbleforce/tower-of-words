import * as THREE from 'three';
import { diningHands } from './izakaya/hands.js';

// Keep both wrists on the real keyboard without borrowing motion from the torso.
export function seatedWork(game, space) {
  const solvers = [diningHands(game, space), diningHands(game, space)];
  return (rig, surface, points, weight = 1, lift = 0) => {
    rig.stepNow?.();
    const proxy = { ...rig, stepNow: () => {} };
    const arms = ['Left', 'Right'].map((side, i) => {
      const arm = solvers[i].start(proxy, side);
      const keep = arm.chain
        .map((bone, j) => ({ bone, base: arm.base[j] }))
        .filter(({ bone }) => !/Spine$/.test(bone.name));
      arm.chain = keep.map((entry) => entry.bone);
      arm.base = keep.map((entry) => entry.base);
      return arm;
    });
    const targets = points.map((p) => surface.localToWorld(new THREE.Vector3(...p)));
    // Native rigs can use opposite bone-side conventions. Match each wrist to its nearest key bank.
    if (arms[0].target.distanceTo(targets[0]) > arms[0].target.distanceTo(targets[1])) targets.reverse();
    arms.forEach((arm, i) => {
      arm.target.lerp(targets[i].clone().add(new THREE.Vector3(0, lift, 0)), weight);
      solvers[i].update();
      solvers[i].active.clear(); // next mixer frame owns the base; retain this frame's solved pose
    });
    rig.workContacts = arms.map((arm, i) => ({
      gap: solvers[i].distance(arm),
      hand: arm.hand.getWorldPosition(new THREE.Vector3()).toArray(),
      target: arm.target.toArray(),
    }));
  };
}

// Support a lap prop on the actual seated thighs, measured in the body's root coordinates.
export function lapSupport(rig, width, depth) {
  rig.root.updateWorldMatrix(true, true);
  rig.root.updateMatrixWorld(true); // refresh SkinnedMesh bind inverses after seating/reparenting
  const bones = {};
  rig.model.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig/, '')] = o;
  });
  const local = (bone) => rig.root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const hip = local(bones.Hips),
    knee = local(bones.LeftLeg).add(local(bones.RightLeg)).multiplyScalar(0.5);
  const centre = hip.clone().lerp(knee, 0.6),
    v = new THREE.Vector3();
  let top = -Infinity;
  rig.model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const { position, skinIndex, skinWeight } = o.geometry.attributes;
    const thighs = o.skeleton.bones.map((b) => /UpLeg|Thigh/i.test(b.name));
    for (let i = 0; i < position.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (thighs[skinIndex.getComponent(i, j)]) weight += skinWeight.getComponent(i, j);
      if (weight < 0.5) continue;
      o.getVertexPosition(i, v);
      rig.root.worldToLocal(v.applyMatrix4(o.matrixWorld));
      if (Math.abs(v.x - centre.x) <= width / 2 && Math.abs(v.z - centre.z) <= depth / 2) top = Math.max(top, v.y);
    }
  });
  if (!Number.isFinite(top)) throw Error('No seated thigh surface beneath laptop');
  centre.y = top;
  return centre;
}
