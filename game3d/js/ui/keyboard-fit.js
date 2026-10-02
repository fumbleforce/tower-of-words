// The phone's on-screen keyboard (Jørgen, Galaxy S23 Chrome, 2026-10-02: "On phone the full panel doesn't show").
// Chrome and Safari keep the page full height under the keyboard and shrink only the visible area (the visual
// viewport), so a panel on the page's bottom edge sat behind the keyboard and the browser bar. While a text field
// has focus and the visible area is clearly shorter than the full screen, body.kb is set, with --kb (px from the
// page's bottom edge up to the top of the keyboard or bar) and --vvh (the visible height); style.css puts the typing
// prompt just above the keyboard and the portraits step out. Browsers that shrink the page itself (Firefox) give
// --kb 0 and the same compact layout. Only CSS changes: the 3D canvas is never resized here.
// portraits.js re-lays the stage on a change (onKeyboard). Tests can stand in a fake window.__vv (height,
// offsetTop, scale) and call window.__kbFit().
let fullH = 0,
  fullW = 0,
  was = false,
  onChange = () => {};
export const onKeyboard = (fn) => (onChange = fn);
const vv = () => window.__vv || window.visualViewport;

function fit() {
  const b = document.body;
  if (!b) return;
  const v = vv(),
    h = v ? v.height : innerHeight,
    top = v ? v.offsetTop : 0;
  // the full height for this width (a turn of the phone starts over)
  if (innerWidth !== fullW) {
    fullW = innerWidth;
    fullH = 0;
  }
  fullH = Math.max(fullH, innerHeight, h);
  const a = document.activeElement;
  const field = !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /^(text|search|)$/.test(a.type)));
  const zoomed = v && v.scale > 1.01;
  const kb = field && !zoomed && fullH - h > 120;
  b.classList.toggle('kb', kb);
  const s = document.documentElement.style;
  if (kb) {
    s.setProperty('--kb', Math.max(0, Math.round(innerHeight - (top + h))) + 'px');
    s.setProperty('--vvh', Math.round(h) + 'px');
    // a panel taller than the space scrolls inside itself; keep the field in view
    const t = a.closest('#talk');
    if (t && t.scrollHeight > t.clientHeight) {
      const r = a.getBoundingClientRect(),
        rt = t.getBoundingClientRect();
      if (r.bottom > rt.bottom - 8) t.scrollTop += r.bottom - rt.bottom + 8;
      else if (r.top < rt.top + 8) t.scrollTop -= rt.top + 8 - r.top;
    }
  }
  if (kb !== was) {
    was = kb;
    onChange();
  }
}

let raf = 0;
const soon = () => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(fit);
};
window.__kbFit = fit;
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', soon);
  window.visualViewport.addEventListener('scroll', soon);
}
addEventListener('resize', soon);
addEventListener('focusin', soon);
addEventListener('focusout', soon);
