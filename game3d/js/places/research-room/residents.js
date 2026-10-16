import * as THREE from 'three';
import { sit, idle } from '../../cast.js';
import { SEAT_Y } from '../../train/car.js';
import { roleBody } from '../../crowd/bodies.js';
import { K } from '../../scenes/office.js';
import { READER } from '../../scenes/research-room/plan.js';
import { blob } from '../../engine.js';
export function researchReader(root) {
  const rig = roleBody('reader', 91, { proxy: true, tint: { top: '#79816c' } });
  if (!rig) throw new Error('Research reader body was not prepared');
  if (!rig.sitAt)
    rig.sitAt = (x, top, z, yaw) => {
      rig.root.position.set(x, 0, z);
      rig.root.rotation.y = yaw;
      sit(rig);
      rig.root.position.y += top - SEAT_Y;
      // This code-built body has a small legacy sit lift; place its actual pelvis on this cushion.
      rig.root.updateWorldMatrix(true, true);
      const pelvis = rig.hips.children.find((o) => o.isMesh);
      if (!pelvis) throw new Error('Reading-room resident has no rendered pelvis');
      const point = new THREE.Vector3();
      let underside = Infinity;
      const positions = pelvis.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(pelvis.matrixWorld);
        underside = Math.min(underside, rig.root.parent.worldToLocal(point).y);
      }
      rig.root.position.y += top - underside;
    };
  rig.readingIdle = (t) => {
    if (!rig.meshy) idle(rig, t);
  };
  rig.root.scale.multiplyScalar(K);
  root.add(rig.root);
  rig.root.add(blob(0.3, 0.22));
  rig.sitAt(READER.x, READER.top, READER.z, READER.ry);
  rig.seated = true;
  return rig;
}
