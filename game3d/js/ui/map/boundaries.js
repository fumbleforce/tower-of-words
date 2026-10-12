import { STAFF_GATE, STAFF_FENCE } from '../../scenes/forecourt/access-plan.js';
import { PROTECTED_EDGES } from '../../scenes/outdoor/protected-edges.js';

export function drawBoundaries(ctx, scale) {
  ctx.save();
  ctx.strokeStyle = '#52646a';
  ctx.lineWidth = Math.max(0.45, 1 / scale);
  ctx.lineCap = 'square';
  for (const [a, b] of [...STAFF_FENCE, STAFF_GATE, ...Object.values(PROTECTED_EDGES).flat()]) {
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  }
  const [a, b] = STAFF_GATE,
    x = (a[0] + b[0]) / 2;
  ctx.fillStyle = '#52646a';
  ctx.fillRect(x - 0.4, a[1] - 0.65, 0.8, 1.3);
  ctx.restore();
}
