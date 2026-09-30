// The gardens either side of the lane (forecourt/lane.js), inside head office's grounds from the court or the tower
// to the gateposts, planted as gardens rather than bands: drifts of planting of different depths, each in layers
// (low domes and grass tufts in front, mixed clusters in the middle, big clipped mounds at the back) over ground
// cover the lawn runs up to, a few specimen trees standing free on the lawn, rocks set in threes, a hedge that steps
// in and out at the back, and on the south side a way in: stepping stones from a gap in the lane's hedge to a raked
// gravel court with a bench and a stone lantern (forecourt/plan.js GARDEN_PATH, GARDEN_COURT; he can walk both).
// Nothing tall stands within 3 of where he can walk on its south side, so no crown hides him. Behind both gardens a
// looser belt of trees runs on past the gateposts toward the plaza.
import { kerbRect } from '../outdoor/edges.js';
import {
  keyaki,
  sakura,
  maple,
  pine,
  ginkgo,
  cluster,
  mound,
  hedge,
  grass,
  bed,
  gravel,
  LEAF,
} from '../outdoor/planting.js';
import { bench, stoneLantern } from '../outdoor/furniture.js';
import { rng } from '../outdoor/parts.js';
import * as P from './plan.js';

const { STRIP_S: S, STRIP_N: N, LE, TE, GATE_X, PATH_X, GARDEN_PATH: GP, GARDEN_COURT: GC } = P;
const X1 = GATE_X - 0.3; // the gardens end at the gateposts' line
const STONE = ['#9d9c95', '#8f8e88', '#a6a49c'];
const ROCK = ['#8a8983', '#7f7e79', '#94928b'];
const TONES = [LEAF.mid, LEAF.fresh, LEAF.deep, LEAF.light, LEAF.olive];

// a rock set in the ground: a squat faceted stone, a little sunk
const rock = (p, x, z, r, i = 0) => mound(p, x, z, r, ROCK[i % 3], { y: -r * 0.18, squash: 0.62, turn: x * 1.3 + z });
// three rocks as a group (a big one, two smaller ones leaning in), the Japanese garden's usual set
function rocks(p, x, z, r = 0.34, seed = 1) {
  const q = rng(seed + 5);
  rock(p, x, z, r, seed);
  rock(p, x + r * (1.3 + q() * 0.3), z + r * (0.4 + q() * 0.4), r * 0.62, seed + 1);
  rock(p, x - r * (0.9 + q() * 0.3), z + r * (0.7 + q() * 0.3), r * 0.48, seed + 2);
}

// A drift of planting over a rectangle, in three layers by depth from its front (the side he sees it from) to its
// back, each at its own loose rhythm, over ground cover whose edge steps in and out. back: the side the tall layer
// is on ('n' or 's'); skip: x ranges left empty (a path).
export function drift(p, [x0, x1, z0, z1], { back = 's', seed = 1, y = 0.06, skip = [] } = {}) {
  const q = rng(seed + 29),
    d = z1 - z0;
  const at = (t) => (back === 's' ? z0 + d * t : z1 - d * t); // t: 0 at the front, 1 at the back
  const w = x1 - x0;
  [
    [x0, x1, 0.05, 0.95],
    [x0 + w * q() * 0.3, x1 - w * q() * 0.3, 0, 1],
  ].forEach(([a, b, t0, t1], i) => {
    const [c, e] = [at(t0), at(t1)];
    bed(p, [a, b, Math.min(c, e), Math.max(c, e)], { y: y + i * 0.005 });
  });
  const free = (x) => x > x0 + 0.2 && x < x1 - 0.2 && !skip.some(([a, b]) => x > a - 0.3 && x < b + 0.3);
  const tone = () => (q() < 0.12 ? LEAF.rust : TONES[Math.floor(q() * TONES.length)]); // one turning early
  // the back: big mounds, touching, a little up and down, evergreen
  let k = Math.floor(q() * 4);
  for (let x = x0 + 0.35 + q() * 0.3; x < x1; x += 0.7 + q() * 0.35)
    if (free(x)) mound(p, x, at(0.8 + q() * 0.12), (0.42 + q() * 0.16) * Math.min(1, d / 1.6), TONES[k++ % 4], { y });
  // the middle: clusters and grasses in turn, never evenly spaced
  k = 0;
  for (let x = x0 + 0.6 + q() * 0.5; x < x1; x += 1.1 + q() * 0.7, k++) {
    if (!free(x)) continue;
    const z = at(0.45 + q() * 0.15);
    if (k % 3 === 2) for (let g = 0; g < 3; g++) grass(p, x + g * 0.2, z + (g % 2) * 0.16, { seed: seed + k + g });
    else cluster(p, x, z, { n: 3 + (k % 3), r: 0.26 + q() * 0.1, spread: 0.4, seed: seed + k, tones: TONES, y });
  }
  // the front: a few low domes
  for (let x = x0 + 0.4 + q(); x < x1; x += 1.3 + q() * 1.2)
    if (free(x)) mound(p, x, at(0.15 + q() * 0.08), 0.18 + q() * 0.08, tone(), { y });
}

// the way in and the gravel court: the stones cross the verge (lane.js leaves the gaps), the court has a pale kerb,
// a bench on its north side looking into the garden and the lantern in its south-west corner
function court(p, set, block) {
  const q = rng(4);
  for (let z = GP[2] + 1.35; z < GC[2] - 0.2; z += 0.58)
    p.box(STONE[Math.floor(q() * 3)], 0.5 + q() * 0.1, 0.05, 0.4, PATH_X + (q() - 0.5) * 0.16, 0.05, z, {
      ry: (q() - 0.5) * 0.25,
      cast: false,
      surf: 'concrete',
    });
  kerbRect(p, GC, { gaps: { n: [[GP[0], GP[1]]] } });
  gravel(p, [GC[0] + 0.16, GC[1] - 0.16, GC[2] + 0.16, GC[3] - 0.16], { y: 0.03 });
  const bx = GC[1] - 1.0;
  bench(p, bx, GC[2] + 0.45, 0, { len: 1.5 });
  block(bx - 0.8, bx + 0.8, GC[2], GC[2] + 0.75);
  stoneLantern(p, set, GC[0] + 0.45, GC[3] - 0.5, 0.03);
  set.lit.push([GC[0] + 1.2, GC[3] - 0.9, 1.3]); // its light on the gravel after dark
  block(GC[0], GC[0] + 0.8, GC[3] - 0.9, GC[3]);
  // low planting round the court's south side: nothing that stands up into the camera's view of him
  drift(p, [GC[0], GC[1], GC[3] + 0.1, GC[3] + 1.3], { seed: 2 });
}

// south of the lane: from the court's garden (LE) to the gateposts, z from the strip's edge (S[3]) south. West of
// the court a drift round a maple; east of it the specimen cherry free on the lawn; then a drift that steps back
// with a ginkgo in it, and at the east end a clipped pine over rocks, in line with the gateposts. Behind all of it
// a clipped hedge in three runs at different depths and heights.
function south(p) {
  const z0 = S[3];
  drift(p, [LE + 0.2, GC[0] - 0.3, z0 + 0.4, z0 + 4.4], { seed: 3 });
  maple(p, LE + 1.3, z0 + 2.4, 1.15, 5);
  rocks(p, LE + 2.2, z0 + 1.3, 0.3, 1);
  const cx = GC[1] + 2.4;
  sakura(p, cx, z0 + 2.3, 1.3, 9);
  rocks(p, cx - 1.1, z0 + 3.4, 0.3, 2);
  mound(p, cx + 1.0, z0 + 3.2, 0.3, LEAF.mid);
  drift(p, [cx + 2.0, cx + 4.2, z0 + 1.6, z0 + 4.6], { seed: 5 });
  drift(p, [cx + 4.2, X1 - 2.4, z0 + 0.7, z0 + 3.6], { seed: 6 });
  ginkgo(p, cx + 3.2, z0 + 3.9, 0.95, 4);
  drift(p, [X1 - 2.6, X1, z0 + 0.4, z0 + 4.2], { seed: 8 });
  pine(p, X1 - 1.2, z0 + 2.0, 1.1, 7);
  rocks(p, X1 - 2.0, z0 + 1.1, 0.34, 3);
  for (const [a, b, z, h] of [
    [LE + 0.2, GC[1] + 0.8, z0 + 5.2, 0.75],
    [GC[1] + 0.8, cx + 4.2, z0 + 5.8, 0.95],
    [cx + 4.2, X1, z0 + 4.9, 0.8],
  ])
    hedge(p, [a, z], [b, z], { w: 0.55, h, seed: Math.round(a) });
}

// north of the lane, past the tower: a drift by the tower's corner round a maple, a specimen pine standing free on
// the lawn over rocks, a deep drift with a cherry, and a hedge stepping in and out behind
function north(p) {
  const z0 = N[2];
  drift(p, [TE + 0.3, TE + 3.6, z0 - 3.8, z0 - 0.5], { back: 'n', seed: 11 });
  maple(p, TE + 2.0, z0 - 2.2, 1.05, 3);
  pine(p, TE + 5.4, z0 - 1.9, 1.35, 5);
  rocks(p, TE + 6.3, z0 - 1.1, 0.34, 6);
  drift(p, [TE + 7.4, X1, z0 - 4.6, z0 - 1.2], { back: 'n', seed: 12 });
  sakura(p, TE + 9.0, z0 - 3.3, 1.2, 4);
  for (const [a, b, z, h] of [
    [TE + 0.2, TE + 7.4, z0 - 4.6, 0.8],
    [TE + 7.4, X1, z0 - 5.3, 0.95],
  ])
    hedge(p, [a, z], [b, z], { w: 0.55, h, seed: Math.round(b) });
}

// the belts of taller trees behind both gardens: irregular spacing and depth, mixed kinds, on past the gateposts
function belts(p) {
  const q = rng(17);
  for (const [x0, zs, side] of [
    [LE + 0.6, S[3] + 7.4, 1],
    [TE + 0.8, N[2] - 6.4, -1],
  ]) {
    let i = 0;
    for (let x = x0; x < 52; x += 1.7 + q() * 1.2, i++) {
      const kind = [keyaki, ginkgo, keyaki, sakura, keyaki][Math.floor(q() * 5)];
      kind(p, x, zs + side * q() * 1.8, 1.1 + q() * 0.25, i + (side > 0 ? 50 : 80));
    }
  }
}

// block: the walk grid's block(); set: the lamps (the lantern's fire box glows with them)
export function buildGardens(p, set, block) {
  court(p, set, block);
  south(p);
  north(p);
  belts(p);
}
