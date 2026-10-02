// The old works' plan (scenes/works.js): the walkable ground from the supply yard's north edge up the works lane to
// the power plant's door and the chimney's foot, east along the works yard past the factory's gates and the server
// hall to the works street, down the street to the office street, and east along the research walk to Amakawa
// Research (docs/game/island.md, "Old works"), from the layout's paths (scenes/island-works.js). Everything is laid
// out in the island frame (x east, z south) and moved into the chunk's own by pt() and rect(); the chunk is not
// turned, its origin is where the works lane meets the yard.
//
//   the works lane: north from the supply yard (the harbour's; its mouth is walked in both) between the harbour
//   office and the server hall, past the yard, to a short apron before the power plant's door on its east face, and
//   on to the chimney's foot under the pipe bridge, a dead end
//   the works yard: east from the lane between the works shed and the server hall; north off it the factory apron
//   to the factory's chained gates, the gatehouse on its east side and the transformer lot beyond; south off it the
//   hall apron to the server hall's door on its east face; the old siding comes out of the factory's gates and runs
//   east along the yard to a buffer stop
//   the works street: south from the yard's east end to the office street (its mouth is walked in both); the
//   recycling centre's door on its east side
//   the research walk: east from the yard's east end to Amakawa Research's door, the weather station north of it
import * as LAYOUT from '../island-layout.js';
import { faces, faceAt, tOf, bayOf } from '../outdoor/block-face.js';
import { inRect } from '../office-quarter/plan.js';

export const CHUNK = 'works';
const AT = LAYOUT.CHUNKS[CHUNK].at;
// the island frame to the chunk's: a point, a rect [x0, x1, z0, z1]
export const pt = ([x, z]) => [x - AT[0], z - AT[1]];
export const rect = ([x0, x1, z0, z1]) => [x0 - AT[0], x1 - AT[0], z0 - AT[1], z1 - AT[1]];
export { inRect };
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];
const path = (id) => box(LAYOUT.PATHS.find((p) => p.id === id).rect);
const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);
const mid = (a, b) => (a + b) / 2;

export const LANE = path('works_lane');
export const YARD = path('works_yard');
export const GATE = path('factory_gate');
export const APRON = path('hall_apron');
export const STREET = path('works_street');
export const RWALK = path('research_walk');
export const PLANT = box(building('nw_old').rect);
export const FACTORY = box(building('factory').rect);
export const SHED = box(building('works_shed').rect);
export const KIOSK = box(building('works_kiosk').rect);
export const HALL = box(building('works_blue').rect);
export const LX = mid(LANE[0], LANE[1]),
  SX = mid(STREET[0], STREET[1]);

// the chimney: round, on a square plinth, in the middle of its layout footprint
export const CHIMNEY = (() => {
  const [x0, x1, z0, z1] = box(building('chimney').rect);
  return { x: mid(x0, x1), z: mid(z0, z1), r: 1.35, top: 0.85, h: 24, plinth: 3.2 };
})();
// the dead end at the chimney's foot, past the lane's head, under the pipe bridge
export const FOOT = [LANE[0], CHIMNEY.x + 1.9, CHIMNEY.z + CHIMNEY.plinth / 2 + 0.2, LANE[2]];
export const PIPE_Z = -116.3; // the pipe bridge, from the plant's north-east corner over the lane's head to the factory
// the power plant's door on its east face, and the apron before it off the lane
export const PLANT_DOOR = { z: -112.4, w: 1.7 };
export const PLANT_APRON = [PLANT[1], LANE[0], PLANT_DOOR.z - 1.4, PLANT_DOOR.z + 1.4];
// the factory's gates, in the middle of its apron
export const GATES = { x: mid(GATE[0], GATE[1]), w: 5.2, h: 4.4 };
// the old siding: out of the gates south down the apron, a curve east (radius r), along the yard (at z) to the
// buffer stop (at x stop)
export const RAIL = { gauge: 0.72, r: 3, z: -105, stop: -57.2 };
// the gatehouse's window on its west face, onto the factory apron
export const KIOSK_WINDOW = { z: -110.6, w: 1.6 };
// the transformer lot east of the gatehouse: a chain-link fence round it, its gate open on the yard
export const LOT = [KIOSK[1] + 0.3, STREET[0] - 0.4, FACTORY[3] + 0.2, YARD[2] - 0.3];
export const LOT_GATE = [-54.4, -52.8];
// the smoking corner behind the server hall, off the lane; a fence along the yard closes it on the north
export const CORNER = [LANE[1], HALL[0] - 0.8, HALL[2] - 0.2, HALL[3] + 0.2];
// the weather station north of the research walk, a low fence round it, its gate on the walk
export const STATION = [-44.6, -38.4, -110.4, RWALK[2] - 0.15];
export const STATION_GATE = [-42.2, -40.8];

// the fronts with a name and a shut door (as the office row's, office-quarter/plan.js BLOCKS): the face it is on and
// where along it, snapped to a bay of the block's ground floor; the name on the canopy [kana, English, colour]; the
// thing id is the place id
const FRONT_LIST = [
  {
    id: 'w2',
    place: 'recycling_centre',
    face: 'w',
    at: -95.8,
    sign: ['リサイクルセンター', 'RECYCLING CENTRE', '#4a6a52'],
    wall: '#9a9c94',
  },
  {
    id: 'n4',
    place: 'research_lab',
    face: 'w',
    at: mid(RWALK[2], RWALK[3]),
    sign: ['けんきゅうじょ', 'AMAKAWA RESEARCH', '#34505a'],
    wall: '#c3c4c0',
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
  return { ...k, rect: r, row: b, seed: 70 + i, t, w: bw - 0.36, door: [dx, dz], n: F.n, F };
});
export const front = (id) => FRONTS.find((k) => k.id === id);
const W2 = front('w2'),
  N4 = front('n4');
// the recycling centre's forecourt between its face and the street; Amakawa Research's landing at the walk's end
export const W2_COURT = [STREET[1], W2.rect[0], W2.door[1] - 1.3, W2.door[1] + 1.3];
export const N4_LANDING = [N4.rect[0] - 2.2, N4.rect[0], N4.door[1] - 1.5, N4.door[1] + 1.5];
// the server hall's door on its east face, on the hall apron
export const HALL_DOOR = { z: mid(HALL[2], HALL[3]), w: 1.5 };

// the ways out and in, all to the harbour: down the lane into the supply yard, and down the works street onto the
// office street. Each way out ends (edge) where the harbour's way in starts; the harbour's way out up the lane or the
// street ends at LANE_SEAM or STREET_SEAM, where this chunk's way in starts (harbour/plan.js EXITS)
export const LANE_SEAM = -100.9,
  STREET_SEAM = -59.4;
const LANE_S = -97.8, // the lane is walked south to here, a step into the supply yard
  STREET_S = -55.6; // the street to here, on the office street's north edge
// the seams in the island frame: where each way out of here ends (out: the harbour's way in starts there) and where
// the harbour's way out ends (in: this chunk's way in starts there)
export const WAYS = {
  lane: { out: [LX, LANE_S - 0.1], in: [LX, LANE_SEAM] },
  street: { out: [SX, STREET_S - 0.2], in: [SX, STREET_SEAM] },
};
export const EXITS = {
  lane: {
    edge: pt(WAYS.lane.out),
    lane: pt([LX, LANE_S - 1.1]),
    zone: rect([LANE[0], LANE[1], LANE_S - 1.8, LANE_S]),
    arrive: pt(WAYS.lane.in),
    in: pt([LX, mid(YARD[2], YARD[3]) - 0.2]),
  },
  street: {
    edge: pt(WAYS.street.out),
    lane: pt([SX, STREET_S - 1.2]),
    zone: rect([STREET[0], STREET[1], STREET_S - 1.8, STREET_S]),
    arrive: pt(WAYS.street.in),
    in: pt([SX, STREET_SEAM - 3.4]),
  },
};
export const IN = EXITS.lane.in;
export const ARRIVE_EDGE = EXITS.lane.arrive;

// the nooks: corners off the way with something to look at, each reachable on foot (docs/game/places.md, "Nooks");
// nothing in them yet. Where Eric stands in each, in the island frame
export const NOOKS = {
  chimney_foot: [CHIMNEY.x - 0.6, FOOT[2] + 0.5],
  smoking_corner: [mid(CORNER[0], CORNER[1]), mid(CORNER[2], CORNER[3]) + 0.4],
  gatehouse_window: [GATE[1] - 0.7, KIOSK_WINDOW.z],
  transformer_lot: [mid(LOT_GATE[0], LOT_GATE[1]), LOT[3] - 1.4],
  weather_station: [mid(STATION_GATE[0], STATION_GATE[1]), STATION[3] - 1.6],
};

// the walkable rects, in the island frame
const I_WALKS = [
  [LANE[0], LANE[1], FOOT[3], LANE_S],
  [FOOT[0], FOOT[1], FOOT[2], FOOT[3] + 0.1],
  [PLANT_APRON[0] + 0.15, PLANT_APRON[1] + 0.1, PLANT_APRON[2], PLANT_APRON[3]],
  [LANE[1] - 0.1, YARD[1], YARD[2], YARD[3]],
  [GATE[0] + 0.1, GATE[1] - 0.1, GATE[2] + 0.25, GATE[3] + 0.1],
  [APRON[0] + 0.15, APRON[1] + 0.1, APRON[2] - 0.1, APRON[3]],
  [STREET[0], STREET[1], STREET[2], STREET_S],
  [RWALK[0] - 0.1, RWALK[1], RWALK[2], RWALK[3]],
  [N4_LANDING[0], N4_LANDING[1] - 0.15, N4_LANDING[2], N4_LANDING[3]],
  [W2_COURT[0] - 0.1, W2_COURT[1] - 0.15, W2_COURT[2], W2_COURT[3]],
  [CORNER[0] - 0.1, CORNER[1], CORNER[2] + 0.5, CORNER[3]],
  [LOT[0] + 0.3, LOT[1] - 0.3, LOT[2] + 4.2, LOT[3] - 0.25],
  [LOT_GATE[0], LOT_GATE[1], LOT[3] - 0.4, YARD[2] + 0.1],
  [STATION[0] + 0.3, STATION[1] - 0.3, STATION[2] + 0.3, STATION[3] - 0.25],
  [STATION_GATE[0], STATION_GATE[1], STATION[3] - 0.4, RWALK[2] + 0.1],
];
export const WALKS = I_WALKS.map(rect);

// furniture, in the island frame: arm lamps (the works' old concrete poles) up the lane's west side, along the yard's
// north edge and down the street's west side; post lamps on the research walk's north side (beyond Eric from the
// camera); the finger sign at the yard's east end
export const LAMPS = {
  arm: [
    [LANE[0] - 0.35, -101.6, 0],
    [LANE[0] - 0.35, -108.4, 0],
    [-76.2, YARD[2] + 0.3, -Math.PI / 2],
    [-58.4, YARD[2] + 0.3, -Math.PI / 2],
    ...[-63, -73, -83, -93].map((z) => [STREET[0] - 0.35, z, 0]),
  ],
  post: [
    [STATION[0] - 1.4, RWALK[2] - 0.35],
    [N4_LANDING[0] - 0.3, RWALK[2] - 0.35],
  ],
};
export const SIGN = [STREET[1] + 0.4, YARD[3] + 0.5];
export const SIGN_BOARDS = [
  { text: 'Research', sub: '研究所', dir: 1 },
  { text: 'Harbour', sub: '港', dir: -1 },
];
// the props on the walkable ground (props.js lays them): drums, pallets, the bench in the corner, the condensers
export const DRUMS = [
  [CHIMNEY.x + 1.2, FOOT[2] + 0.5],
  [CHIMNEY.x + 1.25, FOOT[2] + 1.15],
  [GATE[0] + 0.6, GATE[2] + 1.0],
  [LOT[1] - 0.8, LOT[2] + 5.0],
];
export const PALLETS = [
  [GATE[0] + 0.8, GATE[2] + 2.4],
  [GATE[0] + 0.8, GATE[2] + 3.6],
  [YARD[0] + 0.9, YARD[2] + 0.75],
];
export const CORNER_BENCH = [mid(CORNER[0], CORNER[1]) - 0.2, CORNER[3] - 0.5];
export const CONDENSERS = [-100.9, -99.7, -98.5].map((z) => [HALL[0] - 0.42, z]);

const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
export const FURNITURE = [
  ...LAMPS.arm.map(([x, z]) => post([x, z], 0.2)),
  ...LAMPS.post.map((p) => post(p)),
  post(SIGN),
  ...DRUMS.map((p) => post(p, 0.36)),
  ...PALLETS.map((p) => post(p, 0.62)),
  [CORNER_BENCH[0] - 0.95, CORNER_BENCH[0] + 0.95, CORNER_BENCH[1] - 0.35, CORNER_BENCH[1] + 0.5],
  ...CONDENSERS.map(([x, z]) => [x - 0.4, x + 0.4, z - 0.5, z + 0.5]),
  // the buffer stop, the lot's transformers and tank legs, the station's instruments
  [RAIL.stop - 0.6, RAIL.stop + 0.3, RAIL.z - 0.8, RAIL.z + 0.8],
  [LOT[0] + 0.3, LOT[1] - 0.3, LOT[2], LOT[2] + 4.0],
  post([-42.9, STATION[2] + 2.0], 0.6),
  post([-40.0, STATION[2] + 1.6], 0.3),
  post([-39.6, STATION[3] - 1.4], 0.2),
].map(rect);

// the shut doors (local), and where Eric stands to try each (step): a step out from the face
const step = ([x, z], [nx, nz], d = 1.0) => [x + nx * d, z + nz * d];
const DOOR_LIST = [
  { id: 'old_power_plant', at: [PLANT[1], PLANT_DOOR.z], n: [1, 0] },
  { id: 'old_factory', at: [GATES.x, GATE[2]], n: [0, 1], d: 1.3 },
  { id: 'server_hall', at: [HALL[1], HALL_DOOR.z], n: [1, 0] },
  ...FRONTS.map((k) => ({ id: k.place, at: k.door, n: k.n })),
];
export const DOORS = DOOR_LIST.map(({ id, at, n, d }) => ({ id, local: pt(at), step: pt(step(at, n, d)) }));

// the camera's looks: up the lane from the south-east, so the power plant's door on the lane faces it; over the yard
// from a little east of south, so the shed, the factory's gates and the gatehouse face it; on the hall apron from the
// south-east, so the server hall's door on its east face faces it; up the street and the research walk from the
// south-west, so the recycling centre's and Amakawa Research's doors on their west faces face it
const deg = Math.PI / 180;
export const POSES = {
  lane: { yaw: 0.5, elev: 55 * deg },
  yard: { yaw: 0.12, elev: 55 * deg },
  apron: { yaw: 0.72, elev: 55 * deg },
  street: { yaw: -0.45, elev: 55 * deg },
};
// where the camera turns between them, in the island frame: to the lane's over x west of the yard; to the street's
// over x at the yard's east end; to the apron's over z south of the yard
export const TURN_LANE = [LANE[1] - 0.1, LANE[1] + 2.4];
export const TURN_STREET = [APRON[1] - 4, APRON[1] - 0.5];
export const TURN_APRON = [YARD[3] - 0.4, YARD[3] + 1.4];

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
