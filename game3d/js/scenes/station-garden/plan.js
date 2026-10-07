// One footprint for the playable garden, its furniture and the shop street's navigation.
import { toLocal, CHUNKS, BUILDINGS } from '../island-layout.js';
import { WALKS } from '../island-west.js';
import { coveredWalk } from '../station-shed.js';

export const local = ([x, z]) => toLocal('shotengai', x, z);
export function rect([x0, z0, x1, z1]) {
  const [a, b] = local([x0, z0]),
    [c, d] = local([x1, z1]);
  return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)];
}
const station = BUILDINGS.find((b) => b.id === 'station').rect;
const [fx, fz] = CHUNKS.forecourt.at;
export const COVERED = coveredWalk({
  x0: station[0] - fx,
  x1: station[2] - fx,
  zS: station[3] - fz,
}).map(([x0, x1, z0, z1]) => [x0 + fx, z0 + fz, x1 + fx, z1 + fz]);
export const PATH_IDS = ['station_walk', 'garden_square', 'south_link', 'garden_arcade', 'garden_return'];
export const PATHS = PATH_IDS.map((id) => WALKS[id].rect);
// Stop short of the existing glass and the stair riser. Neither is a new station entrance.
export const WALKS_LOCAL = [
  ...PATHS,
  ...COVERED.map(([x0, z0, x1, z1], i) => [x0 + 0.16, z0 + (i ? 0.2 : 0.16), x1 - 0.16, z1 + (i ? 0.25 : -0.16)]),
].map(rect);
export const BENCHES = Object.fromEntries(
  WALKS.garden_square.benches.map(([ix, iz], i) => {
    const [x, z] = local([ix, iz]),
      out = local([ix - 0.9, iz]);
    return [
      `garden_bench_${i + 1}`,
      {
        x,
        z,
        ry: Math.atan2(out[0] - x, out[1] - z),
        top: 0.34,
        out,
        island: [ix, iz],
      },
    ];
  }),
);
export const BENCH_BLOCKS = Object.values(BENCHES).map(({ island: [x, z] }) =>
  rect([x - 0.42, z - 0.85, x + 0.3, z + 0.85]),
);
export const PATCHES = [
  [-15.0, 22.8],
  [-14.7, 20.7],
].map(local);
export const TOOL_PARK = local([-16.9, 22.45]);
export const TOOL_BLOCK = rect([-17.2, 22.15, -16.6, 22.75]);
export const BOUNDS = WALKS_LOCAL.reduce(
  (a, r) => [Math.min(a[0], r[0]), Math.max(a[1], r[1]), Math.min(a[2], r[2]), Math.max(a[3], r[3])],
  [Infinity, -Infinity, Infinity, -Infinity],
);
