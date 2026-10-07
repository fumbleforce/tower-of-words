// Carrying needs room beside the thigh; a free arm swing can pass through a bag.
import * as THREE from 'three';

export function bagPose(r, mount, { palm, bounds, grip, fit, propScale }) {
  const parent = mount.parent,
    homePosition = mount.position.clone(),
    homeRotation = mount.quaternion.clone(),
    homeScale = mount.scale.clone(),
    rootRotation = new THREE.Quaternion(),
    parentRotation = new THREE.Quaternion();
  let seatTop = 0;
  const pose = (seatY) => {
    if (seatY !== undefined) seatTop = seatY;
    if (r.seated) {
      if (mount.parent !== r.root) r.root.add(mount);
      mount.quaternion.identity();
      mount.scale.setScalar(propScale);
      mount.position.set(
        palm.x + (bounds.max.x - bounds.min.x) * fit * propScale * 0.7 + 0.025 / r.root.scale.x,
        (seatTop - r.root.position.y) / r.root.scale.y - (bounds.min.y - grip.y) * fit * propScale,
        0,
      );
      mount.updateWorldMatrix(true, true);
      return;
    }
    if (mount.parent !== parent) {
      parent.add(mount);
      mount.position.copy(homePosition);
      mount.quaternion.copy(homeRotation);
      mount.scale.copy(homeScale);
    }
    if (!r.meshy) r.arms[1].rotation.z = 0.16;
    r.root.updateMatrixWorld(true);
    // Rotate around the palm attachment, keeping the grip fixed as the wrist moves.
    r.root.getWorldQuaternion(rootRotation);
    mount.parent.getWorldQuaternion(parentRotation);
    mount.quaternion.copy(parentRotation.invert().multiply(rootRotation));
    mount.updateWorldMatrix(true, true);
  };
  r.carryPose = pose;
  if (r.meshy) {
    const arm = r.model.getObjectByName('LeftArm'),
      shoulder = new THREE.Vector3(),
      direction = new THREE.Vector3(),
      target = new THREE.Vector3(),
      turn = new THREE.Quaternion(),
      world = new THREE.Quaternion();
    const carryingJoints = ['LeftArm', 'LeftForeArm', 'LeftHand'].map((name) => r.model.getObjectByName(name));
    const hand = carryingJoints[2];
    r.root.updateMatrixWorld(true);
    const handRest = hand.getWorldQuaternion(new THREE.Quaternion());
    r.root.getWorldQuaternion(rootRotation);
    handRest.premultiply(rootRotation.invert());
    const steadyHand = () => {
      r.root.getWorldQuaternion(rootRotation);
      hand.parent.getWorldQuaternion(parentRotation);
      hand.quaternion.copy(parentRotation.invert().multiply(rootRotation).multiply(handRest));
      hand.updateWorldMatrix(false, true);
    };
    const relaxed = carryingJoints.map((bone) => bone.quaternion.clone());
    const animated = carryingJoints.map((bone) => bone.quaternion.clone());
    // Wider clothing needs more room than a fixed shoulder angle provides.
    const edge = new THREE.Vector3();
    let outerLeg = 0;
    const skeletons = new Set();
    r.model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      skeletons.add(o.skeleton);
      o.skeleton.update();
      const a = o.geometry.attributes;
      for (let i = 0; i < a.position.count; i++) {
        let weight = 0;
        for (let k = 0; k < 4; k++) {
          const bone = o.skeleton.bones[a.skinIndex.getComponent(i, k)];
          if (/(?:upleg|leg|foot|toe)/i.test(bone.name)) weight += a.skinWeight.getComponent(i, k);
        }
        if (weight < 0.5) continue;
        o.getVertexPosition(i, edge).applyMatrix4(o.matrixWorld);
        outerLeg = Math.max(outerLeg, r.root.worldToLocal(edge).x);
      }
    });
    const halfWidth = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) * fit * propScale;
    const palmX = outerLeg + halfWidth + 0.025;
    let posed = false;
    const update = r.update,
      sitAt = r.sitAt;
    r.update = (dt, speed) => {
      if (posed) carryingJoints.forEach((bone, i) => bone.quaternion.copy(animated[i]));
      posed = false;
      update(dt, speed);
      if (!r.seated) {
        carryingJoints.forEach((bone, i) => {
          animated[i].copy(bone.quaternion);
          // The loaded arm keeps its elbow down, including the phone's blend out.
          // The free hand still follows the phone animation.
          if (r._ph || i === 1) bone.quaternion.copy(relaxed[i]);
        });
        r.root.updateMatrixWorld(true);
        steadyHand();
        shoulder.copy(r.root.worldToLocal(arm.getWorldPosition(shoulder)));
        // The wrist keeps its orientation, so its offset to the grip stays fixed.
        // Solve the shoulder-to-wrist reach; rotating the whole grip vector would
        // lose some clearance when steadyHand counterrotates the wrist afterward.
        direction.copy(homePosition).applyMatrix4(parent.matrixWorld);
        r.root.worldToLocal(direction);
        hand.getWorldPosition(target);
        r.root.worldToLocal(target);
        const gripOffsetX = direction.x - target.x;
        direction.copy(target).sub(shoulder);
        const length = direction.length();
        const x = Math.min(palmX - gripOffsetX - shoulder.x, length * 0.9);
        const yz = Math.hypot(direction.y, direction.z);
        const remaining = Math.sqrt(Math.max(0, length * length - x * x));
        target.set(
          x,
          yz > 1e-8 ? (direction.y * remaining) / yz : -remaining,
          yz > 1e-8 ? (direction.z * remaining) / yz : 0,
        );
        r.root.getWorldQuaternion(rootRotation);
        turn.setFromUnitVectors(
          direction.normalize().applyQuaternion(rootRotation),
          target.normalize().applyQuaternion(rootRotation),
        );
        arm.getWorldQuaternion(world).premultiply(turn);
        arm.parent.getWorldQuaternion(parentRotation);
        arm.quaternion.copy(parentRotation.invert().multiply(world));
        arm.updateWorldMatrix(false, true);
        // A loaded handle keeps the wrist upright while the arm moves.
        steadyHand();
        posed = true;
      }
      pose();
      // The renderer may have prepared the previous pose before onBeforeRender.
      // Keep this carrier's visible skin and its hand-held prop on the same pose.
      r.model.updateMatrixWorld(true);
      for (const skeleton of skeletons) skeleton.update();
    };
    r.sitAt = (x, y, z, yaw) => {
      seatTop = y;
      sitAt(x, y, z, yaw);
      pose();
    };
    // Material sorting can draw the prop before the skin. Step whichever piece
    // is drawn first; stepNow's game-time guard keeps this to one animation step.
    mount.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const before = mesh.onBeforeRender;
      mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
        r.stepNow();
        before.call(this, renderer, scene, camera, geometry, material, group);
      };
    });
    r.update(0);
  } else pose();
}
