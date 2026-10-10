import * as THREE from 'three';
import { rbox, mat } from '../../props.js';
import { PATCHES, TOOL_PARK } from './plan.js';

export function maintenanceProps(root) {
  const broom = new THREE.Group();
  broom.name = 'garden-broom';
  broom.userData.noBatch = true;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 1.1, 8), mat('#917458'));
  handle.position.y = 0.64;
  broom.add(handle, rbox(0.32, 0.075, 0.065, '#4e6870', { y: 0.065 }));
  for (let i = 0; i < 15; i++)
    broom.add(
      rbox(0.011, 0.065, 0.047, i % 3 ? '#b5ac86' : '#968c6e', {
        x: (i - 7) * 0.02,
        y: 0,
      }),
    );
  const pan = new THREE.Group();
  pan.name = 'garden-dustpan';
  pan.userData.noBatch = true;
  pan.add(rbox(0.34, 0.015, 0.3, '#4c6a73', { y: 0.014 }), rbox(0.34, 0.075, 0.02, '#4c6a73', { y: 0.045, z: 0.14 }));
  for (const x of [-0.16, 0.16]) pan.add(rbox(0.018, 0.055, 0.3, '#4c6a73', { x, y: 0 }));
  pan.add(
    rbox(0.025, 0.5, 0.025, '#53636d', { y: 0.02, z: 0.14 }),
    rbox(0.14, 0.025, 0.03, '#53636d', { y: 0.515, z: 0.14 }),
  );
  const contents = Array.from({ length: 6 }, (_, i) => {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.035, 5), mat('#967555', { side: THREE.DoubleSide }));
    leaf.rotation.x = -Math.PI / 2;
    leaf.scale.y = 0.5;
    leaf.position.set(((i % 3) - 1) * 0.055, 0.034, Math.floor(i / 3) * 0.045);
    leaf.visible = false;
    pan.add(leaf);
    return leaf;
  });
  for (const object of [broom, pan])
    object.traverse((part) => {
      if (part.isMesh) {
        part.name = object.name + '-part';
        part.userData.noBatch = true;
      }
    });
  root.add(broom, pan);
  const leaves = PATCHES.map(([x, z], patch) =>
    Array.from({ length: 9 }, (_, i) => {
      const leaf = new THREE.Mesh(
        new THREE.CircleGeometry(0.025 + (i % 3) * 0.008, 5),
        mat(i % 3 ? '#967555' : '#c09c58', { side: THREE.DoubleSide }),
      );
      leaf.rotation.set(-Math.PI / 2, 0, i * 0.8);
      leaf.scale.set(1, 0.48, 1);
      leaf.position.set(x + ((i % 3) - 1) * 0.095, 0.022, z + 0.55 + Math.floor(i / 3) * 0.07);
      leaf.name = `garden-leaf-${patch}-${i}`;
      leaf.userData.noBatch = true;
      leaf.userData.home = leaf.position.toArray();
      root.add(leaf);
      return leaf;
    }),
  );
  function park(at = TOOL_PARK) {
    broom.position.set(at[0], 0.015, at[1]);
    broom.rotation.set(0, 0, 0);
    pan.position.set(at[0] + 0.22, 0.015, at[1]);
  }
  park();
  return { broom, pan, leaves, contents, park };
}
