// Line helpers for drawing the island layout (scenes/island-layout.js) on a 2D canvas, shared by the game's map
// (ui/map/base.js) and the dev map (js/map/layers.js). P(x, z) -> screen px.
export function shape(ctx, P, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, z], i) => (i ? ctx.lineTo(...P(x, z)) : ctx.moveTo(...P(x, z))));
  if (close) ctx.closePath();
}
export function rectPts([x0, z0, x1, z1]) {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}
export function circlePts([x, z, r], n = 40) {
  return Array.from({ length: n }, (_, i) => [
    x + r * Math.cos((i / n) * 2 * Math.PI),
    z + r * Math.sin((i / n) * 2 * Math.PI),
  ]);
}
// a polyline of width w as its outline
export function ribbon(line, w) {
  const left = [],
    right = [];
  // the unit normal of the piece from a to b
  const normal = (a, b) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  };
  line.forEach((p, i) => {
    // mitred: a right-angle turn gets a square corner
    const n1 = normal(line[Math.max(0, i - 1)], i ? p : line[1]),
      n2 = normal(i < line.length - 1 ? p : line[i - 1], line[Math.min(line.length - 1, i + 1)]);
    const m = [n1[0] + n2[0], n1[1] + n2[1]],
      ml = Math.hypot(...m) || 1,
      k = w / 2 / Math.max(0.2, (m[0] * n1[0] + m[1] * n1[1]) / ml);
    const nx = (m[0] / ml) * k,
      nz = (m[1] / ml) * k;
    left.push([p[0] + nx, p[1] + nz]);
    right.unshift([p[0] - nx, p[1] - nz]);
  });
  return [...left, ...right];
}
