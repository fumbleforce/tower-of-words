// The east coast's plan (scenes/east-coast.js): the walkable ground from the dorm street to the onsen's door
// (docs/game/island.md, "Dorms" and "Sports and baths"), from the dorm cluster's plan (dorm-court/cluster-plan.js)
// and the layout's paths (scenes/island-baths.js). Everything is laid out in the island frame (x east, z south) and
// moved into the chunk's own by pt() and rect(); the chunk is not turned, its origin is the middle of the sea terrace.
//
//   the dorm row: east from the dorm street, where Eric comes in from the east lane and leaves for it, along the
//   south end of Eric's block and the inner court, into the square at dorm_3's door; the walk on east to the sea
//   terrace, and the terrace (not its pine bed, benches, drinks machine or lamp)
//   the east coast walk: out of the terrace's east side, north along the coast behind dorm_4, west where the coast
//   comes in, north past dorm_6, west behind the north residence
//   the onsen path: north along the tennis courts' fence, east along the onsen's precinct wall to the red gate; in
//   at the gate, the stone walk on its axis up to the entrance porch and the shut door
import * as LAYOUT from '../island-layout.js';
import * as C from '../dorm-court/cluster-plan.js';
import { nookWalks } from '../outdoor/nook-walks.js';

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
export const COAST_WALK = path('east_coast_walk');
export const ONSEN_PATH = path('onsen_path');
export const COAST_LEGS = legs(COAST_WALK);
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

// the walkable rects, in the island frame
const ROW = C.ROW;
const I_WALKS = [
  [ROW[0] - 0.3, ROW[1], ROW[2], ROW[3]],
  C.SQUARE_END,
  C.SEA_WALK,
  C.TERRACE,
  ...COAST_LEGS,
  ...ONSEN_LEGS,
  STONE_WALK,
  COURTS_STUB,
];
// the nooks (outdoor/nooks.js), in the chunk's frame: a lookout with a coin telescope where the coast walk turns
// inland, out to the sea wall; a roadside shrine on the lawn south of the walk inland, the cherries behind it
export const NOOKS = [
  {
    id: 'east_coast_lookout',
    kit: 'lookout',
    at: [5.2, -46.5],
    face: Math.PI / 2,
    edge: 1.45,
    span: 0.95,
    seat: false,
    walks: [[5.3, 6.75, -47.45, -45.55]],
    pads: [[5.5, 6.75, -47.45, -45.55]],
  },
  {
    id: 'east_coast_shrine',
    kit: 'shrine',
    at: [-2.5, -44.1],
    face: 0,
    tree: null,
    walks: [[-3.6, -1.4, -45.6, -43.3]],
    pads: [[-3.6, -1.4, -45.45, -43.75]],
  },
];
export const WALKS = [...I_WALKS.map(rect), ...nookWalks(NOOKS)];

// the coast walk's furniture, in the island frame: post lamps on its landward edge about every 8, and benches in
// bays on its landward side looking over it to the sea; the onsen path's lamps on its outer edge
const [, N1, W1, N2, W2] = COAST_LEGS, // the first leg is the link off the terrace
  [N3, E3] = ONSEN_LEGS;
export const LAMPS = [
  ...[2, -6, -14, -22, -30].map((z) => [N1[0] - 0.25, z]),
  ...[124.5].map((x) => [x, W1[3] + 0.25]),
  ...[-42, -50].map((z) => [N2[0] - 0.25, z]),
  ...[115, 107].map((x) => [x, W2[3] + 0.25]),
  ...[-64, -72].map((z) => [N3[0] - 0.25, z]),
  ...[108, 115.5].map((x) => [x, E3[3] + 0.25]),
];
export const BAYS = [-10, -26].map((z) => [N1[0] - 1.5, N1[0], z - 1.1, z + 1.1]); // a bench in each, facing east
export const SIGNS = {
  terrace: [C.TERRACE[1] + 0.4, COAST_LEGS[0][3] + 0.5], // at the terrace's way out east, pointing along it
  corner: [N3[0] - 0.5, E3[2] - 0.5], // where the onsen path turns east, pointing along it
};

// what stands on the walks, to keep Eric off: the row's lamps and its avenue's tree pits, the square's lamps and the
// pots at dorm_3's door; the terrace's pine bed, benches, drinks machine, lamp and its wall on the coast side; the
// coast walk's lamps
const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
const TR = C.TERRACE,
  SQ = C.SQUARE_END,
  tc = mid(TR[0], TR[1]),
  tz = TR[2] + 1.6;
const D3 = C.BLOCKS.find((k) => k.id === 'dorm_3'),
  d3x = mid(SQ[0], SQ[1]);
export const FURNITURE = [
  ...[80.5, 88.5, 96.5].map((x) => post([x, ROW[3] - 0.25])),
  ...[84.5, 92.5, 106].map((x) => post([x, ROW[3] - 0.75], 0.55)),
  post([SQ[0] + 0.5, SQ[2] + 0.6]),
  post([SQ[1] - 0.6, SQ[2] + 0.6]),
  ...[-1, 1].map((s) => post([d3x + s * 1.15, D3.rect[3] + 0.4], 0.22)),
  [tc - 1.0, tc + 1.0, tz - 0.8, tz + 0.8],
  ...[TR[0] + 1.1, TR[1] - 1.1].map((x) => [x - 0.7, x + 0.7, TR[3] - 1.0, TR[3] - 0.4]),
  [TR[0], TR[0] + 1.0, TR[2], TR[2] + 0.9],
  post([TR[1] - 0.4, TR[2] + 0.4]),
  [TR[0], TR[1], TR[3] - 0.3, TR[3] + 0.1],
  ...LAMPS.map((p) => post(p)),
].map(rect);

// the shut door: on the hall's south face under the porch (local), and where Eric stands to try it (step)
export const DOORS = [{ id: 'onsen', local: pt([GX, HALL[3]]), step: pt([GX - 0.35, HALL[3] + 1.0]) }];

// the ways out ({ edge, lane, zone } as the east lane's EXITS): west along the dorm row onto the dorm street, to the
// east lane; west along the courts walk from the onsen path's foot, to the sports ground (in: where he walks to,
// back from there, out of the zone)
const RZ = mid(ROW[2], ROW[3]),
  CS = COURTS_STUB,
  CZ = mid(CS[2], CS[3]);
export const EXITS = {
  east_lane: {
    edge: pt([ROW[0] + 0.2, RZ]),
    lane: pt([ROW[0] + 1.6, RZ]),
    zone: rect([ROW[0] - 1, ROW[0] + 2.2, ROW[2] - 0.5, ROW[3] + 0.5]),
  },
  sports: {
    edge: pt([CS[0] + 0.2, CZ]),
    lane: pt([CS[0] + 1.6, CZ]),
    zone: rect([CS[0] - 1, CS[0] + 2.2, CS[2] - 0.5, CS[3] + 0.5]),
    in: pt([CS[1] + 0.9, CZ]),
  },
};
// where Eric comes in from the east lane (and from anywhere a trip doesn't say): on the row, walking east
export const IN = pt([ROW[0] + 3.6, RZ]);
export const ARRIVE_EDGE = pt([ROW[0] + 0.2, RZ]);
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

// where the camera turns (places/east-coast.js): it looks east along the row, and turns to look north up the coast
// over the terrace ([x from, x to] it eases over, south of [z from, z to], which only the row and the terrace are),
// then from the coast's look to the onsen's as he comes off the coast walk onto the onsen path ([z from, z to]);
// all in the chunk's frame
export const TURNS = {
  row: { x: [pt([SQ[1] - 4, 0])[0], pt([TR[1] - 1, 0])[0]], z: [pt([0, ROW[2] - 8])[1], pt([0, ROW[2] - 4])[1]] },
  onsen: { z: [pt([0, W2[2] - 2])[1], pt([0, W2[3]])[1]] },
};
