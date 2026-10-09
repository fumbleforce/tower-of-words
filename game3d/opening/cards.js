// Character cards, the opening's roll call: a person slides in over their own colour with a halftone wash, their
// name huge and hollow behind them, and a name block that lands a beat later. Full frame or clipped into a panel.
import { CAST } from './cast.js';
import { drawPortrait, halftone, stripes, text, typeIn, clamp, ease, lerp, FONT, W, H, IMG } from './paint.js';

// a lighter or darker version of a #rrggbb colour (amt -1..1)
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  const t = amt < 0 ? 0 : 255,
    p = Math.abs(amt);
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// The background of a card: colour, a slow diagonal halftone, a band of stripes
export function cardBack(g, p, lt, { dir = 1 } = {}) {
  g.fillStyle = p.bg;
  g.fillRect(-20, -20, W + 40, H + 40);
  const drift = lt * 30 * dir;
  halftone(g, shade(p.bg, 0.12), 34, -0.5, (x, y) => clamp(((dir > 0 ? x : W - x) / W) * 1.3 - 0.15 + Math.sin((y + drift) * 0.004) * 0.05), null);
  g.save();
  g.beginPath();
  g.moveTo(W * (dir > 0 ? 0.52 : 0.48) + drift, -20);
  g.lineTo(W * (dir > 0 ? 0.74 : 0.26) + drift, -20);
  g.lineTo(W * (dir > 0 ? 0.52 : 0.48) + drift, H + 20);
  g.lineTo(W * (dir > 0 ? 0.3 : 0.7) + drift, H + 20);
  g.closePath();
  g.clip();
  stripes(g, 0.5 * dir, 10, 18, rgba(p.ac, 0.22), lt * 40);
  g.restore();
}

// The name, huge and hollow, running behind the person
export function bigName(g, p, lt, y = 760, alpha = 0.22) {
  const s = 380;
  g.save();
  g.globalAlpha = alpha;
  g.font = `${s}px ${FONT.big}`;
  g.lineWidth = 6;
  g.strokeStyle = p.ac;
  const str = (p.name.replace('MR. ', '') + '  ').repeat(4);
  const off = -((lt * 120) % (g.measureText(p.name.replace('MR. ', '') + '  ').width));
  g.strokeText(str, off, y);
  g.restore();
}

// The name block: kana above, the name, a rule and the job. t: seconds since it started landing.
export function nameBlock(g, p, t, x, y, { align = 'left', size = 150 } = {}) {
  if (t <= 0) return;
  const right = align === 'right';
  const e = ease.out5(clamp(t / 0.45));
  g.save();
  g.translate(lerp(right ? 120 : -120, 0, e), 0);
  g.globalAlpha = clamp(t / 0.12);
  typeIn(g, p.kana, right ? x - (p.kana.length * size * 0.36) : x + 6, y - size * 0.92, t - 0.08, { font: FONT.jp, size: size * 0.3, color: p.ac, stagger: 0.04, from: 1.6 });
  text(g, p.name, x, y, { font: FONT.big, size, align: right ? 'right' : 'left', color: p.ink, tracking: 0.02, shadow: { color: rgba('#0a1430', 0.35), dx: 8, dy: 10 } });
  const rw = ease.out3(clamp((t - 0.15) / 0.4)) * 420;
  g.fillStyle = p.ac;
  g.fillRect(right ? x - rw : x, y + 22, rw, 7);
  text(g, p.job, x, y + 76, { font: FONT.mid, size: size * 0.27, align: right ? 'right' : 'left', color: p.ink, tracking: 0.16, alpha: clamp((t - 0.25) / 0.2) });
  g.restore();
}

// A full-frame card. o: { pic, side: 'right' | 'left' (where the person stands), enter: seconds of the slide,
// nameAt: when the name lands, swap: [time, pic] to change expression, h: portrait height }
export function card(g, lt, id, o = {}) {
  const p = CAST.get(id);
  const side = o.side || 'right';
  const dir = side === 'right' ? 1 : -1;
  cardBack(g, p, lt, { dir });
  bigName(g, p, lt, o.bigY ?? 760);
  const pic = o.swap && lt >= o.swap[0] ? o.swap[1] : o.pic || p.pics[0];
  const enter = o.enter ?? 0.4;
  const e = ease.out5(clamp(lt / enter));
  const h = (o.h ?? 1040) * (p.scale || 1);
  const px = (side === 'right' ? W * 0.66 : W * 0.34) + (1 - e) * 700 * dir + Math.sin(lt * 1.4) * 6;
  const pop = o.swap && lt >= o.swap[0] ? 1 + 0.04 * Math.exp(-(lt - o.swap[0]) / 0.08) : 1;
  const py = H + 40 + (p.scale ? (h - (o.h ?? 1040)) * 0.42 : 0);
  g.save();
  g.translate(px, py);
  g.scale(pop, pop);
  drawPortrait(g, pic, 0, 0, h, { stroke: '#ffffff', strokeW: 9, shadow: { dx: -22 * dir, dy: 0, color: p.ac }, alpha: clamp(lt / 0.08) });
  g.restore();
  const nx = side === 'right' ? 120 : W - 120;
  nameBlock(g, p, lt - (o.nameAt ?? 0.3), nx, o.nameY ?? 700, { align: side === 'right' ? 'left' : 'right', size: o.nameSize ?? 150 });
}

// A card clipped into a polygon panel (frame coords), for split screens. The person stands at the panel's centre
// bottom; the name sits in its upper corner.
export function panelCard(g, lt, id, poly, o = {}) {
  const p = CAST.get(id);
  const xs = poly.map((q) => q[0]),
    ys = poly.map((q) => q[1]);
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  g.save();
  g.beginPath();
  poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
  g.fillStyle = p.bg;
  g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
  halftone(g, shade(p.bg, 0.14), 26, -0.5, (x, y) => clamp(((y - y0) / (y1 - y0)) * 1.2 - 0.1), null);
  const dir = o.dir || 1;
  const e = ease.out5(clamp(lt / (o.enter ?? 0.35)));
  const pic = o.swap && lt >= o.swap[0] ? o.swap[1] : o.pic || p.pics[0];
  const h = (o.h ?? (y1 - y0) * 0.95) * (p.scale || 1);
  const cx = (x0 + x1) / 2 + (o.dx || 0) + (1 - e) * 400 * dir;
  drawPortrait(g, pic, cx, y1 + 30 + (o.dy || 0), h, { stroke: '#ffffff', strokeW: 7, shadow: { dx: -16 * dir, dy: 0, color: p.ac } });
  // name in the upper corner (the lyrics run along the bottom)
  const nt = lt - (o.nameAt ?? 0.2);
  if (nt > 0) {
    const ne = ease.out5(clamp(nt / 0.35));
    const sz = o.nameSize ?? 96;
    const nx = o.nameRight ? poly[1][0] - 40 : poly[0][0] + 40; // inside the panel's top edge
    g.save();
    g.translate(lerp(o.nameRight ? 80 : -80, 0, ne), 0);
    text(g, p.name, nx, y0 + 190, { font: FONT.big, size: sz, align: o.nameRight ? 'right' : 'left', color: '#fff', shadow: { color: 'rgba(10,20,48,0.4)', dx: 6, dy: 7 }, alpha: clamp(nt / 0.1) });
    text(g, p.kana, nx + (o.nameRight ? 0 : 4), y0 + 190 - sz * 0.88, { font: FONT.jp, size: sz * 0.32, align: o.nameRight ? 'right' : 'left', color: p.ac, alpha: clamp(nt / 0.1) });
    g.restore();
  }
  g.restore();
  // the panel's white border
  g.save();
  g.lineWidth = 10;
  g.strokeStyle = '#ffffff';
  g.lineJoin = 'miter';
  g.beginPath();
  poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.stroke();
  g.restore();
}

export { IMG };
