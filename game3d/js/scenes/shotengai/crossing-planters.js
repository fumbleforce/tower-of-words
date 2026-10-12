// Four shallow troughs mark the arcade's crossing without narrowing its centre route.
// Both district views use these island positions and the asset library's planter.
import { planter } from '../../kit/planting/planter.js';
import { MARKET_ROUTE as M } from '../market-route.js';
import { ROWS_Z } from '../island-south.js';

export function crossingPlanters(parts, local = (p) => p) {
  const blocks = [];
  for (const [i, x] of [M.x0 + 0.28, M.x1 - 0.28].entries())
    for (const [j, z] of [ROWS_Z.arcade + 0.75, ROWS_Z.south - 0.75].entries()) {
      const placed = planter(parts, {
        at: local([x, z]),
        face: Math.PI / 2,
        variant: 'long',
        w: 1.1,
        d: 0.45,
        h: 0.4,
        shrubs: 3,
        seed: 419 + i * 7 + j,
      });
      for (const [x0, x1, z0, z1] of placed.blocks) blocks.push([x0 - 0.02, z0 - 0.02, x1 + 0.02, z1 + 0.02]);
    }
  return blocks;
}
