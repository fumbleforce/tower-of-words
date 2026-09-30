// Flat drawing on a canvas for the finds' pictures (finds/pictures-*.js): filled shapes, no outlines.
const TAU = Math.PI * 2;
export function poly(c, pts, fill) {
  c.fillStyle = fill;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
export function circle(c, x, y, r, fill) {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}
export function sky(c, w, h, top, bottom, at = 1) {
  const g = c.createLinearGradient(0, 0, 0, h * at);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}
export function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
