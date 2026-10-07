import * as THREE from 'three';
import { TREES, mound, grass, cluster } from '../outdoor/planting.js';
import { CAMPUS_TREES, CAMPUS_GARDENS, gardenPlants, gardenCover } from './landscape-plan.js';
import { pt } from './plan.js';

function groundPatch(parts, poly, y, color, surf) {
  const shape = new THREE.Shape(
    poly.map((p) => {
      const [x, z] = pt(p);
      return new THREE.Vector2(x, -z);
    }),
  );
  const geo = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  parts.geo(color, geo, { cast: false, surf });
}
export function campusLandscape(parts) {
  for (const [kind, x, z, size, seed] of CAMPUS_TREES) TREES[kind](parts, ...pt([x, z]), size, seed);
  const lowCover = { geo: (color, geometry, options) => parts.geo(color, geometry, { ...options, cast: false }) };
  for (const garden of CAMPUS_GARDENS) {
    groundPatch(parts, garden.poly, 0.012, '#59614d', 'soil');
    const cover = gardenCover(garden);
    cover.forEach(({ x, z, r }, i) =>
      mound(lowCover, ...pt([x, z]), r, ['#586d49', '#5d704c', '#61754d'][i % 3], { y: 0.012, squash: 0.12, turn: i }),
    );
    const plants = gardenPlants(garden);
    plants.forEach(({ x, z, r }, i) =>
      cluster(parts, ...pt([x, z]), {
        n: 4,
        r: r * 0.72,
        spread: r * 0.46,
        seed: garden.seed + i,
        tones: ['#516747', '#687b51', '#5d724b'],
      }),
    );
    // Small upright drifts break the low mat; these are plants, not another layer of rounded shrubs.
    garden.grasses.forEach(([x, z], i) => {
      for (let j = 0; j < 7; j++) {
        const a = j * 2.39996,
          d = j ? 0.08 + Math.sqrt(j) * 0.055 : 0;
        grass(parts, ...pt([x + Math.cos(a) * d, z + Math.sin(a) * d]), {
          h: 0.37 + (j % 3) * 0.11,
          seed: garden.seed + i * 9 + j,
          color: j % 2 ? '#7a8d61' : '#607b53',
        });
      }
    });
    // Flat rain-washed stones sit within the bed, not as obstacles in the path.
    for (const [i, p] of plants.entries())
      if (i === 1) {
        const [x, z] = pt([p.x + 0.12, p.z]);
        const g = new THREE.DodecahedronGeometry(0.15, 0).scale(1.45, 0.32, 0.8).rotateY(i).translate(x, 0.035, z);
        parts.geo('#929285', g, { cast: false });
      }
  }
}
