// Juice: particles on a canvas over the room, screen shake, floating numbers, and flights along an
// arc. Everything here is decoration; nothing waits on it except the flights, which return promises.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let canvas, g, host, parts = [], running = false;
export const speed = { k: new URLSearchParams(location.search).has('fast') ? 0.25 : 1 };
export const ms = t => t * speed.k;
export const sleep = t => new Promise(r => setTimeout(r, ms(t)));

export function initFx(room) {
  host = room;
  canvas = document.createElement('canvas');
  canvas.className = 'fx';
  room.append(canvas);
  g = canvas.getContext('2d');
  const fit = () => {
    const r = room.getBoundingClientRect();
    const d = Math.min(2, devicePixelRatio || 1);
    canvas.width = r.width * d;
    canvas.height = r.height * d;
    g.setTransform(d, 0, 0, d, 0, 0);
  };
  new ResizeObserver(fit).observe(room);
  fit();
}

/** A point's centre in room coordinates. */
export function centre(el, dy = 0.5) {
  const r = el.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height * dy };
}

function loop() {
  running = true;
  g.clearRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.life -= 1;
    p.vy += p.grav;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    const a = Math.max(0, Math.min(1, p.life / p.fade));
    g.save();
    g.globalAlpha = a;
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.fillStyle = p.color;
    if (p.shape === 'ring') {
      g.strokeStyle = p.color;
      g.lineWidth = 3 * a;
      g.beginPath();
      g.arc(0, 0, p.size * (1 + (1 - a) * 2.5), 0, Math.PI * 2);
      g.stroke();
    } else if (p.shape === 'dot') {
      g.beginPath();
      g.arc(0, 0, p.size * a, 0, Math.PI * 2);
      g.fill();
    } else if (p.shape === 'glyph') {
      g.font = `700 ${p.size}px "Zen Kaku Gothic New", sans-serif`;
      g.textAlign = 'center';
      g.shadowColor = p.color;
      g.shadowBlur = 12;
      g.fillText(p.text, 0, 0);
    } else g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    g.restore();
  }
  if (parts.length) requestAnimationFrame(loop);
  else {
    running = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function add(p) {
  if (reduced && p.shape !== 'ring') return;
  parts.push({ vx: 0, vy: 0, grav: 0, drag: 1, rot: 0, spin: 0, size: 6, life: 40, fade: 20, shape: 'rect', ...p });
  if (!running) requestAnimationFrame(loop);
}

/** Confetti and a ring where something lands well. */
export function burst(x, y, colors, n = 18, power = 1) {
  add({ x, y, color: colors[0], shape: 'ring', size: 10, life: 26, fade: 26 });
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (2 + Math.random() * 4) * power;
    add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, grav: 0.18, drag: 0.97, color: colors[i % colors.length], size: 5 + Math.random() * 6, spin: (Math.random() - 0.5) * 0.4, life: 50 + Math.random() * 30, fade: 25 });
  }
}

/** Small dull puffs where something lands badly. */
export function puff(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    add({ x, y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.2 - 0.6, drag: 0.94, color: 'rgba(200,210,220,.7)', shape: 'dot', size: 4 + Math.random() * 5, life: 40, fade: 30 });
  }
}

/** Light motes rising off a machine as a command takes hold (the kotodama shimmer). */
export function motes(x, y, w, h, text) {
  for (let i = 0; i < 26; i++)
    add({ x: x - w / 2 + Math.random() * w, y: y + h / 2 - Math.random() * h, vy: -0.6 - Math.random() * 1.2, vx: (Math.random() - 0.5) * 0.4, color: i % 3 ? '#8ff5e4' : '#ffffff', shape: 'dot', size: 1.5 + Math.random() * 2.5, life: 50 + Math.random() * 40, fade: 30 });
  [...text].filter(c => c.trim()).forEach((c, i) =>
    add({ x: x - w / 2 + Math.random() * w, y: y - h * 0.1 + Math.random() * h * 0.3, vy: -0.7 - Math.random() * 0.5, color: '#bffcf1', shape: 'glyph', text: c, size: 16 + Math.random() * 8, life: 70 + i * 3, fade: 40 }),
  );
}

/** The room shakes; strength 0 to 1. */
export function shake(el, strength = 0.4) {
  if (reduced || strength <= 0) return;
  const s = 3 + strength * 12;
  const k = Array.from({ length: 7 }, (_, i) => {
    const f = 1 - i / 7;
    return { transform: `translate(${(Math.random() - 0.5) * s * f}px, ${(Math.random() - 0.5) * s * f}px) rotate(${(Math.random() - 0.5) * strength * 1.2 * f}deg)` };
  });
  k.push({ transform: 'none' });
  el.animate(k, { duration: 380 + strength * 200, easing: 'ease-out' });
}

/** A number that floats up from a point and fades. */
export function floater(x, y, text, cls = '') {
  const el = document.createElement('div');
  el.className = `floater ${cls}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  host.append(el);
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%, -18px) scale(1.15)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -54px) scale(1)', opacity: 0 },
    ],
    { duration: ms(1100), easing: 'cubic-bezier(.2,.8,.3,1)' },
  ).onfinish = () => el.remove();
}

/**
 * Flies an element (already in the room, absolutely placed) from a to b along an arc, spinning a
 * little. Resolves when it lands.
 */
export function fly(el, a, b, { height = 120, duration = 620, spin = 200, scaleTo = 1 } = {}) {
  const frames = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * height;
    const s = 1 + (scaleTo - 1) * t + Math.sin(Math.PI * t) * 0.25;
    frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${spin * t}deg) scale(${s})` });
  }
  const anim = el.animate(frames, { duration: ms(duration), easing: 'cubic-bezier(.35,.05,.55,1)', fill: 'forwards' });
  return anim.finished.catch(() => {});
}
