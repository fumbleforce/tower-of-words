// The campus's walks in the island's frame, for lining its planted beds up with them (outdoor/bed-layout.js). Kept
// light (no Three.js, no scene modules) so the planting plans and the map can load it: the mapped paths, the cross
// street and the shed street north of the court. The walk grid's own list is campus/plan.js WALKS; the unit test
// (game3d/test/unit/walk-ground.test.mjs) checks every strip bed stands behind a kerb of that real ground.
import { CHUNKS } from '../island-chunks.js';
import { CAMPUS_PATHS } from '../island-campus.js';
import { CROSS, STREET_W } from '../forecourt/cross-plan.js';

const [ax, az] = CHUNKS.campus.at;
const island = ([x0, x1, z0, z1]) => [x0 + ax, x1 + ax, z0 + az, z1 + az];
// the coast path and the cross path to it, in the island's frame (campus/plan.js WALKS takes them from here)
export const COAST_WALKS = [
  [-42.6, -40.6, -39, -25.4],
  [-40.6, -20.75, -27.4, -25.4],
];
export const BED_WALKS = [
  ...CAMPUS_PATHS.map((p) => [p.rect[0], p.rect[2], p.rect[1], p.rect[3]]),
  island(CROSS),
  island([CROSS[0], CROSS[0] + STREET_W, CROSS[2] - 4, CROSS[3]]), // the shed street at the junction and north of it
  ...COAST_WALKS,
];
