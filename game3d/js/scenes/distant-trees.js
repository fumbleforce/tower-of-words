// Shared island positions keep the green seen down a street consistent from its neighbours.
import { coastLand } from './island-west.js';
import { HALF_EDGE } from './island-plan.js';
import { shapeOf, inside, bbox, hash } from './skyline-geom.js';

function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

export function nearPlot(shape, x, z, margin = 0) {
  if (inside(shape, x, z)) return true;
  return shape.some((a, i) => segmentDistance(x, z, a, shape[(i + 1) % shape.length]) < margin);
}

export function clearTreeSite(L, x, z, radius) {
  if (
    (L.BUILDINGS || []).some((b) => {
      const shape = shapeOf(b);
      return shape && nearPlot(shape, x, z, radius + 0.4);
    })
  )
    return false;
  return !(L.PATHS || []).some((p) => {
    const shape = shapeOf(p);
    if (shape) return nearPlot(shape, x, z, radius + 0.4);
    if (p.circle) return Math.hypot(x - p.circle[0], z - p.circle[1]) < p.circle[2] + radius + 0.4;
    const points = p.line || p.points || [];
    const width = p.w || p.width || 1.5;
    return points.slice(1).some((b, i) => segmentDistance(x, z, points[i], b) < width / 2 + radius + 0.4);
  });
}

const cache = new WeakMap();
export function islandTreeSpots(L) {
  if (cache.has(L)) return cache.get(L);
  const land = coastLand(L.COAST.line),
    spots = [];
  const add = (x, z, key, big = 1) => {
    const radius = (1.1 + hash(key + 'r') * 0.9) * big;
    if (!inside(land, x, z) || !clearTreeSite(L, x, z, radius)) return;
    spots.push({
      x,
      z,
      r: radius,
      c: Math.floor(hash(key + 'c') * 4),
      s: hash(key + 's'),
    });
  };
  for (const g of L.GREEN || []) {
    const shape = shapeOf(g);
    if (!shape) continue;
    const [x0, x1, z0, z1] = bbox(shape);
    for (let x = x0; x < x1; x += 3.4)
      for (let z = z0; z < z1; z += 3.4) {
        const key = `${g.id}|${Math.round(x)}|${Math.round(z)}`;
        const px = x + hash(key + 'x') * 3.4,
          pz = z + hash(key + 'z') * 3.4;
        if (hash(key) < 0.66 && inside(shape, px, pz)) add(px, pz, key);
      }
  }
  const north = Math.min(...HALF_EDGE.map((p) => p[1]));
  const [x0, x1, z0] = bbox(land);
  for (let x = x0; x < x1; x += 4.2)
    for (let z = z0; z < north + 8; z += 4.2) {
      const key = `n|${Math.round(x)}|${Math.round(z)}`;
      if (Math.sin(x * 0.07) + Math.cos(z * 0.09 + x * 0.03) < -0.2 || hash(key) < 0.25) continue;
      add(x + hash(key + 'x') * 4.2, z + hash(key + 'z') * 4.2, key, 1.6);
    }
  cache.set(L, spots);
  return spots;
}
