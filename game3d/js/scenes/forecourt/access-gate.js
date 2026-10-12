// The same closed staff entrance is built from either side, in the forecourt frame.
import { fence } from '../../kit/street/fence.js';
import { STEEL } from '../../kit/core/palette.js';
import { ACCESS_FENCE, ACCESS_GATE, ACCESS_BLOCKS } from './plan.js';

export function accessGate(p) {
  for (const [from, to] of ACCESS_FENCE) fence(p, { from, to, variant: 'service', seed: 548 });
  const [a, b] = ACCESS_GATE;
  const x = (a[0] + b[0]) / 2,
    z = a[1];
  // Two independently framed leaves meet at a bolted latch. Their lower panels meet without a gap.
  for (const [from, to] of [
    [a, [x, z]],
    [[x, z], b],
  ]) {
    fence(p, { from, to, variant: 'service', pitch: 4, seed: 549 });
    const hx = from[0] === a[0] ? a[0] : b[0];
    for (const y of [0.25, 1.85]) p.box(STEEL.mid, 0.16, 0.12, 0.14, hx, y, z);
  }
  for (const side of [-1, 1]) {
    p.box(STEEL.pale, 0.37, 0.085, 0.055, x + side * 0.14, 1.05, z + side * 0.085);
    p.box(STEEL.mid, 0.085, 0.14, 0.07, x, 1.0, z + side * 0.12);
    p.box('#c1c8ca', 0.46, 0.26, 0.025, x - 0.75, 1.45, z + side * 0.055, { cast: false });
    p.box(STEEL.dark, 0.25, 0.035, 0.028, x - 0.75, 1.57, z + side * 0.07, { cast: false });
    p.box(STEEL.dark, 0.16, 0.025, 0.028, x - 0.75, 1.5, z + side * 0.07, { cast: false });
  }
  return ACCESS_BLOCKS;
}
