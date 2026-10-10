import * as L from '../island-layout.js';
import * as F from '../forecourt/plan.js';
import { CAMPUS_PATHS } from '../island-campus.js';
import { COAST_WALKS } from './bed-walks.js';
export const CHUNK = 'campus';
const AT = L.CHUNKS.campus.at;
export const pt = ([x, z]) => [x - AT[0], z - AT[1]];
export const rect = ([x0, x1, z0, z1]) => [x0 - AT[0], x1 - AT[0], z0 - AT[1], z1 - AT[1]];
export const inRect = (x, z, [x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
const paths = CAMPUS_PATHS.map((p) => rect([p.rect[0], p.rect[2], p.rect[1], p.rect[3]]));
// the service lane's east end, where it meets the canteen's loading yard: [x, z0, z1]
export const LANE_END = (() => {
  const r = CAMPUS_PATHS.find((p) => p.id === 'back_lane_west').rect;
  return [r[2] - AT[0], r[1] - AT[1], r[3] - AT[1]];
})();
export const PRINT_DOOR = pt([-24.3, -43.3]);
export const PRINT_STEP = pt([-23.35, -43.3]);
export const BENCH = { x: pt([-37, -33.25])[0], z: pt([-37, -33.25])[1], top: 0.34, ry: 0, out: pt([-37, -32.5]) };
export const WALKS = [
  ...paths,
  [F.SHED_ST[0], F.SHED_ST[1], F.SHED_ST[2], F.BARRIER_Z + 1.5],
  F.CROSS,
  F.STAFF_PATH, // to the wing's staff door
  F.SHELTER_FLOOR, // the bike shelter's floor and its path (its bikes: F.SHELTER_BIKES)
  ...COAST_WALKS.map(rect),
];
const exit = (edge, lane, arrive, inside, zone) => ({
  edge: pt(edge),
  lane: pt(lane),
  arrive: pt(arrive),
  in: pt(inside),
  zone: rect(zone),
});
const shedX = (F.SHED_ST[0] + F.SHED_ST[1]) / 2 + AT[0],
  foreZ = F.BARRIER_Z + AT[1];
export const EXITS = {
  forecourt: exit(
    [shedX, foreZ + 0.5],
    [shedX, foreZ - 0.8],
    [shedX, foreZ + 0.5],
    [shedX, foreZ - 3],
    [shedX - 1.4, shedX + 1.4, foreZ - 1.1, foreZ + 1],
  ),
  office_quarter: exit([4.5, -49.5], [4.5, -48], [4.5, -49.5], [4.5, -46.5], [3, 6, -50, -47.8]),
  office_shed: exit([-19.25, -49.5], [-19.25, -48], [-19.25, -49.5], [-19.25, -46.5], [-20.75, -17.75, -50, -47.8]),
  harbour: exit([-41.6, -37], [-41.6, -35.8], [-41.6, -37], [-41.6, -34.2], [-42.6, -40.6, -39, -35.5]),
};
export const IN = EXITS.forecourt.in;
export const BOUNDS = WALKS.reduce(
  (a, r) => [Math.min(a[0], r[0]), Math.max(a[1], r[1]), Math.min(a[2], r[2]), Math.max(a[3], r[3])],
  [Infinity, -Infinity, Infinity, -Infinity],
);
export const SOLIDS = L.BUILDINGS.filter((b) =>
  ['head_office', 'head_office_wing', 'office_e1', 'w3', 'b_h'].includes(b.id),
).map((b) => rect([b.rect[0], b.rect[2], b.rect[1], b.rect[3]]));

export const BEDS = [
  [-39.25, -38.8, -33.6, -32.75],
  [-39.25, -38.8, -30.85, -30],
  [-34.9, -34.5, -33.6, -30],
  [-15.5, -9.4, -28, -26.8],
];
