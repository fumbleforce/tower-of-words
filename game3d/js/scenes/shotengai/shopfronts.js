import { DISPLAY, displayCenters } from './shopfront-plan.js';
import { displayGoods } from './shopfront-goods.js';

// Carve the real mass, including shared multi-bay buildings. No hidden full box remains behind the goods.
export function recessedShopWall(box, { ua, ub, h, depth, v0, n, centers }) {
  const { width, bottom, top, recess } = DISPLAY;
  if (!centers.length) return [box(ub - ua - 0.06, h, depth, (ua + ub) / 2, 0, v0 + depth / 2)];
  const front = v0 + (n > 0 ? depth : 0),
    backDepth = depth - recess;
  const parts = [box(ub - ua - 0.06, h, backDepth, (ua + ub) / 2, 0, v0 + depth / 2 - (n * recess) / 2)];
  let edge = ua + 0.03;
  for (const c of [...centers].sort((a, b) => a - b)) {
    const left = c - width / 2,
      right = c + width / 2;
    parts.push(box(left - edge, h, recess, (edge + left) / 2, 0, front - (n * recess) / 2));
    parts.push(box(width, bottom, recess, c, 0, front - (n * recess) / 2));
    parts.push(box(width, h - top, recess, c, top, front - (n * recess) / 2));
    edge = right;
  }
  parts.push(box(ub - 0.03 - edge, h, recess, (edge + ub - 0.03) / 2, 0, front - (n * recess) / 2));
  return parts;
}

export function shopfront(p, id, u, front, n) {
  const { width, bottom, top, projection } = DISPLAY;
  const frame = id === 'bakery' ? '#667579' : id === 'store' ? '#627f8b' : '#537366';
  for (const [side, x] of displayCenters(u).entries()) {
    // The transform keeps all display dimensions in the front's own outward frame.
    const put = (c, w, h, d, dx, y, z, opts = {}) => p.box(c, w, h, d, x + dx, y, front + n * z, opts);
    put('#dad9d1', width - 0.02, top - bottom - 0.02, 0.025, 0, bottom + 0.01, -0.65, { surf: 'plaster' });
    for (const dx of [-width / 2, width / 2])
      put(frame, 0.07, top - bottom + 0.09, 0.13, dx, bottom - 0.04, 0.025, { surf: 'metal' });
    put(frame, width, 0.07, 0.13, 0, top - 0.035, 0.025, { surf: 'metal' });
    put('#bcc1bd', width + 0.12, 0.075, 0.43, 0, bottom - 0.055, 0.065, { surf: 'stone' });
    // Projecting low display base: a real case, visible from the unchanged phone overview.
    put(frame, width - 0.1, 0.43, 0.8, 0, bottom, -0.12, { surf: 'metal' });
    put('#344651', width - 0.19, 0.035, 0.72, 0, 0.81, -0.12);
    displayGoods(p, id, x, front, n, side);
    put(frame, width - 0.1, 0.04, 0.8, 0, 0.81, -0.12, { surf: 'metal' });
    // Glazing only across the lower case. The tall back display remains visible through a light front pane.
    put('#bad3d6', width - 0.18, 0.29, 0.014, 0, 0.84, projection - 0.018, {
      cast: false,
      opts: { transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.15 },
    });
    for (const dx of [-width / 2 + 0.075, width / 2 - 0.075])
      put(frame, 0.025, 0.34, 0.025, dx, 0.82, projection - 0.02, { surf: 'metal' });
    put('#ccd4cf', width - 0.18, 0.018, 0.1, 0, 0.82, projection + 0.025, { surf: 'metal' });
    // A shutter rolled into its fitted head box, rather than a floating decorative stripe.
    put(frame, width + 0.13, 0.13, 0.19, 0, top + 0.035, 0.035, { surf: 'metal' });
    for (let k = 0; k < 3; k++)
      put('#9daaa8', width + 0.04, 0.012, 0.015, 0, top + 0.065 + k * 0.027, 0.138, { surf: 'metal' });
  }
  // Door-side pilasters and a recessed doormat leave the original door/cards unobscured.
  for (const dx of [-0.67, 0.67]) p.box(frame, 0.075, 1.86, 0.12, u + dx, 0, front + n * 0.01, { surf: 'metal' });
  p.box('#5b6265', 1.12, 0.012, 0.28, u, 0.035, front + n * 0.17, { surf: 'stone' });
}
