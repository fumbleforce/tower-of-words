// The office quarter's plan (scenes/office-quarter.js): the walkable ground from the gym's corner west along the
// office street past the office blocks and the bank (docs/game/island.md, "Office quarter"), from the layout's paths
// (scenes/island-offices.js, island-sports.js). Everything is laid out in the island frame (x east, z south) and
// moved into the chunk's own by pt() and rect(); the chunk is not turned, its origin is where the quarter street
// meets the office street.
//
//   the gym's corner: the sports lane's west end turns north by gym_link to the office street's east end; the
//   sports chunk walks it too (scenes/sports.js), and both lay it with link.js
//   the office street: west from the corner past m5, m3, m2 and w1 on its north side, each with its door on a paved
//   forecourt off the street, to a row of bollards just short of the harbour walk (the street goes on to the supply
//   quay later)
//   the walks north: on the shed street's line to Amakawa Foods (m1), and between m3 and m5 to the court in front of
//   Amakawa Construction (m4)
//   the quarter street's mouth: a few steps south to the bank's door and its ATM corner, on the bank's east face;
//   bollards across it, and across the shed street's mouth (both go on south to head office's back, not walked)
import * as LAYOUT from '../island-layout.js';
import { faces, faceAt, tOf, bayOf } from '../outdoor/block-face.js';

export const CHUNK = 'office_quarter';
const AT = LAYOUT.CHUNKS[CHUNK].at;
// the island frame to the chunk's: a point, a rect [x0, x1, z0, z1]
export const pt = ([x, z]) => [x - AT[0], z - AT[1]];
export const rect = ([x0, x1, z0, z1]) => [x0 - AT[0], x1 - AT[0], z0 - AT[1], z1 - AT[1]];
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
const mid = (a, b) => (a + b) / 2;
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];
const path = (id) => box(LAYOUT.PATHS.find((p) => p.id === id).rect);
const plan = (id) => box(LAYOUT.PLAN_PATHS.find((p) => p.id === id).rect);
const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);

export const STREET = path('office_street');
export const LINK = path('gym_link');
export const LANE = path('sports_lane');
export const FOODS_WALK = path('foods_walk');
export const CON_WALK = path('construction_walk');
export const CON_COURT = path('construction_court');
export const QUARTER = plan('quarter_street');
export const SHED = plan('shed_street_far');
export const HARBOUR_WALK = plan('harbour_walk');
export const GYM = box(building('gym').rect);

// the gym's corner, laid by link.js in both chunks: the lane's west end (a turn), gym_link, the street's east end
// (a turn) and the street west of it to STUB_X; the lane east of it to LINK_E, where the sports chunk's own lane
// starts (sports/grounds.js)
export const LANE_TURN = [LINK[0], LINK[1], LANE[2], LANE[3]];
export const STREET_TURN = [LINK[0], LINK[1], STREET[2], STREET[3]];
export const STUB_X = 27.5;
export const LINK_E = 44.5;
export const WEST_END = HARBOUR_WALK[1] + 0.6; // the street is walked east from here; bollards across it
export const QUARTER_END = STREET[3] + 6; // the quarter street's mouth is walked this far south; bollards
// the walkable rects of the corner, in the island frame (the sports chunk walks these too)
export const LINK_WALKS = [
  [STUB_X - 1.5, LINK[1], STREET[2], STREET[3]],
  [LINK[0], LINK[1], STREET[2], LANE[3]],
  [LINK[0], LINK_E, LANE[2], LANE[3]],
];

// the camera's looks (places/office-quarter.js and places/sports.js): along the street a little west of north from
// a little east of south, so the north side's fronts face it and the bank, south of the street, stays out of the
// line to Eric; up the walks north between the blocks, straight north; in the quarter street's mouth, from the
// south-east, so the bank's door on its east face faces it; by the gym, the sports lane's look
const deg = Math.PI / 180;
export const POSES = {
  street: { yaw: 0.32, elev: 55 * deg },
  walks: { yaw: 0.04, elev: 56 * deg },
  mouth: { yaw: 0.8, elev: 55 * deg },
  lane: { yaw: -0.2, elev: 50 * deg },
};
// where the camera turns between them, in the island frame: from the street's look to the lane's over x (the gym's
// corner), to the walks' look over z (north of the street's north edge), and to the mouth's over z (south of its
// south edge)
export const TURN_X = [STUB_X + 2, LINK[0] + 1.5];
export const TURN_Z = [STREET[2] - 1.5, STREET[2] - 4];
export const TURN_S = [STREET[3] + 0.3, STREET[3] + 2];

// the blocks along the street, each with its door: the face it is on and where along it, snapped to a bay of the
// block's ground floor (outdoor/block.js); the name on the canopy [kana, English, colour] (docs/game/island.md,
// "Office quarter"); the thing id is the place id there
const BLOCK_LIST = [
  {
    id: 'w1',
    place: 'trading_office',
    face: 's',
    at: -34.15,
    sign: ['しょうじ', 'AMAKAWA TRADING', '#3d4f63'],
  },
  {
    id: 'm1',
    place: 'foods_office',
    face: 's',
    at: mid(...FOODS_WALK.slice(0, 2)),
    sign: ['しょくひん', 'AMAKAWA FOODS', '#4a6048'],
  },
  {
    id: 'm2',
    place: 'electric_office',
    face: 's',
    at: -4.9,
    sign: ['でんき', 'AMAKAWA ELECTRIC', '#34505a'],
  },
  {
    id: 'm3',
    place: 'logistics_office',
    face: 's',
    at: 10.45,
    sign: ['ぶつりゅう', 'AMAKAWA LOGISTICS', '#4f5f74'],
  },
  {
    id: 'm4',
    place: 'construction_office',
    face: 's',
    at: 20.5,
    sign: ['けんせつ', 'AMAKAWA CONSTRUCTION', '#3e5a4a'],
  },
  {
    id: 'm5',
    place: 'insurance_office',
    face: 's',
    at: 21.65,
    sign: ['せいめい', 'AMAKAWA LIFE', '#584f6a'],
  },
  {
    id: 'b_h',
    place: 'bank',
    face: 'e',
    at: -47.9,
    sign: ['ぎんこう', 'BANK', '#34425c'],
  },
];
export const BLOCKS = BLOCK_LIST.map((k, i) => {
  const b = building(k.id),
    r = box(b.rect),
    F = faces(r)[k.face],
    bw = bayOf(F.L),
    n = Math.round(F.L / bw),
    t = (Math.min(n - 1, Math.max(0, Math.floor(tOf(F, k.at) / bw))) + 0.5) * bw;
  const [dx, dz] = faceAt(F, t, 0);
  return {
    ...k,
    rect: r,
    row: b,
    seed: 30 + i,
    t,
    w: bw - 0.36,
    door: [dx, dz],
    n: F.n,
    F,
  };
});
export const BLOCK_IDS = BLOCKS.map((k) => k.id);
export const block = (id) => BLOCKS.find((k) => k.id === id);
// the forecourts: the paved ground between a south face and the street, the face's length
export const FORECOURTS = BLOCKS.filter((k) => k.face === 's' && k.rect[3] > STREET[2] - 5).map((k) => ({
  id: k.id,
  rect: [k.rect[0] + 0.2, k.rect[1] - 0.2, k.rect[3], STREET[2]],
}));
const BED = 0.9; // the beds against a forecourt's face, either side of the door
const doorBay = (k) => [k.door[0] - k.w / 2 - 0.6, k.door[0] + k.w / 2 + 0.6];

// the walkable rects, in the island frame
const I_WALKS = [
  ...LINK_WALKS,
  [WEST_END, STUB_X, STREET[2], STREET[3]],
  [QUARTER[0], QUARTER[1], STREET[3] - 0.1, QUARTER_END],
  [FOODS_WALK[0], FOODS_WALK[1], FOODS_WALK[2] + 0.1, STREET[2] + 0.1],
  [CON_WALK[0], CON_WALK[1], CON_WALK[2], STREET[2] + 0.1],
  [CON_COURT[0], CON_COURT[1], CON_COURT[2] + 0.1, CON_COURT[3] + 0.1],
  ...FORECOURTS.flatMap(({ id, rect: [x0, x1, z0, z1] }) => {
    const k = block(id),
      deep = z1 - z0 > 2;
    // a shallow one is walked to the face; a deep one in front of its beds, and up to the door between them
    return deep
      ? [
          [x0, x1, z0 + BED + 0.15, z1 + 0.1],
          [...doorBay(k), z0 + 0.15, z0 + BED + 0.3],
        ]
      : [[x0, x1, z0 + 0.15, z1 + 0.1]];
  }),
];
export const WALKS = I_WALKS.map(rect);

// the forecourts' beds against the face either side of the door, and where the bike racks stand (m2's and m3's, a
// row along the forecourt's street edge at its outer end)
export const BEDS = FORECOURTS.filter(({ rect: [, , z0, z1] }) => z1 - z0 > 2).flatMap(({ id, rect: [x0, x1, z0] }) => {
  const [d0, d1] = doorBay(block(id));
  return [
    [x0, d0, z0, z0 + BED],
    [d1, x1, z0, z0 + BED],
  ];
});
export const RACKS = [
  { id: 'm2', from: block('m2').rect[1] - 3.6, to: block('m2').rect[1] - 0.6 },
  { id: 'm3', from: block('m3').rect[0] + 0.6, to: block('m3').rect[0] + 3.0 },
].map(({ id, from, to }) => {
  const z = STREET[2] - 0.9;
  return { id, a: [from, z], b: [to, z] };
});

// furniture, in the island frame: post lamps behind the street's south kerb every 8, none at the side streets' mouths;
// benches in two bays on the south verge, looking over the street at the offices; bollards across the street's west
// end and the two side streets' mouths; finger signs at the gym's corner and at the street's west end
const mouths = [
  [SHED[0], SHED[1]],
  [QUARTER[0], QUARTER[1]],
];
const clear = (x) => !mouths.some(([a, b]) => x > a - 1 && x < b + 1);
export const LAMPS = [];
for (let x = WEST_END + 2; x < STUB_X; x += 8) if (clear(x)) LAMPS.push([x, STREET[3] + 0.45]);
export const LINK_LAMPS = [
  [STUB_X + 2.5, STREET[3] + 0.45],
  [LINK[0] - 0.45, LANE[2] + 0.5],
  [41, LANE[3] + 0.45],
];
export const BAYS = [-12.5, 24].map((x) => [x - 1.1, x + 1.1]); // along the south verge, a bench in each
export const BOLLARDS = [
  {
    a: [WEST_END - 0.35, STREET[2] + 0.5],
    b: [WEST_END - 0.35, STREET[3] - 0.3],
  },
  {
    a: [SHED[0] + 0.5, STREET[3] + 0.55],
    b: [SHED[1] - 0.3, STREET[3] + 0.55],
  },
  {
    a: [QUARTER[0] + 0.5, QUARTER_END + 0.35],
    b: [QUARTER[1] - 0.3, QUARTER_END + 0.35],
  },
];
export const SIGNS = {
  corner: [LINK[0] - 0.45, STREET[3] + 0.45], // the street's east end, pointing west to the offices and the bank
  west: [WEST_END + 0.6, STREET[3] + 0.45], // the street's west end, pointing back east to the gym
};
const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
export const FURNITURE = [
  ...[...LAMPS, ...LINK_LAMPS, SIGNS.corner, SIGNS.west].map((p) => post(p)),
  ...RACKS.map(({ a, b }) => [a[0] - 0.3, b[0] + 0.3, a[1] - 0.6, a[1] + 0.6]),
].map(rect);

// the shut doors (local), and where Eric stands to try each (step): a step out from the face, a little to one side
export const DOORS = BLOCKS.map((k) => {
  const [x, z] = k.door;
  return {
    id: k.place,
    local: pt([x, z]),
    step: pt([x + k.n[0] * 1.0 - k.n[1] * 0.35, z + k.n[1] * 1.0]),
  };
});

// the way out ({ edge, lane, zone, in } as the sports chunk's EXITS): east along the sports lane past the gym's
// corner, to the sports ground; in: where he walks to from there, coming west along the street
const LZ = mid(LANE[2], LANE[3]),
  SZ = mid(STREET[2], STREET[3]),
  EX = LINK_E - 1.2;
export const EXITS = {
  sports: {
    edge: pt([EX + 0.2, LZ]),
    lane: pt([EX - 1.4, LZ]),
    zone: rect([EX - 2, EX + 1, LANE[2] - 0.5, LANE[3] + 0.5]),
  },
};
// where Eric comes in from the sports ground (and from anywhere a trip doesn't say): on the street west of the
// corner, walking west; ARRIVE_EDGE is where the sports chunk's way here ends (sports/plan.js EXITS)
export const ARRIVE_EDGE = pt([STUB_X - 1.2, SZ]);
export const IN = pt([STUB_X - 4.6, SZ]);
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
