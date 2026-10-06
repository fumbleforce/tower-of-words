// The island layout (scenes/island-layout.js) as line drawing for the map: coast, green, paths, buildings, and the
// chunks' walk rectangles. Everything goes through P(x, z) -> screen px, so the same drawing lies on the island
// frame or on the reference as drawn (perspective).
import { BUILDINGS, PATHS, GREEN, COAST, CHUNKS, footprint, toIsland } from '../scenes/island-layout.js';
import { shape, rectPts, circlePts, ribbon } from '../ui/map/shapes.js';

export const INK = {
  building: '#ff9de2',
  path: '#f2f2f2',
  green: '#8fd18a',
  coast: '#6fb7ff',
  walk: '#ff6b6b',
};

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
