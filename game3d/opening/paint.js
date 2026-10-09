// The 2D side of the opening: easing, the cast portraits (with their flat silhouettes and outlines made once at
// load), and the graphic pieces anime openings are cut from: sunbursts, halftone, stripes, speed lines, glints and
// big type. Everything draws in a 1920x1080 frame (op.js scales the context), as a pure function of time.
import { CAST } from './cast.js';

export const W = 1920,
  H = 1080;

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = {
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  out3: (t) => 1 - (1 - t) ** 3,
  out5: (t) => 1 - (1 - t) ** 5,
  inOut2: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inOut3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outBack: (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  // a settle with one small overshoot, for things that land
  land: (t) => (t >= 1 ? 1 : 1 - Math.exp(-7 * t) * Math.cos(9 * t)),
};
// eased progress of t across [a, b]
export const k = (t, a, b, fn = ease.out3) => fn(clamp((t - a) / (b - a)));

// a small seeded random, so every frame draws the same lines for the same time
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- images ----------
export const IMG = {};
const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(src));
    i.src = src;
  });
// The portraits: the sharper 2x copies made for the opening when they are there, else the game's own.
export async function loadPortraits(names) {
  await Promise.all(
    names.map(async (n) => {
      const hi = new URL(`../assets/opening/portraits/${n}.webp`, import.meta.url).href;
      const lo = new URL(`../assets/portraits/${n}.webp`, import.meta.url).href;
      IMG[n] = await loadImg(hi).catch(() => loadImg(lo));
    }),
  );
}

// Derived versions of a portrait, made once and kept: a flat silhouette in a colour, and an outline ring.
const derived = new Map();
function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
export function silhouette(name, color, fade = 0) {
  const key = `s|${name}|${color}|${fade}`;
  if (derived.has(key)) return derived.get(key);
  const im = fade ? faded(name, fade) : IMG[name];
  const c = canvasOf(im.width, im.height),
    g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  derived.set(key, c);
  return c;
}
// the portrait with its lower part faded out (for people standing behind others in a group)
export function faded(name, from = 0.62) {
  const key = `f|${name}|${from}`;
  if (derived.has(key)) return derived.get(key);
  const im = IMG[name];
  const c = canvasOf(im.width, im.height),
    g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const gr = g.createLinearGradient(0, im.height * from, 0, im.height);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr;
  g.fillRect(0, 0, im.width, im.height);
  derived.set(key, c);
  return c;
}
// the portrait grown by r pixels (of the image) in every direction, filled with a colour: a sticker outline
export function outline(name, color, r) {
  const key = `o|${name}|${color}|${r}`;
  if (derived.has(key)) return derived.get(key);
  const im = IMG[name];
  const p = Math.ceil(r) + 2;
  const c = canvasOf(im.width + 2 * p, im.height + 2 * p),
    g = c.getContext('2d');
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.drawImage(im, p + Math.cos(a) * r, p + Math.sin(a) * r);
  }
  g.drawImage(im, p, p);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  c.pad = p;
  derived.set(key, c);
  return c;
}

// Draw a cast portrait standing on (x, y) (bottom centre), h pixels tall in the frame.
// o: { fill (a flat colour instead of the picture), mix (0..1 of that colour over the picture), stroke (outline
// colour), strokeW (frame pixels), shadow: {dx, dy, color}, alpha, flip, crop: [x0, y0, x1, y1] fractions }
export function drawPortrait(g, name, x, y, h, o = {}) {
  const im = IMG[name];
  if (!im) return;
  const crop = o.crop || [0, 0, 1, 1];
  const sw = im.width * (crop[2] - crop[0]),
    sh = im.height * (crop[3] - crop[1]);
  const s = h / sh; // frame pixels per image pixel
  const w = sw * s;
  const x0 = x - w / 2,
    y0 = y - h;
  g.save();
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  if (o.flip) {
    g.translate(x, 0);
    g.scale(-1, 1);
    g.translate(-x, 0);
  }
  const blit = (src, pad = 0) => {
    const sx = im.width * crop[0],
      sy = im.height * crop[1];
    g.drawImage(src, sx, sy, sw + 2 * pad, sh + 2 * pad, x0 - pad * s, y0 - pad * s, w + 2 * pad * s, h + 2 * pad * s);
  };
  if (o.shadow) {
    g.save();
    g.translate(o.shadow.dx, o.shadow.dy);
    if (o.stroke) {
      const oc = outline(name, o.shadow.color, (o.strokeW || 8) / s);
      blit(oc, oc.pad);
    } else blit(silhouette(name, o.shadow.color));
    g.restore();
  }
  if (o.stroke) {
    const oc = outline(name, o.stroke, (o.strokeW || 8) / s);
    blit(oc, oc.pad);
  }
  if (o.fill && (o.mix ?? 1) >= 1) blit(silhouette(name, o.fill, o.fade || 0));
  else {
    blit(o.fade ? faded(name, o.fade) : im);
    if (o.fill && o.mix > 0) {
      g.globalAlpha *= o.mix;
      blit(silhouette(name, o.fill, o.fade || 0));
    }
  }
  g.restore();
  return { x0, y0, w, h };
}

// the cast's standing height in a portrait frame: Kuro's picture runs down to her waist and is drawn 15% smaller
// at the same face height (docs/game/cast.md); the rest share one framing
export const portraitScale = (name) => CAST.byPortrait(name)?.scale ?? 1;

// ---------- backgrounds and graphics ----------
export function fill(g, color) {
  g.fillStyle = color;
  g.fillRect(-20, -20, W + 40, H + 40);
}
export function vgrad(g, stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr;
  g.fillRect(-20, -20, W + 40, H + 40);
}
export function sunburst(g, cx, cy, rays, rot, color, widthK = 0.5, R = 2600) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < rays; i++) {
    const a0 = rot + (i / rays) * Math.PI * 2,
      a1 = a0 + ((Math.PI * 2) / rays) * widthK;
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
    g.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
    g.closePath();
  }
  g.fill();
  g.restore();
}
// halftone dots on a grid tilted by `angle`, their size following f(u) where u runs 0..1 along `dir` (radians)
export function halftone(g, color, step, angle, sizeAt, clipFn) {
  g.save();
  if (clipFn) clipFn(g);
  g.fillStyle = color;
  g.translate(W / 2, H / 2);
  g.rotate(angle);
  const R = Math.hypot(W, H) / 2 + step;
  g.beginPath();
  for (let y = -R; y <= R; y += step)
    for (let x = -R; x <= R; x += step) {
      // back to frame space for the size function
      const ca = Math.cos(angle),
        sa = Math.sin(angle);
      const fx = W / 2 + x * ca - y * sa,
        fy = H / 2 + x * sa + y * ca;
      const r = sizeAt(fx, fy) * step * 0.5;
      if (r < 0.4) continue;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, Math.PI * 2);
    }
  g.fill();
  g.restore();
}
export function stripes(g, angle, width, gap, color, offset = 0) {
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(angle);
  g.fillStyle = color;
  const R = Math.hypot(W, H) / 2 + width + gap;
  const p = width + gap;
  const o = ((offset % p) + p) % p;
  for (let x = -R - p + o; x < R; x += p) g.fillRect(x, -R, width, 2 * R);
  g.restore();
}
// radial speed lines around (cx, cy), drawn fresh on twos (12 fps) like a hand-drawn layer
export function speedLines(g, cx, cy, t, { color = '#fff', count = 90, inner = 360, seed = 7, width = 10, alpha = 1 } = {}) {
  const r = rng(seed + Math.floor(t * 12) * 131);
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = color;
  const R = 2400;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const ri = inner * (0.8 + r() * 0.9);
    const w = width * (0.3 + r() * 1.2);
    const ca = Math.cos(a),
      sa = Math.sin(a);
    g.beginPath();
    g.moveTo(cx + ca * ri, cy + sa * ri);
    g.lineTo(cx + ca * R - sa * w, cy + sa * R + ca * w);
    g.lineTo(cx + ca * R + sa * w, cy + sa * R - ca * w);
    g.fill();
  }
  g.restore();
}
// horizontal streaks for movement across the frame (dir 1 = things fly to the left)
export function streaks(g, t, { color = '#fff', count = 40, seed = 3, alpha = 0.6, y0 = 0, y1 = H, speed = 4200 } = {}) {
  const r = rng(seed);
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const y = y0 + r() * (y1 - y0),
      len = 200 + r() * 700,
      th = 1.5 + r() * 4;
    const x = ((((r() * 3000 - t * speed * (0.6 + r())) % 3000) + 3000) % 3000) - 500;
    g.fillRect(x, y, len, th);
  }
  g.restore();
}
// a four-point star glint
export function glint(g, x, y, size, color = '#fff', alpha = 1, rot = 0) {
  if (size <= 0.5 || alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = color;
  g.beginPath();
  const s = size,
    q = size * 0.12;
  g.moveTo(0, -s);
  g.quadraticCurveTo(q, -q, s, 0);
  g.quadraticCurveTo(q, q, 0, s);
  g.quadraticCurveTo(-q, q, -s, 0);
  g.quadraticCurveTo(-q, -q, 0, -s);
  g.fill();
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
  rg.addColorStop(0, color);
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.globalAlpha *= 0.7;
  g.fillRect(-s, -s, 2 * s, 2 * s);
  g.restore();
}
export function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
export function soft(g, x, y, r, color, alpha = 1) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, color);
  rg.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.restore();
}

// ---------- type ----------
export const FONT = {
  jp: '"OP Dela", "Zen Kaku Gothic New", sans-serif',
  big: '"OP Barlow XB", "Barlow Condensed", "Arial Narrow", sans-serif',
  mid: '"OP Barlow SB", "Barlow Condensed", "Arial Narrow", sans-serif',
  ui: '"Zen Kaku Gothic New", sans-serif',
};
// Text with letter spacing, an optional outline and shadow. Returns its width.
export function text(g, str, x, y, o = {}) {
  const size = o.size || 64;
  g.save();
  g.font = `${o.weight || ''} ${size}px ${o.font || FONT.big}`.trim();
  g.textBaseline = o.baseline || 'alphabetic';
  g.letterSpacing = `${(o.tracking || 0) * size}px`;
  const w = g.measureText(str).width - (o.tracking || 0) * size;
  const ax = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
  g.textAlign = 'left';
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  if (o.shadow) {
    g.fillStyle = o.shadow.color;
    g.fillText(str, x + ax + o.shadow.dx, y + o.shadow.dy);
  }
  if (o.stroke) {
    g.lineJoin = 'round';
    g.lineWidth = o.strokeW || size * 0.12;
    g.strokeStyle = o.stroke;
    g.strokeText(str, x + ax, y);
  }
  g.fillStyle = o.color || '#fff';
  g.fillText(str, x + ax, y);
  g.restore();
  return w;
}
// characters that drop in one after another; each one's own time is t - i*stagger
export function typeIn(g, str, x, y, t, o = {}) {
  const chars = [...str];
  const size = o.size || 64;
  g.save();
  g.font = `${o.weight || ''} ${size}px ${o.font || FONT.jp}`.trim();
  g.letterSpacing = `${(o.tracking || 0) * size}px`;
  const widths = chars.map((c) => g.measureText(c).width);
  g.restore();
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = o.align === 'center' ? x - total / 2 : x;
  chars.forEach((c, i) => {
    const lt = t - i * (o.stagger ?? 0.06);
    if (lt > 0) {
      const p = ease.land(clamp(lt / (o.dur || 0.35)));
      const s = lerp(o.from ?? 1.8, 1, p);
      g.save();
      g.translate(cx + widths[i] / 2, y - size * 0.35);
      g.scale(s, s);
      text(g, c, 0, size * 0.35, { ...o, align: 'center', alpha: clamp(lt / 0.08) * (o.alpha ?? 1) });
      g.restore();
    }
    cx += widths[i];
  });
  return total;
}

// ---------- sky things ----------
// a flock of gulls: simple M shapes flapping on twos. birds: [{x, y, s, ph}] in frame pixels
export function gulls(g, birds, t, color = 'rgba(30,40,70,0.85)') {
  g.save();
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const tt = Math.floor(t * 12) / 12;
  for (const b of birds) {
    const f = Math.sin(tt * 9 + b.ph); // wing beat
    const s = b.s;
    g.lineWidth = Math.max(1.5, s * 0.16);
    g.beginPath();
    g.moveTo(b.x - s, b.y - f * s * 0.45);
    g.quadraticCurveTo(b.x - s * 0.45, b.y - s * 0.35 - f * s * 0.2, b.x, b.y);
    g.quadraticCurveTo(b.x + s * 0.45, b.y - s * 0.35 - f * s * 0.2, b.x + s, b.y - f * s * 0.45);
    g.stroke();
  }
  g.restore();
}
// a lens flare along the line from the sun (sx, sy) through the frame centre
export function flare(g, sx, sy, a = 1) {
  if (a <= 0.01) return;
  const cx = W / 2,
    cy = H / 2;
  const dx = cx - sx,
    dy = cy - sy;
  g.save();
  g.globalCompositeOperation = 'lighter';
  soft(g, sx, sy, 520, 'rgba(255,214,170,0.35)', a);
  soft(g, sx, sy, 160, 'rgba(255,246,228,0.8)', a);
  const ghosts = [
    [0.35, 46, 'rgba(255,190,150,0.16)'],
    [0.62, 22, 'rgba(160,220,255,0.22)'],
    [0.9, 90, 'rgba(150,200,255,0.10)'],
    [1.25, 34, 'rgba(255,170,210,0.16)'],
    [1.6, 140, 'rgba(140,255,220,0.07)'],
  ];
  for (const [k, r, c] of ghosts) soft(g, sx + dx * k, sy + dy * k, r, c, a);
  // a thin horizontal streak through the sun
  const gr = g.createLinearGradient(sx - 900, 0, sx + 900, 0);
  gr.addColorStop(0, 'rgba(255,220,190,0)');
  gr.addColorStop(0.5, 'rgba(255,236,214,0.5)');
  gr.addColorStop(1, 'rgba(255,220,190,0)');
  g.globalAlpha = a * 0.8;
  g.fillStyle = gr;
  g.fillRect(sx - 900, sy - 2, 1800, 4);
  g.restore();
}
// project a world point to frame pixels with the stage camera; null if behind
export function toFrame(camera, v3) {
  const p = v3.clone().project(camera);
  if (p.z > 1) return null;
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
}
