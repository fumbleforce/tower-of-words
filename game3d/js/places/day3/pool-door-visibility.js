import * as THREE from 'three';
import { addOccluder, updateOccluders } from '../../scenes/occluders.js';

// Existing doorway labels and locker rows fade only while they cover the walking player.
export function poolDoorVisibility(root, cam) {
  const view = {},
    ray = new THREE.Raycaster(),
    target = new THREE.Vector3(),
    eye = new THREE.Vector3();
  root.traverse((object) => {
    if (!object.userData.poolChangingOccluder) return;
    const meshes = [];
    object.traverse((mesh) => {
      if (mesh.isMesh) meshes.push(mesh);
    });
    addOccluder(
      view,
      meshes,
      (position) => {
        if (cam.close) return false;
        cam.camera.getWorldPosition(eye);
        for (const y of [0.6, 0.8, 1, 1.2])
          for (const dx of [-0.2, 0, 0.2]) {
            target.set(position.x + dx, position.y + y, position.z);
            root.localToWorld(target);
            ray.set(eye, target.clone().sub(eye).normalize());
            ray.far = eye.distanceTo(target) - 0.02;
            if (ray.intersectObjects(meshes, false).length) return true;
          }
        return false;
      },
      { name: 'pool-changing' },
    );
  });
  return {
    update(position, dt) {
      updateOccluders(view, position, dt);
    },
  };
}
