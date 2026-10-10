// Doorways a scene never starts in (Jørgen, 2026-10-04: "I didnt make it fully onto the platform before the scene
// triggered, trapping me in the door"). A place lists its door openings as `doorways`: [{ id, x0, x1, z0, z1 }], the
// opening's width by the wall's thickness, in the place's x/z. Eric is in one while any of his body overlaps it.
// Trigger zones sit clear of them (docs/game/places.md); if a scene starts with him in one anyway (a tap on a door,
// someone talking to him in it), he first walks out of it to free floor, and the day test fails if he is still in it.

// the doorway Eric's body (radius r) overlaps at (x, z), or null
export function doorwayAt(place, x, z, r = place?.nav?.R ?? 0.17) {
  return (place?.doorways || []).find((d) => x > d.x0 - r && x < d.x1 + r && z > d.z0 - r && z < d.z1 + r) || null;
}

// the nearer free floor point just out of the doorway, on either side of its wall, or null if both are blocked
export function clearOf(place, d, x, z, r = place?.nav?.R ?? 0.17) {
  const m = r + 0.15,
    // along the wall: kept a body's width in from the jambs
    clamp = (v, a, b) => Math.max(Math.min(a + r, (a + b) / 2), Math.min(Math.max(b - r, (a + b) / 2), v));
  // the opening is wider than the wall is thick: the way through crosses the thin side
  const pts =
    d.x1 - d.x0 >= d.z1 - d.z0
      ? [d.z0 - m, d.z1 + m].map((pz) => [clamp(x, d.x0, d.x1), pz])
      : [d.x0 - m, d.x1 + m].map((px) => [px, clamp(z, d.z0, d.z1)]);
  const free = pts.filter(([px, pz]) => !place.nav?.free || place.nav.free(px, pz));
  free.sort((a, b) => Math.hypot(a[0] - x, a[1] - z) - Math.hypot(b[0] - x, b[1] - z));
  return free[0] || null;
}

// at a scene's start: Eric out of any doorway he stands in, by a short walk (game.walkTo). game.onDoorway (the day
// test, testmode.js) hears of each one: the doorway, and the one he's still in after the walk (null when clear).
export async function walkClear(game) {
  const eric = game.player,
    p = eric?.root?.position;
  if (!p || eric.seated) return;
  const d = doorwayAt(game.place, p.x, p.z);
  if (!d) return;
  const to = clearOf(game.place, d, p.x, p.z);
  if (to) await game.walkTo(to[0], to[1]);
  game.onDoorway?.(d, doorwayAt(game.place, p.x, p.z));
}
