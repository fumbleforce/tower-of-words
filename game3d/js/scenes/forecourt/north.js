// The forecourt's north edge (scenes/forecourt.js), what the court sees beyond its north bed, built from the plan
// (forecourt/plan.js) with the outdoor kit (scenes/outdoor/). Backdrop only: nobody walks here on day 1.
//
//   the shed street: north from the court's north-west corner, up the platform shed's east side, laid like the lane
//   (outdoor/lane.js), a verge and an avenue on each side. Where it leaves the court, a soldier band across it; a
//   few steps up, three bollards with yellow-and-black chains between them close it (he can walk up to them).
//   the cross street: east off the shed street at a square junction, behind the wing and the tower, to office_e1's
//   door. A verge and avenue on its north side, a grove of trees in the lawn beyond; on its south side the wing's
//   hedge, then a pale pavement along the tower's back with the refuse store's collection doors and the tower's
//   rear door on it.
//   the wing: head office's lower wing on its plot between the shed street and the service yard (outdoor/block.js),
//   its staff door under a porch on the west face, on a path from the shed street beyond the chains; a service door
//   into the yard; lawn and a clipped hedge in front of its south face, which is what the court sees; a roofed rack
//   of staff bikes on the lawn behind it.
//   office_e1: the same kind of block, its door closing the cross street's axis.
//   the tower's wall along the service yard: windows and a vent (towerYardWall).
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { kerb } from '../outdoor/edges.js';
import { laneField, verge, LANE_BORDER } from '../outdoor/lane.js';
import { keyaki, sakura, ginkgo, cluster, hedge, bed, gravel, treePit } from '../outdoor/planting.js';
import { lamps, bollard, STEEL } from '../outdoor/furniture.js';
import { blockSets, buildBlockSets, officeBlock, doorAt, BLOCK } from '../outdoor/block.js';
import { BUILDINGS } from '../island-layout.js';
import { TOWN } from '../town.js';
import { bikeRow } from './details.js';
import * as P from './plan.js';

const { HZ, TE, TN, SERVICE, WING, E1, CROSS, SHED_ST: SH, JUNCTION: J, WING_PLOT, BARRIER_Z } = P;
const layoutOf = (id) => BUILDINGS.find((b) => b.id === id);
const WING_DOOR = doorAt(WING, 'w', (WING[2] + WING[3]) / 2), // its middle bay, past the chains
  YARD_DOOR = doorAt(WING, 'e', WING[2] + 1.2);
const PATH = [SH[1], WING[0], WING_DOOR.at - 0.8, WING_DOOR.at + 0.8]; // the staff door's path, 1.6 wide
const AV = 4; // the avenues' pitch, as on the lane
// the staff bike shelter behind the wing, and its path from the shed street
const SHELTER = [WING[0] + 0.6, WING[1] - 0.6, WING[2] - 1.7, WING[2] - 0.4];
const SHELTER_PATH = [SH[1], SHELTER[0] - 0.1, SHELTER[2] + 0.05, SHELTER[3] - 0.05];
const REAR_X = (SERVICE[1] + TE) / 2 + 2.5; // the tower's rear door

function paving(root) {
  const pv = paver();
  const BW = LANE_BORDER;
  // the shed street, either side of the junction; a soldier band across its mouth on the court's north edge
  laneField(pv, [SH[0], SH[1], J[3], HZ - 0.3], { along: 'z', origin: [SH[0], HZ] });
  laneField(pv, [SH[0], SH[1], SH[2], J[2]], { along: 'z', origin: [SH[0], HZ] });
  pv.field([SH[0], SH[1], HZ - 0.3, HZ], { pattern: 'grid', module: [0.15, 0.3], tones: GRANITE.edge, h: 0.007 });
  // the junction: a square of pale granite as wide as the streets, its border run on from theirs
  pv.field([J[0] + BW, J[1], J[2] + BW, J[3] - BW], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale });
  pv.border([J[0], J[0] + BW, J[2], J[3]], { w: BW, sides: 'w' });
  pv.border([J[0] + BW, J[1], J[2], J[3]], { w: BW, sides: 'ns' });
  // the cross street, to a band of pale stone at office_e1's step
  laneField(pv, [J[1], CROSS[1] - 0.9, CROSS[2], CROSS[3]], { origin: [J[1], CROSS[2]] });
  pv.field([CROSS[1] - 0.9, CROSS[1], CROSS[2], CROSS[3]], {
    pattern: 'grid',
    module: [0.3, 0.6],
    tones: GRANITE.edge,
  });
  // the staff door's path, pale like the court, a soldier course at the street
  pv.field([PATH[0] + 0.3, PATH[1], PATH[2], PATH[3]], { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.pale });
  pv.border([PATH[0], PATH[0] + 0.3, PATH[2], PATH[3]], { w: 0.3, sides: 'w' });
  // the bike shelter's floor and its path from the shed street, the same stone
  pv.field([SHELTER_PATH[0] + 0.3, SHELTER[1], SHELTER[2], SHELTER[3]], {
    pattern: 'bond',
    module: [0.6, 0.3],
    tones: GRANITE.pale,
  });
  pv.border([SHELTER_PATH[0], SHELTER_PATH[0] + 0.3, SHELTER[2], SHELTER[3]], { w: 0.3, sides: 'w' });
  // the tower's back pavement, from the service yard's end to the tower's north-east corner
  pv.field([SERVICE[0], TE, CROSS[3], TN], {
    pattern: 'bond',
    module: [0.9, 0.45],
    tones: GRANITE.pale,
    origin: [0, TN],
  });
  pv.build(root);
}

// trees along an edge at the avenue's pitch, from a to b (one axis), keeping clear of the given [from, to] spans
const pitch = (a, b, skip = []) => {
  const out = [];
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  for (let t = lo + AV / 2; t < hi - 1; t += AV)
    if (!skip.some(([s0, s1]) => t > s0 - 1.2 && t < s1 + 1.2)) out.push(t);
  return out;
};

const between = (ts) =>
  ts
    .slice(0, -1)
    .map((t, i) => (t + ts[i + 1]) / 2)
    .filter((_, i) => i % 2 === 0);

// p: what the court's cameras see, casting shadows; q: further out, behind the wing and the tower, without
function streets(p, q, set) {
  const ways = [
    [PATH[2], PATH[3]],
    [SHELTER[2], SHELTER[3]],
  ];
  // the shed street: west verge the whole way; on the east, the wing's plot (with the ways through to the staff
  // door and the bike shelter) and north of the junction
  verge(p, [SH[0], HZ], [SH[0], SH[2]], 'w', { trees: pitch(SH[2], HZ - 0.6), seed: 3 });
  verge(p, [SH[1], HZ], [SH[1], J[3]], 'e', { crossings: ways, trees: pitch(J[3], HZ - 0.6, ways), seed: 5 });
  verge(q, [SH[1], J[2]], [SH[1], SH[2]], 'e', { trees: pitch(SH[2], J[2]), seed: 7 });
  // the cross street: an avenue on the north verge; on the south the wing's hedge, then along the tower's pavement
  // ginkgos in tree pits at the same pitch, clear of the doors
  const xs = pitch(J[1], CROSS[1] - 1.5);
  verge(q, [J[1], CROSS[2]], [CROSS[1] - 0.9, CROSS[2]], 'n', { trees: xs, seed: 9 });
  verge(q, [J[1], CROSS[3]], [SERVICE[0], CROSS[3]], 's', { seed: 11 });
  kerb(q, [SERVICE[0], CROSS[3]], [CROSS[1], CROSS[3]], { off: 0.08 });
  const doors = [
    [SERVICE[0], SERVICE[1] - 1.2],
    [REAR_X - 1.4, REAR_X + 1.4],
  ];
  for (const x of xs.filter((x) => x > SERVICE[0] + 0.6 && x < TE - 0.6 && !doors.some(([a, b]) => x > a && x < b))) {
    treePit(q, x, CROSS[3] + 0.6, { s: 0.9 });
    ginkgo(q, x, CROSS[3] + 0.6, 0.95, Math.round(x)); // narrow, clear of the tower's wall
  }
  // lamps on the verges' front edges, between trees, every other gap; on the cross street both sides, staggered
  const gaps = between(xs);
  const pts = [
    ...between(pitch(SH[2], HZ - 0.6)).map((z) => [SH[0] - 0.35, z]),
    ...gaps.map((x) => [x, CROSS[2] - 0.35]),
  ];
  lamps(set, p, pts, { kind: 'post' });
  const south = xs
    .slice(1, -1)
    .map((t, i) => (t + xs[i + 2]) / 2)
    .filter((x, i) => i % 2 === 0 && x > SERVICE[0] && x < TE && !doors.some(([a, b]) => x > a - 0.3 && x < b + 0.3));
  lamps(
    set,
    q,
    south.map((x) => [x, CROSS[3] + 0.3]),
    { kind: 'post' },
  );
}

// where the shed street is closed: three bollards across it with a hanging chain between each two, in yellow and
// black links as on any Japanese site barrier
function barrier(p) {
  const z = BARRIER_Z,
    xs = [SH[0] + 0.55, (SH[0] + SH[1]) / 2, SH[1] - 0.55];
  for (const x of xs) bollard(p, x, z);
  for (let i = 0; i + 1 < xs.length; i++) {
    const [a, b] = [xs[i], xs[i + 1]],
      n = 7;
    for (let k = 0; k < n; k++) {
      const t0 = k / n,
        t1 = (k + 1) / n,
        sag = (t) => 0.4 - 0.16 * Math.sin(Math.PI * t);
      const [x0, y0, x1, y1] = [a + (b - a) * t0, sag(t0), a + (b - a) * t1, sag(t1)];
      const L = Math.hypot(x1 - x0, y1 - y0);
      p.geo(
        k % 2 ? '#2f3238' : '#d8b83c',
        new THREE.BoxGeometry(L, 0.04, 0.04)
          .rotateZ(Math.atan2(y1 - y0, x1 - x0))
          .translate((x0 + x1) / 2, (y0 + y1) / 2, z),
        { cast: false },
      );
    }
  }
}

// the wing's grounds: a gravel drip strip at the foot of its south face behind a low clipped hedge, and lawn from
// there to the court's bed; a hedge along the west face either side of the staff door. Its back hedge is the cross
// street's south verge.
function wingGrounds(p) {
  const [x0, x1] = [WING[0] - 0.3, WING_PLOT[1] - 0.1],
    z = WING[3] + 0.45;
  gravel(p, [x0, x1, WING[3], z], { y: 0.02 });
  kerb(p, [x0, z], [x1, z], { off: 0.08, h: 0.06 });
  hedge(p, [x0 + 0.2, z + 0.4], [x1 - 0.2, z + 0.4], { w: 0.45, h: 0.5, seed: 12 });
  for (const [z0, z1] of [
    [WING[2] + 0.2, PATH[2] - 0.15],
    [PATH[3] + 0.15, WING[3] + 0.45],
  ])
    if (z1 - z0 > 0.6) hedge(p, [WING[0] - 0.4, z0], [WING[0] - 0.4, z1], { w: 0.42, h: 0.5, seed: 4 });
}

// the staff bike shelter on the lawn behind the wing: a flat roof on posts over a row of parked bikes, its open side
// to the wing, square to the cross street's hedge
function bikeShelter(root, p) {
  const [x0, x1, z0, z1] = SHELTER,
    z = (z0 + z1) / 2;
  for (const x of [x0, (x0 + x1) / 2, x1]) p.box(STEEL.dark, 0.07, 1.6, 0.07, x, 0, z0 + 0.05);
  p.box(BLOCK.canopy, x1 - x0 + 0.3, 0.07, z1 - z0 + 0.1, (x0 + x1) / 2, 1.6, z);
  p.box(BLOCK.fascia, x1 - x0 + 0.3, 0.125, 0.05, (x0 + x1) / 2, 1.55, z1 + 0.05); // a 5 mm lip over the canopy's top
  const n = Math.floor((x1 - x0) / 0.55);
  const row = bikeRow(n, { gaps: [...Array(n).keys()].filter((i) => i % 2), seed: 6 }); // every other place taken
  row.position.set(x0 + 0.3, 0, z); // the row runs along x, the bikes across it, under the roof
  root.add(row);
}

// the tower's ground floor along the service yard, the wall the court sees past the yard's gate (on a phone, the
// top left of the first frames): three windows in pale frames with a mullion, lit after work, and a louvred vent
function towerYardWall({ p, lit }) {
  const X = SERVICE[1],
    Z = HZ;
  for (const z of [Z - 1.4, Z - 3.2, Z - 5.0]) {
    p.box(STEEL.pale, 0.05, 1.12, 1.56, X - 0.025, 0.86, z);
    p.box('#a7b6c4', 0.04, 1.0, 1.44, X - 0.05, 0.92, z, { cast: false });
    lit.box(BLOCK.lit, 0.02, 1.0, 1.44, X - 0.075, 0.92, z, { cast: false });
    p.box(STEEL.mid, 0.05, 1.0, 0.04, X - 0.09, 0.92, z, { cast: false }); // the mullion
    p.box(STEEL.pale, 0.08, 0.05, 1.62, X - 0.04, 0.84, z); // the sill
  }
  p.box(STEEL.pale, 0.05, 0.7, 1.0, X - 0.025, 1.2, Z - 6.8);
  for (let y = 1.27; y < 1.85; y += 0.1) p.box(STEEL.mid, 0.07, 0.03, 0.92, X - 0.045, y, Z - 6.8, { cast: false });
}

// behind the tower: the refuse store's collection doors in its back wall (forecourt/service.js), and the tower's
// rear door with its canopy and plate, both on the pavement
function towerBack(p) {
  const zb = TN; // the store's back wall and the tower's north face
  const [a, b] = [SERVICE[0] + 0.4, SERVICE[1] - 1.4];
  p.box(STEEL.mid, b - a, 1.05, 0.05, (a + b) / 2, 0.05, zb - 0.03);
  p.box(STEEL.dark, 0.04, 1.05, 0.06, (a + b) / 2, 0.05, zb - 0.04);
  for (let y = 0.25; y < 1.05; y += 0.18) p.box(STEEL.pale, b - a - 0.1, 0.03, 0.03, (a + b) / 2, y, zb - 0.06);
  const x = REAR_X;
  p.box(STEEL.dark, 1.5, 2.1, 0.08, x, 0, zb - 0.04);
  p.box(BLOCK.glassLow, 1.3, 1.95, 0.04, x, 0.05, zb - 0.09);
  p.box(BLOCK.canopy, 2.3, 0.1, 1.0, x, 2.3, zb - 0.5);
  p.box(BLOCK.plate, 0.3, 0.25, 0.03, x + 1.05, 1.25, zb - 0.02, { cast: false });
}

// the grove beyond the cross street's avenue: trees in loose groups on the lawn, under them a few shrubs
function grove(p) {
  const z0 = CROSS[2] - 4.5;
  const trees = [
    [keyaki, 1.5, z0 - 1.2, 1.1],
    [sakura, 6.2, z0 - 3.0, 1.0],
    [ginkgo, 11.6, z0 - 1.0, 1.0],
    [keyaki, 16.8, z0 - 2.4, 1.15],
    [ginkgo, 22.6, z0 - 0.8, 0.95],
  ];
  trees.forEach(([tree, x, z, s], i) => tree(p, x, z, s, i + 70));
  for (const [x, z, s] of [
    [3.8, z0 - 0.3, 1],
    [19.6, z0 - 0.4, 2],
  ])
    cluster(p, x, z, { n: 4, r: 0.38, seed: s + 80 });
}

// office_e1 (outdoor/block.js) in the frame of the place that builds it, rect [x0, x1, z0, z1] there: its door in
// the middle of its west face, which is the cross street's axis. The fountain plaza builds it too (plaza/north-lane.js).
export function officeE1(sets, rect) {
  const e1 = layoutOf('office_e1');
  officeBlock(sets, rect, {
    storeys: e1.storeys,
    fh: e1.floorH,
    wall: TOWN.walls[e1.wall],
    doors: [{ face: 'w', at: (rect[2] + rect[3]) / 2, w: 1.3 }],
    seed: 5,
  });
}

// built in slices (js/perf/slice.js): it yields between parts, so the forecourt can build while the gate plays
export function* northSteps(root, set, { closed = true, planting = null } = {}) {
  paving(root);
  yield;
  const p = new Parts({ planting }),
    q = new Parts({ planting });
  streets(p, q, set);
  yield;
  if (closed) barrier(p);
  wingGrounds(p);
  towerBack(q);
  bikeShelter(root, q);
  grove(q);
  bed(q, [TE + 0.1, CROSS[1] - 0.1, CROSS[3] + 0.1, CROSS[3] + 1.1], { y: 0.06 }); // past the tower, to the trees
  yield;
  p.build(root);
  yield;
  // out past the wing nothing the cameras see takes their shadows, so these cast none (the shadow pass's triangles)
  for (const m of q.build(root)) m.castShadow = false;
  yield;
  const sets = blockSets();
  const wing = layoutOf('head_office_wing');
  officeBlock(sets, WING, {
    storeys: wing.storeys,
    fh: wing.floorH,
    wall: TOWN.walls[wing.wall],
    doors: [
      { face: 'w', at: WING_DOOR.at },
      { face: 'e', at: YARD_DOOR.at, porch: false },
    ],
    seed: 2,
  });
  towerYardWall(sets);
  yield;
  officeE1(sets, E1);
  yield;
  return buildBlockSets(sets, root);
}
