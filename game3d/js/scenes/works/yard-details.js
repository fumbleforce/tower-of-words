// Exterior details shared by the Works and the harbour's view up its lane.
import * as THREE from 'three';
import { mound, grass, LEAF } from '../outdoor/planting.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { broadLeaf, leafMass, fitFoliage } from './verge-foliage.js';
import { onFace, faces } from '../outdoor/block-face.js';
import * as P from './plan.js';

const NO = { cast: false };
const GREEN = [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light];

// Keep the original trees. Overlapping shrubs and a low leafy fringe tie their beds together,
// stopping behind the existing kerb and leaving both the plant approach and lamps clear.
export function* laneBeds(p, beds) {
  for (const [rect, kinds, seed, pitch] of beds) {
    yield* belt(p, rect, kinds, { seed, pitch, under: 0 });
    const [x0, x1, z0, z1] = rect;
    const foliage = {
      geo(color, geometry, options) {
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox.clone();
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        const parts = fitFoliage(leafMass(color, center, size, seed + Math.round(center.z * 17), 18), bounds);
        geometry.dispose();
        for (const part of parts) p.geo(part.color, part.geometry, options);
      },
    };
    let i = 0;
    for (let z = z0 + 0.5; z < z1; z += 0.72, i++) {
      for (let x = x0 + 0.6; x < x1 - 0.3; x += 0.88) {
        const radius = 0.52 + (i % 3) * 0.055;
        mound(foliage, x, z + Math.sin(x * 3) * 0.14, radius, GREEN[i % 4], {
          y: 0.06,
          squash: x > x1 - 1.1 ? 0.36 : 0.66,
          turn: seed + i,
        });
      }
      // Low leaves reach across the gaps between the shrubs, with occasional grass tufts.
      for (let x = x0 + 0.3; x < x1; x += 0.32) {
        const at = new THREE.Vector3(x, 0.105, z - 0.26);
        p.geo(GREEN[(i + 1) % 4], broadLeaf(at, x * 3 + i, 0.43, 0.27, 0.025), { ...NO, surf: 'foliage' });
      }
      if (i % 3 === 0) grass(p, x1 - 0.12, z, { h: 0.3, seed: seed + i });
      yield;
    }
  }
}

// Flush trench drain: frame and crossbars sit less than 3 cm above the paving.
function drain(p, x, z, length, alongX = false) {
  const put = (color, width, height, depth, dx, y, dz) =>
    p.box(
      color,
      alongX ? depth : width,
      height,
      alongX ? width : depth,
      x + (alongX ? dz : dx),
      y,
      z + (alongX ? dx : dz),
      { ...NO, surf: 'metal' },
    );
  put('#50575a', 0.24, 0.013, length, 0, 0.012, 0);
  for (const side of [-0.105, 0.105]) put('#8b9290', 0.025, 0.018, length, side, 0.012, 0);
  for (let t = -length / 2 + 0.05; t < length / 2; t += 0.105) put('#8b9290', 0.18, 0.016, 0.025, 0, 0.014, t);
}

export function yardSurface(pv, p) {
  const [x0, x1, z0, z1] = P.HALL;
  // Narrow aggregate margin at the foundation; a clean, jointed service pad around the entrance.
  pv.field([x1, x1 + 2.8, z0, z1], {
    pattern: 'grid',
    module: [1.4, 1.25],
    tones: ['#a3a39d', '#a9a8a1', '#9e9f99'],
    vary: 0.025,
    gap: 0.018,
    h: 0.012,
    origin: [x1, z0],
  });
  pv.field([x0, x1, z0 - 0.3, z0], {
    pattern: 'grid',
    module: [0.12, 0.15],
    tones: ['#777c76', '#858981', '#94958b'],
    vary: 0.05,
    gap: 0.012,
    h: 0.012,
  });
  drain(p, x1 + 0.2, (z0 + z1) / 2, z1 - z0 - 0.16);
  drain(p, x1 + 2.62, P.HALL_DOOR.z, 2.5);
  // Two lifting keys and a seam distinguish the inspection cover from a paving patch.
  const cx = x1 + 1.9,
    cz = z0 + 0.75;
  p.box('#626b6c', 0.8, 0.016, 0.65, cx, 0.018, cz, NO);
  p.box('#8b9492', 0.72, 0.016, 0.57, cx, 0.025, cz, { ...NO, surf: 'metal' });
  for (const dx of [-0.24, 0.24]) p.box('#434b4d', 0.08, 0.01, 0.025, cx + dx, 0.042, cz, NO);
  // Repaired slab corners beside the loading apron, clear of the rail grooves.
  for (const [x, z, w, d] of [
    [-70.9, -109.1, 0.85, 1.1],
    [-66.0, -106.8, 1.2, 0.65],
    [-76.8, -103.2, 1.4, 0.8],
  ]) {
    pv.field([x, x + w, z, z + d], {
      pattern: 'grid',
      module: [2, 2],
      tones: ['#92948d'],
      vary: 0,
      gap: 0,
      h: 0.012,
    });
  }
  // A drain against the shed catches roof runoff beside the existing pallet stack.
  drain(p, P.GATE[0] + 0.12, P.GATE[2] + 3.2, 3.4);
}

export function hallFittings(p) {
  const [x0, x1, z0, z1] = P.HALL,
    F = faces(P.HALL),
    f = F.e;
  const door = z1 - P.HALL_DOOR.z;
  // Plinth returns stop at the door; all raised fittings stay within the non-walked 15 cm wall margin.
  for (const [a, b] of [
    [0, door - P.HALL_DOOR.w / 2],
    [door + P.HALL_DOOR.w / 2, f.L],
  ])
    onFace(p, '#919995', f, a, b, 0, 0.22, 0, 0.06, { surf: 'concrete' });
  onFace(p, '#919995', F.n, 0, x1 - x0, 0, 0.22, 0, 0.06, { surf: 'concrete' });
  for (const z of [z0 + 0.22, z1 - 0.22]) {
    p.geo('#7f8d91', new THREE.CylinderGeometry(0.045, 0.045, 2.76, 8).translate(x1 + 0.065, 1.4, z), {
      surf: 'metal',
    });
    for (const y of [0.45, 1.7, 2.65]) p.box('#566970', 0.095, 0.045, 0.14, x1 + 0.05, y, z, NO);
    p.box('#7f8d91', 0.1, 0.07, 0.16, x1 + 0.065, 0.05, z, NO);
  }
  // A shallow wall service enclosure with a hinged door, louvres and conduit to the roof edge.
  onFace(p, '#64767c', f, 0.52, 1.08, 0.72, 1.46, 0.01, 0.115, { surf: 'metal' });
  onFace(p, '#a5aeaa', f, 0.55, 1.05, 0.75, 1.43, 0.115, 0.125, NO);
  for (let y = 0.85; y < 1.13; y += 0.075) onFace(p, '#626e70', f, 0.64, 0.96, y, y + 0.022, 0.125, 0.13, NO);
  onFace(p, '#425258', f, 0.58, 0.63, 1.22, 1.32, 0.125, 0.14, NO);
  onFace(p, '#7f8d91', f, 0.76, 0.8, 1.46, 2.8, 0.025, 0.065, NO);
  // Small windowed intercom beside the door, below the canopy.
  onFace(p, '#65777d', f, door + 0.91, door + 1.13, 1.12, 1.48, 0.015, 0.1, NO);
  onFace(p, '#344b54', f, door + 0.95, door + 1.09, 1.31, 1.43, 0.1, 0.105, NO);
  onFace(p, '#c1c8c4', f, door + 0.99, door + 1.05, 1.18, 1.24, 0.1, 0.11, NO);
}
