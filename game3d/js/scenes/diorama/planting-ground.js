import * as THREE from 'three';

// The lawn often continues underneath paths outside the current place's walk box.
// Index the actual paving in the root frame, rather than using navigation as a lawn mask.
export function pavedGround(root, bounds) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const cells = new Map(),
    size = 1;
  const key = (x, z) => `${Math.floor(x / size)}:${Math.floor(z / size)}`;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3(),
    normal = new THREE.Vector3();
  root.traverse((o) => {
    if (
      !o.isMesh ||
      o.isInstancedMesh ||
      !o.visible ||
      !o.layers.isEnabled(0) ||
      !['concrete', 'paving', 'tile', 'floor', 'stone'].includes(o.userData.surf)
    )
      return;
    const p = o.geometry.attributes.position,
      ix = o.geometry.index;
    if (!p) return;
    const transform = new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld);
    for (let i = 0, n = ix ? ix.count : p.count; i < n; i += 3) {
      a.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(transform);
      b.fromBufferAttribute(p, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(transform);
      c.fromBufferAttribute(p, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(transform);
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      if (normal.y <= 0 || normal.y / normal.length() < 0.8 || Math.max(a.y, b.y, c.y) > 0.5) continue;
      const x0 = Math.max(bounds[0], Math.min(a.x, b.x, c.x)),
        x1 = Math.min(bounds[1], Math.max(a.x, b.x, c.x));
      const z0 = Math.max(bounds[2], Math.min(a.z, b.z, c.z)),
        z1 = Math.min(bounds[3], Math.max(a.z, b.z, c.z));
      if (x1 < x0 || z1 < z0) continue;
      const face = [a.clone(), b.clone(), c.clone()];
      for (let x = Math.floor(x0 / size); x <= Math.floor(x1 / size); x++)
        for (let z = Math.floor(z0 / size); z <= Math.floor(z1 / size); z++) {
          const k = `${x}:${z}`;
          if (!cells.has(k)) cells.set(k, []);
          cells.get(k).push(face);
        }
    }
  });
  return (p) => {
    for (const [a, b, c] of cells.get(key(p.x, p.z)) || []) {
      const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(den) < 1e-10) continue;
      const u = ((b.z - c.z) * (p.x - c.x) + (c.x - b.x) * (p.z - c.z)) / den;
      const v = ((c.z - a.z) * (p.x - c.x) + (a.x - c.x) * (p.z - c.z)) / den;
      const w = 1 - u - v;
      if (u >= -1e-6 && v >= -1e-6 && w >= -1e-6 && u * a.y + v * b.y + w * c.y >= p.y - 0.005) return true;
    }
    return false;
  };
}
