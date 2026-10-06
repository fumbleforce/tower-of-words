import { catHop, catWalk } from '../creatures/cat.js';
import { bodies } from '../movement/shared.js';
import { clearOf, freeNear } from '../movement/navigation.js';

// Tama's hop is in the train's walk-grid space. Keep its whole path clear of
// the person who just petted her, before handing movement back to routed walking.
export function catLanding(game, rig) {
  const list = bodies(game),
    self = list.find((b) => b.root === rig.root);
  const others = list.filter((b) => b.root !== rig.root);
  const { x, z } = rig.root.position,
    nav = game.place.nav;
  const radius = (self?.r || 0.18) + 0.05;
  const clearHop = (tx, tz) => {
    const dx = tx - x,
      dz = tz - z,
      length2 = dx * dx + dz * dz;
    return others.every((b) => {
      const t = length2 ? Math.max(0, Math.min(1, ((b.x - x) * dx + (b.z - z) * dz) / length2)) : 0;
      return Math.hypot(b.x - x - t * dx, b.z - z - t * dz) >= b.r + radius;
    });
  };
  const landing = freeNear(nav, others, x, z * 0.55, radius, clearHop);
  // freeNear's general fallback is its input. A hop must never use that fallback
  // when the aisle is occupied: remain on the bench rather than land on someone.
  return nav.free(...landing, nav.R + 0.02) && clearOf(others, ...landing, radius) && clearHop(...landing)
    ? landing
    : null;
}

export async function moveTrainCat(game, rig, target) {
  if (rig.root.position.y > 0.05) {
    const landing = catLanding(game, rig);
    if (!landing) return;
    await catHop(game, rig, landing, 0);
  }
  await catWalk(game, rig, target, { speed: 1.0, end: 'sit' });
}
