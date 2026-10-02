// The east lane's plan (scenes/east-lane.js): the walkable streets of the east lane district (docs/game/island.md,
// "East lane"), from the plaza's plan of the same ground (plaza/east-plan.js, plaza/north-plan.js), moved into the
// chunk's own frame. The chunk is not turned (island-layout.js CHUNKS), so its axes are the island's: x east, z
// south; its origin is the middle of the pocket park's gravel square.
//
//   the lane: from the plaza's cross walk east to the jog, where Eric comes in from the plaza and leaves for it
//   the jog: its west leg north, its top leg east, both turns; the dorm street south from the top leg past the dorm
//   courtyard's gate (its gate leg, east, is the way in after work) and the dorm row's mouth (east, the way to the
//   sea terrace) down to the ramen shop, where the shop street starts (the walk on is the shop street's chunk)
//   the pocket park: its two walks and the gravel square where they cross
//   the cross walk south from the lane to the south walk, and on to the liquor shop's door; the south walk along the
//   café and the barber to the dorm street
//   the north street from the top leg north to the back lane, with the short walks to the family flats' and the
//   director's doors; the back lane west to Amakawa Travel's walk
import * as LAYOUT from '../island-layout.js';
import * as E from '../plaza/east-plan.js';
import * as N from '../plaza/north-plan.js';
import { LANE, LZ, HALF } from '../plaza/plan.js';
import { lampPoints } from '../plaza/furniture.js';
import { shopDoor } from '../plaza/east-shops.js';

export const CHUNK = 'east_lane';
const [DX, DZ] = [0, 1].map((i) => LAYOUT.CHUNKS.plaza.at[i] - LAYOUT.CHUNKS[CHUNK].at[i]);
// the plaza's frame to the chunk's: a point, a rect [x0, x1, z0, z1]
export const PLAZA = [DX, DZ];
export const pt = ([x, z]) => [x + DX, z + DZ];
export const rect = ([x0, x1, z0, z1]) => [x0 + DX, x1 + DX, z0 + DZ, z1 + DZ];
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;

const {
  CROSS,
  SOUTH_WALK: SW,
  DORM_STREET: DS,
  NORTH_STREET: NS,
  CORNERS,
  WEST_LEG,
  TOP_LEG,
  GATE_Z,
  DORM_ROW: ROW,
} = E;
const m_e2 = E.BLOCKS.find((k) => k.id === 'm_e2').rect;

// the walkable rects, in the plaza's frame
const LANE_W = CROSS[0] - 2.5; // where the lane's walk starts, a little west of the cross walk
const SHOP_END = E.ARCADE_END[2] - 4; // the dorm street's walk ends short of the shop walk
const P_WALKS = {
  lane: [LANE_W, LANE.e[1], LZ - HALF, LZ + HALF],
  west_leg: [WEST_LEG[0], WEST_LEG[1], CORNERS.b[2], CORNERS.a[3]],
  top_leg: [CORNERS.b[0], CORNERS.c[1], TOP_LEG[2], TOP_LEG[3]],
  dorm_street: [DS[0], DS[1], CORNERS.c[2], SHOP_END],
  gate_leg: [DS[1] - 0.1, DS[1] + 2.6, GATE_Z - HALF, GATE_Z + HALF],
  row_leg: [DS[1] - 0.1, DS[1] + 2.6, ROW[2], ROW[3]],
  cross: [CROSS[0], CROSS[1], LZ + HALF - 0.1, m_e2[2]],
  south_walk: [CROSS[0], DS[0] + 0.1, SW[2], SW[3]],
  park_ew: [CORNERS.a[1] - 0.1, DS[0] + 0.1, E.PARK_EW[2], E.PARK_EW[3]],
  park_ns: [E.PARK_NS[0], E.PARK_NS[1], TOP_LEG[3] - 0.1, SW[2] + 0.1],
  square: E.SQUARE,
  north_street: [NS[0], NS[1], N.BACK[2], TOP_LEG[2] + 0.1],
  back_lane: [N.E2_WALK[0] - 0.6, NS[0] + 0.1, N.BACK[2], N.BACK[3]],
  e2_walk: [N.E2_WALK[0], N.E2_WALK[1], N.E2.rect[3], N.BACK[2] + 0.1],
  e3_spur: [E.SPURS[0][0] - 0.1, ...E.SPURS[0].slice(1)],
  r9_spur: [E.SPURS[1][0] - 0.1, ...E.SPURS[1].slice(1)],
};
export const WALKS = Object.values(P_WALKS).map(rect);

// what stands on them, to keep Eric off: the park square's tree, benches and lamps; the street lamps; the lane's
// lamps past the cross walk; the back lane's lamps on its north border
const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
const cx = (E.SQUARE[0] + E.SQUARE[1]) / 2,
  cz = (E.SQUARE[2] + E.SQUARE[3]) / 2;
export const FURNITURE = [
  [cx - 0.9, cx + 0.9, cz - 0.9, cz + 0.9],
  ...E.SQUARE_BENCHES.map(([x, z]) => [x - 0.7, x + 0.7, z - 0.35, z + 0.35]),
  ...E.SQUARE_LAMPS.map((p) => post(p)),
  ...E.STREET_LAMPS.map((p) => post(p)),
  ...lampPoints()
    .filter(([x, z]) => x > LANE_W && Math.abs(z - LZ) < 2)
    .map(([x, z]) => post([x, z])),
  ...N.LAMPS.filter((x) => x > LANE_W).map((x) => post([x, N.BACK[2] + 0.35])),
].map(rect);

// the shut doors of the named shops (plaza/east-shops.js): each { id, local: on the face, step: where Eric stands }
export const DOORS = [...E.BLOCKS, N.E2]
  .filter((k) => k.shop)
  .map((k) => {
    const d = shopDoor(k);
    return {
      id: k.shop.id,
      local: pt(d.at),
      step: pt([d.at[0] + d.n[0] * 0.85, d.at[1] + d.n[1] * 0.85]),
    };
  });

// the ways out, each { edge: where the walk crosses to the next place, lane: where Eric walks to before it, zone:
// the rect past which he is leaving }:
//   plaza: west along the lane past the cross walk (also up the cross walk onto the lane)
//   shotengai: south down the dorm street toward the shop walk
//   east_coast: east along the dorm row toward the sea terrace
//   dorm_court: east into the dorm courtyard's gate leg (after work; before that, a line says so)
const mid = (a, b) => (a + b) / 2;
const DSX = mid(DS[0], DS[1]),
  RZ = mid(ROW[2], ROW[3]);
export const EXITS = {
  plaza: {
    edge: pt([LANE_W + 0.6, LZ]),
    lane: pt([CROSS[0] - 0.3, LZ]),
    zone: rect([LANE_W - 1, CROSS[1] + 0.3, LZ - HALF - 1, LZ + HALF - 0.05]),
  },
  shotengai: {
    edge: pt([DSX, SHOP_END + 0.6]),
    lane: pt([DSX, SHOP_END - 1.0]),
    zone: rect([DS[0] - 1, DS[1] + 1, SHOP_END - 1.6, SHOP_END + 2]),
  },
  east_coast: {
    edge: pt([DS[1] + 3.2, RZ]),
    lane: pt([DS[1] + 1.6, RZ]),
    zone: rect([DS[1] + 1.0, DS[1] + 4, ROW[2], ROW[3]]),
    in: pt([DSX, RZ]), // where he walks to, back from the east coast: on the dorm street, out of the zone
  },
  dorm_court: {
    edge: pt([DS[1] + 3.2, GATE_Z]),
    lane: pt([DS[1] + 1.6, GATE_Z]),
    zone: rect([DS[1] + 1.0, DS[1] + 4, GATE_Z - HALF - 1, GATE_Z + HALF + 1]),
  },
};
// where Eric comes in from the plaza (and from anywhere a trip doesn't say): on the lane, walking east toward the jog
export const IN = pt([CORNERS.a[0] - 3.2, LZ]);
export const ARRIVE_EDGE = pt([CROSS[1] + 2.4, LZ]);
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
// where the camera turns to look south-east, so the shop fronts along the south walk face it: over the south walk
// and the cross walk's foot, west of the dorm street ([z from, z to] it eases over, [x from, x to] it eases off)
export const SOUTH_TURN = {
  z: [pt([0, SW[2] - 1.7])[1], pt([0, SW[2]])[1]],
  x: [pt([DS[0] - 1.4, 0])[0], pt([DS[0], 0])[0]],
};
