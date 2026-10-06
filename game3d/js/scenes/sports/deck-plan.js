// The pool deck's plan: the pool itself and what stands round it (sports/pool.js builds them, seen from both the
// sports ground through the fence and the deck itself), and the deck walked as its own place (places/pool.js),
// through the shower pavilion. In the island frame (x east, z south), moved into the sports chunk's own by plan.js
// pt() and rect(): the pool place shares the sports chunk's frame and world (scenes/sports.js).
//
//   the pool: 25 m of six lanes in a white coping, south of the pavilion; at its south-west corner, steps down into
//   the first lane, a rail either side
//   the deck round it: the pavilion's two changing-room doors on its north side (men's west, women's east), the
//   starting blocks at that end; the lifeguard's chair and two benches against the fence on the west side; the
//   loungers down the east side; the attendant's table at the north-east corner; the winter cover on its reel
//   against the south fence; the pace clock on the pavilion's wall and the rules on the west fence; the float rack
//   and a basket of pull buoys at the south-east corner
import * as P from './plan.js';

const [DX0, DX1, DZ0, DZ1] = P.DECK,
  [VX0, VX1, , VZ1] = P.PAVILION;
const mid = (a, b) => (a + b) / 2;

// the pool: its middle, width (six lanes) and length (25 m), a little toward the walk so the pavilion's end is deeper
export const POOL = {
  x: mid(DX0, DX1),
  z: mid(DZ0, DZ1) + 0.6,
  w: 8.6,
  l: 16.7,
};
export const WATER = [POOL.x - POOL.w / 2, POOL.x + POOL.w / 2, POOL.z - POOL.l / 2, POOL.z + POOL.l / 2];
export const FLOODLIGHTS = [
  [DX0 + 0.28, DZ0 + 3],
  [DX1 - 0.28, DZ0 + 3],
  [DX0 + 0.28, DZ1 - 2],
  [DX1 - 0.28, DZ1 - 2],
];
export const COPING = 0.3; // round the water
export const LANE_W = POOL.w / 6;
// Low club luggage racks beside the steps and beside the attendant.
export const BAG_RACKS = [
  [WATER[0] + LANE_W / 2 - 2.3, WATER[3] + COPING - 0.55],
  [WATER[0] + LANE_W / 2 + 2.1, WATER[3] + 2.15],
];
// the steps down into the first lane at the south end: three treads, their rails on the coping either side
export const STEPS = {
  x0: WATER[0],
  x1: WATER[0] + LANE_W,
  z1: WATER[3],
  tread: 0.38,
  n: 3,
};
// the changing rooms' doors on the pavilion's deck side: the men's (west, Eric's) and the women's
export const DOOR_Z = VZ1;
export const MEN_X = VX0 + 2.0,
  WOMEN_X = VX1 - 2.0;
// the lifeguard's chair by the pool's west side, at its middle
export const CHAIR = [WATER[0] - 0.9, POOL.z];
// two benches against the west fence, facing the pool (bench(): their middles; seats along z)
export const BENCHES = [POOL.z - 5.2, POOL.z + 5.0].map((z) => [DX0 + 0.42, z]);
export const BENCH_LEN = 1.8;
// the loungers down the east side, a little off the fence
export const LOUNGERS = (() => {
  const out = [];
  for (let z = WATER[2] + 1.5; z < WATER[3] - 1; z += 2.4) out.push([DX1 - 1.3, z]);
  return out;
})();
// the winter cover rolled on its reel against the south fence, as wide as the pool's coping
export const REEL = {
  x0: WATER[0] - 0.35,
  x1: WATER[1] + 0.35,
  z: DZ1 - 0.5,
  y: 0.6,
  r: 0.36,
};
// the pace clock on the pavilion's deck-side wall between two shower heads, facing down the pool ([x, y, z])
export const CLOCK = [mid(VX0, VX1) - 0.75, 1.62, VZ1];
// the rules board on the west fence over the lifeguard's chair, facing the pool ([x, y, z]: its middle)
export const RULES = [DX0 + 0.06, 1.42, POOL.z];
// the float rack and the pull buoys' basket at the south-east corner
export const RACK = [DX1 - 0.55, DZ1 - 1.0];
export const BASKET = [DX1 - 0.75, DZ1 - 2.3];
// the attendant's folding table and chair at the north-east corner, the lost-property box on it
export const TABLE = [DX1 - 1.0, DZ0 + 1.6];

// ---------- the deck as a place (places/pool.js), in the sports chunk's frame ----------
const box = ([x, z], w, d) => [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
// walkable: the deck inside its fence, round the pool
const I_WALKS = [[DX0 + 0.12, DX1 - 0.12, DZ0 + 0.08, DZ1 - 0.12]];
// what stands on it: the pool and its coping (with the starting blocks), the chair, the benches, the loungers, the
// reel, the rack and basket, the table, the shower posts along the pavilion's wall
const I_BLOCKS = [
  ...FLOODLIGHTS.map((p) => box(p, 0.45, 0.45)),
  ...BAG_RACKS.map(([x, z]) => box([x + 0.38, z], 1.15, 0.44)),
  [WATER[0] - COPING, WATER[1] + COPING, WATER[2] - COPING - 0.35, WATER[3] + COPING],
  box(CHAIR, 0.75, 0.75),
  ...BENCHES.map(([x, z]) => [DX0, x + 0.32, z - BENCH_LEN / 2 - 0.05, z + BENCH_LEN / 2 + 0.05]),
  ...LOUNGERS.map(([x, z]) => [x - 0.4, x + 0.4, z - 1.0, z + 0.95]),
  [REEL.x0 - 0.15, REEL.x1 + 0.15, REEL.z - REEL.r - 0.1, DZ1],
  box(RACK, 0.9, 1.4),
  box(BASKET, 0.75, 0.75),
  box(TABLE, 1.5, 1.2),
  [MEN_X + 0.6, WOMEN_X - 0.6, DZ0, DZ0 + 0.3],
];
export const WALKS = I_WALKS.map(P.rect);
export const BLOCKS = I_BLOCKS.map(P.rect);

// the way back: into the men's changing room, its door on the pavilion's deck side (edge), from the deck in front of
// it (lane); in: where he walks out to, back from the changing room
export const EXIT = {
  edge: P.pt([MEN_X, DOOR_Z + 0.1]),
  lane: P.pt([MEN_X, DOOR_Z + 1.5]),
  in: P.pt([MEN_X, DOOR_Z + 1.9]),
};
// the women's changing room's door, the same way (Carina's: places/pool.js picks the protagonist's)
export const EXIT_W = {
  edge: P.pt([WOMEN_X, DOOR_Z + 0.1]),
  lane: P.pt([WOMEN_X, DOOR_Z + 1.5]),
  in: P.pt([WOMEN_X, DOOR_Z + 1.9]),
};
// the named spots on the deck: the top of the steps, the north end behind the blocks, by the chair, between the
// benches, by the float rack
export const SPOTS = {
  pool_steps: P.pt([mid(STEPS.x0, STEPS.x1), WATER[3] + COPING + 0.45]),
  pool_blocks: P.pt([POOL.x, WATER[2] - COPING - 0.85]),
  lifeguard_chair: P.pt([CHAIR[0] - 0.1, CHAIR[1] + 0.9]),
  deck_benches: P.pt([DX0 + 1.35, POOL.z]),
  float_rack: P.pt([RACK[0] - 0.95, RACK[1] - 0.6]),
};
// the nooks: the south-west corner by the steps and the reel's crank (the fence there is where things get hung up and
// forgotten); the attendant's table at the north-east corner with the lost-property box
export const NOOK_SPOTS = {
  pool_fence_corner: P.pt([DX0 + 0.7, DZ1 - 0.75]),
  pool_lost_property: P.pt([TABLE[0] - 1.15, TABLE[1] + 0.2]),
};
// the benches' seats: { x, z, top, ry } (ry: the way the sitter faces; east, at the pool)
export const SEATS = {
  deck_bench_n: { at: BENCHES[0], top: 0.34, ry: Math.PI / 2 },
  deck_bench_s: { at: BENCHES[1], top: 0.34, ry: Math.PI / 2 },
};
// the camera: a little east of north up the pool from the south-west, the pavilion behind it
export const LOOK = { yaw: -0.22, elev: 54 };
