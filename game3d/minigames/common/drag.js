// Moving things between places on the stage: drag from a source to a target, or tap one and
// then the other. Works with mouse, touch, keyboard (Enter on each) and the test driver.

const SVGNS = 'http://www.w3.org/2000/svg';

export function centre(el, inside) {
  const r = el.getBoundingClientRect(), o = inside.getBoundingClientRect();
  return { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top };
}

/** An overlay for arrows, sized to its parent; one per stage. */
export function arrowLayer(parent) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add('arrows');
  svg.innerHTML = `<defs><marker id="head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>`;
  parent.append(svg);
  return svg;
}

// A gentle curve from a to b that stops short of both ends, so it never covers a face.
function curve(a, b, pad = 58) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, cut = Math.min(pad, len / 3);
  const s = { x: a.x + ux * cut, y: a.y + uy * cut }, e = { x: b.x - ux * cut, y: b.y - uy * cut };
  const bend = Math.min(40, len / 5), mx = (s.x + e.x) / 2 - uy * bend, my = (s.y + e.y) / 2 + ux * bend;
  return `M${s.x} ${s.y} Q${mx} ${my} ${e.x} ${e.y}`;
}

/** Draws (or redraws) an arrow from element a to element b, or to a point. */
export function arrow(svg, a, b, cls = '', path = null) {
  const host = svg.parentElement;
  const p = path || document.createElementNS(SVGNS, 'path');
  const from = centre(a, host), to = b instanceof HTMLElement ? centre(b, host) : b;
  p.setAttribute('d', curve(from, to, b instanceof HTMLElement ? 58 : 0));
  p.setAttribute('class', `arrow ${cls}`);
  p.setAttribute('marker-end', 'url(#head)');
  if (!path) svg.append(p);
  return p;
}

/** Animates a copy of `thing` from one element to another; resolves when it lands. */
export async function fly(thing, from, to, host, ms = 650) {
  const a = centre(from, host), b = centre(to, host);
  const ghost = thing.cloneNode(true);
  ghost.classList.add('flying');
  host.append(ghost);
  const w = ghost.offsetWidth / 2, h = ghost.offsetHeight / 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = ghost.animate(
    [
      { transform: `translate(${a.x - w}px, ${a.y - h}px) scale(.9)` },
      { transform: `translate(${(a.x + b.x) / 2 - w}px, ${Math.min(a.y, b.y) - h - 40}px) scale(1.1)`, offset: 0.5 },
      { transform: `translate(${b.x - w}px, ${b.y - h}px) scale(.9)` },
    ],
    { duration: reduce ? 1 : ms, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' },
  );
  await anim.finished;
  return ghost;
}

/**
 * Waits for the player to move something from a source to a target.
 * sources, targets: elements. mode 'arrow' draws a line as they drag; 'carry' moves a copy.
 * Resolves { from, to } with the elements, or null if `signal` aborts first.
 */
export function pick({ sources, targets, host, svg = null, mode = 'arrow', signal = null }) {
  return new Promise(resolve => {
    let from = null, line = null, ghost = null, armed = false, start = null, over = null;
    const all = [...new Set([...sources, ...targets])];
    sources.forEach(s => s.classList.add('can-drag'));
    const targetAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const t = el && targets.find(t => t === el || t.contains(el));
      return t && t !== from ? t : null;
    };
    const mark = t => {
      if (over) over.classList.remove('over');
      over = t;
      if (over) over.classList.add('over');
    };
    const clear = () => {
      if (line) line.remove();
      if (ghost) ghost.remove();
      line = ghost = null;
      mark(null);
      if (from) from.classList.remove('lifted');
      from = null;
      armed = false;
      host.classList.remove('picking');
    };
    const finish = to => {
      const f = from;
      clear();
      off();
      resolve({ from: f, to });
    };
    const begin = (s, e) => {
      from = s;
      s.classList.add('lifted');
      host.classList.add('picking');
      start = { x: e.clientX, y: e.clientY };
      if (mode === 'carry') {
        ghost = s.cloneNode(true);
        ghost.classList.add('ghost');
        host.append(ghost);
      }
    };
    const move = e => {
      if (!from || armed) return;
      const o = host.getBoundingClientRect(), p = { x: e.clientX - o.left, y: e.clientY - o.top };
      if (svg) line = arrow(svg, from, p, 'live', line);
      if (ghost) ghost.style.transform = `translate(${p.x - ghost.offsetWidth / 2}px, ${p.y - ghost.offsetHeight / 2}px)`;
      mark(targetAt(e.clientX, e.clientY));
    };
    const down = e => {
      const s = sources.find(s => s === e.target || s.contains(e.target));
      if (armed) {
        const t = targets.find(t => t === e.target || t.contains(e.target));
        if (t && t !== from) return finish(t);
        clear();
        if (!s) return;
      }
      if (!s) return;
      e.preventDefault();
      begin(s, e);
    };
    const up = e => {
      if (!from || armed) return;
      const t = targetAt(e.clientX, e.clientY);
      if (t) return finish(t);
      const still = Math.hypot(e.clientX - start.x, e.clientY - start.y) < 12;
      if (still) {
        // A tap: keep it lifted and wait for a tap on where it goes.
        armed = true;
        if (line) line.remove();
        if (ghost) ghost.remove();
        line = ghost = null;
      } else clear();
    };
    const key = e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = document.activeElement;
      if (!all.includes(el)) return;
      e.preventDefault();
      if (from && targets.includes(el) && el !== from) return finish(el);
      if (sources.includes(el)) {
        clear();
        begin(el, { clientX: 0, clientY: 0 });
        armed = true;
      }
    };
    host.addEventListener('pointerdown', down);
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('keydown', key);
    if (signal) signal.addEventListener('abort', () => (clear(), off(), resolve(null)), { once: true });
    function off() {
      sources.forEach(s => s.classList.remove('can-drag'));
      host.removeEventListener('pointerdown', down);
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('keydown', key);
    }
  });
}
