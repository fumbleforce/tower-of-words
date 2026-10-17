// The dorm quarter's ground (the plan is dorm-quarter/plan.js), in the island frame:
//   the promenade and the dorm row: the lane's brick between pale borders, as the plaza lane they carry on
//   the walks: pale slabs between soldier borders; the park's loop walk and its links in a warmer, smaller stone;
//   the allotments' walks in square flags; the beach promenade in long pale slabs in bond, a band of mid stone along the
//   sea wall; the plaza, the fitness corner and the pergola's floor in mid stone; the cherry's round in a pale square
//   the edges: one granite kerb wherever paving meets lawn (movement/walk-ground.js, outdoor/walk-edges.js), none
//   where it meets a wall, a building, the pond, the sea or the next place's paving
//   the lawn under it all, cut round the pond, the beach and the sea
// A host place that lays some of this itself passes `own`: rects it lays, which this leaves out (the dorm courtyard
// lays the promenade along its front, the east lane the promenade's first stretch off the dorm street).
import { GRANITE } from '../outdoor/paving.js';
import { laneField } from '../outdoor/lane.js';
import { walk } from '../plaza/east-lane.js';
import { walkGround } from '../../movement/walk-ground.js';
import { walkEdges } from '../outdoor/walk-edges.js';
import * as THREE from 'three';
import { groundPatches, TOWN } from '../town.js';
import { mat } from '../../props.js';
import { BATH_COAST } from '../island-baths.js';
import * as Q from './plan.js';
import { LAID_WALKS, GRAVEL, PARK_WALKS, PADS, RING_PAD, PAVED } from './fittings.js';

export { PAVED };

const BW = 0.25;
const edgeField = (pv, rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });
const LANE_ORIGIN = [Q.DORM_STREET[0], Q.PROM[2]];

// what shows where walking ends without a kerb: the blocks and the common room, the courtyard's front and Eric's
// block (dorm_court's), the pond, the sea wall and the sea past it, the gardens' hedges
const barrier = (kind) => (rect) => ({ kind, rect });
export const BARRIERS = [
  ...Q.BLOCKS.map((k) => k.rect).map(barrier('building')),
  barrier('building')(Q.COMMONS),
  barrier('building')(Q.SHED),
  barrier('wall')([Q.COURT_FRONT_X, 105.8, Q.PROM[3], 3.75]), // the courtyard's front bed and garden wall, Eric's block
  barrier('wall')(Q.POND),
  barrier('wall')([Q.WALL[0], 140, -60, 20]), // the sea wall and the sea
  ...Q.GARDENS.map((g) => g.rect).map(barrier('wall')), // the flats' gardens behind their hedges
];
// the next places' paving the quarter's walks run into: no kerb across the joins
const BOUNDS = [70, 140, -62, 32];
export const TOP_MOUTH = [70, Q.DORM_STREET[0], Q.PROM[2], Q.PROM[3]]; // the east lane's top leg, into the dorm street
const NEIGHBOURS = [Q.DORM_STREET, TOP_MOUTH, Q.COURTS, [102, 104, -80, -58.5]];

const dropIn = (rects) => (x, z) => rects.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

// pv, p: the paver and the Parts collector (dorm-court/cells.js cells); own: the rects the host lays itself; theirs:
// the neighbours' paving (NEIGHBOURS) the host lays and kerbs itself (the east lane's dorm street)
export function* groundSteps(pv, p, { own = [], theirs = [], flat = false } = {}) {
  const mine = dropIn(own);
  if (flat) {
    // seen from far off: each path a plain pale strip, no stones or kerbs (a hair over the lawn)
    for (const r of PAVED) {
      if (mine((r[0] + r[1]) / 2, (r[2] + r[3]) / 2)) continue;
      p.box(GRANITE.pale[0], r[1] - r[0], 0.008, r[3] - r[2], (r[0] + r[1]) / 2, 0, (r[2] + r[3]) / 2, { cast: false });
    }
    yield;
    return;
  }
  // a paver that leaves out the host's own: a field is cut where it runs into one along its length
  const field = (r, lay) => {
    const cuts = own
      .filter(([x0, x1, z0, z1]) => x1 > r[0] && x0 < r[1] && z1 > r[2] && z0 < r[3])
      .map(([x0, x1]) => [Math.max(x0, r[0]), Math.min(x1, r[1])])
      .sort((a, b) => a[0] - b[0]);
    let x = r[0];
    for (const [c0, c1] of [...cuts, [r[1], r[1]]]) {
      if (c0 - x > 0.05) lay([x, c0, r[2], r[3]]);
      x = Math.max(x, c1);
    }
  };
  // the promenade and the row in the lane's brick
  field(Q.PROM, (r) => laneField(pv, r, { origin: LANE_ORIGIN }));
  field(Q.ROW, (r) => laneField(pv, r, { origin: [Q.DORM_STREET[0], Q.ROW[2]] }));
  yield;
  // the walks; where one crosses the promenade or the row it stops at the lane's edge
  for (const r of LAID_WALKS) if (!mine((r[0] + r[1]) / 2, (r[2] + r[3]) / 2)) walk(pv, r);
  yield;
  // the park's walks: small warm-grey setts in bond, no borders, so the loop reads as a garden path
  for (const r of PARK_WALKS)
    pv.field(r, {
      pattern: r[1] - r[0] > r[3] - r[2] ? 'bond' : 'bondZ',
      module: [0.4, 0.2],
      tones: GRANITE.brick,
      vary: 0.06,
      origin: [Q.LOOP[0], Q.LOOP[2]],
    });
  // the cherry's round: pale slabs in a border
  pv.field(RING_PAD, { pattern: 'grid', module: [0.5, 0.5], tones: GRANITE.pale, origin: [RING_PAD[0], RING_PAD[2]] });
  for (const z of [RING_PAD[2], RING_PAD[3] - BW]) edgeField(pv, [RING_PAD[0], RING_PAD[1], z, z + BW], [0.15, BW]);
  for (const x of [RING_PAD[0], RING_PAD[1] - BW])
    edgeField(pv, [x, x + BW, RING_PAD[2] + BW, RING_PAD[3] - BW], [BW, 0.15]);
  // the plaza, the fitness corner, the pergola's floor
  for (const r of PADS) pv.field(r, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.mid, origin: [r[0], r[2]] });
  yield;
  // the beach promenade: long pale slabs in bond, a band of mid stone along the wall with a dark course on its inner
  // edge, a pale course at the coping
  const [bx0, bx1, bz0, bz1] = Q.BEACH_PROM,
    band = bx1 - 1.1;
  pv.field([bx0, band - 0.15, bz0, bz1], {
    pattern: 'bondZ',
    module: [1.2, 0.6],
    tones: [GRANITE.pale[0], GRANITE.pale[2]],
    vary: 0.015,
    origin: [bx0, 0],
  });
  pv.field([band - 0.15, band, bz0, bz1], { pattern: 'grid', module: [0.15, 0.3], tones: GRANITE.dark, h: 0.007 });
  pv.field([band, bx1, bz0, bz1], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [band, 0] });
  // a band of dark stone across the promenade at each set of steps and at the plaza's mouth
  for (const s of Q.STEPS)
    pv.field([bx0, band - 0.15, s[2], s[3]], {
      pattern: 'bond',
      module: [0.6, 0.3],
      tones: GRANITE.mid,
      origin: [bx0, s[2]],
      h: 0.009,
    });
  yield;
  // the allotments' walks: square flags of mid stone, no borders, a lesser path than the gardens' own
  for (const r of GRAVEL)
    pv.field(r, { pattern: 'grid', module: [0.8, 0.8], tones: GRANITE.mid, vary: 0.04, origin: [r[0], r[2]] });
  // the edges, from the one outline of everything paved
  const ground = walkGround({
    walk: PAVED,
    backdrop: NEIGHBOURS,
    barriers: BARRIERS,
    bounds: BOUNDS,
  });
  // none inside the host's own ground, nor along the outline of a neighbour's paving the host kerbs itself
  const onEdge = (x, z) =>
    theirs.some(
      ([x0, x1, z0, z1]) =>
        ((Math.abs(x - x0) < 0.01 || Math.abs(x - x1) < 0.01) && z >= z0 && z <= z1) ||
        ((Math.abs(z - z0) < 0.01 || Math.abs(z - z1) < 0.01) && x >= x0 && x <= x1),
    );
  ground.edges = ground.edges.filter((e) => {
    const [x, z] = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2];
    return !mine(x, z) && !onEdge(x, z) && x > BOUNDS[0] + 0.01; // and none across the lane where the quarter's ground ends
  });
  walkEdges(p, ground);
  yield;
}

// the lawn under the quarter, a little over the island's own ground (which the skyline lays lower), cut round the
// pond and short of the coast; one mesh. own: rects the host lays its own ground in
export function lawn(group, { own = [] } = {}) {
  const [px0, px1, pz0, pz1] = Q.POND,
    W = Q.DORM_STREET[1],
    E = Q.EDGE[1]; // the beach promenade's land side: past it the promenade and the wall lay their own
  const rects = [
    [W, E, Q.SEA_GARDEN[3], pz0],
    [W, Q.SEA_GARDEN[0] + 3.8, -56.3, Q.SEA_GARDEN[3]],
    [W, px0, pz0, pz1],
    [px1, E, pz0, pz1],
    [W, E, pz1, 19.4],
    [W, 117, 19.4, 27], // short of the coast as it runs in south-west (plan.js COAST_LINE)
    [W, 110, 27, 31],
  ];
  const cut = [];
  for (const r of rects) {
    let pieces = [r];
    for (const o of own)
      pieces = pieces.flatMap(([x0, x1, z0, z1]) => {
        if (o[1] <= x0 || o[0] >= x1 || o[3] <= z0 || o[2] >= z1) return [[x0, x1, z0, z1]];
        return [
          [x0, o[0], z0, z1],
          [o[1], x1, z0, z1],
          [Math.max(x0, o[0]), Math.min(x1, o[1]), z0, o[2]],
          [Math.max(x0, o[0]), Math.min(x1, o[1]), o[3], z1],
        ].filter(([a, b, c, d]) => b - a > 0.01 && d - c > 0.01);
      });
    cut.push(...pieces);
  }
  groundPatches(
    group,
    cut.map(([x0, x1, z0, z1]) => [x0, x1, z0, z1, TOWN.grass]),
    -0.012,
  );
  // the sea garden's east part, out along the wall's line and in under its coping, so no lawn shows past the rail
  const x0 = Q.SEA_GARDEN[0] + 3.8,
    [, , zN, zS] = Q.SEA_GARDEN,
    inset = 0.15,
    wall = [[Q.SEA_X, zS], ...Q.COAST_LINE.slice(4), BATH_COAST[0], BATH_COAST[1]];
  const at = (z) => {
    for (let i = 0; i + 1 < wall.length; i++) {
      const [[ax, az], [bx, bz]] = [wall[i], wall[i + 1]];
      if (z <= az && z >= bz) return ax + ((bx - ax) * (az - z)) / (az - bz) - inset;
    }
    return wall[wall.length - 1][0];
  };
  const shape = new THREE.Shape();
  shape.moveTo(x0, -zS);
  for (const z of [
    zS,
    ...wall
      .slice(1, -1)
      .map(([, wz]) => wz)
      .filter((wz) => wz > zN),
    zN,
  ])
    shape.lineTo(at(z), -z);
  shape.lineTo(x0, -zN);
  const sea = new THREE.Mesh(
    new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, -0.002, 0),
    mat(TOWN.grass, { roughness: 0.9 }),
  );
  sea.receiveShadow = true;
  sea.userData.surf = 'grass';
  group.add(sea);
}
