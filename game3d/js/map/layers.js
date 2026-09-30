// The island layout (scenes/island-layout.js) as line drawing for the map: coast, green, paths, buildings, and the
// chunks' walk rectangles. Everything goes through P(x, z) -> screen px, so the same drawing lies on the island
// frame or on the reference as drawn (perspective).
import { BUILDINGS, PATHS, GREEN, COAST, CHUNKS, footprint, toIsland } from '../scenes/island-layout.js';

export const INK = {
  building: '#ff9de2',
  path: '#f2f2f2',
  green: '#8fd18a',
  coast: '#6fb7ff',
  walk: '#ff6b6b',
};

function shape(ctx, P, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, z], i) => (i ? ctx.lineTo(...P(x, z)) : ctx.moveTo(...P(x, z))));
  if (close) ctx.closePath();
}
function rectPts([x0, z0, x1, z1]) {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}
function circlePts([x, z, r], n = 40) {
  return Array.from({ length: n }, (_, i) => [
    x + r * Math.cos((i / n) * 2 * Math.PI),
    z + r * Math.sin((i / n) * 2 * Math.PI),
  ]);
}
// a polyline of width w as its outline
function ribbon(line, w) {
  const left = [],
    right = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)],
      b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * (w / 2),
      nz = (dx / l) * (w / 2);
    left.push([p[0] + nx, p[1] + nz]);
    right.unshift([p[0] - nx, p[1] - nz]);
  });
  return [...left, ...right];
}

export function drawLayout(ctx, P, { labels = true } = {}) {
  ctx.save();
  ctx.lineJoin = 'round';
  // coast
  ctx.strokeStyle = INK.coast;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  shape(ctx, P, COAST.line, false);
  ctx.stroke();
  ctx.setLineDash([]);
  // green
  ctx.strokeStyle = INK.green;
  ctx.lineWidth = 1.2;
  for (const g of GREEN) {
    ctx.fillStyle = INK.green + '33';
    shape(ctx, P, g.poly || rectPts(g.rect));
    ctx.fill();
    ctx.stroke();
  }
  // paths
  ctx.strokeStyle = INK.path;
  for (const p of PATHS) {
    ctx.fillStyle = INK.path + '26';
    const pts = p.line ? ribbon(p.line, p.w) : p.circle ? circlePts(p.circle) : rectPts(p.rect);
    ctx.setLineDash(p.kind === 'beam' ? [4, 4] : []);
    shape(ctx, P, pts);
    ctx.fill();
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // buildings, with their storeys
  ctx.lineWidth = 1.6;
  for (const b of BUILDINGS) {
    const pts = footprint(b);
    ctx.fillStyle = INK.building + '30';
    ctx.strokeStyle = INK.building;
    shape(ctx, P, pts);
    ctx.fill();
    ctx.stroke();
    if (!labels) continue;
    const c = pts.reduce((s, [x, z]) => [s[0] + x / pts.length, s[1] + z / pts.length], [0, 0]);
    tag(ctx, `${b.id} ${b.storeys}F`, ...P(...c), INK.building);
  }
  // the chunks' walk rectangles
  ctx.strokeStyle = INK.walk;
  ctx.lineWidth = 2;
  for (const [name, c] of Object.entries(CHUNKS)) {
    const [x0, x1, z0, z1] = c.walk;
    shape(
      ctx,
      P,
      rectPts([x0, z0, x1, z1]).map(([x, z]) => toIsland(name, x, z)),
    );
    ctx.setLineDash(c.level ? [5, 4] : []);
    ctx.stroke();
  }
  ctx.restore();
}

export function tag(ctx, text, x, y, color) {
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width;
  ctx.fillStyle = '#15181dcc';
  ctx.fillRect(x - w / 2 - 3, y - 8, w + 6, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 3);
}
