// The performance box follows the real HUD bottom, including wrapped/scaled phone controls.
export function overlayTop(rects, gap = 10) {
  return Math.ceil(Math.max(12, ...rects.filter((r) => r.width > 0 && r.height > 0).map((r) => r.bottom)) + gap);
}
export function followHud(el) {
  const top = document.getElementById('top');
  function place() {
    const y = document.body.classList.contains('at-title') ? 12 : overlayTop(top ? [top.getBoundingClientRect()] : []);
    el.style.top = `${y}px`;
    el.style.maxHeight = `calc(100dvh - ${y + 12}px)`;
  }
  if (top) new ResizeObserver(place).observe(top);
  addEventListener('resize', place);
  new MutationObserver(place).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  place();
  return place;
}
