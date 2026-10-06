// Labels never occupy another pin's touch target. Pin coordinates remain geographic.
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
export function placeLabels(points, width, height, top = 76, blocked = []) {
  const occupied = points.map(({ x, y }) => ({ x0: x - 23, x1: x + 23, y0: y - 23, y1: y + 23 }));
  occupied.push(...blocked);
  return points.map((p) => {
    for (const dy of [0, -34, 34, -68, 68]) {
      for (const left of [false, true]) {
        const dx = left ? -26 - p.width : 26;
        const box = { x0: p.x + dx, x1: p.x + dx + p.width, y0: p.y + dy - 15, y1: p.y + dy + 15 };
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
