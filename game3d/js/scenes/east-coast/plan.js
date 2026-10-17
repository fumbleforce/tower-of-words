// The east coast's plan (scenes/east-coast.js): the dorm quarter walked from the dorm street to the onsen's door
// (docs/game/island.md, "Dorms" and "Sports and baths"), from the quarter's plan (dorm-quarter/plan.js) and the
// layout's paths (scenes/island-baths.js). Everything is laid out in the island frame (x east, z south) and moved into
// the chunk's own by pt() and rect(); the chunk is not turned, its origin is the middle of the sea terrace.
//
//   the dorm row: east from the dorm street, where Eric comes in from the east lane and leaves for it, past the
//   villas' doors to the sea terrace; the promenade: east from the dorm courtyard's garden (west of it is the east
//   lane's way, past the courtyard's gate) along the park to the beach plaza; the north-south walk from the row past
//   S-E's court, over the promenade and through the park on its bridge, between N-W and N-E to the courts walk
//   the park's loop and its walks, the boardwalk and the cherry's round, the play corner; the north path from the
//   park's west walk to the lookout deck; the beach promenade from the deck to the terrace, its plaza and fitness
//   corner; the walks to the blocks' doors, the gardens' path, the pergola; the coastal garden's loop south of the
//   villas
//   the courts walk: west from the north-south walk to the onsen path's foot and on to the sports ground, east to its
//   bench at the water; the onsen path: north along the tennis courts' fence, east along the onsen's precinct wall to
//   the red gate; in at the gate, the stone walk on its axis up to the entrance porch and the shut door
import * as LAYOUT from '../island-layout.js';
import * as Q from '../dorm-quarter/plan.js';
import {
  PAVED,
  PARK_FURNITURE,
  PARK_LAMPS,
  PROM_PARK_LAMPS,
  PROM_FURNITURE,
  QUARTER_LAMPS,
  ROW_TREES,
  ROW_LAMPS,
} from '../dorm-quarter/fittings.js';
import { nookWalks } from '../outdoor/nook-walks.js';
import { COAST_GARDEN as G } from '../island-dorms.js';

export const CHUNK = 'east_coast';
const AT = LAYOUT.CHUNKS[CHUNK].at;
// the island frame to the chunk's: a point, a rect [x0, x1, z0, z1]
export const pt = ([x, z]) => [x - AT[0], z - AT[1]];
export const rect = ([x0, x1, z0, z1]) => [x0 - AT[0], x1 - AT[0], z0 - AT[1], z1 - AT[1]];
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
const mid = (a, b) => (a + b) / 2;
const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];

// a line path's legs, each a rect [x0, x1, z0, z1] run on past its corners by half the width, so the turns are
// squares as wide as the walk
export function legs({ line, w }) {
  const h = w / 2;
  return line.slice(1).map(([x1, z1], i) => {
    const [x0, z0] = line[i];
    return [Math.min(x0, x1) - h, Math.max(x0, x1) + h, Math.min(z0, z1) - h, Math.max(z0, z1) + h];
  });
}
export const ONSEN_PATH = path('onsen_path');
export const ONSEN_LEGS = legs(ONSEN_PATH);
// the courts walk's last stretch west of the onsen path's foot, the way to the sports chunk (scenes/sports.js)
const CW = box(path('courts_walk').rect);
export const COURTS_STUB = [ONSEN_LEGS[0][0] - 4.2, ONSEN_LEGS[0][0] + 0.1, CW[2], CW[3]];

// the onsen (onsen_main): its precinct inside a plastered wall, the court inside the red gate, the gate on the
// door's axis in the wall's south side; the two bath courtyards east of the hall, toward the sea
export const HALL = box(LAYOUT.BUILDINGS.find((b) => b.id === 'onsen_main').rect);
export const COURT = box(path('onsen_court').rect);
export const GX = mid(HALL[0], HALL[1]); // the gate's and the door's axis
export const WALL_Z = COURT[3]; // the precinct wall's south side, the gate in it
export const PRECINCT = [COURT[0], 140, HALL[2] - 3.8, WALL_Z];
export const YARDS = [
  [COURT[1], 140, HALL[2] - 1.8, mid(HALL[2], HALL[3])],
  [COURT[1], 140, mid(HALL[2], HALL[3]), WALL_Z],
];
export const GATE = { x: GX, w: 2.5 }; // between its posts
export const PORCH = [GX - 1.6, GX + 1.6, HALL[3], HALL[3] + 1.1];
const STONE_WALK = [GX - 1, GX + 1, HALL[3] + 0.2, WALL_Z + 0.6]; // the gate to the door, in and under the porch

// the promenade is this place's from the dorm courtyard's garden east; west of that it is the east lane's way, past
// the courtyard's gate (Eric walks on out of here into the east lane, east-lane/plan.js EXITS)
export const PROM_WEST = 96.4;
const OWN_PROM = [PROM_WEST, Q.PROM[1], Q.PROM[2], Q.PROM[3]];
// the walkable rects, in the island frame: the quarter's paving (less the promenade before the courtyard's front and
// the dorm courtyard's own), the onsen's walks
const I_WALKS = [
  ...PAVED.filter((r) => r !== Q.PROM),
  OWN_PROM,
  ...ONSEN_LEGS,
  STONE_WALK,
  COURTS_STUB,
  G.entry,
  G.pergola,
  ...G.paths,
  ...G.lawns,
];
// the nooks (outdoor/nooks.js), in the chunk's frame: a lookout with a coin telescope on the deck at the north
// path's end, at its sea edge; a roadside shrine on the lawn south of the north path, the cherries behind it
const LOOKOUT = pt([Q.DECK[1] - 1.7, mid(Q.DECK[2], Q.DECK[3])]);
export const NOOKS = [
  {
    id: 'east_coast_lookout',
    kit: 'lookout',
    at: LOOKOUT,
    face: Math.PI / 2,
    edge: 1.45,
    span: 0.95,
    seat: false,
    walks: [[LOOKOUT[0] - 0.1, LOOKOUT[0] + 1.35, LOOKOUT[1] - 0.95, LOOKOUT[1] + 0.95]],
    pads: [],
  },
  {
    id: 'east_coast_shrine',
    kit: 'shrine',
    at: [-2.5, -44.1],
    face: 0,
    tree: null,
    walks: [[-3.6, -1.4, -46.5, -43.3]],
    pads: [[-3.6, -1.4, -46.5, -43.75]],
  },
];
export const WALKS = [...I_WALKS.map(rect), ...nookWalks(NOOKS)];

// the courts walk's lamps on its south edge east of the onsen path; the onsen path's on its outer edge
const [N3, E3] = ONSEN_LEGS;
export const LAMPS = [
  ...[110, 118].map((x) => [x, Q.COURTS_EAST[3] + 0.25]),
  ...[-64, -72].map((z) => [N3[0] - 0.25, z]),
  ...[108, 115.5].map((x) => [x, E3[3] + 0.25]),
];
export const SIGNS = {
  corner: [N3[0] - 0.5, E3[2] - 0.5], // where the onsen path turns east, pointing along it
  courts: [Q.NS_X[1] + 0.5, Q.COURTS[3] + 0.5], // where the north-south walk meets the courts walk, pointing west
};

// what stands on the walks, to keep the crowd off: the row's lamps and its tree pits; the terrace's pine bed,
// benches, drinks machine, lamp and its wall on the sea side; the park's, the beach promenade's and the gardens'
// furniture; the courts walk's and the onsen path's lamps
const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
const TR = Q.TERRACE,
  tc = mid(TR[0], TR[1]),
  tz = TR[2] + 0.95;
export const FURNITURE = [
  ...ROW_LAMPS.map((x) => post([x, Q.ROW[3] - 0.25])),
  ...ROW_TREES.map((x) => post([x, Q.ROW[3] - 0.75], 0.55)),
  [tc - 1.0, tc + 1.0, tz - 0.8, tz + 0.8],
  ...[TR[0] + 1.1, TR[1] - 1.3].map((x) => [x - 0.7, x + 0.7, TR[3] - 1.0, TR[3] - 0.4]),
  [TR[0], TR[0] + 1.0, TR[2], TR[2] + 0.9],
  post([TR[1] - 0.6, TR[2] + 0.4]),
  [TR[0], TR[1], TR[3] - 0.3, TR[3] + 0.1],
  ...LAMPS.map((p) => post(p)),
  ...PARK_FURNITURE,
  ...PARK_LAMPS.map((p) => post(p)),
  ...PROM_PARK_LAMPS.map((p) => post(p)),
  ...PROM_FURNITURE,
  ...QUARTER_LAMPS.map((p) => post(p)),
  ...G.lamps.map((p) => post(p)),
  ...G.benches.map(([x, z]) => [x - 0.9, x + 0.9, z - 0.3, z + 0.3]),
  ...G.stones.map(([x, z]) => [x - 0.43, x + 0.43, z - 0.4, z + 0.4]),
  [111.1, 111.9, 25.5, 26.1],
  // the coastal garden's pergola's posts and benches leave both entrances clear
  ...[G.pergola[0] + 0.3, G.pergola[1] - 0.3].flatMap((x) =>
    [G.pergola[2] + 0.3, G.pergola[3] - 0.3].map((z) => post([x, z], 0.1)),
  ),
  [86.9, 87.5, 17.3, 18.9],
  [89.6, 91.2, 18.8, 19.4],
].map(rect);

// the doors: the onsen's, shut, on the hall's south face under the porch (local), and where Eric stands to try it
// (step); the common room's glazed door on the promenade
export const DOORS = [
  { id: 'onsen', local: pt([GX, HALL[3]]), step: pt([GX - 0.35, HALL[3] + 1.0]) },
  { id: 'commons', local: pt(Q.COMMONS_DOOR), step: pt([Q.COMMONS_DOOR[0], Q.COMMONS_DOOR[1] + 1.0]) },
];

// the ways out ({ edge, lane, zone } as the east lane's EXITS): west along the dorm row onto the dorm street, or west
// along the promenade past the courtyard's front, to the east lane (`ways`: the trip takes the one nearest him, and the
// east lane brings him in at its end of it); west along the courts walk from the onsen path's foot, to the sports
// ground (in: where he walks to, back from there, out of the zone)
const RZ = mid(Q.ROW[2], Q.ROW[3]),
  PZ = mid(Q.PROM[2], Q.PROM[3]),
  CS = COURTS_STUB,
  CZ = mid(CS[2], CS[3]);
const ROW_WAY = {
  edge: pt([Q.ROW[0] + 0.2, RZ]),
  lane: pt([Q.ROW[0] + 1.6, RZ]),
  zone: rect([Q.ROW[0] - 1, Q.ROW[0] + 2.2, Q.ROW[2] - 0.5, Q.ROW[3] + 0.5]),
};
const PROM_WAY = {
  edge: pt([PROM_WEST - 0.4, PZ]),
  lane: pt([PROM_WEST + 1.2, PZ]),
  zone: rect([PROM_WEST - 3, PROM_WEST + 0.6, Q.PROM[2] - 0.5, Q.PROM[3] + 0.5]),
  in: pt([PROM_WEST + 2.6, PZ]),
};
export const EXITS = {
  east_lane: { ...ROW_WAY, ways: { row: ROW_WAY, promenade: PROM_WAY } },
  sports: {
    edge: pt([CS[0] + 0.2, CZ]),
    lane: pt([CS[0] + 1.6, CZ]),
    zone: rect([CS[0] - 1, CS[0] + 2.2, CS[2] - 0.5, CS[3] + 0.5]),
    in: pt([CS[1] + 0.9, CZ]),
  },
};
// where Eric comes in from the east lane (and from anywhere a trip doesn't say): on the row, walking east
export const IN = pt([Q.ROW[0] + 3.6, RZ]);
export const ARRIVE_EDGE = pt([Q.ROW[0] + 0.2, RZ]);
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

// where the camera turns (places/east-coast.js), all in the chunk's frame: along the row it looks east down it; in
// the park and on the promenade it looks north over the park, the blocks behind; on the beach promenade north-east
// along the sea; in the north it looks north to the gardens and the onsen; on the coastal garden south over the sea
export const TURNS = {
  row: rect([Q.ROW[0] - 2, Q.TERRACE[0], Q.ROW[2] - 0.6, Q.ROW[3] + 3.2]),
  south: rect([82, 124, 12.5, 33]), // the villas' gardens, the coastal loop and the sea beyond
  beach: rect([Q.EDGE[0] - 0.4, 140, -40, Q.TERRACE[3] + 1]),
  park: rect([Q.WEST[0] - 1, Q.EDGE[0] - 0.4, Q.PARK_N[2] - 0.2, Q.ROW[2] - 0.6]),
  north: rect([70, Q.EDGE[0] - 0.4, -120, Q.PARK_N[2] - 0.2]),
};
