// Player and objective marks stay crisp in screen pixels as the island zooms.
const TEAL = '#6fd0c6',
  INK = '#0e2a28';
export function mapGoal(ctx, x, y) {
  ctx.fillStyle = 'rgba(111, 208, 198, 0.18)';
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TEAL;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 12);
  ctx.lineTo(x - 5, y - 12);
  ctx.lineTo(x + 9, y - 12);
  ctx.lineTo(x + 5, y - 6);
  ctx.lineTo(x + 9, y);
  ctx.lineTo(x - 5, y);
  ctx.fill();
  ctx.stroke();
}
export function mapPlayer(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(111, 208, 198, 0.22)';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(a);
  ctx.fillStyle = TEAL;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(-7, -8);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
