import { TABLES, COUNTER, SEATS } from './plan.js';
const STEEL = '#7e898d',
  TEAL = '#457b78',
  WOOD = '#bd956d';
export function chair(kit, x, z, ry) {
  kit.box(TEAL, 0.42, 0.045, 0.42, x, 0.295, z, { surf: 'plastic', ry });
  kit.box(TEAL, 0.42, 0.35, 0.045, x - Math.sin(ry) * 0.19, 0.34, z - Math.cos(ry) * 0.19, { surf: 'plastic', ry });
  for (const dx of [-0.16, 0.16])
    for (const dz of [-0.16, 0.16]) kit.box(STEEL, 0.025, 0.295, 0.025, x + dx, 0, z + dz, { surf: 'metal' });
}
export function tray(kit, x, y, z, food = true) {
  kit.box('#697c81', 0.48, 0.024, 0.32, x, y, z, { surf: 'plastic' });
  if (!food) return;
  kit.cyl('#eee7d7', 0.095, 0.085, 0.055, x - 0.1, y + 0.024, z, { surf: 'ceramic' });
  kit.cyl('#f3ede1', 0.075, 0.065, 0.03, x - 0.1, y + 0.07, z);
  kit.cyl('#743c32', 0.065, 0.05, 0.06, x + 0.1, y + 0.024, z + 0.06, { surf: 'ceramic' });
  kit.box('#cea465', 0.19, 0.008, 0.012, x + 0.04, y + 0.03, z - 0.1);
}
export function dining(kit, nav) {
  TABLES.forEach(({ x, z }, i) => {
    kit.box(WOOD, 2.7, 0.07, 0.8, x, 0.53, z, { surf: 'laminate' });
    for (const dx of [-1.1, 1.1])
      for (const dz of [-0.26, 0.26]) kit.box(STEEL, 0.05, 0.53, 0.05, x + dx, 0, z + dz, { surf: 'metal' });
    nav.block(x - 1.42, x + 1.42, z - 0.48, z + 0.48);
    for (const dx of [-0.85, 0, 0.85])
      for (const side of [-1, 1]) {
        chair(kit, x + dx, z + side * 0.73, side < 0 ? 0 : Math.PI);
        nav.block(x + dx - 0.24, x + dx + 0.24, z + side * 0.73 - 0.24, z + side * 0.73 + 0.24);
      }
    kit.box('#eee7d7', 0.16, 0.12, 0.12, x, 0.6, z, { surf: 'ceramic' });
    kit.box('#f7f3e8', 0.1, 0.08, 0.01, x, 0.68, z, { surf: 'paper' });
    if (i % 2 === 0) tray(kit, x - 0.85, 0.6, z + 0.06);
  });
  for (const seat of Object.values(SEATS)) {
    chair(kit, seat.x, seat.z, seat.ry);
    nav.block(seat.x - 0.25, seat.x + 0.25, seat.z - 0.25, seat.z + 0.25);
  }
}
export function service(kit, nav) {
  const { x, z, w, d, h } = COUNTER;
  kit.box(TEAL, w, h - 0.06, d, x, 0, z, { surf: 'laminate' });
  kit.box(STEEL, w + 0.08, 0.06, d + 0.08, x, h - 0.06, z, { surf: 'metal' });
  // Tray rail, inset hot-food wells, covered cooker and cashier end.
  kit.box(STEEL, w, 0.025, 0.2, x, h - 0.08, z + d / 2 + 0.17, { surf: 'metal' });
  for (let i = 0; i < 5; i++) {
    const px = x - 3.3 + i * 1.2;
    kit.box('#373e40', 0.77, 0.035, 0.5, px, h, z, { surf: 'metal' });
    kit.box(['#c48847', '#647b3e', '#8c5136'][i % 3], 0.62, 0.04, 0.37, px, h + 0.025, z);
    kit.box(STEEL, 0.035, 0.48, 0.035, px - 0.42, h, z - 0.25, { surf: 'metal' });
  }
  kit.box('#e4ddd0', 6.0, 0.09, 0.65, x - 0.9, 1.14, z - 0.1, { surf: 'metal' });
  for (let i = 0; i < 7; i++) tray(kit, x - 5.1, h + i * 0.025, z, false);
  kit.cyl('#eee9df', 0.25, 0.25, 0.32, x + 3.65, h, z, { surf: 'plastic' });
  kit.box('#283b3f', 0.45, 0.3, 0.25, x + 5.0, h, z, { surf: 'monitor' });
  nav.block(x - w / 2 - 0.1, x + w / 2 + 0.1, z - d / 2, z + d / 2 + 0.35);
  // Water dispenser and cups, separate from the hot-food queue.
  kit.box(TEAL, 1.3, 0.6, 0.65, 9.5, 0, -6.25, { surf: 'laminate' });
  kit.box('#abb8ba', 0.65, 0.6, 0.5, 9.3, 0.6, -6.25, { surf: 'metal' });
  kit.box('#263f45', 0.42, 0.25, 0.03, 9.3, 0.76, -5.99, { surf: 'metal' });
  for (const dx of [0, 0.16]) kit.cyl('#f4efe4', 0.06, 0.045, 0.15, 9.8 + dx, 0.6, -6.25, { surf: 'ceramic' });
  nav.block(8.8, 10.2, -6.65, -5.85);
  // Return trolley at the front west, with separate shelves and used trays.
  for (const dx of [-0.5, 0.5])
    for (const dz of [-0.3, 0.3]) kit.box(STEEL, 0.04, 0.85, 0.04, -10.3 + dx, 0, -0.5 + dz, { surf: 'metal' });
  for (const y of [0.16, 0.45, 0.75]) {
    kit.box(STEEL, 1.04, 0.025, 0.64, -10.3, y, -0.5, { surf: 'metal' });
    tray(kit, -10.3, y + 0.03, -0.5, false);
  }
  nav.block(-10.85, -9.75, -0.85, -0.15);
}
