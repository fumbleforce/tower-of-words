// The harbour's plan (scenes/harbour.js): the walkable ground from the office street's west end to the supply yard,
// the ferry landing and the two piers, and down the harbour walk (docs/game/island.md, "Harbour"), from the layout's
// paths (scenes/island-harbour.js, island-offices.js). Everything is laid out in the island frame (x east, z south)
// and moved into the chunk's own by pt() and rect(); the chunk is not turned, its origin is the quay's corner where
// the ferry landing meets the supply yard.
//
//   the office street's west end: from in front of Amakawa Trading (where the office quarter takes over) west past
//   the harbour walk's mouth and the works street's to the yard; the works street's mouth walked a few steps north,
//   where the works take over (works/plan.js)
//   the harbour walk: south from the street inland of the rocks, a bay with benches looking out to sea halfway, to a
//   row of bollards where it meets the coast walk (which goes on south to the station, not walked yet)
//   the supply yard: concrete, quays on its west and south sides; the warehouse on its north side, its roller doors
//   to the yard; containers in blocks; the crane and the foreman's hut by the supply pier's root; a painted footway
//   across it from the street to the landing; the harbour office's door on its north edge, and the works lane's
//   mouth beside it, walked a few steps north, where the works take over
//   the supply pier: south off the yard's south quay, the freighter moored along its west face
//   the ferry landing: west of the yard, the terminal's front on its north side; the ferry pier south off its
//   south-west corner, the ferry moored along its west face
import * as LAYOUT from '../island-layout.js';
import { faces, faceAt, tOf, bayOf } from '../outdoor/block-face.js';
import * as O from '../office-quarter/plan.js';
import * as W from '../works/plan.js';

export const CHUNK = 'harbour';
const AT = LAYOUT.CHUNKS[CHUNK].at;
// the island frame to the chunk's: a point, a rect [x0, x1, z0, z1]
export const pt = ([x, z]) => [x - AT[0], z - AT[1]];
export const rect = ([x0, x1, z0, z1]) => [x0 - AT[0], x1 - AT[0], z0 - AT[1], z1 - AT[1]];
export const { inRect } = O;
const mid = (a, b) => (a + b) / 2;
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];
const path = (id) => box(LAYOUT.PATHS.find((p) => p.id === id).rect);
const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);

export const SEA_Y = -0.9; // the water in the harbour, the quays' tops being y 0
export const STREET = O.STREET;
export const HW = path('harbour_walk');
export const YARD = path('supply_yard');
export const LANDING = path('ferry_landing');
export const FERRY_PIER = path('ferry_pier');
export const SUPPLY_PIER = path('supply_pier');
export const WORKS_LANE = path('works_lane');
export const WORKS_STREET = path('works_street');
export const TERMINAL = box(building('ferry_terminal').rect);
export const OFFICE = box(building('works_orange').rect);
export const SHED = box(building('dock_shed').rect);
export const HUT = box(building('dock_hut').rect);
export const SZ = mid(STREET[2], STREET[3]);

export const EAST_END = O.HARBOUR_ARRIVE + 0.3; // the street is walked west from here; the office quarter's beyond
export const WALK_END = HW[3] - 2; // the harbour walk is walked south to here; bollards across it
export const LANE_END = W.LANE_SEAM - 0.3; // the works lane's mouth is walked this far north; the works' beyond
export const STREET_TOP = W.STREET_SEAM - 0.2; // the works street's mouth this far north; the works' beyond
export const EDGE = 0.4; // how far from a quay's edge he can walk
// the bay off the harbour walk's sea side, halfway down: two benches looking west over the rocks
export const BAY = [HW[0] - 2.2, HW[0], -42.4, -38.4];

// the buildings with a door on the yard or the landing: the face it is on and where along it, snapped to a bay of
// the block's ground floor (as the office row's, office-quarter/plan.js); the name on the canopy [kana, English,
// colour]; the thing id is the place id
const FRONT_LIST = [
  {
    id: 'ferry_terminal',
    place: 'ferry_terminal',
    face: 's',
    at: -112,
    sign: ['フェリーのりば', 'FERRY TERMINAL', '#2f5568'],
    wall: '#c9c8c1',
  },
  {
    id: 'works_orange',
    place: 'harbour_office',
    face: 's',
    at: -93,
    sign: ['みなとじむしょ', 'HARBOUR OFFICE', '#3d4f63'],
    wall: '#8a8f96',
  },
];
export const FRONTS = FRONT_LIST.map((k, i) => {
  const b = building(k.id),
    r = box(b.rect),
    F = faces(r)[k.face],
    bw = bayOf(F.L),
    n = Math.round(F.L / bw),
    t = (Math.min(n - 1, Math.max(0, Math.floor(tOf(F, k.at) / bw))) + 0.5) * bw;
  const [dx, dz] = faceAt(F, t, 0);
  return { ...k, rect: r, row: b, seed: 60 + i, t, w: bw - 0.36, door: [dx, dz], n: F.n, F };
});
export const front = (id) => FRONTS.find((k) => k.id === id);

// the yard's things, in the island frame:
//   containers in two blocks, each a list of stacks [x0, z0, along ('x' | 'z'), high]: 20-foot boxes 4 long, 1.6
//   wide; nothing two high with walkable ground just north of it (it would stand between Eric and the camera)
export const BOX = { L: 4, W: 1.6, H: 1.7 };
export const STACKS = [
  // west block, between the footway and the west quay
  ...[0, 1, 2].flatMap((r) =>
    [0, 1].map((c) => [-96.5 + c * 4.3, -79 + r * 1.7, 'x', r === 0 ? 1 : 1 + ((r + c) % 2)]),
  ),
  ...[0, 1, 2].flatMap((r) =>
    [0, 1].map((c) => [-96.5 + c * 4.3, -71.4 + r * 1.7, 'x', r === 0 ? 1 : 1 + ((r * 3 + c) % 2)]),
  ),
  // east block, south of the warehouse's apron, beside the street
  ...[0, 1, 2].flatMap((r) =>
    [0, 1, 2].map((c) => [-77 + c * 4.3, -70 + r * 1.7, 'x', r === 0 ? 1 : 1 + ((r + c * 2) % 2)]),
  ),
];
// the crane on the yard's south-west corner beside the supply pier's root, its jib out south over the freighter's
// hatches, clear of the pier (nothing walkable under it)
export const CRANE = { x: -97.6, z: -55.2, base: 3.2, to: [-100.6, -42] };
// the painted footway across the yard, from the street to the landing: legs [x0, x1, z0, z1]
export const FOOTWAY = [
  [-84.8, YARD[1], -55.2, -53.8],
  [-84.8, -83.4, -92.6, -55.2],
  [YARD[0], -83.4, -92.6, -91.2],
];
// floodlight masts on the yard; pallets and crates [x, z, kind]; the foreman's hut's bikes (a rack along its east side)
export const MASTS = [
  [-86.4, -82],
  [-66.2, -76.6],
];
export const CRATES = [
  [-80.6, -78.6, 'pallet'],
  [-79.2, -78.6, 'crate'],
  [-70.4, -79, 'pallet'],
  [-68.9, -79, 'pallet'],
  [-91, -60.4, 'crate'],
  [-90.2, -62, 'pallet'],
  [-93.5, -46, 'crate'],
  [-93.6, -38.6, 'pallet'],
  [-71, -61.6, 'pallet'],
  [-69.6, -61.6, 'crate'],
  [-71, -60.2, 'pallet'],
  [-80.6, -84, 'crate'],
];
export const RACK = { a: [HUT[1] + 0.6, HUT[2] + 0.2], b: [HUT[1] + 0.6, HUT[3] - 0.2] };
// the quays' mooring bitts: along each quay edge and pier face, about every 6, a step in from the edge
export const LAMPS = [
  // the street west of the office quarter's lamps, on its south side
  ...O.LAMPS.filter(([x]) => x < EAST_END + 4),
  // the landing, along its north side in front of the terminal, and down the ferry pier's east edge
  [-123.6, -98.6],
  [-102.4, -98.6],
  ...[-80, -66].map((z) => [FERRY_PIER[1] - 0.45, z]),
  // the supply pier's east edge
  ...[-46, -36].map((z) => [SUPPLY_PIER[1] - 0.45, z]),
  // the harbour walk's landward edge
  ...[-48, -40, -32].map((z) => [HW[1] + 0.45, z]),
];
// benches on the landing looking south over the water, and in the walk's bay looking west
export const BENCHES = [
  [-118.6, -89.4, 0],
  [-114.6, -89.4, 0],
  [-108.4, -89.4, 0],
  [BAY[0] + 0.55, -41.4, -Math.PI / 2],
  [BAY[0] + 0.55, -39.4, -Math.PI / 2],
];
// finger signs: at the street's yard end, pointing west to the ferry and back east to the offices; on the landing,
// pointing back east to the offices
export const SIGNS = {
  yard: [YARD[1] + 0.6, STREET[3] + 0.45],
  landing: [-101.2, -98.6],
};
// the light beacons at the pier heads, on the corner away from the ferry or the freighter
export const BEACONS = [
  [FERRY_PIER[1] - 0.5, FERRY_PIER[3] - 0.5],
  [SUPPLY_PIER[1] - 0.5, SUPPLY_PIER[3] - 0.5],
];
// bollards across the walk's south end
export const BOLLARDS = [{ a: [HW[0] + 0.3, WALK_END + 0.35], b: [HW[1] - 0.3, WALK_END + 0.35] }];

// the walkable rects, in the island frame
const I_WALKS = [
  [YARD[1] - 0.1, EAST_END, STREET[2], STREET[3]],
  [HW[0], HW[1], STREET[3] - 0.1, WALK_END],
  [BAY[0], BAY[1] + 0.1, BAY[2], BAY[3]],
  [YARD[0] + EDGE, YARD[1], YARD[2], YARD[3] - EDGE],
  [LANDING[0] + EDGE, YARD[0] + EDGE + 0.1, LANDING[2] + 0.15, LANDING[3] - EDGE],
  [FERRY_PIER[0] + EDGE, FERRY_PIER[1] - EDGE, FERRY_PIER[2] - EDGE - 0.1, FERRY_PIER[3] - EDGE],
  [SUPPLY_PIER[0] + EDGE, SUPPLY_PIER[1] - EDGE, SUPPLY_PIER[2] - EDGE - 0.1, SUPPLY_PIER[3] - EDGE],
  [WORKS_LANE[0], WORKS_LANE[1], LANE_END, YARD[2] + 0.1],
  [WORKS_STREET[0], WORKS_STREET[1], STREET_TOP, STREET[2] + 0.1],
];
export const WALKS = I_WALKS.map(rect);

// what stands on the walkable ground, in the island frame (the nav grid blocks these)
const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
const stackRect = ([x, z, along]) =>
  along === 'x'
    ? [x - 0.05, x + BOX.L + 0.05, z - 0.05, z + BOX.W + 0.05]
    : [x - 0.05, x + BOX.W + 0.05, z - 0.05, z + BOX.L + 0.05];
const c = CRANE;
export const FURNITURE = [
  [SHED[0] - 0.1, SHED[1] + 0.1, SHED[2], SHED[3] + 0.15],
  [HUT[0] - 0.1, HUT[1] + 0.9, HUT[2] - 0.1, HUT[3] + 0.1],
  [c.x - c.base / 2 - 0.2, c.x + c.base / 2 + 0.2, c.z - c.base / 2 - 0.2, c.z + c.base / 2 + 0.2],
  ...STACKS.map(stackRect),
  ...CRATES.map(([x, z]) => post([x, z], 0.65)),
  ...MASTS.map((p) => post(p, 0.3)),
  ...LAMPS.map((p) => post(p)),
  ...BEACONS.map((p) => post(p, 0.25)),
  ...[-122.6, -104.6].map((x) => post([x, -94.4], 0.6)),
  ...[-1, 1].map((k) => [-112 + k * 3.2 - 1.3, -112 + k * 3.2 + 1.3, -100, -98.8]),
  ...BENCHES.map(([x, z, f]) =>
    Math.abs(f) > 1 ? [x - 0.35, x + 0.35, z - 0.85, z + 0.85] : [x - 0.85, x + 0.85, z - 0.35, z + 0.35],
  ),
  post(SIGNS.yard),
  post(SIGNS.landing),
  post(O.SIGNS.west),
].map(rect);

// the shut doors (local), and where Eric stands to try each (step): a step out from the face, a little to one side
export const DOORS = FRONTS.map((k) => {
  const [x, z] = k.door;
  return {
    id: k.place,
    local: pt([x, z]),
    step: pt([x + k.n[0] * 1.0 - k.n[1] * 0.35, z + k.n[1] * 1.0]),
  };
});

// the ways out ({ edge, lane, zone } as the office quarter's EXITS): east along the street in front of Amakawa
// Trading, to the office quarter; where he comes in from there: walking west along the street, from where its way
// out ends (office-quarter/plan.js EXITS) to past the harbour walk's mouth. North up the works lane and up the works
// street, both to the works, and back down them from where the works' ways out end (arrive, to in; works/plan.js
// WAYS)
const [LX, SX] = [W.WAYS.lane.in[0], W.WAYS.street.in[0]];
export const EXITS = {
  office_quarter: {
    edge: pt([EAST_END - 0.2, SZ]),
    lane: pt([EAST_END - 1.6, SZ]),
    zone: rect([EAST_END - 2.4, EAST_END + 0.2, STREET[2] - 0.5, STREET[3] + 0.5]),
  },
  works_lane: {
    edge: pt(W.WAYS.lane.in),
    lane: pt([LX, W.LANE_SEAM + 1.1]),
    zone: rect([WORKS_LANE[0], WORKS_LANE[1], LANE_END, W.LANE_SEAM + 1.5]),
    arrive: pt(W.WAYS.lane.out),
    in: pt([LX, W.WAYS.lane.out[1] + 2.7]),
  },
  works_street: {
    edge: pt(W.WAYS.street.in),
    lane: pt([SX, W.STREET_SEAM + 1.4]),
    zone: rect([WORKS_STREET[0], WORKS_STREET[1], STREET_TOP, W.STREET_SEAM + 1.8]),
    arrive: pt(W.WAYS.street.out),
    in: pt([SX, SZ]),
  },
};
export const ARRIVE_EDGE = pt([O.WEST_END + 0.2, SZ]);
export const IN = pt([HW[0] - 2, SZ]);

// the camera's looks: along the street and down the harbour walk, the office street's (office-quarter/plan.js
// POSES); over the yard, the landing and the piers a little west of north and a little steeper, so the fronts on
// the yard's and the landing's north sides face it and the ships lie beside the piers, not between Eric and it
const deg = Math.PI / 180;
export const POSES = {
  street: O.POSES.street,
  quay: { yaw: 0.16, elev: 56 * deg },
};
// where the camera turns between them, in the island frame: over x, as he comes off the street into the yard
export const TURN_X = [YARD[1] - 3, YARD[1] + 3];

// the walks' bounds, for the nav grid and the camera
export const BOUNDS = (() => {
  const b = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [x0, x1, z0, z1] of WALKS) {
    b[0] = Math.min(b[0], x0);
    b[1] = Math.max(b[1], x1);
    b[2] = Math.min(b[2], z0);
    b[3] = Math.max(b[3], z1);
  }
  return b;
})();
