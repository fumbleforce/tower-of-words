import * as THREE from 'three';

// Crowns wrap the existing model's limb tips. Broadleaf species have rounded, uneven lobes;
// pines retain horizontal pads and ginkgos build a narrow upright silhouette.
export function treeCrown(species, scale, size, seed) {
  const pine = species === 'pine',
    narrow = species === 'ginkgo';
  const spread = narrow ? 0.48 : species === 'sakura' ? 0.84 : species === 'maple' ? 0.71 : 0.76;
  const depth = pine ? 0.21 : narrow ? 0.47 : species === 'sakura' ? 0.43 : 0.53;
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    // Continuous across shared vertices, so the surface stays closed at every seam.
    const lobe = 1 + 0.075 * Math.sin(x * 5 + seed) * Math.cos(z * 4 - seed * 0.7) + 0.04 * Math.sin(y * 6 + seed);
    position.setXYZ(i, x * lobe, y * lobe, z * lobe);
  }
  const width = 0.93 + 0.12 * Math.sin(seed * 1.3);
  const height = 0.88 + 0.2 * (0.5 + 0.5 * Math.cos(seed * 2.1));
  geometry.scale(spread * size * scale * width, depth * Math.max(0.8, size) * scale * height, spread * size * scale);
  geometry.rotateY(seed * 0.7);
  geometry.computeVertexNormals();
  return geometry;
}
