// Hand straps: a grey band and a triangular loop under a pivot at the rail (train/car.js makes the pivots), swinging
// with the car's motion (places/train.js calls swingStraps every frame). The bands and loops of the whole car are
// one instanced mesh each, placed from the pivots, so two dozen straps are two draws (and two in the shadow pass)
// instead of about a hundred.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BAND = new THREE.Matrix4().makeTranslation(0, -0.08, 0);
const LOOP = new THREE.Matrix4().makeTranslation(0, -0.2, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); // apex up

// straps: [{ piv }], each pivot in a rail group that sits beside the meshes (same parent); bandM, loopM: materials
export function strapMeshes(straps, bandM, loopM) {
  const n = Math.max(1, straps.length);
  const band = new THREE.InstancedMesh(new RoundedBoxGeometry(0.03, 0.14, 0.012, 1, 0.005), bandM, n);
  const loop = new THREE.InstancedMesh(new THREE.TorusGeometry(0.055, 0.011, 5, 3), loopM, n);
  for (const m of [band, loop]) {
    m.count = straps.length;
    m.frustumCulled = false; // they swing a little past any bounds taken at rest
    m.castShadow = m.receiveShadow = true;
  }
  const _m = new THREE.Matrix4(),
    _t = new THREE.Matrix4();
  straps.sync = () => {
    for (let i = 0; i < straps.length; i++) {
      const p = straps[i].piv;
      p.updateMatrix();
      p.parent.updateMatrix();
      _m.multiplyMatrices(p.parent.matrix, p.matrix);
      band.setMatrixAt(i, _t.multiplyMatrices(_m, BAND));
      loop.setMatrixAt(i, _t.multiplyMatrices(_m, LOOP));
    }
    band.instanceMatrix.needsUpdate = loop.instanceMatrix.needsUpdate = true;
  };
  straps.sync();
  return [band, loop];
}

// one frame of the swing: m is the car's motion (roll, pitch), latVel, bump and rollVel its rates, brakeKick a push
export function swingStraps(straps, { m, latVel, bump, rollVel, brakeKick, simT, dt }) {
  for (const s of straps) {
    const wv = 6.2 + (s.ph % 1.3),
      zeta = 0.09;
    s.v += (-(wv * wv) * (s.a - (-m.roll * 7 - latVel * 2.5 - rollVel * 0.6)) - 2 * zeta * wv * s.v) * dt;
    s.a += s.v * dt;
    s.w +=
      (-(wv * wv) * (s.b - (-m.pitch * 6 + bump * 1.2 * (0.6 + 0.4 * Math.sin(s.ph)) + brakeKick)) -
        2 * zeta * wv * s.w) *
      dt;
    s.b += s.w * dt;
    s.piv.rotation.x = s.a + 0.03 * Math.sin(simT * 1.3 + s.ph);
    s.piv.rotation.z = s.b;
  }
  straps.sync?.();
}
