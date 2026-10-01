// Shared by viewer.html, face-viewer.html and mio-i2i-viewer.html.
// One pointer drags to turn; two pointers pinch to zoom; the wheel zooms. No camera state lives here:
// the viewer passes rotate(dx, dy) and zoom(factor), factor > 1 meaning farther away.
export function attachOrbit(canvas, { rotate, zoom }) {
  const pts = new Map();
  let last = 0;
  const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  canvas.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    canvas.setPointerCapture(e.pointerId);
    if (pts.size === 2) last = span();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const before = [...p];
    p[0] = e.clientX; p[1] = e.clientY;
    if (pts.size === 1) rotate(e.clientX - before[0], e.clientY - before[1]);
    else if (pts.size === 2) {
      const s = span();
      if (last > 8 && s > 8) zoom(last / s);
      last = s;
    }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size === 2) last = span(); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(1 + e.deltaY * 0.001); }, { passive: false });
}
