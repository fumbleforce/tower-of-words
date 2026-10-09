import * as THREE from 'three';
import { grass } from '../outdoor/planting.js';
import { quarterCover } from './quarter-plan.js';
import { NORTH_GARDENS } from './north-garden-plan.js';

// Eight visible faces form each groundcover cushion; no buried lower hemisphere is needed.
function coverCushion(radius) {
  const vertices = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      b = a + Math.PI / 4;
    vertices.push(
      0,
      radius,
      0,
      Math.cos(b) * radius,
      -radius * 0.85,
      Math.sin(b) * radius,
      Math.cos(a) * radius,
      -radius * 0.85,
      Math.sin(a) * radius,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Low faceted foliage and a continuous flat mowing edge keep this shared band inexpensive.
export function northGarden(parts, offset = [0, 0]) {
  const p = {
    geo: (color, geometry, options) => parts.geo(color, geometry.translate(offset[0], 0, offset[1]), options),
  };
  const leaf = (x, z, r, h, color, turn, cast) =>
    p.geo(
      color,
      (cast ? new THREE.DodecahedronGeometry(r, 0) : coverCushion(r))
        .rotateY(turn)
        .scale(1, h / r, 0.9)
        .translate(x, h + 0.025, z),
      { cast, surf: 'foliage' },
    );
  for (const bed of NORTH_GARDENS) {
    if (!bed.loose) soilAndCover(p, leaf, bed);
    [...bed.masses, ...bed.looseMasses].forEach(([x, z, r], i) => {
      for (let j = 0; j < 3; j++) {
        const turn = i * 2.39996 + j * 2.1,
          spread = r * 0.28;
        leaf(
          x + Math.cos(turn) * spread,
          z + Math.sin(turn) * spread,
          r * 0.72,
          r * (0.38 + j * 0.06),
          ['#516747', '#687b51', '#5d724b'][j],
          turn,
          true,
        );
      }
    });
    [...bed.grasses, ...bed.looseGrasses].forEach(([x, z], i) => {
      for (let j = 0; j < 2; j++)
        grass(p, x + j * 0.12, z - j * 0.1, {
          h: 0.4 + j * 0.12,
          seed: bed.seed + i * 7 + j,
        });
    });
  }
}

// a strip bed's soil, its flat mowing edge and its low cover (outdoor/bed-layout.js)
function soilAndCover(p, leaf, bed) {
  const shape = new THREE.Shape(bed.poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  p.geo('#59614d', new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.013, 0), {
    cast: false,
    surf: 'soil',
  });
  const rim = [];
  bed.poly.forEach(([x, z], i) => {
    const [xx, zz] = bed.poly[(i + 1) % bed.poly.length],
      length = Math.hypot(xx - x, zz - z),
      dx = ((zz - z) / length) * 0.028,
      dz = ((x - xx) / length) * 0.028;
    rim.push(
      x - dx,
      0.038,
      z - dz,
      xx - dx,
      0.038,
      zz - dz,
      xx + dx,
      0.038,
      zz + dz,
      x - dx,
      0.038,
      z - dz,
      xx + dx,
      0.038,
      zz + dz,
      x + dx,
      0.038,
      z + dz,
    );
  });
  const edge = new THREE.BufferGeometry();
  edge.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3));
  edge.computeVertexNormals();
  p.geo('#85897c', edge, { cast: false });
  quarterCover(bed).forEach(({ x, z, r }, i) =>
    leaf(x, z, r, 0.07, ['#486447', '#4a6849', '#466548'][i % 3], i * 2.39996, false),
  );
}
