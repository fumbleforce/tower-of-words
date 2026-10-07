import * as THREE from 'three';

// A clipped run keeps broad top/side planes; only the narrow edge rings soften its corners.
export function clippedHedge(width, height, depth) {
  const bevel = Math.min(0.06, width * 0.12, height * 0.15, depth * 0.12),
    vertices = [];
  const ring = (y, inset) => {
    const x = width / 2 - inset,
      z = depth / 2 - inset,
      r = bevel;
    return [
      [-x + r, y, -z],
      [x - r, y, -z],
      [x, y, -z + r],
      [x, y, z - r],
      [x - r, y, z],
      [-x + r, y, z],
      [-x, y, z - r],
      [-x, y, -z + r],
    ];
  };
  const rings = [ring(0, bevel), ring(bevel, 0), ring(height - bevel, 0), ring(height, bevel)];
  const tri = (a, b, c) => vertices.push(...a, ...b, ...c);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 8; i++) {
      const k = (i + 1) % 8;
      tri(rings[j][i], rings[j + 1][k], rings[j][k]);
      tri(rings[j][i], rings[j + 1][i], rings[j + 1][k]);
    }
  for (let i = 0; i < 8; i++) {
    const k = (i + 1) % 8;
    tri([0, height, 0], rings[3][k], rings[3][i]);
    tri([0, 0, 0], rings[0][i], rings[0][k]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
