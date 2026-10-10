import * as THREE from 'three';

// The held sitting clip looks down at the meal. Lift only her head while talking.
export function mioLunchEyeline(mio) {
  mio.stepNow?.();
  let head;
  mio.root.traverse((o) => {
    if (o.isBone && /^(mixamorig)?Head$/.test(o.name)) head = o;
  });
  if (!head) return;
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(mio.root.getWorldQuaternion(new THREE.Quaternion()));
  axis.applyQuaternion(head.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  head.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, -0.3));
  head.updateWorldMatrix(false, true);
}
