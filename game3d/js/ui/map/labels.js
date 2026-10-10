// Labels never occupy another pin's touch target. Pin coordinates remain geographic.
export const labelRect = (p, dx, dy, padding = 15) => ({
  x0: p.x + dx,
  x1: p.x + dx + p.width,
  y0: p.y + dy - padding,
  y1: p.y + dy + padding,
});
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
export function placeLabels(points, width, height, top = 76, blocked = []) {
  const occupied = points.map(({ x, y }) => ({
    x0: x - 23,
    x1: x + 23,
    y0: y - 23,
    y1: y + 23,
  }));
  occupied.push(...blocked);
  return points.map((p) => {
    for (const dy of [0, -34, 34, -68, 68, -102, 102]) {
      for (const dx of [26, -26 - p.width, ...(dy ? [-p.width / 2] : [])]) {
        const box = labelRect(p, dx, dy);
        if (
          box.x0 < 8 ||
          box.x1 > width - 8 ||
          box.y0 < top ||
          box.y1 > height - 8 ||
          occupied.some((o) => overlaps(box, o))
        )
          continue;
        occupied.push(box);
        return { id: p.id, dx, dy };
      }
    }
    return { id: p.id, hidden: true };
  });
}

export function drawLabelLeader(ctx, point, offset) {
  const edge = offset.dx < 0 ? offset.dx + point.width : offset.dx;
  ctx.strokeStyle = '#f7f0df';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(point.x + (offset.dx < 0 ? -18 : 18), point.y + offset.dy);
  ctx.lineTo(point.x + edge, point.y + offset.dy);
  ctx.stroke();
  ctx.strokeStyle = '#35544b';
  ctx.lineWidth = 1.25;
  ctx.stroke();
}
