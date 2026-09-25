// Amakawa opening: shots. Each shot is draw(lt, u, t, fx, cut): lt = seconds into the shot, u = 0..1 progress.
'use strict';
let CUTS = [], BEATS = [], DOWNS = [], DUR = 100;
const P = {}; // per-asset positions (face boxes, glint spots) filled from data below

// ---------- palette ----------
const C = {
  teal: [0.07, 0.62, 0.62], ink: [0.05, 0.07, 0.12], sky: [0.35, 0.62, 0.92], white: [1, 1, 1], coral: [0.92, 0.42, 0.32],
  green: [0.13, 0.78, 0.53], silver: [0.86, 0.89, 0.93], pink: [0.95, 0.25, 0.55], violet: [0.36, 0.22, 0.58], navy: [0.07, 0.12, 0.26],
};
const css = (c, a = 1) => `rgba(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0},${a})`;

// ---------- beat helpers ----------
function lastBeat(t, list = BEATS) { let b = -1e9; for (const x of list) { if (x <= t + 1e-4) b = x; else break; } return b; }
const beatPulse = (t, k = 7) => Math.exp(-(t - lastBeat(t)) * k);
const barPulse = (t, k = 5) => Math.exp(-(t - lastBeat(t, DOWNS)) * k);
function beatIndexIn(lt, cut) { return BEATS.filter(b => b >= cut.start - 1e-3 && b <= cut.start + lt + 1e-4).length - 1; }
const punch = (lt, k = 9, a = 0.05) => 1 + a * Math.exp(-lt * k);

// ---------- 2D text + particles ----------
const FONT = { jp: '"ZenBlack", "Noto Sans CJK JP", sans-serif', jpb: '"ZenBold", "Noto Sans CJK JP", sans-serif', en: '"BarlowSemi", "Arial Narrow", sans-serif', enx: '"BarlowX", "Arial Narrow", sans-serif' };
function star(x, y, r, a, ctx, col = '255,255,255') {
  if (a <= 0.01 || r <= 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.6);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(${col},${a})`;
  for (const [dx, dy, l] of [[1, 0, 1], [0, 1, 1], [0.7, 0.7, 0.45], [0.7, -0.7, 0.45]]) {
    ctx.beginPath();
    const w = r * 0.07;
    ctx.moveTo(x - dx * r * l, y - dy * r * l); ctx.lineTo(x - dy * w, y + dx * w); ctx.lineTo(x + dx * r * l, y + dy * r * l); ctx.lineTo(x + dy * w, y - dx * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// glints: points [x,y] in screen px; each pops on a beat index then fades
function glints(ctx, pts, t, seed = 0, size = 46) {
  const bt = lastBeat(t), k = BEATS.indexOf(bt);
  pts.forEach((p, i) => {
    for (const back of [0, 1]) {
      const bi = k - back;
      if (bi < 0) continue;
      if (hash(bi * 13.1 + i * 7.7 + seed) > 0.45) continue;
      const age = t - BEATS[bi];
      const a = Math.exp(-age * 4) * clamp(age * 30);
      star(p[0], p[1], size * (0.6 + 0.6 * hash(i + seed)) * (1 + age), a, ctx);
    }
  });
}
function waterSparkle(ctx, t, box, n = 40, seed = 1, size = 18) {
  const st = on2s(t, 12);
  for (let i = 0; i < n; i++) {
    const ph = hash(i * 3.3 + seed) * 6.28, sp = 1.5 + hash(i * 5.1 + seed) * 3;
    const a = Math.pow(Math.max(0, Math.sin(st * sp + ph)), 8);
    const x = box[0] + hash(i * 1.7 + seed) * box[2], y = box[1] + Math.pow(hash(i * 2.9 + seed), 0.7) * box[3];
    star(x, y, size * (0.5 + hash(i + 9 + seed)) * (0.4 + 0.6 * (y - box[1]) / box[3]), a, ctx);
  }
}
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || ''} ${o.size || 40}px ${o.font || FONT.en}`;
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 24; }
  if (o.stroke) { ctx.lineWidth = o.lw || 4; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || '#fff'; ctx.fillText(s, x, y); }
  ctx.restore();
}
// kotodama glyph: a kana that draws itself in light (wipe from top-left) then floats and fades into sparks
function kana(ctx, ch, x, y, size, age, life = 2.5, col = [150, 255, 240]) {
  if (age < 0 || age > life) return;
  const wr = E.outC(clamp(age / 0.35));
  const fade = 1 - inv(life - 0.6, life, age);
  const lift = -age * 22;
  ctx.save();
  ctx.translate(x, y + lift);
  ctx.beginPath(); ctx.rect(-size, -size, size * 2 * wr, size * 2); ctx.clip();
  ctx.font = `${size}px ${FONT.jpb}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalCompositeOperation = 'lighter';
  for (const [b, a] of [[40, 0.9], [14, 0.9], [0, 1]]) {
    ctx.shadowColor = `rgba(${col},${a * fade})`; ctx.shadowBlur = b;
    ctx.fillStyle = b ? `rgba(${col},${0.5 * fade})` : `rgba(235,255,252,${fade})`;
    ctx.fillText(ch, 0, 0);
  }
  ctx.restore();
  // sparks shed while it fades
  for (let i = 0; i < 10; i++) {
    const s0 = life - 0.9 + hash(i + ch.charCodeAt(0)) * 0.5, a2 = age - s0;
    if (a2 < 0 || a2 > 1) continue;
    const ang = hash(i * 7 + x) * 6.28, d = a2 * (60 + 90 * hash(i * 3 + y));
    star(x + Math.cos(ang) * d, y + lift + Math.sin(ang) * d - a2 * 40, 14 * (1 - a2), 1 - a2, ctx, `${col}`);
  }
}
// sheet of paper: fake 3D flutter (x-scale by cos of the flip angle, shade by facing)
function paper(ctx, x, y, w, h, rot, flip, a = 1) {
  const c = Math.cos(flip);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Math.max(0.05, Math.abs(c)), 1);
  const sh = 0.78 + 0.22 * Math.abs(c);
  ctx.globalAlpha = a;
  ctx.fillStyle = `rgb(${250 * sh | 0},${250 * sh | 0},${246 * sh | 0})`;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = `rgba(90,110,130,${0.25 * sh})`;
  for (let i = 0; i < 6; i++) ctx.fillRect(-w * 0.36, -h * 0.34 + i * h * 0.1, w * (i % 3 === 2 ? 0.45 : 0.72), h * 0.025);
  ctx.restore();
}
function flutter(ctx, t0, t, n, origin, o = {}) {
  const age = t - t0;
  if (age < 0) return;
  const st = on2s(t, 12) - t0;
  for (let i = 0; i < n; i++) {
    const d = hash(i * 1.31 + (o.seed || 0)) * (o.spread || 1.2);
    const a2 = st - d;
    if (a2 < 0) continue;
    const vx = (o.vx || 700) * (0.5 + hash(i * 2.1)), vy = (o.vy || -380) * (0.4 + hash(i * 3.7));
    const x = origin[0] + vx * a2 + Math.sin(a2 * 3 + i) * 60;
    const y = origin[1] + vy * a2 + 160 * a2 * a2;
    const sz = (o.size || 90) * (0.6 + hash(i * 4.4) * 0.8);
    paper(ctx, x, y, sz, sz * 1.41, a2 * (2 + hash(i) * 3) + i, a2 * (5 + hash(i * 9) * 6) + i, clamp(a2 * 6));
  }
}

// ---------- ID card (drawn once) ----------
let CARD = null;
function buildCard() {
  const c = document.createElement('canvas'); c.width = 1012; c.height = 638;
  const x = c.getContext('2d');
  const r = 34;
  x.fillStyle = '#f7f9fb'; x.beginPath(); x.roundRect(0, 0, 1012, 638, r); x.fill();
  x.save(); x.beginPath(); x.roundRect(0, 0, 1012, 638, r); x.clip();
  x.fillStyle = '#0f8f8f'; x.fillRect(0, 0, 1012, 150);
  x.fillStyle = '#12b3a8'; x.beginPath(); x.moveTo(640, 0); x.lineTo(1012, 0); x.lineTo(1012, 150); x.lineTo(560, 150); x.fill();
  // hologram strip
  const g = x.createLinearGradient(700, 500, 1012, 638);
  g.addColorStop(0, 'rgba(120,220,255,.35)'); g.addColorStop(.5, 'rgba(255,160,230,.35)'); g.addColorStop(1, 'rgba(150,255,200,.35)');
  x.fillStyle = g; x.fillRect(720, 520, 250, 70);
  x.restore();
  text(x, '天川', 48, 112, { font: FONT.jp, size: 84, fill: '#fff' });
  text(x, 'AMAKAWA', 250, 104, { font: FONT.enx, size: 50, fill: '#e8fffb', ls: 12 });
  // photo from the main character sprite
  const s = TEX_IMG['s-mc'];
  x.fillStyle = '#dfe6ec'; x.fillRect(56, 200, 300, 370);
  if (s) {
    const f = P.face.mc; // uv box
    x.drawImage(s, f[0] * s.width, f[1] * s.height, (f[2] - f[0]) * s.width, (f[3] - f[1]) * s.height, 56, 200, 300, 370);
  }
  x.strokeStyle = '#c7d0d8'; x.lineWidth = 3; x.strokeRect(56, 200, 300, 370);
  text(x, '新人', 400, 300, { font: FONT.jp, size: 96, fill: '#16202c' });
  text(x, 'NEW HIRE', 404, 360, { font: FONT.enx, size: 46, fill: '#0f8f8f', ls: 6 });
  text(x, 'システム課  地下1階', 404, 440, { font: FONT.jpb, size: 40, fill: '#46525e' });
  x.fillStyle = '#16202c';
  for (let i = 0; i < 44; i++) { const w = 2 + (hash(i * 3.1) * 7 | 0); x.fillRect(404 + i * 7.2, 480, w * 0.6, 60); }
  CARD = texFromImage(c);
}
const TEX_IMG = {};

// ---------- reusable shot pieces ----------
// blink: closed-eye frame for ~0.1 s (on 2s: 2-3 drawings) at seeded times, if a '<name>-blink' texture exists
function blinkName(name, t, lt, seed = 0) {
  if (!TEX[name + '-blink']) return name;
  const times = [0.9 + hash(seed) * 0.5, 2.6 + hash(seed + 1) * 0.8, 4.4 + hash(seed + 2)];
  for (const b of times) if (lt >= b && lt < b + 0.11) return name + '-blink';
  return name;
}
function flashIn(fx, lt, d = 0.14, col) { if (lt < d) { fx.flash = Math.max(fx.flash, 1 - lt / d); if (col) fx.flashCol = col; } }
function flashOut(fx, lt, len, d = 0.12) { if (lt > len - d) fx.flash = Math.max(fx.flash, (lt - (len - d)) / d); }
function whipOut(o, lt, len, d = 0.16, dir = 1) { const k = inv(len - d, len, lt); o.mb = [0.25 * E.inQ(k) * dir, 0]; o.cx = (o.cx ?? 0.5) + 0.12 * E.inQ(k) * dir; return k; }
function whipIn(o, lt, d = 0.16, dir = 1) { const k = 1 - inv(0, d, lt); o.mb = [0.25 * E.inQ(k) * dir, 0]; o.cx = (o.cx ?? 0.5) - 0.12 * E.inQ(k) * dir; return k; }
function shake(t, amt) { return [noise1(on2s(t, 24) * 9) * amt, noise1(on2s(t, 24) * 9 + 50) * amt]; }

// Pose reveal: a character slides in over a flat colour card with a halftone field, a big outlined name and a name plate.
function poseReveal(t, lt, len, fx, o) {
  const k = E.outE(clamp(lt / 0.45));
  fill(...o.bg);
  // diagonal band
  const band = c2d();
  band.save();
  band.translate(W / 2, H / 2); band.rotate(-0.28);
  band.fillStyle = css(o.band, 0.95); band.fillRect(-1600, -170 + (1 - k) * 400, 3200, 250);
  band.fillStyle = css(o.band2 || C.white, 0.9); band.fillRect(-1600, 110 + (1 - k) * 600, 3200, 18);
  band.restore();
  // halftone field (on 2s)
  band.fillStyle = css(o.dots || C.white, 0.16);
  const st = on2s(t, 12);
  for (let y = 0; y < H; y += 26) for (let x = 0; x < W; x += 26) {
    const d = clamp(1 - (x + y * 0.6) / (W * 1.1) + 0.2 * Math.sin(st * 2 + y * 0.01));
    const r = 11 * d * d;
    if (r > 0.6) { band.beginPath(); band.arc(x + (y / 26 % 2) * 13, y, r, 0, 7); band.fill(); }
  }
  // giant outlined name, drifting
  text(band, o.big, W * 0.98 - lt * 40, H * 0.62, { font: FONT.jp, size: 420, fill: null, stroke: css(C.white, 0.35), lw: 5, align: 'right' });
  draw2d();
  if (lt < 0.35) speedLines({ mode: 'parallel', angle: 0, density: 70, seed: on2s(t) * 12, alpha: 0.5 * (1 - lt / 0.35), col: [1, 1, 1] });
  // the character
  const sx = lerp(o.from || W * 1.25, o.x, k) - lt * 12 * (o.drift ?? 1);
  const mb = (1 - k) * 0.06 * Math.sign((o.from || W * 1.25) - o.x);
  sprite(blinkName(o.name, t, lt, o.name.length), sx, o.y + (o.h * (o.bob ?? 0.004)) * Math.sin(t * 2.2), o.h,
    { mb: [mb, 0], rim: [...(o.rim || C.white), 0.9], rimDir: o.rimDir || [0.004, 0.002], warp: o.warp, warpBox: o.warpBox,
      grade: o.grade || [0.02, 1.05, 1.05] });
  // name plate
  const p = c2d();
  const nk = E.outE(clamp((lt - 0.2) / 0.5));
  p.save();
  p.translate(o.plate[0] + (1 - nk) * -160, o.plate[1]);
  p.globalAlpha = nk;
  p.fillStyle = css(C.ink, 0.85); p.fillRect(0, -86, 12, 150);
  text(p, o.jp, 36, 0, { font: FONT.jp, size: 110, fill: '#fff' });
  text(p, o.en, 40, 56, { font: FONT.enx, size: 40, fill: css(o.band2 || C.white), ls: 10 });
  if (o.role) text(p, o.role, 40, 100, { font: FONT.en, size: 30, fill: 'rgba(255,255,255,.85)', ls: 3 });
  p.restore();
  draw2d();
  flashIn(fx, lt, 0.1);
  fx.bloom = 0.25; fx.ca = 0.004 * (1 - k);
}

// ---------- shots ----------
const S = {};
S.sky = (lt, u, t, fx, c) => {
  const k = E.ioC(inv(0.42, c.end - 0.1, t));
  const cy = lerp(0.0, 1.0, k);
  bg('sky', { cy, zoom: 1.02 + 0.03 * k, depth: null });
  // sun flare once the horizon is in view
  const vh = (TEX.sky ? TEX.sky.w / TEX.sky.h : 0.68) / (W / H) / 1.02;
  const top = clamp(cy, vh / 2, 1 - vh / 2) - vh / 2;
  const sunY = (P.sun.sky[1] - top) / vh;
  if (sunY < 1.2) { fx.flare = [P.sun.sky[0], sunY]; fx.flareAmt = clamp((1.2 - sunY) * 1.2) * 0.9; }
  fx.leak = 0.18 + 0.1 * Math.sin(t);
  fx.fade = t < 0.42 ? 1 : 0;
  if (t >= 0.42) flashIn(fx, t - 0.42, 0.3);
};
S.bay = (lt, u, t, fx, c) => {
  // Pilot, shot 2: the approved exterior master. A slow truck right and push toward the city with depth parallax,
  // so the near beam and train slide against the far sea and skyline. Glints on the water change on 2s.
  const k = E.ioS(u);
  const o = { cx: lerp(0.485, 0.5, k), cy: lerp(0.52, 0.5, k), zoom: lerp(1.03, 1.1, k), par: [lerp(-0.006, 0.008, k), lerp(0.002, -0.002, k)], focus: 0.12 };
  flashIn(fx, lt, 0.1);
  bg('bay', o);
  const x = c2d();
  for (const [u0, v0, du, dv] of P.bayGlitter) {
    const [x0, y0] = toScreen(u0, v0), [x1, y1] = toScreen(u0 + du, v0 + dv);
    waterSparkle(x, t, [x0, y0, x1 - x0, y1 - y0], 26, u0 * 10, 16);
  }
  draw2d();
  const [sx, sy] = toScreen(P.sun.bay[0], P.sun.bay[1]);
  fx.flare = [sx / W, sy / H]; fx.flareAmt = 0.12;
  fx.leak = 0.08; fx.bloom = 0.3; fx.thr = 0.8; fx.vig = 0.22;
};
S.oncoming = (lt, u, t, fx, c) => {
  const o = { zoom: lerp(1.12, 1.3, u), rot: lerp(-0.05, 0.04, E.ioC(u)), cx: 0.5, cy: 0.5, shake: shake(t, 6), depth: null };
  flashIn(fx, lt, 0.08);
  bg('oncoming', o);
  speedLines({ mode: 'parallel', angle: P.angle.oncoming, density: 60, seed: on2s(t) * 12, alpha: 0.35, clear: 0.12 });
  fx.ca = 0.004;
};
S.streak = (lt, u, t, fx, c) => {
  bg('pano', { cx: lerp(0.3, 0.7, u), cy: 0.55, zoom: 1.5, mb: [0.05, 0], depth: null });
  speedLines({ mode: 'parallel', angle: 0, density: 50, seed: on2s(t) * 12, alpha: 0.55, len: 1.2 });
  fx.ca = 0.006;
};
function cabin(lt, u, t, o = {}) {
  // the bay scrolls behind the window mask faster than the carriage moves
  const scroll = (t * 0.012) % 1;
  bg('pano', { cx: 0.2 + scroll * 0.6, cy: 0.42, zoom: o.panoZoom || 1.35, mb: [0.006, 0], depth: null });
  const x = c2d(); glints(x, P.glint.cabin, t, 5, 36); draw2d();
  bg('cabin', Object.assign({ cx: 0.5, cy: 0.5, zoom: 1.05, depth: null,
    sweep: [lerp(-0.4, 1.4, (lt * 0.45) % 1), 0.12, 0.35, 0.22], sweepCol: [1, 0.85, 0.6] }, o));
}
S.cabin = (lt, u, t, fx, c) => { cabin(lt, u, t, { cx: lerp(0.45, 0.55, u), zoom: 1.08 }); flashIn(fx, lt, 0.08); fx.leak = 0.15; };
S.mcwin1 = (lt, u, t, fx, c) => {
  bg('mcwin', { cx: lerp(0.52, 0.48, u), zoom: lerp(1.05, 1.12, u), par: [-0.012 * u, 0], focus: 0.7,
    sweep: [lerp(1.3, -0.3, E.ioS(u)), 0.16, 0.2, 0.3], sweepCol: [1, 0.85, 0.6] });
  fx.leak = 0.2;
};
S.pillars = (lt, u, t, fx, c) => {
  const i = Math.min(3, Math.floor(lt / 0.395)), l2 = lt - i * 0.395;
  if (i === 0) {
    bg('luggage', { zoom: 1.75 * punch(l2), cx: 0.33, cy: 0.72, depth: null, sweep: [lerp(0.2, 0.8, l2 / 0.4), 0.1, 0.3, 0.25] });
  } else if (i === 1) {
    bg('bay', { zoom: 2.4 * punch(l2), cx: 0.3, cy: 0.85, depth: null });
    const x = c2d(); waterSparkle(x, t, [0, 300, W, 780], 60, 8, 34); draw2d();
  } else if (i === 2) {
    bg('forward', { zoom: 1.5 * punch(l2), cx: 0.5, cy: 0.55, depth: null, mb: [0, 0.01] });
    speedLines({ mode: 'radial', cx: 0.5, cy: 0.45, density: 110, seed: on2s(t) * 12, alpha: 0.45, clear: 0.28 });
  } else {
    bg('pano', { zoom: 1.9 * punch(l2), cx: P.city.pano[0], cy: P.city.pano[1], depth: null });
    const x = c2d(); glints(x, [[W * 0.4, H * 0.35], [W * 0.62, H * 0.42], [W * 0.5, H * 0.3]], t, 2, 70); draw2d();
  }
  flashIn(fx, l2, 0.06);
  fx.ca = 0.005;
};
S.songtitle = (lt, u, t, fx, c) => {
  bg('sky', { cy: 0.12, zoom: 1.2, depth: null, blur: 0.004, grade: [0.15, 0.8, 0.8] });
  fill(1, 1, 1, 0.35);
  const x = c2d();
  const s = 'はじめまして';
  for (let i = 0; i < s.length; i++) {
    const a = t - (c.start + 0.06 * i);
    if (a < 0) continue;
    const k = E.outB(clamp(a / 0.22));
    text(x, s[i], W / 2 - 330 + i * 132, H / 2 + 40 + (1 - k) * 60, { font: FONT.jp, size: 130, fill: css(C.navy), align: 'center', alpha: clamp(a * 8) });
  }
  text(x, 'OPENING THEME', W / 2, H / 2 - 110, { font: FONT.enx, size: 34, fill: css(C.teal), align: 'center', ls: 18, alpha: clamp((lt - 0.2) * 4) });
  x.fillStyle = css(C.teal); x.fillRect(W / 2 - 360 * E.outE(clamp(lt / 0.5)), H / 2 + 110, 720 * E.outE(clamp(lt / 0.5)), 6);
  draw2d();
  flashIn(fx, lt, 0.2);
  fx.bloom = 0.1;
};
S.window = (lt, u, t, fx, c) => { cabin(lt, u, t, { cx: lerp(0.4, 0.6, u), zoom: 1.15 }); flashIn(fx, lt, 0.1); fx.leak = 0.12; };
S.mcwin2 = (lt, u, t, fx, c) => {
  const bi = beatIndexIn(lt, c), bl = t - lastBeat(t);
  bg('mcwin', { cx: P.face.mcwin[0], cy: P.face.mcwin[1], zoom: lerp(1.45, 1.6, u), par: [0.01 * u, 0], focus: 0.7,
    bands: [bi * 0.5 + bl * 1.6, 0.9, 0.18, 0.28] });
  fx.leak = 0.18;
};
S.pano = (lt, u, t, fx, c) => {
  bg('pano', { cx: lerp(0.35, 0.62, u), cy: 0.5, zoom: 1.12, par: [0.008 * u, 0], focus: 0.3 });
  const x = c2d();
  const vw = (W / H) / (TEX.pano.w / TEX.pano.h) / 1.12, cx = lerp(0.35, 0.62, u);
  const pts = P.glint.pano.map(([gx, gy]) => [((gx - (cx - vw / 2)) / vw) * W, (0.5 + (gy - 0.5) * 1.12) * H]);
  glints(x, pts, t, 11, 60);
  draw2d();
  fx.leak = 0.1;
};
S.approach = (lt, u, t, fx, c) => {
  // forward along the beam: a steady push = the train moving toward the island
  const k = E.ioS(u);
  bg('forward', { cx: 0.5, cy: lerp(0.52, 0.47, k), zoom: lerp(1.02, 1.45, u), focus: 0.2, par: [0, 0.006 * k] });
  const x = c2d(); waterSparkle(x, t, [0, H * 0.55, W, H * 0.45], 50, 4, 20); draw2d();
  fx.flare = P.sun.forward; fx.flareAmt = 0.5; fx.leak = 0.12;
};
S.card = (lt, u, t, fx, c) => {
  // his blazer (from the window shot, out of focus); the drawn ID card rises out of the pocket, rack focus lands on it
  bg('mcwin', { zoom: lerp(2.3, 2.5, u), cx: 0.36, cy: 0.86, depth: null, blur: 0.005, grade: [-0.05, 1, 0.9] });
  const k = E.outC(clamp((lt - 0.15) / 0.9));
  const cw = 760, ch = cw * 638 / 1012;
  const x0 = lerp(W * 0.52, W * 0.5, k), y0 = lerp(H + ch * 0.55, H * 0.5, k);
  const rot = lerp(0.35, -0.06, k) + 0.015 * Math.sin(lt * 2.5);
  drawQuad(GL.white, rectCorners(x0 + 30, y0 + 40, cw, ch, rot), { tint: [0, 0, 0, 1], alpha: 0.3 * k });
  drawQuad(CARD, rectCorners(x0, y0, cw, ch, rot), { blur: 0.004 * (1 - E.outC(clamp((lt - 0.6) / 0.6))),
    sweep: [lerp(-0.3, 1.3, inv(1.4, 2.4, lt)), 0.05, 0.6, 0.6 * (lt > 1.4 && lt < 2.4 ? 1 : 0)], sweepCol: [1, 1, 1] });
  // a hand-drawn pocket edge in front of the card while it is still coming out
  if (k < 0.9) rect(W * 0.5, H - 30, W * 0.9, 120, 0.02, [0.07, 0.1, 0.2], 1 - k);
  fx.leak = 0.15;
};
S.cardflip = (lt, u, t, fx, c) => {
  bg('mcwin', { zoom: 2.5, cx: 0.36, cy: 0.86, blur: 0.007, grade: [-0.2, 0.9, 0.8], depth: null });
  const k = E.outB(clamp(lt / 0.55));
  const ang = lerp(-1.35, 0.12, k) + 0.04 * Math.sin(lt * 2);
  const cw = 900, ch = cw * 638 / 1012;
  const cx = W / 2 + 40 * (1 - k), cy = H / 2 + 10;
  const f = 1400; // focal length
  const pts = [[-cw / 2, -ch / 2], [cw / 2, -ch / 2], [cw / 2, ch / 2], [-cw / 2, ch / 2]].map(([x, y]) => {
    const z = x * Math.sin(ang), xx = x * Math.cos(ang);
    const yy = y * Math.cos(0.12 * (1 - k)) ;
    const s = f / (f + z);
    return [cx + xx * s, cy + yy * s];
  });
  // soft shadow
  drawQuad(GL.white, pts.map(([x, y]) => [x + 30, y + 40]), { tint: [0, 0, 0, 1], alpha: 0.35, blur: 0 });
  drawQuad(CARD, pts, { sweep: [lerp(-0.2, 1.2, inv(0.5, 1.3, lt)), 0.04, 0.9, 0.7], sweepCol: [1, 1, 1] });
  const x = c2d(); if (lt > 0.5) star(pts[1][0] - 60, pts[1][1] + 40, 90, Math.exp(-(lt - 0.5) * 3), x); draw2d();
  flashIn(fx, lt, 0.08);
};
S.station = (lt, u, t, fx, c) => {
  bg('station', { cx: lerp(0.4, 0.58, E.outQ(u)), zoom: lerp(1.12, 1.05, u), par: [0.02 * u, 0], focus: 0.4, shake: shake(t, 3 * (1 - u)) });
  fx.leak = 0.15; fx.flare = P.sun.station; fx.flareAmt = 0.3;
};
S.gate = (lt, u, t, fx, c) => {
  bg('gate', { cx: P.reader.gate[0] + 0.08, cy: P.reader.gate[1] + 0.05, zoom: lerp(1.45, 1.6, E.ioS(u)), par: [0.01 * u, 0], focus: 0.6 });
  const [vx, vy] = toScreen(P.reader.gate[0], P.reader.gate[1]);
  // the card slides in to the reader and taps on the beat
  const tap = c.start + 0.78;
  const k = E.outC(clamp((t - (tap - 0.5)) / 0.5));
  if (t < tap + 0.5) {
    const cw = 380, ch = cw * 638 / 1012;
    const x0 = lerp(W + 300, vx, k), y0 = lerp(vy + 200, vy - 60, k);
    const pts = rectCorners(x0, y0, cw, ch, -0.25 + 0.1 * k).map(([x, y]) => [x, y]);
    drawQuad(CARD, pts, { alpha: 1 - inv(tap + 0.2, tap + 0.5, t) });
  }
  const x = c2d();
  const ga = Math.exp(-Math.max(0, t - tap) * 2.5) * (t > tap ? 1 : 0);
  if (ga > 0.01) {
    const g = x.createRadialGradient(vx, vy, 0, vx, vy, 260);
    g.addColorStop(0, `rgba(80,255,220,${0.8 * ga})`); g.addColorStop(1, 'rgba(80,255,220,0)');
    x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(0, 0, W, H);
    star(vx, vy, 120, ga, x, '180,255,240');
  }
  draw2d();
  fx.leak = 0.1;
};
S.towerup = (lt, u, t, fx, c) => {
  const k = E.inC(u);
  bg('towerup', { cy: lerp(0.95, 0.05, E.ioC(u)), zoom: 1.05 + 0.2 * k, depth: null, mb: [0, -0.02 * k] });
  speedLines({ mode: 'radial', cx: 0.5, cy: 0.1, density: 120, seed: on2s(t) * 12, alpha: 0.4 * k, clear: 0.2 });
  fx.flare = [0.5, lerp(0.8, 0.08, u)]; fx.flareAmt = 0.6 + 0.6 * k;
};
S.mcface = (lt, u, t, fx, c) => {
  bg('sky', { cy: 0.3, zoom: 1.4, depth: null, blur: 0.006, grade: [0.05, 0.9, 0.9] });
  const f = P.face.mc, z = lerp(1.0, 1.15, E.outC(u));
  const cw = 1100 * z, ch = cw * (f[3] - f[1]) / (f[2] - f[0]) * (TEX['s-mcopen'] ? TEX['s-mcopen'].h / TEX['s-mcopen'].w : 1.29);
  spriteCrop('s-mcopen', [f[0] - 0.12, f[1] - 0.05, f[2] + 0.12, f[3] + 0.25], W * 0.55, H * 0.58, cw * 1.5, ch * 1.6,
    { rim: [1, 0.95, 0.8, 0.8], rimDir: [-0.003, 0.002] });
  fx.flash = Math.max(fx.flash, E.inE(inv(c.end - 0.3, c.end, t)));
  fx.leak = 0.25;
};
S.skyline = (lt, u, t, fx, c) => {
  bg('skyline', { zoom: lerp(1.0, 1.1, E.outQ(u)), cx: 0.5, cy: lerp(0.52, 0.48, u), par: [0.018 * u, -0.004 * u], focus: 0.35 });
  const x = c2d(); waterSparkle(x, t, P.water.skyline, 70, 6, 26);
  glints(x, P.glint.skyline, t, 3, 70);
  draw2d();
  flashIn(fx, lt, 0.45);
  fx.flare = P.sun.skyline; fx.flareAmt = 0.9; fx.leak = 0.2; fx.bloom = 0.45;
};
S.overhead = (lt, u, t, fx, c) => {
  const o = { zoom: lerp(1.2, 1.4, u), rot: lerp(0.05, -0.08, u), cx: lerp(0.4, 0.6, u), depth: null, shake: shake(t, 5) };
  whipOut(o, lt, c.end - c.start, 0.18, 1);
  bg('oncoming', o);
  speedLines({ mode: 'parallel', angle: P.angle.oncoming, density: 70, seed: on2s(t) * 12, alpha: 0.45, clear: 0.1 });
};
S.mcpose = (lt, u, t, fx, c) => poseReveal(t, lt, c.end - c.start, fx, Object.assign({
  name: 's-mcopen', bg: [0.05, 0.42, 0.45], band: [0.1, 0.72, 0.68], band2: [0.85, 1, 0.97], big: 'シンジン', jp: '新人', en: 'THE NEW HIRE',
  role: 'IT, BASEMENT 1', x: W * 0.64, y: H + 40, h: H * 1.25, plate: [150, H * 0.72], rim: [1, 0.95, 0.8] }, P.pose.mc));
S.kotoba = (lt, u, t, fx, c) => {
  // dim teal field, him lit from below by the words
  fill(0.02, 0.1, 0.14);
  const x0 = c2d();
  const g = x0.createRadialGradient(W * 0.5, H * 1.1, 50, W * 0.5, H * 0.9, 900);
  g.addColorStop(0, 'rgba(60,220,210,.55)'); g.addColorStop(1, 'rgba(0,40,60,0)');
  x0.fillStyle = g; x0.fillRect(0, 0, W, H);
  draw2d();
  const f = P.face.mc, z = lerp(1, 1.08, u);
  spriteCrop('s-mcopen', [0.12, f[1] - 0.06, 0.88, 0.95], W * 0.5, H * 0.56 + 40, 1200 * z, 1200 * z * 1.1 * 1.29 * (0.95 - f[1] + 0.06) / 0.76,
    { grade: [-0.12, 1.0, 0.85], tint: [0.1, 0.5, 0.55, 0.12], rim: [0.5, 1, 0.95, 1], rimDir: [0, -0.004] });
  const x = c2d();
  const words = [['こ', 0.0, -560, -120], ['と', 0.4, -430, -300], ['ば', 0.8, -300, -90], ['ま', 1.6, 330, -260], ['ほ', 2.0, 460, -80], ['う', 2.4, 570, -280]];
  for (const [ch, d, dx, dy] of words) kana(x, ch, W / 2 + dx, H / 2 + dy, 150, lt - d, 2.2);
  for (let i = 0; i < 40; i++) { // rising motes
    const ph = (hash(i * 1.9) + on2s(t) * (0.1 + 0.2 * hash(i))) % 1;
    star(hash(i * 7.3) * W, H * (1 - ph), 10 + 12 * hash(i), Math.sin(ph * 3.14) * 0.8, x, '150,255,240');
  }
  draw2d();
  flashIn(fx, lt, 0.12, [0.6, 1, 0.95]);
  fx.bloom = 0.7; fx.thr = 0.55;
};
S.kanaflow = (lt, u, t, fx, c) => {
  fill(0.02, 0.08, 0.12);
  const x = c2d();
  const set = 'ことばまほうてつだってうごいてありがとうまって';
  for (let i = 0; i < 70; i++) {
    const sp = 0.5 + hash(i * 2.3);
    const p = (hash(i * 5.7) + lt * 0.55 * sp) % 1.4 - 0.2;
    const y = H * hash(i * 3.1), xx = W * (1.1 - p * 1.3);
    const s = 50 + 110 * hash(i * 8.8);
    text(x, set[i % set.length], xx, y + Math.sin(lt * 2 + i) * 30, { font: FONT.jpb, size: s, fill: `rgba(210,255,250,${0.35 + 0.6 * hash(i)})`, glow: 'rgba(80,255,230,.9)', blur: 20, align: 'center' });
  }
  // wipe to white-teal at the end
  const k = inv(c.end - 0.5, c.end, t);
  if (k > 0) { x.fillStyle = `rgba(230,255,252,${E.inQ(k)})`; x.fillRect(0, 0, W, H); }
  draw2d();
  fx.bloom = 0.8; fx.thr = 0.5;
};
S.copy = (lt, u, t, fx, c) => {
  bg('copy', { zoom: lerp(1.05, 1.15, u), cx: lerp(0.5, P.copier.copy[0], u * 0.5), par: [0.012 * u, 0], focus: 0.5, grade: [0, 1.05, 1] });
  const x = c2d();
  const cpu = P.copier.copy, cp = [0, 0, ...toScreen(cpu[0], cpu[1])];
  const s = 'てつだって';
  for (let i = 0; i < s.length; i++) kana(x, s[i], W * 0.5 - 300 + i * 150, H * 0.3, 120, lt - 0.35 - i * 0.12, 3.5);
  const hit = c.start + 1.6 - c.start; // copier wakes up on the bar
  const ga = lt > hit ? Math.exp(-(lt - hit) * 1.5) : 0;
  if (ga > 0.01) { const g = x.createRadialGradient(cp[2], cp[3], 0, cp[2], cp[3], 420); g.addColorStop(0, `rgba(120,255,200,${0.6 * ga})`); g.addColorStop(1, 'rgba(120,255,200,0)'); x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
  flutter(x, c.start + 2.0, t, 14, [cp[2], cp[3] - 60], { vx: -520, vy: -520, spread: 1.0, size: 80, seed: 2 });
  draw2d();
  flashIn(fx, lt, 0.3, [0.9, 1, 0.98]);
  fx.bloom = 0.5;
};
S.emi = (lt, u, t, fx, c) => {
  poseReveal(t, lt, c.end - c.start, fx, Object.assign({ name: 's-emi', bg: [0.95, 0.93, 0.9], band: [0.9, 0.4, 0.3], band2: [1, 0.9, 0.85], dots: [0.9, 0.4, 0.3],
    big: 'エミ', jp: 'エミ', en: 'EMI', role: 'TEAM LEADER, BASEMENT', x: W * 0.62, y: H + 60, h: H * 1.3, from: -W * 0.3, plate: [120, H * 0.7], rim: [1, 0.9, 0.8] }, P.pose.emi));
  const x = c2d(); flutter(x, c.start - 0.2, t, 12, [-100, H * 0.8], { vx: 900, vy: -420, spread: 2.5, size: 110, seed: 7 }); draw2d();
};
S.moving = (lt, u, t, fx, c) => {
  const len = 0.4, i = Math.min(6, Math.floor(lt / len)), l2 = lt - i * len;
  const k = E.outC(clamp(l2 / len));
  const list = [
    () => bg('gate', { zoom: 1.4 * punch(l2), cx: P.reader.gate[0], cy: 0.6, par: [0.02 * k, 0], focus: 0.6 }),
    () => bg('doors', { zoom: lerp(1.3, 1.15, k), cy: 0.5, depth: null, sweep: [0.5, 0.08 + 0.2 * k, 1.5708, 0.4 * k], sweepCol: [1, 0.95, 0.8] }),
    () => bg('station', { zoom: 1.5, cx: lerp(0.3, 0.45, k), mb: [0.02, 0], depth: null }),
    () => { bg('bay', { zoom: 1.6, cx: lerp(0.35, 0.5, k), cy: 0.45, mb: [0.03, 0], depth: null }); },
    () => { bg('pano', { zoom: 1.8 * punch(l2), cx: 0.55, cy: 0.45, depth: null }); const x = c2d(); glints(x, [[W * .3, H * .4], [W * .7, H * .35], [W * .5, H * .5]], t, 9, 80); draw2d(); },
    () => { bg('copy', { zoom: 1.4 * punch(l2), cx: P.copier.copy[0], depth: null }); const x = c2d(); flutter(x, c.start + 5 * len, t, 10, toScreen(P.copier.copy[0], P.copier.copy[1]), { vx: 600, vy: -500, spread: 0.3, seed: 5 }); draw2d(); },
    () => { bg('skyline', { zoom: lerp(1.5, 1.2, k), cx: P.city.skyline[0], cy: P.city.skyline[1], depth: null }); fx.flare = P.sun.skyline; fx.flareAmt = 0.6; },
  ];
  list[i]();
  flashIn(fx, l2, 0.05);
  fx.ca = 0.004;
};
S.baywide = (lt, u, t, fx, c) => {
  bg('bay', { zoom: lerp(1.25, 1.0, E.outC(u)), cx: 0.5, cy: 0.5, par: [-0.015 * u, 0.004], focus: 0.4 });
  const x = c2d(); waterSparkle(x, t, P.water.bay, 60, 12, 24); draw2d();
  fx.flare = P.sun.bay; fx.flareAmt = 0.5; fx.leak = 0.2;
};
S.mcsmile = (lt, u, t, fx, c) => {
  bg('mcwin', { cx: P.face.mcwin[0], cy: P.face.mcwin[1], zoom: lerp(1.3, 1.2, u), par: [-0.01 * u, 0], focus: 0.7,
    sweep: [lerp(-0.2, 1.2, u), 0.3, 0.2, 0.25] });
  fx.leak = 0.2 + 0.5 * E.inQ(u);
  fx.flash = Math.max(fx.flash, 0.9 * E.inE(inv(c.end - 0.5, c.end, t)));
  fx.flashCol = [1, 0.95, 0.88];
};
// group shot in two rows: back row (smaller, higher) Kaori, Aoi, Kuro; front row Rei, the new hire, Emi, Mio
const ROW = [['s-kaori', 0.2, 0.62, 1], ['s-aoi', 0.5, 0.6, 1], ['s-kuro', 0.8, 0.62, 1],
  ['s-rei', 0.14, 0.8, 0], ['s-mcopen', 0.39, 0.84, 0], ['s-emi', 0.63, 0.8, 0], ['s-mio', 0.87, 0.78, 0]];
function row(t, c0, fillStart, step = 0.2) {
  bg('sky', { cy: P.sun.sky[1] - 0.02, zoom: 1.25, depth: null, grade: [0.02, 1.1, 1.1] });
  const order = [4, 5, 3, 6, 1, 0, 2];   // entry order: front centre first, back row last
  for (const j of [0, 1, 2, 3, 4, 5, 6]) {
    const [n, x, s, back] = ROW[j];
    const oi = order.indexOf(j);
    const a = t - (c0 + oi * step);
    if (a < 0) continue;
    const k = E.outE(clamp(a / 0.3));
    const f = fillStart ? 1 - E.ioC(clamp((t - (fillStart + oi * 0.18)) / 0.25)) : 1;
    const y = H + 20 - (back ? H * 0.2 : 0) + (1 - k) * 400;
    sprite(n, x * W, y, H * s, { sil: [0.06, 0.08, 0.16, f], rim: [1, 0.8, 0.55, 0.9 * f + 0.3], rimDir: [0.003, 0.003],
      grade: back ? [-0.08, 1, 0.9] : [0, 1, 1] });
  }
}
S.silhouettes = (lt, u, t, fx, c) => { row(t, c.start, 0); fx.flare = [P.sun.sky[0], 0.8]; fx.flareAmt = 0.8; flashIn(fx, lt, 0.4, [1, 0.95, 0.88]); fx.leak = 0.2; };
S.reveal = (lt, u, t, fx, c) => { row(t, c.start - 10, c.start); fx.flare = [P.sun.sky[0], 0.8]; fx.flareAmt = 0.6; fx.leak = 0.15; };
S.aoi = (lt, u, t, fx, c) => poseReveal(t, lt, c.end - c.start, fx, Object.assign({ name: 's-aoi', bg: [0.12, 0.1, 0.2], band: [0.95, 0.25, 0.55], dots: [0.95, 0.25, 0.55],
  big: 'アオイ', jp: 'アオイ', en: 'AOI', role: 'INTERN', x: W * 0.62, y: H + 40, h: H * 1.2, plate: [140, H * 0.72] }, P.pose.aoi));
S.kaori = (lt, u, t, fx, c) => poseReveal(t, lt, c.end - c.start, fx, Object.assign({ name: 's-kaori', bg: [0.9, 0.94, 0.94], band: [0.1, 0.55, 0.55], dots: [0.1, 0.55, 0.55],
  big: 'カオリ', jp: 'カオリ', en: 'KAORI', role: 'CANTEEN HEAD CHEF', x: W * 0.36, y: H + 40, h: H * 1.2, from: -W * 0.3, plate: [W * 0.56, H * 0.72] }, P.pose.kaori));
S.kuro = (lt, u, t, fx, c) => {
  bg('doors', { zoom: lerp(1.2, 1.1, u), depth: null, grade: [-0.3, 1.1, 0.5], tint: [0.12, 0.08, 0.3, 0.45] });
  fill(0.05, 0.03, 0.12, 0.35);
  const k = E.outC(clamp(lt / 0.6));
  sprite('s-kuro', lerp(W * 0.75, W * 0.66, k), H + 40, H * 1.2, { alpha: k, rim: [0.7, 0.55, 1, 0.9], rimDir: [-0.004, 0.002], grade: [-0.02, 1.05, 0.95] });
  const p = c2d();
  const nk = E.outE(clamp((lt - 0.35) / 0.6));
  p.globalAlpha = nk;
  text(p, 'クロ', 150, H * 0.66, { font: FONT.jp, size: 120, fill: '#fff' });
  text(p, '玖路', 160, H * 0.66 + 80, { font: FONT.jpb, size: 60, fill: 'rgba(200,180,255,.9)' });
  text(p, 'KURO  ·  NIGHT RECEPTION', 162, H * 0.66 + 140, { font: FONT.enx, size: 34, fill: 'rgba(255,255,255,.8)', ls: 8 });
  draw2d();
  flashIn(fx, lt, 0.12, [0.8, 0.7, 1]);
  fx.vig = 0.5;
};
S.down = (lt, u, t, fx, c) => {
  const k = E.ioC(u);
  bg('basement', { zoom: 1.2, cy: 0.5, depth: null, grade: [-0.4 + 0.4 * k, 1, 0.9] });
  // concrete slab passing upward: the camera sinks through the floor
  const y = lerp(H * 0.0, -H * 1.3, k);
  rect(W / 2, y + H / 2, W * 1.2, H, 0, [0.16, 0.17, 0.18], 1);
  rect(W / 2, y + H, W * 1.2, 16, 0, [0.35, 0.37, 0.38], 1);
  rect(W / 2, y + H / 2, W * 1.2, H, 0, [0.02, 0.02, 0.03], (1 - k) * 0.4);
  fx.vig = 0.5;
};
S.basement = (lt, u, t, fx, c) => {
  const flick = (hash(Math.floor(t * 12)) > 0.86 ? -0.12 : 0) + (lt < 0.25 && hash(Math.floor(t * 24)) > 0.5 ? -0.3 : 0);
  bg('basement', { zoom: lerp(1.08, 1.18, u), cx: lerp(0.48, 0.54, u), par: [0.015 * u, 0.003], focus: 0.5, grade: [flick, 1.05, 1] });
  fx.bloom = 0.4;
};
S.miogame = (lt, u, t, fx, c) => {
  const bi = beatIndexIn(lt, c);
  const cols = [[0.4, 0.6, 1], [1, 0.3, 0.7], [0.3, 1, 0.6], [1, 0.7, 0.2]];
  const col = cols[((bi % 4) + 4) % 4];
  bg('miogame', { zoom: lerp(1.05, 1.15, u), par: [0.01 * u, 0], focus: 0.6, sweep: [0.45, 0.35, 1.5708, 0.14 * (0.4 + beatPulse(t))], sweepCol: col });
  fx.bloom = 0.5;
};
S.mio = (lt, u, t, fx, c) => poseReveal(t, lt, c.end - c.start, fx, Object.assign({ name: 's-mio', bg: [0.04, 0.07, 0.07], band: [0.13, 0.78, 0.53], band2: [0.7, 1, 0.85], dots: [0.13, 0.78, 0.53],
  big: 'ミオ', jp: 'ミオ', en: 'MIO', role: 'GAME DEBUG, BASEMENT', x: W * 0.64, y: H + 40, h: H * 1.22, plate: [140, H * 0.72], rim: [0.5, 1, 0.75] }, P.pose.mio));
S.emilaugh = (lt, u, t, fx, c) => {
  fill(0.98, 0.9, 0.84);
  const x0 = c2d();
  const st = on2s(t, 12);
  for (let i = 0; i < 24; i++) { // sunburst
    const a = i / 24 * 6.283 + st * 0.2;
    x0.fillStyle = i % 2 ? 'rgba(240,130,100,.35)' : 'rgba(255,255,255,.0)';
    x0.beginPath(); x0.moveTo(W * 0.62, H * 0.45); x0.arc(W * 0.62, H * 0.45, 2000, a, a + 6.283 / 24); x0.fill();
  }
  draw2d();
  const k = E.outB(clamp(lt / 0.4));
  sprite('s-emilaugh', W * 0.62, H + 60 + (1 - k) * 200, H * 1.3 * lerp(0.95, 1.0, k), { rim: [1, 1, 1, 0.8], rimDir: [0.004, 0.002] });
  const pop = c.start + 2.4; // the いいね on the vocal
  const x = c2d();
  const a = t - pop;
  if (a > 0) {
    const s = E.outB(clamp(a / 0.25));
    x.save(); x.translate(W * 0.28, H * 0.33); x.rotate(-0.12); x.scale(s, s);
    x.fillStyle = '#fff'; x.strokeStyle = css(C.ink); x.lineWidth = 8;
    x.beginPath(); for (let i = 0; i < 20; i++) { const r = i % 2 ? 150 : 205, an = i / 20 * 6.283; x.lineTo(Math.cos(an) * r * 1.5, Math.sin(an) * r); } x.closePath(); x.fill(); x.stroke();
    text(x, 'いいね！', 0, 30, { font: FONT.jp, size: 110, fill: css(C.coral), align: 'center', stroke: css(C.ink), lw: 6 });
    x.restore();
  }
  text(x, 'エミ', 120, H * 0.86, { font: FONT.jp, size: 90, fill: css(C.ink), alpha: E.outC(clamp(lt * 3)) });
  draw2d();
  flashIn(fx, lt, 0.1);
};
S.rei = (lt, u, t, fx, c) => poseReveal(t, lt, c.end - c.start, fx, Object.assign({ name: 's-rei', bg: [0.9, 0.92, 0.95], band: [0.08, 0.09, 0.12], band2: [0.85, 0.88, 0.95], dots: [0.4, 0.45, 0.55],
  big: 'レイ', jp: 'レイ', en: 'REI', role: 'SALES, 3F', x: W * 0.36, y: H + 50, h: H * 1.25, from: -W * 0.3, plate: [W * 0.6, H * 0.72], rim: [0.8, 0.9, 1] }, P.pose.rei));
S.button = (lt, u, t, fx, c) => {
  bg('button', { zoom: lerp(1.05, 1.3, E.outC(u)), cx: lerp(0.5, P.button.button[0], u), cy: lerp(0.5, P.button.button[1], u), par: [0.01 * u, 0], focus: 0.8 });
  const press = c.start + 0.8;
  const x = c2d();
  const a = t - press;
  if (a > 0) {
    const [bx, by] = toScreen(P.button.button[0], P.button.button[1]);
    for (let r = 0; r < 3; r++) {
      const ra = a - r * 0.18;
      if (ra < 0) continue;
      x.strokeStyle = `rgba(255,230,190,${Math.exp(-ra * 2.5)})`; x.lineWidth = 6;
      x.beginPath(); x.arc(bx, by, 60 + ra * 500, 0, 7); x.stroke();
    }
    fx.flash = Math.max(fx.flash, 0.4 * Math.exp(-a * 10));
  }
  draw2d();
  fx.bloom = 0.5 + 0.4 * (a > 0 ? Math.exp(-a * 2) : 0);
};
S.doors = (lt, u, t, fx, c) => {
  const k = E.ioC(u);
  bg('doors', { zoom: lerp(1.05, 1.5, E.inQ(u)), cy: 0.5, par: [0, 0.01 * u], focus: 0.5, sweep: [0.5, 0.05 + 0.4 * k, 1.5708, 0.7 * k], sweepCol: [1, 0.95, 0.85] });
  fx.bloom = 0.5 + 0.8 * k; fx.thr = lerp(0.72, 0.4, k);
  fx.flash = Math.max(fx.flash, E.inE(inv(c.end - 0.35, c.end, t)));
  fx.flashCol = [1, 0.97, 0.92];
};
S.stairs = (lt, u, t, fx, c) => {
  bg('stairs', { cy: lerp(0.75, 0.4, E.outC(u)), zoom: lerp(1.15, 1.05, u), par: [0, 0.012 * u], focus: 0.6 });
  flashIn(fx, lt, 0.4, [1, 0.97, 0.92]);
  fx.flare = [0.55, 0.05]; fx.flareAmt = 0.8; fx.leak = 0.25;
  const x = c2d(); for (let i = 0; i < 30; i++) { const ph = (hash(i * 2.2) + on2s(t) * 0.15) % 1; star(hash(i * 5.5) * W, H * (1 - ph), 12, Math.sin(ph * 3.14) * 0.6, x); } draw2d();
};
S.logo = (lt, u, t, fx, c) => {
  const hit = c.start; // the last downbeat
  const pre = E.ioC(inv(c.start - 1.6, c.end, t));
  bg('sky', { cy: lerp(0.3, 0.12, pre), zoom: 1.1, depth: null, grade: [0.06, 1, 1.05] });
  const a = t - hit;
  const x = c2d();
  if (a >= 0) {
    const s = lerp(1.35, 1, E.outE(clamp(a / 0.3)));
    x.save(); x.translate(W / 2, H * 0.46); x.scale(s, s);
    text(x, '天川', 0, 0, { font: FONT.jp, size: 330, fill: '#fff', align: 'center', base: 'middle', glow: 'rgba(20,60,120,.55)', blur: 40 });
    x.restore();
    // shine sweep across the letters
    const sp = inv(0.25, 0.9, a);
    if (sp > 0 && sp < 1) {
      x.save(); x.globalCompositeOperation = 'source-atop';
      const gx = lerp(W * 0.3, W * 0.7, sp);
      const g = x.createLinearGradient(gx - 80, 0, gx + 80, 0);
      g.addColorStop(0, 'rgba(120,230,255,0)'); g.addColorStop(0.5, 'rgba(160,240,255,1)'); g.addColorStop(1, 'rgba(120,230,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    }
    const ek = E.outE(clamp((a - 0.12) / 0.6));
    text(x, 'AMAKAWA', W / 2, H * 0.66, { font: FONT.enx, size: 64, fill: '#fff', align: 'center', ls: lerp(60, 26, ek), alpha: ek });
    x.fillStyle = `rgba(255,255,255,${ek})`; x.fillRect(W / 2 - 300 * ek, H * 0.7, 600 * ek, 4);
    text(x, 'THE FIRST WEEK', W / 2, H * 0.75, { font: FONT.en, size: 30, fill: 'rgba(255,255,255,.9)', align: 'center', ls: 14, alpha: clamp((a - 0.5) * 3) });
  }
  draw2d();
  if (a >= 0) flashIn(fx, a, 0.25);
  fx.flare = [0.72, 0.18]; fx.flareAmt = 0.5 + 0.4 * pre;
  fx.leak = 0.15;
  fx.fade = inv(DUR - 0.5, DUR, t);
};


// The company phone's new-hire app (GUIDE: on the monorail the phone runs the onboarding app). Drawn in code.
function phoneScreen(x, lt, w, h) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0d3b46'); g.addColorStop(1, '#0a1c2a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  text(x, '天川', w / 2, 150, { font: FONT.jp, size: 96, fill: '#e9fffb', align: 'center' });
  text(x, 'AMAKAWA', w / 2, 200, { font: FONT.enx, size: 30, fill: '#6fe3d3', align: 'center', ls: 10 });
  // welcome types in, one kana per 2 frames at 24 fps
  const msg = 'ようこそ！';
  const n = Math.min(msg.length, Math.floor(Math.max(0, lt - 0.2) * 12));
  text(x, msg.slice(0, n), w / 2, 330, { font: FONT.jp, size: 86, fill: '#ffffff', align: 'center' });
  // island map: a rounded island shape, the guideway coming in from the left, a pulsing dot for his dorm
  x.save(); x.translate(w / 2, 560);
  x.strokeStyle = 'rgba(111,227,211,.9)'; x.lineWidth = 5;
  x.beginPath(); x.ellipse(40, 0, 170, 110, -0.2, 0, 7); x.stroke();
  x.setLineDash([14, 10]); x.beginPath(); x.moveTo(-w / 2 + 20, 60); x.quadraticCurveTo(-200, 40, -120, 10); x.stroke(); x.setLineDash([]);
  const pulse = (lt * 1.5) % 1;
  x.fillStyle = '#ffd36b'; x.beginPath(); x.arc(70, -20, 12, 0, 7); x.fill();
  x.strokeStyle = `rgba(255,211,107,${1 - pulse})`; x.lineWidth = 4; x.beginPath(); x.arc(70, -20, 12 + pulse * 40, 0, 7); x.stroke();
  x.restore();
  // three onboarding steps as simple rows
  const rows = ['ちず', 'りょう', 'IDカード'];
  rows.forEach((r, i) => {
    const a = clamp((lt - 0.5 - i * 0.2) * 5);
    x.globalAlpha = a;
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(60, 760 + i * 110, w - 120, 90);
    text(x, r, 100, 820 + i * 110, { font: FONT.jpb, size: 44, fill: '#e9fffb' });
    x.fillStyle = '#6fe3d3'; x.beginPath(); x.arc(w - 110, 805 + i * 110, 14, 0, 7); x.fill();
    x.globalAlpha = 1;
  });
}
let PHONE = null;
S.phone = (lt, u, t, fx, c) => {
  bg('sky', { cy: 0.75, zoom: 1.6, depth: null, blur: 0.01, grade: [0, 0.9, 0.85] });
  fill(0.02, 0.06, 0.1, 0.35);
  if (!PHONE) { PHONE = document.createElement('canvas'); PHONE.width = 700; PHONE.height = 1200; }
  const px = PHONE.getContext('2d'); px.clearRect(0, 0, 700, 1200); phoneScreen(px, lt, 700, 1200);
  const x = c2d();
  const k = E.outB(clamp(lt / 0.45));
  const ph = 980, pw = ph * 0.49;
  x.save(); x.translate(W * 0.5, H * 0.55 + (1 - k) * 700); x.rotate(-0.08 + 0.05 * (1 - k));
  x.fillStyle = '#10141a'; x.beginPath(); x.roundRect(-pw / 2 - 18, -ph / 2 - 18, pw + 36, ph + 36, 56); x.fill();
  x.save(); x.beginPath(); x.roundRect(-pw / 2, -ph / 2, pw, ph, 40); x.clip();
  x.drawImage(PHONE, -pw / 2, -ph / 2, pw, ph);
  // screen glare sweep
  const gx = lerp(-pw, pw, inv(0.6, 1.3, lt));
  const gg = x.createLinearGradient(gx - 80, 0, gx + 80, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,.25)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gg; x.fillRect(-pw / 2, -ph / 2, pw, ph);
  x.restore(); x.restore();
  draw2d();
  flashIn(fx, lt, 0.08);
  fx.bloom = 0.3;
};
S.end = (lt, u, t, fx, c) => { S.pano(lt + 2.39, 1, t, fx, c); fx.fade = E.ioC(clamp(lt / 0.8)); };
// credits: small, bottom-left, the way TV openings list staff during the first verse
const CREDITS = [
  [13.3, 15.9, 'STORY', 'Jørgen'],
  [19.1, 21.1, 'ART', 'RDBT Anima, local'],
  [22.0, 24.2, 'SONG', 'YuE2, local'],
  [29.5, 31.5, 'OPENING', 'Claude'],
];
function credits(t) {
  const cr = CREDITS.find(c => t >= c[0] && t < c[1]);
  if (!cr) return;
  const a = Math.min(clamp((t - cr[0]) * 5), clamp((cr[1] - t) * 5));
  const x = c2d();
  text(x, cr[2], 96, H - 150, { font: FONT.enx, size: 26, fill: `rgba(255,255,255,${0.85 * a})`, ls: 10, glow: 'rgba(0,0,0,.5)', blur: 10 });
  text(x, cr[3], 94, H - 96, { font: FONT.en, size: 48, fill: `rgba(255,255,255,${a})`, ls: 2, glow: 'rgba(0,0,0,.5)', blur: 12 });
  draw2d();
}

function cutAt(t) { let c = CUTS[0]; for (const x of CUTS) if (t >= x.start) c = x; return c; }
function drawShot(t, fx) {
  const c = cutAt(t);
  const lt = t - c.start, u = clamp(lt / (c.end - c.start));
  (S[c.id] || (() => fill(0.2, 0, 0)))(lt, u, t, fx, c);
  credits(t);
}
