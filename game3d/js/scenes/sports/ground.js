// The sports ground's walkable ground (movement/walk-ground.js; notes/grounds-system.md): the streets, the walks,
// the bench bays, the nooks and the west tennis court from the plans (sports/plan.js, court-plan.js), in the chunk's
// frame. The walk grid and the drawn kerbs both come from it. What already shows where walking ends: the buildings
// (the gym, the pool pavilion, the north residence, r3), the courts' mesh fence, and the three trips' starts.
import { walkGround } from '../../movement/walk-ground.js';
import * as P from './plan.js';
import * as CP from './court-plan.js';

export const WALKS = [...P.WALKS, ...P.BAY_WALKS, ...CP.WALKS];
// the walk grid's area (scenes/sports.js)
export const WALK_AREA = (([x0, x1, z0, z1]) => [x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3])(P.boundsOf(WALKS));

// a building's footprint and the strip of lawn or gravel between it and a walk that ends at its wall
const grow = ([x0, x1, z0, z1], d = 0.3) => [x0 - d, x1 + d, z0 - d, z1 + d];
export const BUILDINGS = [P.GYM, P.PAVILION, P.RESIDENCE, P.R3].map((r) => ({
  kind: 'building',
  rect: grow(P.rect(r)),
}));
// the courts' fence (courts.js): the band between the fence line and the court's walk, a little past the fence
const [FX0, FX1, FZ0, FZ1] = P.rect(CP.COURTS),
  [WX0, WX1, WZ0, WZ1] = CP.WALKS[0];
export const FENCE = [
  [FX0 - 0.3, WX0, FZ0 - 0.3, FZ1 + 0.3],
  [WX1, FX1 + 0.3, FZ0 - 0.3, FZ1 + 0.3],
  [FX0 - 0.3, FX1 + 0.3, FZ0 - 0.3, WZ0],
  [FX0 - 0.3, FX1 + 0.3, WZ1, FZ1 + 0.3],
].map((rect) => ({ kind: 'wall', rect }));
// where the walks run on into the next place (plan.js EXITS): south down the north street, east along the courts
// walk, west along the office street's stub; no kerb is drawn across them
export const RUNS_ON = Object.entries(P.EXITS).map(([to, { edge }]) => {
  const r = WALKS.find(([x0, x1, z0, z1]) => edge[0] >= x0 && edge[0] <= x1 && edge[1] >= z0 && edge[1] <= z1);
  const d = [edge[0] - r[0], r[1] - edge[0], edge[1] - r[2], r[3] - edge[1]],
    side = d.indexOf(Math.min(...d));
  const rect = [
    [r[0] - 10, r[0], r[2], r[3]],
    [r[1], r[1] + 10, r[2], r[3]],
    [r[0], r[1], r[2] - 10, r[2]],
    [r[0], r[1], r[3], r[3] + 10],
  ][side];
  return { to, rect };
});

// the north street's paving past the trip's start, down to the back lane (grounds.js lays it): walked in the east
// lane, drawn here with its kerbs; the back lane beyond is the plaza's, which lays its own
const [NX0, NX1] = P.rect(P.NS),
  [, , BZ0, BZ1] = P.rect(P.BACK);
export const BACKDROP = [[NX0, NX1, P.WALKS[0][3], BZ0]];
const BACK_LANE = { kind: 'open', rect: [NX0 - 50, NX1 + 10, BZ0, BZ1 + 10] };

export function ground() {
  return walkGround({
    walk: WALKS,
    backdrop: BACKDROP,
    barriers: [...BUILDINGS, ...FENCE, ...RUNS_ON.map(({ rect }) => ({ kind: 'open', rect })), BACK_LANE],
    bounds: WALK_AREA,
  });
}
