import * as THREE from 'three';
import * as P from './plan.js';
import { mat } from '../../kit/core/mat.js';

// Opaque glazing closes a real recess. It reflects the place's sky and street (kit/materials/, the shared glass),
// with a local horizon on each pane: the pane's height shifts the reflected horizon, so the steep near-orthographic
// street camera still sees sky-to-ground bands move instead of one tint. Its own material: the evening lights it.
export function sportsGlass() {
  const material = mat.own('#b9cbd0', {
    finish: 'glass',
    roughness: 0.09,
    metalness: 0.82,
    envK: 1.2,
    horizon: ['uv', 0.5, 1.4],
    side: THREE.DoubleSide,
    emissive: '#ffd7a0',
    emissiveIntensity: 0,
  });
  material.userData.noLook = true;
  return material;
}

// Same footprint and roof bearing as the original hall; the clerestory and entrance
// are openings through a 24 cm shell rather than glass laid on a solid building.
export function gymShell(p, C, height) {
  const [x0, x1, z0, z1] = P.GYM,
    gx = P.GX,
    width = x1 - x0,
    depth = z1 - z0;
  p.box(C.wall, width, height - 0.3, 0.24, gx, 0.3, z0 + 0.12, { surf: 'concrete' });
  const doorHalf = 3.4;
  for (const [a, b] of [
    [x0, gx - doorHalf],
    [gx + doorHalf, x1],
  ]) {
    p.box(C.wall, b - a, height - 0.3, 0.24, (a + b) / 2, 0.3, z1 - 0.12, { surf: 'concrete' });
    // Broad mineral panels sit within the wall line, separated by narrow joints.
    const count = 3,
      pitch = (b - a) / count;
    for (let i = 0; i < count; i++) {
      p.box('#c2c0b7', pitch - 0.035, 2.75, 0.035, a + pitch * (i + 0.5), 1.15, z1 + 0.004, {
        surf: 'concrete',
        cast: false,
      });
      p.box('#a8aaa1', pitch - 0.035, 0.7, 0.03, a + pitch * (i + 0.5), 0.35, z1 + 0.006, {
        surf: 'concrete',
        cast: false,
      });
    }
  }
  p.box(C.wall, doorHalf * 2, height - 3, 0.24, gx, 3, z1 - 0.12, { surf: 'concrete' });
  for (const x of [x0 + 0.12, x1 - 0.12]) {
    p.box(C.wall, 0.24, 2.55, depth, x, 0.3, (z0 + z1) / 2, { surf: 'concrete' });
    p.box(C.wall, 0.24, height - 3.85, depth, x, 3.85, (z0 + z1) / 2, { surf: 'concrete' });
    const bays = Math.round(depth / 3.2),
      pitch = depth / bays;
    for (let i = 0; i <= bays; i++) {
      const a = Math.max(z0, z0 + i * pitch - 0.3),
        b = Math.min(z1, z0 + i * pitch + 0.3);
      p.box(C.wall, 0.24, 1, b - a, x, 2.85, (a + b) / 2, { surf: 'concrete' });
    }
  }
}
