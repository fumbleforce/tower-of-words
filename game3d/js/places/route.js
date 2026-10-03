// Walk routes for people the story moves: A* over the place's walk grid (the same one the player uses), so
// nobody cuts through walls, glass, counters or benches. The last point is always the exact target (a seat or a
// spot can sit just inside a blocker). Falls back to `fallback` (or a straight line) if the grid finds no way.
export function route(nav, from, to, fallback) {
  const p = nav.path(from.x, from.z, to[0], to[1]);
  const pts = p && p.length ? p.slice() : fallback || [to];
  const last = pts[pts.length - 1];
  if (Math.hypot(last[0] - to[0], last[1] - to[1]) > 0.02) pts.push([to[0], to[1]]);
  return pts;
}
