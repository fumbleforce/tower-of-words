// The fountain ring and avenues use their builders' pure plans, in island coordinates.
import { toIsland } from '../../scenes/island-layout.js';
import { F, R, BAND, ARCS, AVENUE, LANE, TERRACE, LINK } from '../../scenes/plaza/plan.js';
import { STREET_TREES, NORTH_STREET, CROSS_X } from '../../scenes/plaza/east-plan.js';
import { AVENUE as NORTH_AVENUE, BACK } from '../../scenes/plaza/north-plan.js';
const point = (x, z) => toIsland('plaza', x, z);
export const avenueTrees = [
  ...AVENUE.flatMap((d) =>
    [-1, 1].flatMap((side) =>
      [-1, 1].flatMap((edge) => {
        const x = F[0] + side * d;
        if (side > 0 && x > CROSS_X[0] - 0.8 && x < CROSS_X[1] + 0.8) return [];
        const lane = side < 0 ? LANE.w : LANE.e;
        return [[...point(x, edge < 0 ? lane[2] - 2.1 : lane[3] + 2.1), 1.1]];
      }),
    ),
  ),
  ...STREET_TREES.map((z) => [...point(NORTH_STREET[0] - 2.1, z), 1.1]),
  ...NORTH_AVENUE.map((x) => [...point(x, BACK[2] - 2.1), 1.1]),
];
export function drawGardens(ctx, crown, detail) {
  const [x, z] = point(...F);
  ctx.strokeStyle = '#759269';
  ctx.lineWidth = BAND;
  for (const [a, b] of Object.values(ARCS)) {
    ctx.beginPath();
    ctx.arc(x, z, R + BAND / 2, a, b);
    ctx.stroke();
  }
  const rect = ([a, b, c, d], color) => {
    const [x0, z0] = point(a, c),
      [x1, z1] = point(b, d);
    ctx.fillStyle = color;
    ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
  };
  rect(TERRACE, '#d4bc99');
  rect(LINK, '#e3c9a1');
  if (!detail) return;
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) continue;
    const a = (i * Math.PI) / 8,
      r = R + BAND * 0.42;
    crown(ctx, x + Math.cos(a) * r, z + Math.sin(a) * r, 0.9);
  }
  for (const [tx, tz, size] of avenueTrees) crown(ctx, tx, tz, size);
}
