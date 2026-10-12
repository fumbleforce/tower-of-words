import * as THREE from 'three';
// Overlapping clipped evergreen tiers, still narrow enough for the formal gate planting.
export function clippedColumn(p, x, z, y = 0) {
  p.geo('#77644b', new THREE.CylinderGeometry(0.05, 0.06, 0.3, 5).translate(x, y + 0.15, z), { surf: 'bark' });
  for (const [i, [cy, r, h]] of [
    [0.48, 0.24, 0.25],
    [0.82, 0.2, 0.24],
    [1.15, 0.14, 0.24],
  ].entries()) {
    const g = new THREE.SphereGeometry(1, 8, 5),
      v = g.attributes.position;
    for (let j = 0; j < v.count; j++) {
      const a = v.getX(j),
        b = v.getY(j),
        c = v.getZ(j);
      const edge = 1 + 0.055 * Math.sin(a * 7 + c * 4 + i) + 0.035 * Math.cos(b * 9 + c * 5);
      v.setXYZ(j, a * edge * r, b * h, c * edge * r);
    }
    g.translate(x, y + cy, z);
    g.computeVertexNormals();
    p.geo('#44604f', g, { surf: 'diorama-hedge' });
  }
}
