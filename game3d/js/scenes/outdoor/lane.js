// The town's lane for the outdoor kit (scenes/outdoor/): the route home from head office through the fountain plaza
// to the dorms is one lane, so every place lays it the same way.
//   laneField(pv, rect, { along, origin })   grey brick in running bond (courses along the lane) between two pale
//                                            soldier borders, on a paver (outdoor/paving.js)
//   verge(p, a, b, side, { bays, trees })    one side's verge: a kerb on the lane's edge, a bed of ground cover
//                                            1.1 deep with a low clipped hedge at its back, the zelkova avenue
//                                            behind it in rings of mulch
import * as THREE from 'three';
import { GRANITE } from './paving.js';
import { kerb } from './edges.js';
import { BED_FLUSH } from './walk-edges.js';
import { keyaki, hedge, bed, LEAF } from './planting.js';

export const LANE_BORDER = 0.25; // the soldier border along each edge

// rect [x0, x1, z0, z1]; along 'x' (courses along x, borders on the north and south edges) or 'z'
export function laneField(pv, [x0, x1, z0, z1], { along = 'x', origin = [x0, z0] } = {}) {
  const BW = LANE_BORDER;
  const brick = (rect, pattern) =>
    pv.field(rect, { pattern, module: [0.5, 0.25], tones: GRANITE.brick, vary: 0.08, origin });
  const edge = (rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });
  if (along === 'x') {
    brick([x0, x1, z0 + BW, z1 - BW], 'bond');
    edge([x0, x1, z0, z0 + BW], [0.15, BW]);
    edge([x0, x1, z1 - BW, z1], [0.15, BW]);
  } else {
    brick([x0 + BW, x1 - BW, z0, z1], 'bondZ');
    edge([x0, x0 + BW, z0, z1], [BW, 0.15]);
    edge([x1 - BW, x1, z0, z1], [BW, 0.15]);
  }
}

// a verge along a straight lane edge from a to b ([x, z], axis-aligned), on `side` ('n', 's', 'e', 'w': away from
// the lane): a kerb on the lane's edge, a bed of ground cover 1.1 deep with a low hedge at its back and a kerb
// behind it, gaps in the kerb and hedge for bench bays ([from, to] along the edge), and the avenue's trees, each in
// a ring of mulch, 2.1 from the edge at the given positions along it
// crossings: [from, to] along the edge where a path runs straight through the verge: both kerbs open, no bed or
// hedge, and a kerb down each side of the opening
// ground: the place's walkable ground (movement/walk-ground.js) draws the lane's edge, so the verge lays no kerbs of
// its own and its beds lie flush with the lawn
export function verge(p, a, b, side, { bays = [], crossings = [], trees = [], seed = 1, ground = false } = {}) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const sgn = side === 's' || side === 'e' ? 1 : -1;
  const at = (t, o) => (alongX ? [t, a[1] + sgn * o] : [a[0] + sgn * o, t]);
  const [t0, t1] = alongX ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  const line = (o) => [at(t0, o), at(t1, o)];
  if (!ground) {
    kerb(p, ...line(0), { off: sgn * 0.08, gaps: [...bays, ...crossings] });
    kerb(p, ...line(1.1), { off: -sgn * 0.08, gaps: crossings });
    for (const [c0, c1] of crossings)
      for (const [t, o] of [
        [c0, -0.08],
        [c1, 0.08],
      ])
        kerb(p, at(t, 0.16), at(t, 1.1 - 0.16), { off: o });
  }
  const y = ground ? BED_FLUSH : 0.06;
  const cuts = [t0, ...[...bays, ...crossings].sort((u, v) => u[0] - v[0]).flat(), t1];
  for (let i = 0; i + 1 < cuts.length; i += 2) {
    const [s0, s1] = [cuts[i], cuts[i + 1]];
    if (s1 - s0 < 0.4) continue;
    const [p0, p1] = [at(s0 + 0.1, 0.12), at(s1 - 0.1, 1.1 - 0.12)];
    bed(p, [Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1])], { y });
    hedge(p, at(s0 + 0.15, 1.1 - 0.36), at(s1 - 0.15, 1.1 - 0.36), { w: 0.4, h: 0.42, seed: seed + i });
  }
  for (const [s0, s1] of bays) {
    const [p0, p1] = [at(s0, 0.9), at(s1, 1.1 - 0.12)];
    bed(p, [Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1])], {
      y,
      cover: false,
    });
  }
  trees.forEach((t, i) => {
    const [x, z] = at(t, 2.1);
    keyaki(p, x, z, 1.0 + ((i + seed) % 3) * 0.04, seed * 7 + i);
    p.geo(LEAF.mulch, new THREE.CylinderGeometry(0.55, 0.6, 0.03, 12).translate(x, 0.0, z), {
      cast: false,
      surf: 'soil',
    });
  });
}
