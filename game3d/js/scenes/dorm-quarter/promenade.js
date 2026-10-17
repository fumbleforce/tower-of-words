// The dorm quarter's beach promenade (the plan is dorm-quarter/plan.js), in the island frame:
//   along the sea wall's coping (outdoor/coast.js lays the wall on the coast line) a railing, open at the steps and
//   the deck; benches on the seaward band facing the sea, a bin by every other; lamps on the land side
//   the land side: a bed of salt-tolerant planting, opened wherever a walk comes in, and black pines in groups
//   behind it
//   the lookout deck at the north path's end: timber on piles over the water, a rail on its sides (the lookout nook,
//   east-coast/plan.js NOOKS, stands on its far edge with its telescope and bench)
//   the steps down to the sand: treads between two cheek walls, a landing on the sand; the beach plaza's set wide
//   the beach plaza where the promenade comes in: two drinks machines, a bench looking out, a beach tap
//   the fitness corner: three bars of three heights and a sit-up bench, a small board
import * as THREE from 'three';
import { rail } from '../outdoor/coast.js';
import { pine, mound, grass, bed, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, STEEL, PAINTED } from '../outdoor/furniture.js';
import { terraceVending } from '../east-coast/terrace-details.js';
import { hash2 } from '../outdoor/parts.js';
import { boards, fitnessBars } from '../outdoor/park-kit.js';
import { planter } from '../../kit/planting/planter.js';
import { boulder, shoreRibbon, WET, SURF } from '../outdoor/seafront.js';
import * as Q from './plan.js';
import { WALL_GAPS } from './fittings.js';
import { BATH_COAST } from '../island-baths.js';

const STONE = { tread: '#9a9893', nosing: '#6f7175', cheek: '#8c8e8f' };
const PILE = '#5d5249';
const [BX0, BX1, BZ0, BZ1] = Q.BEACH_PROM;
const RAIL_X = Q.SEA_X; // on the coping's middle
const COPING_Y = 0.2;

// the planted edge's runs between the walks coming in
function edgeRuns() {
  const out = [];
  let z = BZ0 + 0.6;
  for (const [g0, g1] of [...Q.EDGE_GAPS].sort((a, b) => a[0] - b[0])) {
    if (g0 - z > 0.6) out.push([z, g0]);
    z = Math.max(z, g1);
  }
  if (BZ1 - z > 0.6) out.push([z, Q.TERRACE[2]]);
  return out.filter(([a, b]) => b - a > 0.6);
}
const PINES = [
  [127.4, -33.6, 0.95],
  [127.8, -31.0, 0.85],
  [127.3, -24.6, 0.9],
  [127.5, -17.4, 0.9],
  [127.7, -5.4, 0.85],
  [127.4, 0.4, 0.9],
];
export function* promenadeSteps(pv, p, lights, root, { far = false } = {}) {
  // the railing on the coping, in runs between the gaps
  let z = BZ0;
  for (const [g0, g1] of [...WALL_GAPS, [BZ1, BZ1]].sort((a, b) => a[0] - b[0])) {
    if (g0 - z > 0.5) rail(p, [RAIL_X, z + 0.1], [RAIL_X, g0 - 0.1], { y: COPING_Y, mid: true });
    z = g1;
  }
  // and on round the sea garden's wall to the courts walk's end, so the lawn's edge at the water reads as closed
  const [c0, c1] = BATH_COAST,
    t = (c0[1] - Q.COURTS_EAST[2]) / (c0[1] - c1[1]);
  const north = [[RAIL_X, BZ0], ...Q.COAST_LINE.slice(4), c0, [c0[0] + (c1[0] - c0[0]) * t, Q.COURTS_EAST[2]]];
  for (let i = 0; i + 1 < north.length; i++) rail(p, north[i], north[i + 1], { y: COPING_Y, mid: true });
  yield;
  // the benches looking out, a bin beside every other
  Q.SEA_BENCHES.forEach((bz, i) => {
    bench(p, BX1 - 0.45, bz, Math.PI / 2, { len: 1.6 });
    if (i % 2) bins(p, BX1 - 0.4, bz + 1.25, Math.PI / 2);
  });
  lamps(
    lights,
    p,
    Q.PROM_LAMPS.map((lz) => [BX0 - 0.15, lz]),
    { pool: 1.5, poolShift: [0.9, 0] },
  );
  yield;
  // the land side: a bed along the edge, mounds and grasses in it, the pines behind
  for (const [z0, z1] of edgeRuns()) {
    bed(p, [Q.EDGE[0], Q.EDGE[1], z0, z1], { y: 0.005 });
    for (let t = z0 + 0.3; t < z1 - 0.2; t += 0.55 + hash2(t, 1, 3) * 0.4) {
      const x = Q.EDGE[0] + 0.3 + hash2(t, 2, 5) * 0.45;
      if (hash2(t, x, 7) < 0.6)
        mound(p, x, t, 0.2 + hash2(x, t, 9) * 0.08, [LEAF.deep, LEAF.mid, LEAF.fresh][Math.floor(hash2(t, 3, 11) * 3)]);
      else if (!far) grass(p, x, t, { h: 0.42, color: '#a1a482', seed: Math.round(t * 10) });
    }
    yield;
  }
  for (const [x, pz, s] of PINES) {
    pine(p, x, pz, s, Math.round(pz * 3));
    yield;
  }
  // the deck: boards across it on piles, its rails
  deck(p);
  yield;
  for (const s of Q.STEPS) steps(p, s);
  yield;
  plaza(root, p, lights);
  fitness(p);
  yield;
  beach(p, far);
  yield;
}

// the beach: a wet band along the water and a line of foam on it, a few boulders where the sand runs out against
// the wall at its ends, dune grass at the wall's foot
function beach(p, far) {
  const shore = Q.SHORE.slice(1, -1);
  shoreRibbon(
    p,
    shore,
    WET,
    [
      [-1.6, 0],
      [-0.5, 0.45],
      [0, 0.65],
    ],
    -0.142,
  );
  shoreRibbon(
    p,
    shore,
    SURF,
    [
      [-0.04, 0],
      [0.18, 0.6],
      [0.6, 0],
    ],
    -0.172,
  );
  for (const [x, z, n] of [
    [134.1, 1.6, 4],
    [134.0, -24.6, 5],
    [136.9, -14.0, 2],
  ])
    for (let j = 0; j < n; j++) {
      const a = j * 1.4 + x,
        r = (j ? 0.26 : 0.45) * (0.8 + hash2(x, j, 3) * 0.5);
      boulder(p, x + Math.cos(a) * 0.45 * Math.sqrt(j), z + Math.sin(a) * 0.4 * Math.sqrt(j), r, -0.16);
    }
  if (far) return;
  for (let z = Q.BEACH[2] + 2; z < Q.BEACH[3] - 1.5; z += 1.7 + hash2(z, 1, 9) * 1.4) {
    if (Q.STEPS.some(([, , z0, z1]) => z > z0 - 0.8 && z < z1 + 0.8)) continue; // the steps and their landings clear
    grass(p, Q.WALL[1] + 0.35 + hash2(z, 2, 5) * 0.4, z, { h: 0.34, color: '#8a8f66', seed: Math.round(z * 7) });
  }
}

function deck(p) {
  const [x0, x1, z0, z1] = Q.DECK,
    y = 0.04;
  boards(p, Q.DECK, { y, along: 'x' });
  for (const x of [x0 + 0.5, (x0 + x1) / 2, x1 - 0.3])
    for (const z of [z0 + 0.3, z1 - 0.3])
      p.geo(PILE, new THREE.CylinderGeometry(0.11, 0.12, 0.9, 8).translate(x, -0.45, z), { cast: false });
  p.box('#6f5c49', x1 - x0, 0.12, 0.12, (x0 + x1) / 2, -0.12, z0 + 0.3, { cast: false });
  p.box('#6f5c49', x1 - x0, 0.12, 0.12, (x0 + x1) / 2, -0.12, z1 - 0.3, { cast: false });
  // rails on its north and south sides, from the coping out to the far corner (the nook's rail is on its east edge)
  for (const z of [z0 + 0.08, z1 - 0.08]) rail(p, [Q.WALL[1], z], [x1 - 0.08, z], { y, mid: true });
}

// a flight of steps over the wall down to the sand: six treads between cheek walls, a landing on the sand
function steps(p, [x0, x1, z0, z1]) {
  const n = 6,
    td = (x1 - x0) / n,
    cz = (z0 + z1) / 2;
  for (let i = 0; i < n; i++) {
    const y = -0.02 - i * 0.022,
      x = x0 + td * i;
    p.box(STONE.tread, td, 0.04, z1 - z0 - 0.4, x + td / 2, y, cz, { cast: false });
    p.box(STONE.nosing, 0.07, 0.045, z1 - z0 - 0.4, x + td - 0.035, y, cz, { cast: false });
  }
  for (const z of [z0 + 0.1, z1 - 0.1]) p.box(STONE.cheek, x1 - x0, 0.25, 0.22, (x0 + x1) / 2, -0.05, z);
  // the landing: a slab with its edge standing a little proud of the sand, a dark nosing along its sea side
  p.box(STONE.cheek, 1.24, 0.1, z1 - z0 + 0.64, x1 + 0.6, -0.23, cz, { cast: false });
  p.box(STONE.tread, 1.2, 0.03, z1 - z0 + 0.6, x1 + 0.6, -0.15, cz, { cast: false });
  p.box(STONE.nosing, 0.08, 0.035, z1 - z0 + 0.6, x1 + 1.16, -0.15, cz, { cast: false });
}

// the beach plaza: two drinks machines lit on its north side, a bench looking out, the beach tap by the steps
function plaza(root, p, lights) {
  const [x0, , z0] = Q.PLAZA;
  // a slatted timber screen behind them, so they stand against something, not the lawn
  for (let x = x0 + 0.2; x < x0 + 2.05; x += 0.16) p.box('#7a654f', 0.1, 1.9, 0.06, x, 0, z0 - 0.04, { surf: 'wood' });
  p.box('#6d5a47', 1.95, 0.08, 0.1, x0 + 1.12, 1.9, z0 - 0.04, { surf: 'wood' });
  terraceVending(root, p, x0 + 0.7, z0 + 0.4, { color: '#b8463f', seed: 3 });
  terraceVending(root, p, x0 + 1.55, z0 + 0.4, { color: '#3f6f9e', seed: 4 });
  lights.lit.push([x0 + 1.1, z0 + 1.3, 1.0]);
  bins(p, x0 + 2.5, z0 + 0.35, 0);
  bench(p, x0 + 1.2, Q.PLAZA[3] - 0.45, Math.PI, { len: 1.6 });
  // a bowl of flowers at each of its corners on the beach promenade's side
  for (const z of [Q.PLAZA[2] + 0.45, Q.PLAZA[3] - 0.45])
    planter(p, { at: [Q.PLAZA[1] - 0.5, z], variant: 'round', seed: Math.round(z) });
  // the tap: a stone post with a steel tap and a grate in the paving under it
  const tx = BX1 - 0.4,
    tz = -11.6;
  p.box('#8c8e8f', 0.22, 0.85, 0.22, tx, 0, tz);
  p.box(STEEL.pale, 0.04, 0.04, 0.16, tx, 0.62, tz + 0.15, PAINTED);
  p.box('#555f64', 0.5, 0.012, 0.5, tx, 0.004, tz + 0.2, { cast: false });
}

// the fitness corner: three bars of three heights, a sit-up bench, a board with the exercises
function fitness(p) {
  const [x0, x1, z0, z1] = Q.FITNESS,
    zb = z0 + 1.15, // the bars' middle
    zs = (z0 + z1) / 2 + 0.55; // the sit-up bench's and the board's
  // a soft mat under the bars, the bars of three heights on it
  p.box('#6f7f8f', 1.7, 0.025, 1.5, x0 + 1.4, 0, zb, { cast: false });
  fitnessBars(p, x0 + 0.8, zb); // out toward the promenade, clear of the block's balconies
  // the sit-up bench, tilted, its foot bar
  p.geo('#4d6b8a', new THREE.BoxGeometry(0.45, 0.06, 1.3).rotateX(0.22).translate(x1 - 0.5, 0.36, zs), PAINTED);
  p.box(STEEL.dark, 0.08, 0.32, 0.08, x1 - 0.5, 0, zs + 0.62, PAINTED);
  // low push-up bars at the far end
  for (const dz of [-0.22, 0.22]) {
    for (const dx of [-0.3, 0.3]) p.box(STEEL.mid, 0.05, 0.3, 0.05, x1 - 0.55 + dx, 0, z1 - 0.6 + dz, PAINTED);
    p.box(STEEL.pale, 0.66, 0.04, 0.04, x1 - 0.55, 0.3, z1 - 0.6 + dz, PAINTED);
  }
  // the board against the garden's hedge, facing the promenade: how to use them, a blue head over three drawings
  p.box(STEEL.dark, 0.06, 1.2, 0.06, x0 + 0.25, 0, zs, PAINTED);
  p.box('#e4e6e3', 0.04, 0.42, 0.5, x0 + 0.29, 0.9, zs, { cast: false });
  p.box('#3f6f9e', 0.045, 0.1, 0.5, x0 + 0.29, 1.22, zs, { cast: false });
  for (const dz of [-0.15, 0, 0.15]) p.box('#5b616b', 0.046, 0.16, 0.08, x0 + 0.29, 0.98, zs + dz, { cast: false });
}
