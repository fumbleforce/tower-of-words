// The public southwest coast has one entrance, at the promenade's west end.
// The station garden's planted ends remain separate. Island rectangles follow island-west.js.
import { WALKS } from '../island-west.js';
import { toLocal } from '../island-layout.js';

export const PATH_IDS = [
  'southwest_promenade',
  'southwest_turn',
  'southwest_coast_turn',
  'southwest_rest',
  'south_lookout',
  'coast_path_south',
  'coast_lookout',
];
export const PATHS = Object.fromEntries(PATH_IDS.map((id) => [id, WALKS[id]]));
export const local = ([x, z]) => toLocal('shotengai', x, z);
export function rect([x0, z0, x1, z1]) {
  const [a, b] = local([x0, z0]),
    [c, d] = local([x1, z1]);
  return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)];
}
// A small lawn beside the resting bay is reachable by floor taps as well as held movement.
export const PLAY_LAWN = [-30.5, 30.8, -26.5, 35.2];
export const WALKS_LOCAL = [...Object.values(PATHS).map((w) => rect(w.rect)), rect(PLAY_LAWN)];
export const BOUNDS = [-14, 12.15, -111, 9.5];
export const REST_BENCHES = [
  [-25.2, 32.65, 0],
  [-22.8, 32.65, 0],
];
export const SPOTS = {
  southwest_corner: local([-44.2, 18.5]),
  southwest_west_view: local([-44.3, 10.1]),
  southwest_pine_rest: local([-24, 31.8]),
  southwest_stones: local([-28.6, 33.1]),
};
// A tall maintenance fence joins the wall to the shed, closing the undeveloped north coast.
export const NORTH_FENCE = { from: [-47.1, 7.65], to: [-32.6, 7.65] };
export const BENCHES = Object.fromEntries(
  [
    ...REST_BENCHES,
    ...['south_lookout', 'coast_lookout'].flatMap((id) => {
      const {
        rect: [x0, z0, , z1],
        look,
      } = WALKS[id];
      return [z0 + 0.9, z1 - 1.1].map((z) => [x0 + 1.1, z, look]);
    }),
  ].map(([ix, iz, angle], i) => {
    const [x, z] = local([ix, iz]),
      // Leave coastal benches from their inland side, clear of both the rail and diagonal bench footprint.
      out = local(i < 2 ? [ix, iz + 0.9] : [ix + 1.25, iz]);
    return [`southwest_bench_${i + 1}`, { x, z, top: 0.34, ry: angle - Math.PI / 2, out }];
  }),
);
// Actual station approach hammerhead footprints; taps use the clear southern lane around the first.
const PIER_HEADS = [
  [-39.45, 28.4, -38.17, 30.09],
  [-41.75, 22.47, -40.47, 24.16],
];
export const BLOCKS = [
  ...PIER_HEADS.map(rect),
  ...Object.values(BENCHES).map(({ x, z, ry }) => {
    const across = Math.abs(Math.cos(ry)) * 0.8 + Math.abs(Math.sin(ry)) * 0.3,
      depth = Math.abs(Math.sin(ry)) * 0.8 + Math.abs(Math.cos(ry)) * 0.3;
    return [x - across, x + across, z - depth, z + depth];
  }),
  rect([-26.2, 31.0, -25.4, 31.4]),
];
