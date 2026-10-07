// The goal when it's off screen: an arrow on the screen edge (the "To head office" and "To the dorms" buttons).
// The goal's pin is clamped to the screen by the markers; when the goal itself is off screen, the pin hides and a
// teal arrow at the edge points to it, with the goal's name. Hidden in conversations and trips, like the pins.
//
// It sits on the edge toward the goal and never covers Eric, the people and things he can use (a thing's `keep`, in
// metres, is how much ground round it counts: the plaza's fountain basin), their pins or the action prompt (issue
// #84: it sat over the fountain). Where the goal's own spot on the edge is taken, it slides along that edge to the
// nearest clear place, keeping to the side it was on while one stays clear.
import * as THREE from 'three';
import { thingBox, elBox as rect } from './screen-box.js';

const PAD = 8, // px kept between the arrow and what it keeps clear of
  STEP = 6;

export function installGoalArrow({ game, phone, paused, root }) {
  const a = document.createElement('button');
  a.className = 'goalarrow';
  a.innerHTML =
    '<span class="ar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span><span class="gn"></span>';
  a.type = 'button';
  a.hidden = true;
  a.id = 'goalArrow';
  root.appendChild(a);
  let target = null,
    last = null, // where it was drawn last frame, to keep it from hopping between two clear places
    size = [160, 44];
  a.onclick = (e) => {
    e.stopPropagation();
    if (target) game().use(target);
  };
  const v = new THREE.Vector3();
  const keepClear = (g, goal) => {
    const out = [g.ericBox?.()];
    for (const m of g.markers.list) {
      if (m === goal) continue;
      let on = false;
      try {
        on = m.enabled();
      } catch {}
      if (!on) continue;
      out.push(thingBox(g, m));
      const c = m.el.classList;
      if (m.el.style.display !== 'none' && !c.contains('crowded') && !c.contains('offscreen')) out.push(rect(m.el));
    }
    const act = document.getElementById('actMenu');
    if (act && !act.hidden) out.push(rect(act));
    // HUD controls and the optional metrics box stay clear of the moving edge button too.
    for (const id of ['minimap', 'top', 'perfHud']) {
      const el = document.getElementById(id);
      if (el && !el.hidden && el.offsetWidth) out.push(rect(el));
    }
    return out.filter((b) => b && b.x1 > 0 && b.x0 < innerWidth && b.y1 > 0 && b.y0 < innerHeight);
  };
  // the arrow's box when its point sits at (x, y); pointing right-to-left it is laid out mirrored (css .lefty)
  const arrowBox = (x, y, lefty) => {
    const [w, h] = size;
    const x0 = lefty ? x + 22 - w : x - 22;
    return { x0: x0 - PAD, x1: x0 + w + PAD, y0: y - h / 2 - PAD, y1: y + h / 2 + PAD };
  };
  const hits = (b, list) => list.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);

  const loop = () => {
    requestAnimationFrame(loop);
    const g = game();
    if (!g || !g.place || !g.markers) {
      a.hidden = true;
      return;
    }
    const b = document.body;
    const goals = g.markers.list.filter((m) => {
      try {
        return m.enabled() && m.goal && m.goal();
      } catch {
        return false;
      }
    });
    let show = false;
    for (const m of goals) {
      m.anchor(v);
      v.project(g.place.camera);
      const behind = v.z > 1;
      const W = innerWidth,
        H = innerHeight;
      let x = ((v.x + 1) / 2) * W,
        y = ((1 - v.y) / 2) * H;
      if (behind) {
        x = W - x;
        y = H - y;
      }
      const off = behind || x < 8 || x > W - 8 || y < 30 || y > H - 8;
      m.el.classList.toggle('offscreen', off);
      if (!off || show) continue;
      show = true;
      target = m;
      // the arrow sits where the goal would be, pulled in to the screen edge, and points out toward it
      // #top uses CSS zoom and can grow when a hint wraps. A fixed top inset
      // leaves no horizontal escape once that row reaches the arrow's old y.
      const top = rect(document.getElementById('top'));
      const edge = 34,
        topM = Math.max(phone() ? 150 : 90, (top?.y1 || 0) + size[1] / 2 + PAD),
        botM = phone() ? 110 : 70;
      let ax = Math.max(edge, Math.min(W - edge, x)),
        ay = Math.max(topM, Math.min(H - botM, y));
      const lefty = ax > W / 2;
      // on a side edge it slides up or down; on the top or bottom edge, across
      const side = ax !== x;
      const list = keepClear(g, m);
      if (hits(arrowBox(ax, ay, lefty), list)) {
        const [lo, hi, at] = side ? [topM, H - botM, ay] : [edge, W - edge, ax];
        const prev = last && last.m === m ? (side ? last.y : last.x) : at;
        let best = null,
          cost = Infinity;
        for (let p = lo; p <= hi; p += STEP) {
          const bx = side ? arrowBox(ax, p, lefty) : arrowBox(p, ay, lefty);
          if (hits(bx, list)) continue;
          const c = Math.abs(p - at) + 0.5 * Math.abs(p - prev);
          if (c < cost) ((cost = c), (best = p));
        }
        if (best != null) side ? (ay = best) : (ax = best);
      }
      last = { m, x: ax, y: ay };
      a._keep = list; // for game3d/tools/goal-arrow-check.mjs
      a.style.transform = `translate(${Math.round(ax)}px, ${Math.round(ay)}px)`;
      a.querySelector('.ar').style.transform = `rotate(${Math.atan2(y - ay, x - ax)}rad)`;
      a.classList.toggle('lefty', lefty);
      const nm = m.label || '';
      if (a.querySelector('.gn').textContent !== nm) a.querySelector('.gn').textContent = nm;
      a.setAttribute('aria-label', `Goal: ${nm}, off screen. Walk there`);
    }
    a.hidden = show
      ? b.classList.contains('busy') ||
        b.classList.contains('trip') ||
        b.classList.contains('at-title') ||
        paused() ||
        !!(window.__onboard && window.__onboard.active)
      : true;
    if (!a.hidden && a.offsetWidth) size = [a.offsetWidth, a.offsetHeight];
  };
  loop();
}
