// Keep a tooltip beside its pin, clear of the player, target and controls.
// Coordinates are viewport CSS pixels; the caller handles the layer's origin.
export function pinTipPosition(pin, width, height, viewport, avoid = []) {
  const gap = 8;
  const cx = (pin.x0 + pin.x1) / 2,
    cy = (pin.y0 + pin.y1) / 2;
  const keep = [pin, ...avoid.filter(Boolean)];
  const candidates = [
    [cx - width / 2, pin.y0 - gap - height],
    [pin.x1 + gap, cy - height / 2],
    [pin.x0 - gap - width, cy - height / 2],
    [cx - width / 2, pin.y1 + gap],
  ];
  // When a body touches the pin, its edge is the nearest place the label can fit.
  for (const box of keep) {
    candidates.push(
      [box.x1 + gap, cy - height / 2],
      [box.x0 - gap - width, cy - height / 2],
      [cx - width / 2, box.y0 - gap - height],
      [cx - width / 2, box.y1 + gap],
    );
  }
  let best = null;
  for (const [index, [left, top]] of candidates.entries()) {
    const x = Math.round(Math.max(viewport.x0 + gap, Math.min(viewport.x1 - width - gap, left))),
      y = Math.round(Math.max(viewport.y0 + gap, Math.min(viewport.y1 - height - gap, top)));
    const overlap = keep.reduce(
      (sum, box) =>
        sum +
        Math.max(0, Math.min(x + width, box.x1) - Math.max(x, box.x0)) *
          Math.max(0, Math.min(y + height, box.y1) - Math.max(y, box.y0)),
      0,
    );
    // Rank the nearest label edge: a long label beside the pin should not lose
    // to a distant label above a body merely because its center is farther away.
    const distance = Math.hypot(Math.max(x - cx, 0, cx - x - width), Math.max(y - cy, 0, cy - y - height));
    if (!best || overlap < best.overlap || (overlap === best.overlap && distance < best.distance))
      best = { x, y, overlap, distance };
    // Keep the familiar above-pin position when it is already clear.
    if (index === 0 && overlap === 0) break;
  }
  return { x: best.x, y: best.y };
}
