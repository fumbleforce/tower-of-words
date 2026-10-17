// The dorm quarter, the coast and the southern garden share one grid. A 20 cm cell keeps the longest trips (the
// terrace to the onsen) within the search's limit while keeping several cells across every walk, the 1 m park loop
// and boardwalk too; body clearance still uses the exact rectangles.
import { Nav } from '../../movement/navigation.js';
import { BOUNDS, WALKS, FURNITURE, inRect } from './plan.js';

export function coastNavigation() {
  const [x0, x1, z0, z1] = BOUNDS;
  const nav = new Nav(x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, 0.2);
  nav.extra = (x, z) => WALKS.some((r) => inRect(x, z, r, -0.02));
  for (const r of FURNITURE) nav.block(...r);
  return nav;
}
