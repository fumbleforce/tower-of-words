// Fit geography into the part of the map left clear by its header and controls.
export function fitMap(bounds, view, frame) {
  const scale = Math.min(
    (frame.right - frame.left) / (bounds.x1 - bounds.x0),
    (frame.bottom - frame.top) / (bounds.z1 - bounds.z0),
  );
  return {
    scale,
    cx: (bounds.x0 + bounds.x1) / 2 + (view.w - frame.left - frame.right) / (2 * scale),
    cz: (bounds.z0 + bounds.z1) / 2 + (view.h - frame.top - frame.bottom) / (2 * scale),
  };
}

export function clampMap(view, bounds, frame, minScale) {
  view.scale = Math.max(minScale, Math.min(14, view.scale));
  const axis = (value, lo, hi, size, start, end) => {
    const min = lo + (size / 2 - start) / view.scale;
    const max = hi + (size / 2 - end) / view.scale;
    return min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value));
  };
  view.cx = axis(view.cx, bounds.x0, bounds.x1, view.w, frame.left, frame.right);
  view.cz = axis(view.cz, bounds.z0, bounds.z1, view.h, frame.top, frame.bottom);
}

// A small map above an expanded phone sheet may have no room for the decorative north fade.
export function mapFrame(rect, headers, controls, northFade, bounds) {
  const visible = (elements) =>
    elements.filter((el) => !el.hidden && el.offsetWidth).map((el) => el.getBoundingClientRect());
  const top = Math.max(rect.top, ...visible(headers).map((r) => r.bottom)) - rect.top + 12;
  const blocks = visible(controls);
  const rightTools = blocks.filter((r) => r.left > rect.left + rect.width / 2);
  const frames = [
    { right: rect.width - 12, bottom: Math.min(rect.bottom, ...blocks.map((r) => r.top)) - rect.top - 12 },
    {
      right: Math.min(rect.right, ...rightTools.map((r) => r.left)) - rect.left - 12,
      bottom: Math.min(rect.bottom, ...blocks.filter((r) => !rightTools.includes(r)).map((r) => r.top)) - rect.top - 12,
    },
  ].map((f) => ({
    left: 12,
    right: Math.max(13, f.right),
    top: top + Math.min(northFade, Math.max(0, f.bottom - top - 40)),
    bottom: Math.max(top + 1, f.bottom),
  }));
  const view = { w: rect.width, h: rect.height };
  return frames.sort((a, b) => fitMap(bounds, view, b).scale - fitMap(bounds, view, a).scale)[0];
}

export function sizeMap(area, canvas) {
  const rect = area.getBoundingClientRect();
  const w = Math.max(1, rect.width),
    h = Math.max(1, rect.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  return { rect, w, h, dpr };
}
