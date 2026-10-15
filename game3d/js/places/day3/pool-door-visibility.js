import * as THREE from 'three';
import { addOccluder, updateOccluders } from '../../scenes/occluders.js';

// Doorway labels, locker rows and individual light fixtures cut away only while they cover the walking player.
export function poolDoorVisibility(root, cam) {
  const view = {},
    initial = new Map(),
    ray = new THREE.Raycaster(),
    target = new THREE.Vector3(),
    eye = new THREE.Vector3();
  root.traverse((object) => {
    if (!object.userData.poolChangingOccluder) return;
    const meshes = [];
    object.traverse((mesh) => {
      if (mesh.isMesh) {
        meshes.push(mesh);
        initial.set(mesh, { visible: mesh.visible, opacity: mesh.material.opacity });
      }
    });
    addOccluder(
      view,
      meshes,
      (position) => {
        if (cam.close) return false;
        cam.camera.getWorldPosition(eye);
        for (const y of [0.2, 0.4, 0.6, 0.8, 1, 1.2])
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
    reset() {
      for (const occluder of view.occluders || []) occluder.k = 1;
      for (const [mesh, saved] of initial) {
        mesh.visible = saved.visible;
        mesh.material.opacity = saved.opacity;
      }
    },
    update(position) {
      updateOccluders(view, position, Infinity);
    },
  };
}
