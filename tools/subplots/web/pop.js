// One small popover (speaker picker, add-beat menu), anchored under the control that opened it.
const { document, window } = globalThis;
const pop = () => document.getElementById('pop');

export function openPop(anchor, fill) {
  const el = pop();
  el.className = 'pop';
  el.replaceChildren();
  fill(el);
  el.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  const below = r.bottom + 6;
  el.style.top = (below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below) + 'px';
}

export function closePop() {
  pop().hidden = true;
}

document.addEventListener('pointerdown', e => {
  if (!pop().hidden && !pop().contains(e.target)) closePop();
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
