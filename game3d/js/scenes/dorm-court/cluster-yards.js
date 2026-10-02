// The dorm cluster's yards (dorm-court/cluster.js builds the streets and the inner court): what the ground round
// the blocks is for, in the island frame.
//   the row's end: a square of herringbone brick at dorm_3's main door, the row's verge on along its south side;
//   from its east side a walk between two beds to a terrace with benches looking south over the coast pines
//   the coast: a belt of black pines over low mounds south of the row's east end and the garden
//   the north edge: a belt of mixed trees in beds of layered planting behind the blocks
//   the back: a clipped hedge behind the common building; north of the back walk a second bike shelter, and behind
//   it a bed of layered planting with mixed trees; mixed groups in beds on the lawns round the towers, beds along
//   the blocks' feet
//   the garden south of the row: cherries, a pine and drifts behind the avenue
//   pots of clipped shrubs either side of every door
import * as THREE from 'three';
import { GRANITE } from '../outdoor/paving.js';
import { kerb, kerbRect, lowWall, wallRect } from '../outdoor/edges.js';
import { verge } from '../outdoor/lane.js';
import { hedge, keyaki, sakura, ginkgo, pine, maple, mound, bed, LEAF } from '../outdoor/planting.js';
import { drift } from '../forecourt/gardens.js';
import { lamps, bench, STEEL } from '../outdoor/furniture.js';
import * as C from './cluster-plan.js';

const { ROW, BACK, ENTRY, GARDEN, SQUARE_END: SQ, SEA_WALK: SW, TERRACE: TR } = C;
export const pale = (pv, r) =>
  pv.field(r, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [r[0], r[2]] });
const edge = (pv, rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });
const BW = 0.25;

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

// the square at the row's east end: herringbone brick in a pale border, dorm_3's door on its north side
export function* endSquare(pv, p, lights) {
  const [x0, x1, z0, z1] = SQ;
  pv.field([x0, x1 - BW, z0, z1 - BW], {
    pattern: 'herringbone',
    module: [0.5, 0.25],
    tones: GRANITE.brick,
    vary: 0.08,
    origin: [x0, z0],
  });
  edge(pv, [x0, x1, z1 - BW, z1], [0.15, BW]);
  edge(pv, [x1 - BW, x1, z0, z1 - BW], [BW, 0.15]);
  kerbRect(p, [x0, x1, z0, z1], { sides: 'e', gaps: { e: [[SW[2], SW[3]]] } });
  kerb(p, [x0, z0], [x0, ROW[2]], { off: 0.08 });
  verge(p, [x0, z1], [x1, z1], 's', { seed: 71 });
  yield;
  lamps(
    lights,
    p,
    [
      [x0 + 0.5, z0 + 0.6],
      [x1 - 0.6, z0 + 0.6],
    ],
    { pool: 1.4 },
  );
  // the walk on east between two beds, and the terrace: pale granite in a border, a low wall on its south side,
  // three benches looking out, a lamp, a pine at each south corner
  pv.field(SW, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [SW[0], SW[2]] });
  for (const z of [SW[2], SW[3] - BW]) edge(pv, [SW[0], SW[1], z, z + BW], [0.15, BW]);
  kerbRect(p, [SW[0], SW[1], z0, SW[2]], { sides: 'ne' });
  drift(p, [SW[0], SW[1], z0, SW[2]], { back: 'n', seed: 72 });
  yield;
  kerbRect(p, [SW[0], SW[1], SW[3], z1 + 1.1], { sides: 'se' });
  drift(p, [SW[0], SW[1], SW[3], z1 + 1.1], { back: 's', seed: 78 });
  yield;
  pv.field(TR, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.mid, origin: [TR[0], TR[2]] });
  for (const z of [TR[2], TR[3] - BW]) edge(pv, [TR[0], TR[1], z, z + BW], [0.15, BW]);
  edge(pv, [TR[1] - BW, TR[1], TR[2] + BW, TR[3] - BW], [BW, 0.15]);
  kerbRect(p, TR, { sides: 'nw', gaps: { w: [[SW[2], SW[3]]] } });
  kerbRect(p, TR, { sides: 'e', gaps: { e: [C.COAST_Z] } }); // open for the east coast walk
  // the wall on the coast side, closed
  const st = [(TR[0] + TR[1]) / 2 - 0.75, (TR[0] + TR[1]) / 2 + 0.75];
  lowWall(p, [TR[0], TR[3]], [TR[1], TR[3]], { off: -0.11 });
  // a bench at each end looking out; a drinks machine lit on the terrace's north side, by the walk
  for (const x of [TR[0] + 1.1, TR[1] - 1.1]) bench(p, x, TR[3] - 0.7, 0, { len: 1.3 });
  const vx = TR[0] + 0.6,
    vz = TR[2] + 0.55;
  p.box('#3f6f9e', 0.75, 1.8, 0.65, vx, 0, vz);
  lights.glowParts.push(new THREE.BoxGeometry(0.6, 0.9, 0.02).translate(vx, 1.15, vz + 0.33));
  lights.lit.push([vx, vz + 0.9, 0.9]);
  // in the terrace's north half a raised bed with a big black pine, seen from up the row
  const tc = (TR[0] + TR[1]) / 2,
    tz = TR[2] + 1.6;
  yield;
  wallRect(p, [tc - 1.0, tc + 1.0, tz - 0.8, tz + 0.8], { h: 0.45 });
  bed(p, [tc - 0.8, tc + 0.8, tz - 0.6, tz + 0.6], { y: 0.43 });
  pine(p, tc, tz, 1.25, 81);
  lamps(lights, p, [[TR[1] - 0.4, TR[2] + 0.4]], { pool: 1.5 });
  yield;
  pine(p, (st[0] + st[1]) / 2 + 1.6, TR[3] + 2.4, 1.0, 82);
  pine(p, TR[0] - 0.6, TR[3] + 1.0, 0.9, 79);
  pine(p, TR[1] + 0.4, TR[3] + 0.8, 0.85, 80);
  yield;
}

// a wood along an edge: trees of the given kinds in turn, in staggered rows `pitch` apart (2.4) and a little off the
// grid, over an understorey of ground cover thick with clipped mounds in mixed greens and sizes; no kerb, it runs out
// into the lawn
export function* belt(p, [x0, x1, z0, z1], kinds, { seed = 1, pitch = 2.4 } = {}) {
  bed(p, [x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3], { y: 0.03 }); // a little over its neighbours, so no lawn between
  const alongX = x1 - x0 >= z1 - z0,
    [a0, a1] = alongX ? [x0, x1] : [z0, z1],
    [b0, b1] = alongX ? [z0, z1] : [x0, x1],
    at = (a, b) => (alongX ? [a, b] : [b, a]);
  const tones = [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light];
  let k = 0;
  for (let a = a0 + 0.4; a < a1 - 0.3; a += 0.45 + ((k * 7 + seed) % 4) * 0.12, k++)
    for (let j = 0; j < 2; j++) {
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
// round the cluster's outer edges, out past the map tile: the coast's black pines along the south, mixed trees along
// the north and the east
export function* belts(p) {
  const DE = C.block('dorm_entry'),
    D2 = C.block('dorm_2');
  yield* belt(p, [GARDEN[0], D2[0] - 0.3, GARDEN[3] + 0.6, 26], [pine, pine, sakura], { seed: 90 });
  yield* belt(p, [D2[0] - 0.3, 136, D2[3] + 1.6, 26], [pine, pine, keyaki], { seed: 94 });
  yield* belt(p, [C.block('dorm_2')[1] + 0.6, TR[1] + 1.0, SQ[3] + 1.6, D2[3] + 1.6], [pine, sakura, pine], {
    seed: 98,
  });
  // east of the east coast walk, a strip of pines on the land above the coast's wall
  yield* belt(p, [C.COAST_X[1] + 1.2, 135.8, -21, 0], [pine, pine, keyaki], { seed: 102, pitch: 3.4 });
  yield* belt(p, [C.block('dorm_1e')[0], C.COAST_X[0] - 0.6, -21, DE[2] - 0.2], [keyaki, ginkgo, sakura, maple], {
    seed: 106,
  });
}

// mixed trees in a bed of layered planting: [kind, x, z, size] each
function* grove(p, rect, trees, seed) {
  drift(p, rect, { back: 'n', seed });
  yield;
  for (const [i, [k, x, z, s]] of trees.entries()) {
    k(p, x, z, s, seed + i);
    yield;
  }
}

// the bike shelter's pad, north of the back walk and open to it
export const SHELTER_PAD = [ENTRY[1] + 1.3, ENTRY[1] + 11.7, BACK[2] - 2.2, BACK[2]];
export function* backYards(pv, p, lights) {
  const GAL = C.block('dorm_gallery'),
    D1E = C.block('dorm_1e'),
    D2 = C.block('dorm_2'),
    D3 = C.block('dorm_3'),
    D4 = C.block('dorm_4'),
    DE = C.block('dorm_entry');
  // behind the common building: a bed against its back wall, a clipped hedge along the walk
  shrubBed(p, [GAL[0], GAL[1], BACK[3] + 0.9, GAL[2]], 'we', 49);
  shrubBed(p, [GAL[1], C.LINK[0], BACK[3] + 0.9, C.COURT[2] - 0.6], 'nsw', 48); // east of it, to the link
  hedge(p, [GAL[0] + 0.3, BACK[3] + 0.5], [GAL[1] - 0.3, BACK[3] + 0.5], { w: 0.5, h: 0.6, seed: 50 });
  // north of the back walk: the bike shelter, open to the walk; behind it a bed of mixed trees
  pv.field(SHELTER_PAD, {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.mid,
    origin: [SHELTER_PAD[0], SHELTER_PAD[2]],
  });
  kerbRect(p, SHELTER_PAD, { sides: 'nwe' });
  shelter(p, lights, [ENTRY[1] + 1.5, ENTRY[1] + 11.5, BACK[2] - 2.0, BACK[2] - 0.05], 's', 7);
  yield;
  yield* grove(
    p,
    [DE[1] + 0.6, D4[0] - 0.3, DE[2] - 0.2, BACK[2] - 2.6],
    [
      [keyaki, ENTRY[1] + 3.0, DE[2] + 1.6, 1.05],
      [maple, ENTRY[1] + 6.5, DE[2] + 0.8, 0.85],
      [ginkgo, ENTRY[1] + 10.2, DE[2] + 1.8, 1.0],
    ],
    55,
  );
  // the lawn north of dorm_1e and west of dorm_entry; between dorm_3 and dorm_4; east of the towers
  yield* grove(
    p,
    [D1E[0] + 0.2, DE[0] - 1.6, DE[2] - 0.2, D1E[2] - 1.6],
    [
      [keyaki, D1E[0] + 2.0, DE[2] + 1.0, 1.05],
      [pine, DE[0] - 3.0, DE[2] + 2.6, 0.85],
    ],
    61,
  );
  yield* grove(
    p,
    [D1E[1] + 0.4, ENTRY[0] - 0.4, D1E[2] - 1.4, BACK[3]],
    [[sakura, D1E[1] + 2.0, BACK[2] - 0.4, 0.9]],
    53,
  );
  yield* grove(
    p,
    [C.LINK[1] + 0.6, D4[0] - 0.3, BACK[3] + 0.6, D3[2] - 0.4],
    [
      [sakura, C.LINK[1] + 3.2, D4[3] + 2.6, 1.0],
      [maple, D4[0] - 2.2, D3[2] - 1.8, 0.8],
    ],
    63,
  );
  yield* grove(
    p,
    [D3[1] + 1.1, D4[1] + 2.0, D4[3] + 1.2, TR[2] - 0.8],
    [
      [keyaki, D3[1] + 3.6, D4[3] + 3.2, 1.1],
      [ginkgo, D4[1] - 0.5, D3[2] + 2.5, 0.95],
      [pine, D3[1] + 4.5, TR[2] - 2.4, 0.9],
    ],
    65,
  );
  shrubBed(p, [D4[0], D3[1] + 1.0, D4[3] + 1.2, D3[2] - 0.4], 'nsw', 70);
  yield;
  // beds along the blocks' feet where they face lawn
  shrubBed(p, [D4[0], D4[1], D4[3], D4[3] + 1.0], 'sew', 73);
  shrubBed(p, [D3[1], D3[1] + 1.0, D3[2], D3[3]], 'nse', 74);
  shrubBed(p, [DE[0] - 1.0, DE[0], DE[2], DE[3]], 'nsw', 75);
  shrubBed(p, [D2[0], D2[1], D2[3], D2[3] + 1.0], 'sew', 76);
  shrubBed(p, [D1E[0], D1E[1], D1E[2] - 1.0, D1E[2]], 'nwe', 77);
  // the back walk's lamps, on its north edge
  lamps(
    lights,
    p,
    [ENTRY[1] + 0.6, C.LINK[1] + 3.0].map((x) => [x, BACK[2] + 0.2]),
    { pool: 1.3 },
  );
}

// the garden south of the row: a walk in from the row through the verge to a paved pad under a pergola with a bench
// at each end, drifts of layered planting either side with a cherry in each
export const GARDEN_WALK = [(GARDEN[0] + GARDEN[1]) / 2 - 0.75, (GARDEN[0] + GARDEN[1]) / 2 + 0.75];
export function* garden(pv, p) {
  const [x0, x1, , z1] = GARDEN,
    [w0, w1] = GARDEN_WALK,
    pad = [w0 - 2.6, w1 + 2.6, z1 - 3.4, z1 - 0.4];
  // from the row's kerb, through the verge's opening
  pale(pv, [w0, w1, ROW[3], pad[2]]);
  for (const x of [w0, w1 - BW]) edge(pv, [x, x + BW, ROW[3], pad[2]], [BW, 0.15]);
  kerbRect(p, [w0, w1, ROW[3] + 1.1, pad[2]], { sides: 'we' });
  pv.field(pad, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.mid, origin: [pad[0], pad[2]] });
  for (const z of [pad[2], pad[3] - BW]) edge(pv, [pad[0], pad[1], z, z + BW], [0.15, BW]);
  kerbRect(p, pad, { gaps: { n: [[w0, w1]] } });
  // the pergola: four posts, two beams along it, slats across
  for (const x of [pad[0] + 0.3, pad[1] - 0.3])
    for (const z of [pad[2] + 0.3, pad[3] - 0.3]) p.box('#8f969e', 0.14, 2.3, 0.14, x, 0, z);
  for (const z of [pad[2] + 0.3, pad[3] - 0.3])
    p.box('#7d858e', pad[1] - pad[0] - 0.2, 0.12, 0.12, (pad[0] + pad[1]) / 2, 2.3, z);
  for (let x = pad[0] + 0.4; x < pad[1] - 0.3; x += 0.45)
    p.box('#9aa0a6', 0.06, 0.06, pad[3] - pad[2] - 0.2, x, 2.42, (pad[2] + pad[3]) / 2, { cast: false });
  for (const [x, f] of [
    [pad[0] + 0.7, Math.PI / 2],
    [pad[1] - 0.7, -Math.PI / 2],
  ])
    bench(p, x, (pad[2] + pad[3]) / 2, f, { len: 1.6 });
  yield;
  // the drifts, and a cherry in each
  drift(p, [x0 + 0.4, pad[0] - 0.4, ROW[3] + 1.6, z1 - 0.3], { back: 's', seed: 41 });
  yield;
  drift(p, [pad[1] + 0.4, x1 - 0.4, ROW[3] + 1.6, z1 - 0.3], { back: 's', seed: 45 });
  yield;
  sakura(p, (x0 + pad[0]) / 2, ROW[3] + 3.6, 1.0, 42);
  sakura(p, (pad[1] + x1) / 2, ROW[3] + 3.9, 0.95, 43);
  pine(p, (x0 + pad[0]) / 2 + 0.8, z1 - 1.4, 0.8, 44);
  yield;
}

// a glazed pot with a clipped shrub either side of each door
export function doorPots(p, blocks) {
  for (const k of blocks)
    for (const d of C.doorsOf(k))
      for (const s of [-1, 1]) {
        const x = d.x + d.n[0] * 0.4 + d.along[0] * s * 1.15,
          z = d.z + d.n[1] * 0.4 + d.along[1] * s * 1.15;
        p.geo('#5b6470', new THREE.CylinderGeometry(0.2, 0.15, 0.36, 8).translate(x, 0.18, z), { cast: false });
        mound(p, x, z, 0.22, s > 0 ? LEAF.mid : LEAF.deep, { y: 0.36, squash: 0.85 });
      }
}
