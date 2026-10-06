// Non-interactive geographic captions. Place buttons and their availability remain in view.js.
// Positions describe existing districts, never new destinations or travel connections.
export const DISTRICTS = [
  ['OLD WORKS', -54, -128],
  ['HARBOUR', -94, -89],
  ['OFFICE QUARTER', 6, -82],
  ['SPORTS GROUNDS', 72, -101],
  ['DORMITORIES', 101, -24],
  ['SEAFRONT', 34, 49],
];
export function drawCartography(ctx, v, blocked = []) {
  if (v.detail === false) return;
  ctx.save();
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  const size = Math.min(13, Math.max(10, v.scale * 3.4));
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [text, x, z] of DISTRICTS) {
    const px = v.w / 2 + (x - v.cx) * v.scale,
      py = v.h / 2 + (z - v.cz) * v.scale;
    if (py < 105 || py > v.h - 45 || px < 50 || px > v.w - 50) continue;
    const width = ctx.measureText(text).width;
    if (blocked.some((r) => px + width / 2 + 6 > r.x0 && px - width / 2 - 6 < r.x1 && py + 12 > r.y0 && py - 12 < r.y1))
      continue;
    const sea = text === 'SEAFRONT';
    ctx.strokeStyle = sea ? '#21444e' : '#d6d8b8';
    ctx.lineWidth = 4;
    ctx.strokeText(text, px, py);
    ctx.fillStyle = sea ? '#a9c2b7' : '#536e60';
    ctx.fillText(text, px, py);
  }
  ctx.restore();
}
export function scaleMetres(scale) {
  // The island frame is 1.5 metres/unit; keep the ruler between 45 and 120 CSS px.
  return [10, 20, 50, 100, 200].find((m) => (m / 1.5) * scale >= 45) || 200;
}
