// The yards kit: what the ground round a block is for, as the dorm quarter (dorm-quarter/) first laid it and the
// other places use it: pale walks, beds of clipped shrubs against a wall, parked bikes and a bike shelter, belts and
// groves of trees over layered planting, pots by a door. In the island frame of whoever calls it.
import * as THREE from 'three';
import { GRANITE } from '../outdoor/paving.js';
import { kerbRect } from '../outdoor/edges.js';
import { mound, bed, LEAF } from '../outdoor/planting.js';
import { drift } from '../forecourt/gardens.js';
import { STEEL } from '../outdoor/furniture.js';

export const pale = (pv, r) =>
  pv.field(r, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [r[0], r[2]] });

// a bed against a wall or along a walk, kerbed on its open sides: clipped mounds in mixed greens
export function shrubBed(p, rect, sides, seed) {
  kerbRect(p, rect, { sides });
  bed(p, rect, { y: 0.06 });
  const tones = [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light];
  const [x0, x1, z0, z1] = rect,
    alongX = x1 - x0 >= z1 - z0,
    [a0, a1] = alongX ? [x0, x1] : [z0, z1],
    c = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
  let i = 0;
  for (let t = a0 + 0.45; t < a1 - 0.3; t += 0.75, i++) {
    const o = ((i * 7 + seed) % 3) * 0.12 - 0.12,
      r = 0.22 + ((i + seed) % 3) * 0.06;
    mound(p, alongX ? t : c + o, alongX ? c + o : t, r, tones[(i + seed) % 4], { y: 0.06 });
  }
}

// a bicycle standing at (x, z), facing ry (0: along +z): two wheels, a frame, a saddle and a handlebar
const FRAMES = ['#7d8a96', '#3f5f6e', '#c9c6bd', '#5d6b5a', '#8c4a4a'];
export function bike(p, x, z, ry, k) {
  const put = (color, g) => p.geo(color, g.rotateY(ry).translate(x, 0, z), { cast: false });
  for (const s of [-1, 1])
    put('#2f3338', new THREE.TorusGeometry(0.27, 0.035, 4, 12).rotateY(Math.PI / 2).translate(0, 0.3, s * 0.52));
  const frame = FRAMES[k % FRAMES.length];
  put(frame, new THREE.BoxGeometry(0.05, 0.05, 0.8).translate(0, 0.52, 0));
  put(frame, new THREE.BoxGeometry(0.05, 0.42, 0.05).translate(0, 0.42, -0.18));
  put('#2f3338', new THREE.BoxGeometry(0.1, 0.05, 0.22).translate(0, 0.66, -0.2));
  put('#2f3338', new THREE.BoxGeometry(0.46, 0.04, 0.04).translate(0, 0.78, 0.45));
}
// a bike shelter over [x0, x1] × [z0, z1], open on the side `open` ('n' or 's'): posts at its back, a roof sloping
// to the back, a rack rail, bikes nose-in with gaps, a lit strip under the roof
export function shelter(p, lights, [x0, x1, z0, z1], open, seed) {
  const back = open === 's' ? z0 : z1,
    front = open === 's' ? z1 : z0,
    dir = open === 's' ? 1 : -1;
  for (let x = x0 + 0.2; x < x1; x += 2.4) p.box(STEEL.mid, 0.08, 2.1, 0.08, x, 0, back + dir * 0.15);
  p.box(STEEL.mid, 0.08, 2.1, 0.08, x1 - 0.2, 0, back + dir * 0.15);
  const d = Math.abs(z1 - z0),
    roof = new THREE.BoxGeometry(x1 - x0 + 0.3, 0.06, d + 0.3).rotateX(-dir * 0.08);
  p.geo('#9aa4ad', roof.translate((x0 + x1) / 2, 2.15, (z0 + z1) / 2), { cast: false });
  // the roof's ribs, across it every 0.6
  for (let x = x0; x <= x1 + 0.01; x += 0.6)
    p.geo('#7d858e', new THREE.BoxGeometry(0.05, 0.05, d + 0.3).rotateX(-dir * 0.08).translate(x, 2.2, (z0 + z1) / 2), {
      cast: false,
    });
  p.box(STEEL.dark, x1 - x0 - 0.2, 0.05, 0.05, (x0 + x1) / 2, 0.45, back + dir * 0.45);
  lights.glowParts.push(new THREE.BoxGeometry(x1 - x0 - 0.6, 0.04, 0.08).translate((x0 + x1) / 2, 2.05, (z0 + z1) / 2));
  lights.lit.push([(x0 + x1) / 2, (z0 + z1) / 2, 1.6]);
  let k = seed;
  for (let x = x0 + 0.45; x < x1 - 0.3; x += 0.62, k++) if ((k * 7) % 5 !== 2) bike(p, x, back + dir * 0.95, 0, k);
  return front;
}

// a wood along an edge: trees of the given kinds in turn, in staggered rows `pitch` apart (2.4) and a little off the
// grid, over an understorey of ground cover thick with clipped mounds in mixed greens and sizes; no kerb, it runs out
// into the lawn. under: mounds per step along it (2; 1 for a lighter wood seen from further off, scenes/bands.js)
export function* belt(p, [x0, x1, z0, z1], kinds, { seed = 1, pitch = 2.4, under = 2, soil = true } = {}) {
  if (soil) bed(p, [x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3], { y: 0.03 }); // shared ground, unless the caller lays its own bed
  const alongX = x1 - x0 >= z1 - z0,
    [a0, a1] = alongX ? [x0, x1] : [z0, z1],
    [b0, b1] = alongX ? [z0, z1] : [x0, x1],
    at = (a, b) => (alongX ? [a, b] : [b, a]);
  const tones = [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light];
  let k = 0;
  for (let a = a0 + 0.4; a < a1 - 0.3; a += 0.45 + ((k * 7 + seed) % 4) * 0.12, k++)
    for (let j = 0; j < under; j++) {
      const b = b0 + 0.35 + ((((k * 13 + j * 5 + seed) % 11) + 0.5) / 11) * (b1 - b0 - 0.7);
      mound(p, ...at(a, b), 0.2 + ((k + j + seed) % 4) * 0.06, tones[(k * 3 + j + seed) % 4], { y: 0.03 });
      if (k % 4 === 3 && j) yield;
    }
  yield;
  const rows = Math.max(1, Math.floor((b1 - b0) / pitch));
  k = 0;
  for (let r = 0; r < rows; r++)
    for (let a = a0 + pitch / 2 + (r % 2) * (pitch / 2); a < a1 - 0.8; a += pitch, k++) {
      const b = b0 + ((r + 0.5) * (b1 - b0)) / rows + (((k * 7 + seed) % 5) - 2) * 0.18;
      kinds[k % kinds.length](
        p,
        ...at(a + (((k * 3 + seed) % 5) - 2) * 0.15, b),
        0.9 + ((k + seed) % 4) * 0.08,
        seed + k,
      );
      yield;
    }
}
// mixed trees in a bed of layered planting: [kind, x, z, size] each
export function* grove(p, rect, trees, seed) {
  drift(p, rect, { back: 'n', seed });
  yield;
  for (const [i, [k, x, z, s]] of trees.entries()) {
    k(p, x, z, s, seed + i);
    yield;
  }
}

// a glazed pot with a clipped shrub either side of each door: doors [{ x, z, n, along }] (on the face, its outward
// normal, its direction along)
export function doorPots(p, doors) {
  for (const d of doors)
    for (const s of [-1, 1]) {
      const x = d.x + d.n[0] * 0.4 + d.along[0] * s * 1.15,
        z = d.z + d.n[1] * 0.4 + d.along[1] * s * 1.15;
      p.geo('#5b6470', new THREE.CylinderGeometry(0.2, 0.15, 0.36, 8).translate(x, 0.18, z), { cast: false });
      mound(p, x, z, 0.22, s > 0 ? LEAF.mid : LEAF.deep, { y: 0.36, squash: 0.85 });
    }
}
