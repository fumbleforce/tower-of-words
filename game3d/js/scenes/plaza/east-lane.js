// The east lane past the fountain plaza, to the dorm courtyard's street (the plan is plaza/east-plan.js): backdrop
// for the plaza's east exit and the island map, nothing walkable. Laid with the outdoor kit like the plaza:
//   paving: the lane's jog and the dorm street and the north street in the lane's brick between pale borders, every
//   turn a square of herringbone closed by a border on its outer sides; the walks in pale slabs between soldier
//   borders; kerbs wherever paving meets grass, opened where paths meet
//   the pocket park: a kerbed lawn inside the jog with a clipped hedge round it, opened for its two walks; the walks
//   cross at a gravel square with one big zelkova, four benches facing it and a lamp at two corners; a tree in each
//   lawn quarter
//   the north street's avenue: zelkovas every 4 down its west side in the lane's verge
//   lamps along the streets, beds along block_e1's front, and the nine blocks' fronts (plaza/east-fronts.js)
// The back lane behind the canteen (plaza/north-lane.js) meets the north street from the west, through its verge.
import * as THREE from 'three';
import { paver, GRANITE } from '../outdoor/paving.js';
import { laneField, verge, LANE_BORDER as BW } from '../outdoor/lane.js';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { hedge, keyaki, sakura, ginkgo, pine, mound, grass, bed, LEAF } from '../outdoor/planting.js';
import { drift } from '../forecourt/gardens.js';
import { lamps, bench, fingerSign } from '../outdoor/furniture.js';
import { Parts, rng } from '../outdoor/parts.js';
import { shade } from '../outdoor/shade.js';
import { bikeRow } from '../forecourt/details.js';
import { frontsSteps } from './east-fronts.js';
import { signBoard } from '../plaza-buildings.js';
import { signSet } from '../shop-signs.js';
import { shopFittings } from './east-shops.js';
import { faces, faceAt, tOf } from '../outdoor/block.js';
import { LANE, FOOTPATH } from './plan.js';
import * as E from './east-plan.js';
import { BACK, E2 } from './north-plan.js';

const { CORNERS, WEST_LEG, TOP_LEG, DORM_STREET: DS, NORTH_STREET: NS, CROSS, SOUTH_WALK: SW, PARK, SQUARE } = E;
const ORIGIN = [LANE.e[0], LANE.e[2]]; // the lane's brick pattern runs on from the plaza's
const edge = (pv, rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });

// a turn: herringbone brick, a pale border on its closed sides ('nsew'), each with optional gaps [from, to] (the
// sports chunk turns the north street into the sports lane with it, scenes/sports/grounds.js)
export function corner(pv, [x0, x1, z0, z1], closed, gaps = {}) {
  // the herringbone's own origin: the kit lays it only near its origin
  const brick = { pattern: 'herringbone', module: [0.5, 0.25], tones: GRANITE.brick, vary: 0.08, origin: [x0, z0] };
  pv.field([x0, x1, z0, z1], brick);
  const cut = (a, b, g = []) => {
    const out = [];
    let t = a;
    for (const [g0, g1] of g) (g0 > t && out.push([t, g0]), (t = g1));
    if (b > t) out.push([t, b]);
    return out;
  };
  for (const s of closed) {
    if (s === 'n' || s === 's') {
      const z = s === 'n' ? z0 : z1 - BW;
      for (const [a, b] of cut(x0, x1, gaps[s])) edge(pv, [a, b, z, z + BW], [0.15, BW]);
    } else {
      const x = s === 'w' ? x0 : x1 - BW;
      for (const [a, b] of cut(z0, z1, gaps[s])) edge(pv, [x, x + BW, a, b], [BW, 0.15]);
    }
  }
}
// a tree standing free on the lawn, in its ring of mulch like the avenue's (north-lane.js uses these three too);
// sh: a shade() collector for its laid shadow
export function tree(p, kind, x, z, s, seed, sh = null) {
  kind(p, x, z, s, seed);
  sh?.tree(x, z, s); // its shadow laid on the ground (outdoor/shade.js), out past the sun's shadow box
  p.geo(LEAF.mulch, new THREE.CylinderGeometry(0.55, 0.6, 0.03, 12).translate(x, 0, z), { cast: false, surf: 'soil' });
}
// a walk: pale slabs between soldier borders on its long sides
export function walk(pv, [x0, x1, z0, z1], alongX = x1 - x0 > z1 - z0) {
  pv.field([x0, x1, z0, z1], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [x0, z0] });
  if (alongX) for (const z of [z0, z1 - BW]) edge(pv, [x0, x1, z, z + BW], [0.15, BW]);
  else for (const x of [x0, x1 - BW]) edge(pv, [x, x + BW, z0, z1], [BW, 0.15]);
}

function* ground(root) {
  const pv = paver();
  const ew = [E.PARK_EW[2], E.PARK_EW[3]],
    ns = [E.PARK_NS[0], E.PARK_NS[1]];
  corner(pv, CORNERS.a, 'se', { e: [ew] });
  laneField(pv, WEST_LEG, { along: 'z', origin: ORIGIN });
  yield;
  corner(pv, CORNERS.b, 'nw');
  laneField(pv, TOP_LEG, { origin: ORIGIN });
  yield;
  corner(pv, CORNERS.c, 'ne');
  laneField(pv, DS, { along: 'z', origin: ORIGIN });
  yield;
  edge(pv, [DS[0], DS[1], DS[3] - BW, DS[3]], [0.15, BW]); // the street's end, at the corner of the shop walk
  laneField(pv, [NS[0], NS[1], NS[2], TOP_LEG[2]], { along: 'z', origin: ORIGIN });
  // the dorm courtyard's gate leg, east off the street (the courtyard lays the rest)
  laneField(pv, [DS[1], DS[1] + 3, E.GATE_Z - 1.5, E.GATE_Z + 1.5], { origin: ORIGIN });
  yield;
  // the walks
  walk(pv, [CROSS[0], CROSS[1], CROSS[2], LANE.e[2]]);
  walk(pv, [CROSS[0], CROSS[1], LANE.e[3], CROSS[3]]);
  walk(pv, [CROSS[1], DS[0], SW[2], SW[3]]);
  yield;
  walk(pv, [CORNERS.a[1], SQUARE[0], ew[0], ew[1]]);
  walk(pv, [SQUARE[1], DS[0], ew[0], ew[1]]);
  walk(pv, [ns[0], ns[1], TOP_LEG[3], SQUARE[2]]);
  walk(pv, [ns[0], ns[1], SQUARE[3], SW[2]]);
  yield;
  for (const s of E.SPURS) walk(pv, s, true);
  walk(pv, E.SEAT_BAY, true);
  pv.field(E.BIKE_PAD, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [CROSS[0], E.BIKE_PAD[2]] });
  // the shop street's walk out of the arcade, in the arcade's stone
  const AE = E.ARCADE_END;
  pv.field(AE, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [AE[0], AE[2]] });
  yield;
  pv.build(root);
  yield;
}

function* kerbs(p) {
  const ew = [E.PARK_EW[2], E.PARK_EW[3]],
    ns = [E.PARK_NS[0], E.PARK_NS[1]];
  const vBack = 1.1; // the lane's verge depth
  // the west leg's west side, from the lane's north verge up round corner b; the top leg's north side
  kerb(p, [WEST_LEG[0], LANE.e[2] - vBack], [WEST_LEG[0], CORNERS.b[2]], { off: -0.08 });
  kerb(p, [WEST_LEG[0], TOP_LEG[2]], [CORNERS.c[1], TOP_LEG[2]], { off: -0.08, gaps: [[NS[0], NS[1]]] });
  // the dorm street's east side, open for the courtyard's gate leg, the dorm row and the ramen shop's door; its west
  // side past the south walk, open for the footpath along the shops' backs and the shop walk
  const [e3, r9, ramen, r3] = E.SPURS,
    AE = E.ARCADE_END;
  const gate = [E.GATE_Z - 1.5, E.GATE_Z + 1.5];
  const row = [E.DORM_ROW[2], E.DORM_ROW[3]];
  kerb(p, [DS[1], CORNERS.c[2]], [DS[1], DS[3]], { off: 0.08, gaps: [gate, row, [ramen[2], ramen[3]]] });
  kerb(p, [DS[0], SW[3]], [DS[0], DS[3]], {
    off: -0.08,
    gaps: [
      [FOOTPATH[2], FOOTPATH[3]],
      [AE[2], AE[3]],
    ],
  });
  yield;
  // the north street's east side, open for block_e3's and r9's doors
  kerb(p, [NS[1], NS[2]], [NS[1], TOP_LEG[2]], {
    off: 0.08,
    gaps: [
      [e3[2], e3[3]],
      [r9[2], r9[3]],
      [r3[2], r3[3]],
    ],
  });
  // the shop walk: its south side; its north side between the rows' end, the izakaya and the street
  const iz = E.BLOCKS.find((k) => k.id === 'izakaya').rect;
  kerb(p, [AE[0], AE[3]], [AE[1], AE[3]], { off: -0.08 });
  kerb(p, [AE[0], AE[2]], [AE[1], AE[2]], { off: 0.08, gaps: [[iz[0], iz[1]]] });
  yield;
  // the cross walk, north and south of the lane's verges
  for (const x of [CROSS[0], CROSS[1]]) {
    const o = x === CROSS[0] ? -0.08 : 0.08;
    const bay = x === CROSS[1] ? [[E.SEAT_BAY[2], E.SEAT_BAY[3]]] : []; // open into the seat bay
    kerb(p, [x, CROSS[2]], [x, LANE.e[2] - vBack], { off: o, gaps: bay });
    kerb(p, [x, LANE.e[3] + vBack], [x, x === CROSS[0] ? CROSS[3] : SW[2]], { off: o });
  }
  kerb(p, [CROSS[1], SW[3]], [CROSS[1], CROSS[3]], { off: 0.08 });
  // the south walk: its north side to the park, its south side between the blocks' fronts
  kerb(p, [CROSS[1], SW[2]], [PARK[0], SW[2]], { off: -0.08 });
  kerb(p, [CROSS[1], SW[3]], [DS[0], SW[3]], {
    off: 0.08,
    gaps: E.BLOCKS.filter((k) => Math.abs(k.rect[2] - SW[3]) < 0.01).map((k) => [k.rect[0], k.rect[1]]),
  });
  yield;
  // the door spurs
  for (const s of E.SPURS)
    for (const [z, o] of [
      [s[2], -0.08],
      [s[3], 0.08],
    ])
      kerb(p, [s[0], z], [s[1], z], { off: o });
  // the park and its square, open for the walks
  kerbRect(p, PARK, { gaps: { n: [ns], s: [ns], w: [ew], e: [ew] } });
  kerbRect(p, SQUARE, { gaps: { n: [ns], s: [ns], w: [ew], e: [ew] } });
}

function* park(p, lights, sh) {
  const ew = [E.PARK_EW[2], E.PARK_EW[3]],
    ns = [E.PARK_NS[0], E.PARK_NS[1]];
  const [x0, x1, z0, z1] = PARK,
    i = 0.45; // the hedge's line, in from the kerb
  const runs = [
    [
      [x0 + i, z0 + i],
      [ns[0] - 0.3, z0 + i],
    ],
    [
      [ns[1] + 0.3, z0 + i],
      [x1 - i, z0 + i],
    ],
    [
      [x0 + i, z1 - i],
      [ns[0] - 0.3, z1 - i],
    ],
    [
      [ns[1] + 0.3, z1 - i],
      [x1 - i, z1 - i],
    ],
    [
      [x0 + i, z0 + i],
      [x0 + i, ew[0] - 0.3],
    ],
    [
      [x0 + i, ew[1] + 0.3],
      [x0 + i, z1 - i],
    ],
    [
      [x1 - i, z0 + i],
      [x1 - i, ew[0] - 0.3],
    ],
    [
      [x1 - i, ew[1] + 0.3],
      [x1 - i, z1 - i],
    ],
  ];
  for (const [k, [a, b]] of runs.entries()) {
    hedge(p, a, b, { w: 0.4, h: 0.5, seed: 40 + k });
    if (k % 2) yield;
  }
  // the square: loose pale gravel with stones scattered over it, one big zelkova in the middle, a bench either side
  // of each walk's mouth facing it
  const cx = (SQUARE[0] + SQUARE[1]) / 2,
    cz = (SQUARE[2] + SQUARE[3]) / 2;
  const [gx0, gx1, gz0, gz1] = [SQUARE[0] + 0.08, SQUARE[1] - 0.08, SQUARE[2] + 0.08, SQUARE[3] - 0.08];
  p.box('#a9aaa5', gx1 - gx0, 0.03, gz1 - gz0, cx, -0.01, cz, { cast: false });
  const pebbles = rng(77);
  for (let k = 0; k < 90; k++) {
    const s = 0.04 + pebbles() * 0.05;
    const g = new THREE.DodecahedronGeometry(s, 0).scale(1, 0.45, 1);
    const tone = ['#93948f', '#b7b8b2', '#8a8b86'][k % 3];
    p.geo(tone, g.translate(gx0 + pebbles() * (gx1 - gx0), 0.02, gz0 + pebbles() * (gz1 - gz0)), { cast: false });
    if (k % 30 === 29) yield;
  }
  p.geo(LEAF.mulch, new THREE.CylinderGeometry(0.8, 0.85, 0.04, 14).translate(cx, 0.0, cz), {
    cast: false,
    surf: 'soil',
  });
  keyaki(p, cx, cz, 1.05, 71);
  sh.tree(cx, cz, 1.05);
  yield;
  for (const [x, z, ry] of E.SQUARE_BENCHES) bench(p, x, z, ry, { len: 1.3 });
  lamps(lights, p, E.SQUARE_LAMPS, { pool: 1.6, poolShift: [0, 0] });
  // a small tree in the middle of each lawn quarter, clear of the hedge and the walks: cherries to the north,
  // clipped pines to the south
  const qx = [(x0 + i + ns[0]) / 2, (ns[1] + x1 - i) / 2],
    qz = [(z0 + i + ew[0]) / 2, (ew[1] + z1 - i) / 2];
  yield;
  for (const [a, z] of qz.entries())
    for (const [b, x] of qx.entries()) {
      tree(p, a ? pine : sakura, x, z, a ? 0.8 : 0.7, 60 + a * 2 + b, sh);
      yield;
    }
}

// a bed against a wall or along a walk: kerbed on its open sides, planted with clipped mounds of mixed sizes and
// greens, grass tufts and, if `pineAt` is set, a dwarf pine at that end ('w' or 'e')
export function shrubBed(p, rect, sides, seed, pineAt = null) {
  kerbRect(p, rect, { sides });
  bed(p, rect, { y: 0.06 });
  const q = rng(seed),
    [x0, x1, z0, z1] = rect,
    zc = (z0 + z1) / 2,
    tones = [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light];
  const px = pineAt === 'w' ? x0 + 0.7 : x1 - 0.7;
  for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.55 + q() * 0.5) {
    if (pineAt && Math.abs(x - px) < 0.7) continue;
    if (q() < 0.18) grass(p, x, zc + (q() - 0.5) * 0.3, { seed: seed + Math.round(x * 10) });
    else mound(p, x, zc + (q() - 0.5) * (z1 - z0 - 0.7), 0.2 + q() * 0.18, tones[Math.floor(q() * 4)], { y: 0.06 });
  }
  if (pineAt) pine(p, px, zc, 0.55, seed + 3);
}

// the north street's avenue (z in the plaza's frame): none where the back lane comes in (plaza/north-plan.js) or
// against block_e2's east end, which stands close behind the verge (the sports chunk plants its top too)
export const avenueTrees = () =>
  E.STREET_TREES.filter(
    (z) =>
      ![
        [BACK[2], BACK[3]],
        [E2.rect[2], E2.rect[3]],
      ].some(([a, b]) => z > a - 1.2 && z < b + 1.2),
  );

function* planting(p, lights, sh) {
  // the north street's avenue, open where the back lane comes in
  const back = [[BACK[2], BACK[3]], E.SHRINE_GAP];
  const trees = avenueTrees();
  verge(p, [NS[0], NS[2]], [NS[0], TOP_LEG[2]], 'w', { crossings: back, trees, seed: 21 });
  for (const z of trees) sh.tree(NS[0] - 2.1, z, 1.04);
  yield;
  // block_e1: the bike pad west of its door (its bikes in buildEastLane), a deep bed along its front east of the
  // door, a ginkgo on the lawn between the pad and the lane; a zelkova east of it; a clipped hedge along its back
  // with two trees beyond, toward the canteen
  const [bx0, bx1, bz0, bz1] = E.BLOCKS[0].rect,
    pad = E.BIKE_PAD;
  kerbRect(p, pad, { sides: 'sw' });
  shrubBed(p, [CROSS[1] + 0.16, bx1 - 0.3, bz1, bz1 + 1.4], 'se', 41, 'e');
  tree(p, ginkgo, pad[0] + 0.6, (pad[3] + LANE.e[2] - 1.1) / 2, 1.05, 37, sh);
  tree(p, keyaki, bx1 + 2.4, bz1 - 2.0, 1.05, 60, sh);
  yield;
  hedge(p, [bx0 + 0.4, bz0 - 1.0], [bx1 - 0.4, bz0 - 1.0], { w: 0.6, h: 0.75, seed: 62 });
  tree(p, keyaki, bx0 + 2.4, bz0 - 5.8, 1.15, 63, sh);
  tree(p, sakura, bx0 + 6.8, bz0 - 6.6, 1.0, 64, sh);
  yield;
  // m_e2: a bed either side of its door; a drift down its west side; a cherry and a pine between it and m_e1
  const [me2, me1, r8] = ['m_e2', 'm_e1', 'r8'].map((id) => E.BLOCKS.find((k) => k.id === id).rect);
  shrubBed(p, [me2[0] + 0.3, CROSS[0] - 0.16, me2[2] - 1.1, me2[2]], 'nw', 42, 'w');
  shrubBed(p, [CROSS[1] + 0.16, me2[1] - 0.3, me2[2] - 1.1, me2[2]], 'ne', 43);
  yield;
  drift(p, [me2[0] - 3.2, me2[0] - 0.4, me2[2] + 0.4, FOOTPATH[2] - 0.4], { back: 's', seed: 65 });
  yield;
  tree(p, sakura, (me2[1] + me1[0]) / 2, SW[3] + 2.4, 1.0, 35, sh);
  tree(p, pine, (me2[1] + me1[0]) / 2, me2[2] + 2.6, 1.0, 56, sh);
  yield;
  // behind m_e1 and r8, along the footpath: a drift with its tall layer at the back and a zelkova
  drift(p, [me1[0] + 0.3, DS[0] - 0.6, r8[3] + 0.5, FOOTPATH[2] - 0.4], { back: 's', seed: 55 });
  yield;
  tree(p, keyaki, me1[1] + 0.3, r8[3] + 1.2, 1.05, 57, sh);
  yield;
  // the lawn south of the shop walk's east end: a hedge along the walk, two cherries behind it; the dorm street
  // ends at a bed across it
  const AE = E.ARCADE_END;
  hedge(p, [AE[0] + 0.4, AE[3] + 0.45], [AE[1] - 0.4, AE[3] + 0.45], { w: 0.5, h: 0.6, seed: 58 });
  tree(p, sakura, AE[0] + 2.2, AE[3] + 2.4, 1.0, 59, sh);
  tree(p, sakura, AE[1] - 2.0, AE[3] + 2.8, 0.95, 67, sh);
  yield;
  shrubBed(p, [DS[0], DS[1], DS[3], DS[3] + 1.3], 'sew', 44, 'e');
  yield;
  // lamps: down the dorm street's west side and the north street's east side every 8; by the cross walk at the
  // bike pad (the lane's own lamp by its south mouth is the plaza's)
  lamps(lights, p, E.STREET_LAMPS, { pool: 1.4 });
  lamps(lights, p, [[pad[1] - 0.3, pad[3] - 0.3]], { pool: 1.8, poolShift: [0.6, 0] }); // on the pad's corner
  // a bay off the cross walk, east of it in front of the bed: paved, a bench looking down the walk to the lane
  kerbRect(p, E.SEAT_BAY, { sides: 'nse' });
  bench(p, E.SEAT_BAY[0] + 1.4, E.SEAT_BAY[2] + 0.45, 0, { len: 1.5 });
  // and the lane's lamps carried on to the jog: one more on its south edge, lighting the lane like the plaza's
  lamps(lights, p, [[LANE.e[1] + 0.6, LANE.e[3] + 0.35]], { pool: 1.7, poolShift: [0, -0.9] });
}

// builds it all into the plaza: p, the plaza's Parts collector; lights, its light set. Returns the evening switch.
// A generator that yields between parts (every few trees, every face and roof), for building in slices
// (js/perf/slice.js).
// Almost all of it lies outside the sun's shadow box (scenes/plaza.js), so it goes into its own collector that casts
// no shadow (no shadow-pass triangles); only the walls of the blocks inside the box cast, through the plaza's p. The
// rest get their shadows laid on the ground (outdoor/shade.js); update(sun) keeps them on the sun's side.
const SHADOW_X = 22; // the shadow box's east edge, in the plaza's frame
export function* eastLaneSteps(root, p, lights) {
  const q = new Parts();
  yield* ground(root);
  yield* kerbs(q);
  const sh = shade();
  yield* park(q, lights, sh);
  yield* planting(q, lights, sh);
  const bikes = bikeRow(5, { gaps: [1, 3], seed: 9 }); // the rack against block_e1's front, the bikes facing the lane
  bikes.rotation.y = Math.PI;
  bikes.position.set(E.BIKE_PAD[1] - 0.6, 0, E.BIKE_PAD[2] + 0.75);
  root.add(bikes);
  yield;
  const fronts = yield* frontsSteps(q, lights, E.BLOCKS, { caster: p, casts: (k) => k.rect[0] < SHADOW_X });
  fronts.meshes(root);
  yield;
  // a block's sign standing on its door canopy's front edge, as the canteen's (k.sign: [kana, English])
  for (const k of E.BLOCKS.filter((b) => b.sign)) {
    const F = faces(k.rect)[k.face],
      [x, z] = faceAt(F, tOf(F, k.at), 1.08);
    const s = signBoard(k.sign[0], k.sign[1], 2.4, 0.6, '#44535f');
    s.position.set(x, 2.72, z);
    s.rotation.y = Math.atan2(F.n[0], F.n[1]);
    root.add(s);
  }
  for (const k of E.BLOCKS) if (k.rect[0] >= SHADOW_X) sh.block(k.rect, k.row.storeys * k.row.floorH);
  // the named shops' signs and shut doors (plaza/east-shops.js), Amakawa Travel's too (its block is the back lane's,
  // plaza/north-lane.js); a finger sign at the south walk's start pointing along it to the shop street
  const signs = signSet();
  shopFittings(q, signs, [...E.BLOCKS, E2]);
  const shopSigns = signs.build(root);
  fingerSign(root, q, ...E.FINGER, [{ text: 'Shop street', sub: '商店街', dir: 1 }]);
  yield;
  for (const m of q.build(root)) m.castShadow = false;
  yield;
  const shadows = sh.build(root);
  return {
    evening() {
      fronts.evening();
      shopSigns.evening();
    },
    cards: (day, period) => shopSigns.show(day, period), // the shops' door cards (shop-signs.js WHEN)
    update: (sun) => shadows.follow(sun.position),
  };
}
