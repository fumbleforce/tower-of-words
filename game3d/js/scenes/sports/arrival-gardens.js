import * as THREE from 'three';
import { grass } from '../outdoor/planting.js';
import { quarterCover } from '../campus/quarter-plan.js';
import { ARRIVAL_GARDENS } from './arrival-garden-plan.js';
import { BED_FLUSH } from '../outdoor/walk-edges.js';

// Broad, overlapping cushions use only eight visible faces. The original shrubs
// and trunks stay in place; this lower layer connects them to their planted ground.
function cushion(r) {
  const vertices = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      b = a + Math.PI / 4;
    vertices.push(0, r, 0, Math.cos(b) * r, 0, Math.sin(b) * r, Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.computeVertexNormals();
  return g;
}
export function arrivalGardens(p, { foundations = false, northStreet = false } = {}) {
  for (const bed of ARRIVAL_GARDENS) {
    if (bed.id.startsWith('gym-foundation') !== foundations) continue;
    if (bed.id.startsWith('north-street') !== northStreet) continue;
    // flush with the lawn, one footprint, no raised face (notes/grounds-system.md); a bed with no walk beside it is
    // only its plants, loose on the lawn (outdoor/bed-layout.js)
    const y = BED_FLUSH;
    if (!bed.loose) {
      const shape = new THREE.Shape(bed.poly.map(([x, z]) => new THREE.Vector2(x, -z)));
      p.geo('#59614d', new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0), {
        cast: false,
        surf: 'soil',
      });
      quarterCover(bed).forEach(({ x, z, r }, i) =>
        p.geo(
          ['#486849', '#4b6b4b', '#4e6d4c'][i % 3],
          cushion(r)
            .scale(1, 0.055 / r, 0.96)
            .rotateY(i * 2.39996)
            .translate(x, y, z),
          { cast: false, surf: 'foliage' },
        ),
      );
    }
    [...bed.masses, ...(bed.looseMasses || [])].forEach(([x, z, r], i) => {
      for (let j = 0; j < 5; j++) {
        const a = i * 2.39996 + j * 2.1;
        p.geo(
          ['#516e49', '#60794f', '#5a744d'][j % 3],
          new THREE.DodecahedronGeometry(r * (0.48 + (j % 3) * 0.08), 0)
            .rotateY(a)
            .scale(1, 0.58, 0.86)
            .translate(x + Math.cos(a) * r * 0.65, y + r * (0.29 + (j % 3) * 0.05), z + Math.sin(a) * r * 0.42),
          { surf: 'foliage' },
        );
      }
    });
    const planted = {
      geo: (color, g, opts) => {
        // Cone bases are buried in the soil; retain every visible blade face.
        g.setIndex(Array.from(g.index.array).slice(0, g.groups[0].count));
        g.clearGroups();
        p.geo(color, g.translate(0, y, 0), opts);
      },
    };
    const grasses = [...bed.grasses, ...(bed.looseGrasses || [])];
    grasses.forEach(([x, z], i) => {
      for (let j = 0; j < (bed.masses.length && i % 3 !== 0 ? 2 : 1); j++)
        grass(planted, x + j * 0.13, z - j * 0.1, { h: 0.38 + j * 0.12, seed: bed.seed + i * 7 + j });
    });
  }
}
