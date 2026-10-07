import { occupiedGrid, routeBetween } from './paths.js';

const noop = () => {};
function cuts(a, b, o) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((o.x - a[0]) * dx + (o.z - a[1]) * dz) / length)) : 0;
  return Math.hypot(a[0] + t * dx - o.x, a[1] + t * dz - o.z) < o.r + 0.35;
}
// Reroute intersecting lines once per occupied-space change, including newly spawned walkers.
// Local steering still enforces the unchanged body/scene clearances on every physical step.
export function scenePaths(base) {
  let key = '',
    grid = base,
    circles = [];
  const seen = new WeakMap();
  return {
    get grid() {
      return grid;
    },
    update(list, player, wide, scale = 1) {
      // Match walkStep's outer give-way band as well as the player body.
      // A route through that band would repeatedly stop before reaching its waypoint.
      const occupied = wide
        ? list
            .filter((b) => !b.crowd && !b.rig?._walk)
            .map((b) => ({ x: b.x, z: b.z, r: b.r + (b === player ? wide + 0.4 * scale : 0) + 0.05 }))
        : [];
      const next = occupied.map((b) => [Math.round(b.x * 4), Math.round(b.z * 4), b.r].join(',')).join(';');
      if (next !== key) {
        key = next;
        circles = occupied;
        grid = circles.length ? occupiedGrid(base, circles) : base;
      }
      if (!circles.length) return noop;
      return (w) => {
        if (!w.onGrid || w.wait) return;
        const previous = seen.get(w);
        if (previous?.key === key && previous.line === w.line) return;
        const p = w.r.root.position,
          points = [[p.x, p.z], ...w.line.slice(w.i)];
        if (points.some((q, i) => i && circles.some((o) => cuts(points[i - 1], q, o)))) {
          const route = routeBetween(grid, points[0], w.goal);
          if (route?.length > 1) {
            w.line = [points[0], ...route, ...w.tail];
            w.i = 1;
            w.offA = false;
            w.best = Infinity;
            w.held = 0;
            w.rejoins = 0;
            w.ghost = false;
          }
        }
        seen.set(w, { key, line: w.line });
      };
    },
  };
}
