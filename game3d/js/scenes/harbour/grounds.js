// The harbour's ground away from the quays (harbour/plan.js), in the island frame:
//   the office street's west end: the office quarter's street (office-quarter/grounds.js streetSteps) from the yard
//   to in front of Amakawa Trading, the works street's mouth laid a little way north with bollards across; on its
//   south side west of the harbour walk a verge and the rocks beyond; Amakawa Trading's front (office-quarter/row.js)
//   the harbour walk: pale slabs between borders, kerbed, south from the street to a row of bollards; a bay off its
//   sea side with two benches looking west; lamps on its landward edge
//   the landing: benches looking out over the water, lamps, a finger sign; the beacons on the pier heads
//   the planting: pines along the rocks, a belt of trees between the street's west end and the works street, trees
//   round the terminal and behind the harbour office, the office quarter's belts by Amakawa Trading
//   the rocks: the coast kit's sea wall, armour rocks and surf (outdoor/coast.js) north-west of the landing and from
//   the yard round to the coast walk, at the harbour's water level
import * as THREE from 'three';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { lamps, bench, bollard, fingerSign, STEEL } from '../outdoor/furniture.js';
import { pine, keyaki, sakura, maple, planter, treePit } from '../outdoor/planting.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { walk } from '../plaza/east-lane.js';
import { laneField, verge } from '../outdoor/lane.js';
import { GRANITE } from '../outdoor/paving.js';
import { coastSteps } from '../outdoor/coast.js';
import { streetSteps, planting } from '../office-quarter/grounds.js';
import { ORIGIN } from '../office-quarter/link.js';
import * as O from '../office-quarter/plan.js';
import { ROCKS_NW, ROCKS_SE } from '../island-harbour.js';
import { WEST_COAST, WEST_TREES } from '../island-west.js';
import * as P from './plan.js';

const { STREET: S, HW, BAY } = P;

// the street's west end, the works street's mouth, and the south side's verge west of the walk
function* street(pv, p, lights, signRoot) {
  yield* streetSteps(pv, p, lights, [P.YARD[1], P.EAST_END + 4]);
  const W = P.WORKS_STREET;
  laneField(pv, [W[0], W[1], S[2] - 2.2, S[2]], { along: 'z', origin: ORIGIN });
  for (const x of [W[0], W[1]]) kerb(p, [x, S[2] - 2.2], [x, S[2]], { off: x === W[0] ? -0.08 : 0.08 });
  verge(p, [P.YARD[1], S[3]], [HW[0] - 1.5, S[3]], 's', { seed: 151 });
  fingerSign(signRoot, p, ...O.SIGNS.west, O.WEST_BOARDS);
  fingerSign(signRoot, p, ...P.SIGNS.yard, [
    { text: 'Ferry', sub: 'フェリー', dir: -1 },
    { text: 'Offices', sub: '事務所', dir: 1 },
  ]);
  yield;
}

// the harbour walk and its bay
function* harbourWalk(pv, p, lights) {
  walk(pv, [HW[0], HW[1], S[3], P.WALK_END + 1.2], false);
  pv.field(BAY, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [BAY[0], BAY[2]] });
  kerbRect(p, [HW[0], HW[1], S[3] + 1.1, P.WALK_END + 1.2], { sides: 'we', gaps: { w: [[BAY[2], BAY[3]]] } });
  kerbRect(p, BAY, { sides: 'nsw' });
  for (const [x, z, f] of P.BENCHES.filter(([x]) => x > -60)) bench(p, x, z, f, { len: 1.5 });
  lamps(
    lights,
    p,
    P.LAMPS.filter(([x, z]) => x > HW[1] && z > S[3] + 1),
    { pool: 0.95, poolShift: [-1.45, 0] },
  );
  yield;
}

// the landing's benches, lamps and sign, the beacons on the pier heads, the lifebuoys, the bollards
function* landing(p, lights, signRoot) {
  for (const [x, z, f] of P.BENCHES.filter(([x]) => x < -100)) bench(p, x, z, f, { len: 1.5 });
  lamps(
    lights,
    p,
    P.LAMPS.filter(([x, z]) => x < P.YARD[1] && z < P.LANDING[3]),
    { pool: 1.3 },
  );
  lamps(
    lights,
    p,
    P.LAMPS.filter(([x, z]) => x < P.YARD[1] && z > P.LANDING[3]),
    { pool: 1.2, poolShift: [-1.2, 0] },
  );
  fingerSign(signRoot, p, ...P.SIGNS.landing, [{ text: 'Offices', sub: '事務所', dir: 1 }]);
  for (const [x, z] of P.BEACONS) {
    p.geo('#d9dbd6', new THREE.CylinderGeometry(0.16, 0.2, 1.6, 8).translate(x, 0.8, z));
    p.geo('#3f8a5a', new THREE.CylinderGeometry(0.17, 0.17, 0.3, 8).translate(x, 1.3, z));
    lights.glowParts.push(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8).translate(x, 1.72, z));
    p.geo(STEEL.dark, new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8).translate(x, 1.86, z));
  }
  // lifebuoys on posts by the pier roots and on the landing's quay
  for (const [x, z] of [
    [P.FERRY_PIER[1] - 0.4, P.FERRY_PIER[2] + 1.6],
    [P.SUPPLY_PIER[1] - 0.4, P.SUPPLY_PIER[2] + 1.6],
    [-104.6, P.LANDING[3] - 0.5],
  ]) {
    p.box(STEEL.dark, 0.06, 1.1, 0.06, x, 0, z, { cast: false });
    p.geo('#c75b3b', new THREE.TorusGeometry(0.26, 0.07, 6, 12).translate(x, 0.8, z + 0.06));
  }
  // planters either side of the terminal's door, pines in pits on the landing
  const t = P.front('ferry_terminal').door[0];
  for (const s of [-1, 1])
    planter(p, s < 0 ? [t - 4.4, t - 2.0, -99.6, -98.9] : [t + 2.0, t + 4.4, -99.6, -98.9], { seed: 160 + s });
  for (const [x, z] of [
    [-122.6, -94.4],
    [-104.6, -94.4],
  ]) {
    treePit(p, x, z);
    pine(p, x, z, 1.05, 170 + x);
  }
  for (const { a, b } of P.BOLLARDS) {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.66));
    for (let i = 0; i <= n; i++) bollard(p, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
  }
  yield;
}

// the trees: pines along the rocks, the belt north of the street's west end, round the terminal and the office
function* trees(p) {
  for (const [r, kinds, seed, pitch] of [
    // north of the street's west end, between the yard and the works street
    [[P.YARD[1] + 1.2, P.WORKS_STREET[0] - 1.2, S[2] - 13, S[2] - 1.6], [pine, keyaki, sakura], 141, 3.2],
    // west of the terminal, on to the rocks
    [[P.LANDING[0] - 2, P.TERMINAL[0] - 1, P.TERMINAL[2] - 4, P.LANDING[2] - 1], [pine, pine, keyaki], 143, 3.0],
    // behind the harbour office and the terminal
    [[P.TERMINAL[0], P.OFFICE[1], P.OFFICE[2] - 5, P.OFFICE[2] - 0.8], [keyaki, sakura, pine], 145, 3.4],
    // between the harbour walk and the rocks, north and south of the bay, and pines along the rocks
    [[-50, HW[0] - 1.6, S[3] + 3.4, BAY[2] - 1.4], [pine, maple, keyaki], 147, 2.6],
    [[-50, HW[0] - 1.6, BAY[3] + 1.4, P.WALK_END - 1], [keyaki, pine, sakura], 149, 2.6],
    [[-55.2, -51.6, -46, -31], [pine], 151, 2.4],
  ])
    yield* belt(p, r, kinds, { seed, pitch });
  yield* planting(p, [-Infinity, P.EAST_END + 6]);
}

// the rocks: the coast kit's wall with its rocks and surf at the harbour's water level, its planted strip behind;
// the station's coast walk's pines where it shows
function* rocks(root) {
  const near = (x, z) => z < -14;
  yield* coastSteps(root, {
    at: (x, z) => [x, z],
    sea: P.SEA_Y,
    clip: near,
    data: {
      coast: [
        { line: ROCKS_NW.filter(([x]) => x > -140), plant: true },
        { line: [...ROCKS_SE, ...WEST_COAST.filter(([, z]) => z < -10)], plant: true },
      ],
      trees: WEST_TREES.filter(([, , z]) => z < -14),
      paved: [
        [P.YARD[0], P.YARD[2], P.YARD[1], P.YARD[3]],
        [P.YARD[1], S[2], P.EAST_END, S[3]],
      ],
    },
  });
}

// c: cells (dorm-court/cells.js); lights: a lightSet; signRoot: the group the finger signs' boards go in; coastRoot:
// where the coast kit's meshes go
export function* groundsSteps(c, lights, signRoot, coastRoot) {
  yield* street(c.paver, c.parts, lights, signRoot);
  yield* harbourWalk(c.paver, c.parts, lights);
  yield* landing(c.parts, lights, signRoot);
  yield* trees(c.parts);
  yield* rocks(coastRoot);
}
