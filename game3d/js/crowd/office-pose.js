import * as THREE from 'three';
import { S } from '../train/people.js';

// The station queue writes to the old rig's head and torso controls. Apply those
// offsets after native animation, restoring the preceding frame before sampling.
export function bridgeOfficePose(rig) {
  const head = rig.model.getObjectByName('Head');
  const spine = rig.model.getObjectByName('Spine');
  const headPose = head.quaternion.clone();
  const spinePose = spine.position.clone();
  const scale = new THREE.Vector3();
  rig.root.updateMatrixWorld(true);
  const units = (rig.root.getWorldScale(scale).y * S) / spine.parent.getWorldScale(scale).y;
  const update = rig.update;
  let applied = false;
  rig.update = (...args) => {
    if (applied) {
      head.quaternion.copy(headPose);
      spine.position.copy(spinePose);
    }
    update(...args);
    headPose.copy(head.quaternion);
    spinePose.copy(spine.position);
    head.quaternion.multiply(rig.head.quaternion);
    spine.position.y += rig.torso.position.y * units;
    rig.model.updateMatrixWorld(true);
    applied = true;
  };
}
