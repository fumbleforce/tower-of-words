import * as THREE from 'three';
import { TREES, mound, cluster, grass } from '../outdoor/planting.js';
import { QUARTER_BEDS, QUARTER_TREES, BANK_FOUNDATIONS, BANK_APRON_DRAIN, quarterCover } from './quarter-plan.js';

// One island-frame builder; campus supplies its translation, the office band uses the island frame.
export function quarterBeds(parts, beds, offset = [0, 0]) {
  const p = {
    geo: (color, g, options) => parts.geo(color, g.translate(offset[0], 0, offset[1]), options),
    box: (color, w, h, d, x, y, z, options) => parts.box(color, w, h, d, x + offset[0], y, z + offset[1], options),
  };
  for (const bed of beds) {
    plants(p, bed);
    if (bed.loose) continue; // plants on the lawn, no bed (outdoor/bed-layout.js)
    const shape = new THREE.Shape(bed.poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    p.geo('#59614d', new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.013, 0), {
      cast: false,
      surf: 'soil',
    });
    // A shallow mowing edge follows the entire bed, including its return to open lawn.
    bed.poly.forEach(([x, z], i) => {
      const [xx, zz] = bed.poly[(i + 1) % bed.poly.length],
        length = Math.hypot(xx - x, zz - z);
      p.box('#85897c', 0.055, 0.035, length, (x + xx) / 2, 0.005, (z + zz) / 2, {
        ry: Math.atan2(xx - x, zz - z),
        cast: false,
      });
    });
    quarterCover(bed).forEach(({ x, z, r }, i) => {
      const low = { geo: (c, g, o) => p.geo(c, g, { ...o, cast: false }) };
      mound(low, x, z, r, ['#486447', '#4a6849', '#466548'][i % 3], {
        y: 0.018,
        squash:
          bed.cover?.squash ??
          (bed.cover ? 0.68 + (Math.sin(i * 19.3) + 1) * 0.12 : 0.38 + (Math.sin(i * 19.3) + 1) * 0.16),
        turn: i * 2.39996,
      });
    });
  }
}

// a bed's shrubs and grasses, in its strip and loose on the lawn beside it
function plants(p, bed) {
  [...bed.masses, ...(bed.looseMasses || [])].forEach(([x, z, r, height = 1], i) =>
    cluster(height === 1 ? p : { geo: (c, g, o) => p.geo(c, g.scale(1, height, 1), o) }, x, z, {
      n: 4,
      r: r * 0.72,
      spread: r * 0.46,
      seed: bed.seed + i,
      tones: ['#516747', '#687b51', '#5d724b'],
    }),
  );
  [...bed.grasses, ...(bed.looseGrasses || [])].forEach(([x, z, height = 0.3], i) => {
    for (let j = 0; j < (bed.grassCount ?? 5); j++) {
      const a = j * 2.39996,
        d = Math.sqrt(j) * 0.07;
      grass(p, x + Math.cos(a) * d, z + Math.sin(a) * d, {
        h: height + (j % 3) * 0.07,
        seed: bed.seed + i * 7 + j,
        color: j % 2 ? '#7a8d61' : '#607b53',
      });
    }
  });
}

export function quarterGrounds(parts, offset = [0, 0]) {
  quarterBeds(parts, QUARTER_BEDS, offset);
  const p = {
    geo: (color, g, options) => parts.geo(color, g.translate(offset[0], 0, offset[1]), options),
    box: (color, w, h, d, x, y, z, options) => parts.box(color, w, h, d, x + offset[0], y, z + offset[1], options),
  };
  for (const [kind, x, z, size, seed] of QUARTER_TREES) TREES[kind](p, x, z, size, seed);
  for (const [x, z, x1, z1] of BANK_FOUNDATIONS) {
    p.box('#919387', x1 - x, 0.026, z1 - z, (x + x1) / 2, 0.004, (z + z1) / 2, {
      cast: false,
      surf: 'gravel',
    });
    const alongX = x1 - x > z1 - z;
    p.box(
      '#85897c',
      alongX ? x1 - x : 0.065,
      0.06,
      alongX ? 0.065 : z1 - z,
      alongX ? (x + x1) / 2 : x,
      0.005,
      alongX ? z1 : (z + z1) / 2,
      { cast: false },
    );
    for (let a = (alongX ? x : z) + 0.18; a < (alongX ? x1 : z1) - 0.1; a += 0.27) {
      for (let j = 0; j < 3; j++) {
        const phase = Math.abs(Math.sin(a * 53 + j * 29)),
          n = Math.round(a * 100) + j;
        const xx = alongX ? a + (phase - 0.5) * 0.19 : x + 0.09 + phase * 0.34;
        const zz = alongX ? z + 0.09 + Math.abs(Math.cos(a * 47 + j * 13)) * 0.34 : a + (phase - 0.5) * 0.19;
        p.geo(
          n % 2 ? '#a2a397' : '#777f74',
          new THREE.TetrahedronGeometry(0.026 + phase * 0.013)
            .scale(1.3, 0.4, 0.85)
            .rotateY(a + j)
            .translate(xx, 0.036, zz),
          { cast: false },
        );
      }
    }
  }
  // Contact course stays against the bank's two lawn-facing walls, below the glazing.
  p.box('#747e7d', 9.6, 0.11, 0.055, -2.3, 0.005, -45.475, { cast: false });
  p.box('#747e7d', 0.055, 0.11, 4.8, -7.075, 0.005, -47.9, { cast: false });
  const [x, z, x1, z1] = BANK_APRON_DRAIN;
  p.box('#394746', x1 - x, 0.018, z1 - z, (x + x1) / 2, 0.007, (z + z1) / 2, {
    cast: false,
  });
  for (let xx = x + 0.035; xx < x1; xx += 0.075)
    p.box('#747c73', 0.024, 0.013, z1 - z - 0.025, xx, 0.026, (z + z1) / 2, {
      cast: false,
    });
}
