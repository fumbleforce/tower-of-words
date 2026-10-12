// Canonical walk-end furniture used by close and distant coast views.
import { planter } from '../../kit/planting/planter.js';
import { lamps } from './furniture.js';

export function walkEndFurniture(parts, walk, at, turn, clip, lights) {
  for (const { at: point, face = 0, variant = 'long', ...options } of walk.planters || []) {
    const position = at(...point);
    if (clip(...position)) planter(parts, { ...options, at: position, face: face + turn, variant, shrubs: 5 });
  }
  const set = lights || { glowParts: [], lit: [] },
    origin = at(0, 0),
    poolPoint = at(...(walk.lampPoolOffset || [0, 0]));
  lamps(
    set,
    parts,
    (walk.lamps || []).map((point) => at(...point)).filter((point) => clip(...point)),
    { pool: 3.2, poolShift: poolPoint.map((value, i) => value - origin[i]) },
  );
  if (!lights) for (const geo of set.glowParts) parts.geo('#f4ede2', geo, { cast: false });
}
