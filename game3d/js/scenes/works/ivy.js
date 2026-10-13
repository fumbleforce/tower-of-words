// The plant's existing ivy footprint, built with the same opaque leaves as its neighbouring verge.
import * as THREE from 'three';
import { leafMass, fitFoliage } from './verge-foliage.js';
import { rod } from '../outdoor/furniture.js';

export function plantIvy(p, x, z, colors) {
  const clumps = [];
  for (let k = 0; k < 26; k++) {
    const u = (k * 0.37) % 1.8,
      y = ((k * 0.61) % 1) * (2.6 + u * 1.6),
      depth = 0.006 + 0.004 * (k % 6);
    clumps.push({
      side: 's',
      color: colors[k % 3],
      bounds: new THREE.Box3(
        new THREE.Vector3(x - 0.45 - u, y, z + 0.02),
        new THREE.Vector3(x + 0.05 - u, y + 0.55, z + 0.14 + depth),
      ),
    });
    if (k % 2)
      clumps.push({
        side: 'e',
        color: colors[(k + 1) % 3],
        bounds: new THREE.Box3(
          new THREE.Vector3(x + 0.02, y * 0.9, z - 0.55 - u * 0.8),
          new THREE.Vector3(x + 0.14 + depth, y * 0.9 + 0.5, z - 0.05 - u * 0.8),
        ),
      });
  }
  for (const [i, clump] of clumps.entries()) {
    const { bounds, color, side } = clump,
      center = bounds.getCenter(new THREE.Vector3()),
      half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    // Curved leaves replace coplanar coloured slabs. Their outer envelope keeps the corrected depth offsets.
    const leaves = fitFoliage(leafMass(color, center, half, 741 + i * 13, 12), bounds);
    // These leaves are finished geometry, not coarse canopy volume for the global vegetation pass.
    for (const part of leaves) p.geo(part.color, part.geometry, { cast: false, opts: { roughness: 1 } });
    const from = center.clone(),
      to = center.clone();
    from.y = bounds.min.y;
    to.y = bounds.max.y;
    if (side === 's') from.z = to.z = z + 0.145;
    else from.x = to.x = x + 0.145;
    rod(p, '#54634a', from.toArray(), to.toArray(), 0.008);
  }
}
