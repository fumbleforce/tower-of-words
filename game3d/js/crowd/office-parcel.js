import * as THREE from 'three';
import { rbox } from '../props.js';
import { S } from '../train/people.js';

export function carryOfficeParcel(rig) {
  const box = rbox(0.2, 0.12, 0.2, '#f4efe6', { r: 0.01 });
  box.add(rbox(0.19, 0.004, 0.05, '#d9534f', { y: 0.062, r: 0.002 }));
  if (!rig.approvedCrowd) {
    box.position.set(0, -0.3, 0.05);
    rig.arms[1].add(box);
    return;
  }
  box.scale.setScalar(S);
  rig.root.add(box);
  const hand = rig.model.getObjectByName('LeftHand');
  const forearm = rig.model.getObjectByName('LeftForeArm');
  const point = new THREE.Vector3(),
    direction = new THREE.Vector3();
  const update = rig.update;
  rig.update = (...args) => {
    update(...args);
    rig.root.updateMatrixWorld(true);
    rig.root.worldToLocal(hand.getWorldPosition(point));
    rig.root.worldToLocal(forearm.getWorldPosition(direction));
    direction.subVectors(point, direction).normalize();
    // The fingertips meet the rear rim; the parcel stays level as the arm moves.
    box.position.copy(point).addScaledVector(direction, 0.035 * S);
    box.position.y -= 0.06 * S;
    box.position.z += 0.1 * S;
  };
  rig.update(0);
}
