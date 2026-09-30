import * as THREE from 'three';

// The server racks' blinking lights, one instanced mesh per colour: they blink every frame, so as meshes of their own
// the draw-call pass could never merge them (45 draws a frame); now two. set(i, on) shows or hides light i.
export function ledLights(root) {
  const leds = [];
  root.traverse((o) => {
    const hex = o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.color.getHexString();
    if ((hex === '5fd38f' || hex === 'ffb95a') && o.position.z > 0.3 && o.position.z < 0.4) leds.push(o);
  });
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(),
    zero = new THREE.Matrix4().makeScale(0, 0, 0),
    by = new Map(),
    slots = [];
  for (const o of leds) {
    const hex = o.material.color.getHexString();
    if (!by.has(hex)) by.set(hex, { mat: o.material, geo: o.geometry, list: [] });
    const b = by.get(hex);
    slots.push({ b, i: b.list.length, m: inv.clone().multiply(o.matrixWorld), on: true });
    b.list.push(o);
    o.parent.remove(o);
  }
  for (const b of by.values()) {
    b.mesh = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
    root.add(b.mesh);
  }
  for (const s of slots) s.b.mesh.setMatrixAt(s.i, s.m);
  for (const b of by.values()) b.mesh.computeBoundingSphere();
  return {
    length: slots.length,
    set(i, on) {
      const s = slots[i];
      if (s.on === on) return;
      s.on = on;
      s.b.mesh.setMatrixAt(s.i, on ? s.m : zero);
      s.b.mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
