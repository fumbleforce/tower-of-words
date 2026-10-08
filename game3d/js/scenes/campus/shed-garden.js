import * as THREE from 'three';
import { quarterBeds } from './quarter-grounds.js';
import { SHED_GARDENS, SHED_RILLS, SHED_DRAINS } from './shed-garden-plan.js';
import { northGarden } from './north-garden.js';

// Campus, forecourt and the office street see the same planted ground.
export function shedGarden(parts, offset = [0, 0]) {
  quarterBeds(parts, SHED_GARDENS, offset);
  northGarden(parts, offset);
  const box = (color, w, h, d, x, y, z, o = {}) =>
    parts.box(color, w, h, d, x + offset[0], y, z + offset[1], {
      cast: false,
      ...o,
    });
  for (const [x, z, x1, z1] of SHED_RILLS) {
    box('#8b9389', x1 - x, 0.026, z1 - z, (x + x1) / 2, 0.015, (z + z1) / 2, {
      surf: 'gravel',
    });
    for (let zz = z + 0.1; zz < z1; zz += 0.16)
      for (let i = 0; i < 2; i++) {
        const phase = Math.abs(Math.sin(zz * 71 + i * 13));
        const geo = new THREE.OctahedronGeometry(0.043 + phase * 0.018, 0)
          .scale(1.2, 0.45, 0.8)
          .rotateY(zz)
          .translate(x + 0.07 + i * 0.15 + offset[0], 0.044, zz + offset[1]);
        parts.geo(i ? '#a4aaa0' : '#768278', geo, { cast: false });
      }
  }
  for (const [x, z] of SHED_DRAINS) {
    box('#596966', 0.55, 0.045, 0.45, x, 0.008, z);
    for (let i = 0; i < 6; i++) box('#a2a9a0', 0.025, 0.015, 0.4, x - 0.22 + i * 0.088, 0.053, z);
    box('#858f84', 0.66, 0.06, 0.07, x, 0.002, z - 0.26);
    box('#858f84', 0.66, 0.06, 0.07, x, 0.002, z + 0.26);
  }
}
