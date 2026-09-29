// The feedback window's screenshot (js/feedback.js): the WebGL frame, then the page drawn over it.
// The canvas keeps its picture only until the frame is shown, so it is copied in an animation frame queued after
// main.js's own (as menu.js's thumbnails are). The HUD is plain DOM: every visible box, border, text run, image
// and icon is read in that same frame and drawn onto the copy (box shadows, gradients and blur are left out).
// capture(skip) resolves to { blob, w, h } (a PNG) or null; `skip` is an element left out (the window itself).
const $ = (s, r = document) => r.querySelector(s);
let layer = null;
export function capture(skip = null) {
  layer = skip;
  return new Promise((res) =>
    setTimeout(() =>
      requestAnimationFrame(async () => {
        try {
          const k = Math.min(devicePixelRatio || 1, 2);
          const cv = document.createElement('canvas');
          cv.width = Math.round(innerWidth * k);
          cv.height = Math.round(innerHeight * k);
          const x = cv.getContext('2d');
          x.fillStyle = getComputedStyle(document.body).backgroundColor;
          x.fillRect(0, 0, cv.width, cv.height);
          const c = $('#c');
          if (c && c.width) {
            const r = c.getBoundingClientRect();
            x.drawImage(c, r.left * k, r.top * k, r.width * k, r.height * k);
          }
          const ops = collect();
          await paint(x, ops, k);
          cv.toBlob((blob) => res(blob ? { blob, w: cv.width, h: cv.height } : null), 'image/png');
        } catch (err) {
          console.warn('feedback: screenshot failed', err);
          res(null);
        }
      }),
    ),
  );
}

const alphaOf = (c) => {
  if (!c || c === 'transparent') return 0;
  const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(c) || /\/\s*([\d.]+)\s*\)/.exec(c);
  return m ? +m[1] : 1;
};
const px = (v, z, r) =>
  String(v).endsWith('%') ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) * z || 0;
const words = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
const letters =
  typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const pieces = (s, seg) => (seg ? [...seg.segment(s)].map((p) => [p.index, p.segment]) : [[0, s]]);

function collect() {
  const ops = [];
  const onScreen = (r) =>
    r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const walk = (el, alpha) => {
    if (el === layer || el.id === 'c' || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const a = alpha * (parseFloat(cs.opacity) || 0);
    if (a < 0.02) return;
    const r = el.getBoundingClientRect();
    const z = el.offsetWidth ? r.width / el.offsetWidth : 1; // CSS zoom (the interface size) and scale transforms
    const shown = cs.visibility === 'visible' && onScreen(r);
    const clip = (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') && r.width > 0;
    const inset = insetClip(cs.clipPath, r, z); // the phone portraits are cut off at the grey band
    const filter = cs.filter && cs.filter !== 'none' ? cs.filter : '';
    if (filter) ops.push({ t: 'filter', f: filter }); // the dimmed listener, the blur on text still to come
    if (clip) ops.push({ t: 'clip', r });
    if (inset) ops.push({ t: 'clip', r: inset });
    const masked = (cs.maskImage || cs.webkitMaskImage || 'none') !== 'none';
    if (shown && !masked) box(cs, r, z, a, ops);
    const tag = el.tagName.toLowerCase();
    if (shown && (tag === 'img' || tag === 'canvas') && (el.width || el.naturalWidth))
      ops.push({ t: 'img', img: el, r, a, fit: cs.objectFit });
    else if (shown && tag === 'svg') ops.push({ t: 'svg', src: svgSource(el, r), r, a });
    if (tag !== 'svg' && tag !== 'img')
      for (const n of el.childNodes) {
        if (n.nodeType === 1) walk(n, a);
        else if (n.nodeType === 3 && cs.visibility === 'visible' && n.data.trim()) text(n, cs, z, a, ops);
      }
    if (clip) ops.push({ t: 'unclip' });
    if (inset) ops.push({ t: 'unclip' });
    if (filter) ops.push({ t: 'unclip' });
  };
  for (const n of document.body.children) walk(n, 1);
  return ops;
}

function insetClip(cp, r, z) {
  const m = /^inset\(([^)]*)\)/.exec(cp || '');
  if (!m) return null;
  const v = m[1]
    .split(/\s+round\s+/)[0]
    .trim()
    .split(/\s+/);
  const [t, rt = t, b = t, l = rt] = v.map((x, i) =>
    x.endsWith('%') ? (parseFloat(x) / 100) * (i % 2 ? r.width : r.height) : parseFloat(x) * z || 0,
  );
  return { left: r.left + l, top: r.top + t, width: r.width - l - rt, height: r.height - t - b };
}

function box(cs, r, z, a, ops) {
  const rad = Math.min(px(cs.borderTopLeftRadius, z, r), r.width / 2, r.height / 2);
  if (alphaOf(cs.backgroundColor) > 0) ops.push({ t: 'fill', r, rad, color: cs.backgroundColor, a });
  if (cs.backgroundImage.includes('linear-gradient'))
    for (const g of gradients(cs.backgroundImage, r)) ops.push({ t: 'grad', g, r, rad, a });
  const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => [
    parseFloat(cs[`border${s}Width`]) * z || 0,
    cs[`border${s}Style`] === 'none' ? 'transparent' : cs[`border${s}Color`],
  ]);
  const same = sides.every(([w, c]) => w === sides[0][0] && c === sides[0][1]);
  if (same && sides[0][0] > 0 && alphaOf(sides[0][1]) > 0)
    ops.push({ t: 'stroke', r, rad, w: sides[0][0], color: sides[0][1], a });
  else if (!same) {
    // each side as its mitred trapezoid, which also draws CSS triangles (the continue arrow) the right shape
    const [t, rt, b, l] = sides.map(([w]) => w);
    const L = r.left,
      T = r.top,
      R = r.right,
      B = r.bottom;
    const polys = [
      [L, T, R, T, R - rt, T + t, L + l, T + t],
      [R, T, R, B, R - rt, B - b, R - rt, T + t],
      [R, B, L, B, L + l, B - b, R - rt, B - b],
      [L, B, L, T, L + l, T + t, L + l, B - b],
    ];
    sides.forEach(([w, c], i) => w > 0 && alphaOf(c) && ops.push({ t: 'side', p: polys[i], color: c, a }));
  }
}

// Backgrounds: linear gradients (the phone's grey band, the dialogue shade) are redrawn; other images are left out.
const splitTop = (str) => {
  const out = [];
  let depth = 0,
    cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && !depth) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
const SIDES = { top: 0, right: 90, bottom: 180, left: 270 };
function gradients(bg, r) {
  const out = [];
  for (const layer of splitTop(bg).reverse()) {
    const m = /^linear-gradient\((.*)\)$/.exec(layer);
    if (!m) continue;
    const args = splitTop(m[1]);
    let deg = 180;
    if (/^(to |-?[\d.]+deg)/.test(args[0])) {
      const d = args.shift();
      deg = d.endsWith('deg') ? parseFloat(d) : (SIDES[d.split(/\s+/)[1]] ?? 180);
    }
    const rad = (deg * Math.PI) / 180,
      dx = Math.sin(rad),
      dy = -Math.cos(rad);
    const len = Math.abs(r.width * dx) + Math.abs(r.height * dy);
    const stops = args.map((arg) => {
      const cut = arg.startsWith('rgb') || arg.startsWith('color') ? arg.indexOf(')') + 1 : arg.search(/\s|$/);
      const pos = arg.slice(cut).trim().split(/\s+/)[0];
      const at = !pos ? null : pos.endsWith('%') ? parseFloat(pos) / 100 : parseFloat(pos) / len;
      return [arg.slice(0, cut), at];
    });
    stops.forEach((st, i) => {
      if (st[1] == null) st[1] = i === 0 ? 0 : i === stops.length - 1 ? 1 : stops[i - 1][1];
      st[1] = Math.min(1, Math.max(i ? stops[i - 1][1] : 0, st[1]));
    });
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    out.push({
      from: [cx - (dx * len) / 2, cy - (dy * len) / 2],
      to: [cx + (dx * len) / 2, cy + (dy * len) / 2],
      stops,
    });
  }
  return out;
}

// One text node, drawn word by word where the browser laid it out (so wrapping, ruby and zoom come out right).
function text(n, cs, z, a, ops) {
  const range = document.createRange();
  const font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * z}px ${cs.fontFamily}`;
  const sh = /^(rgba?\([^)]*\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s*([\d.]+)?/.exec(cs.textShadow || '');
  const shadow = sh ? { color: sh[1], x: +sh[2] * z, y: +sh[3] * z, blur: +(sh[4] || 0) * z } : null;
  const put = (from, s, split) => {
    range.setStart(n, from);
    range.setEnd(n, from + s.length);
    const rs = range.getClientRects();
    if (!rs.length || !s.trim()) return;
    if (rs.length > 1 && split) return pieces(s, letters).forEach(([i, p]) => put(from + i, p, false));
    const r = rs[0];
    const str = cs.textTransform === 'uppercase' ? s.toUpperCase() : s;
    ops.push({
      t: 'text',
      s: str,
      x: r.left,
      y: r.top + r.height / 2,
      w: r.width,
      font,
      color: cs.color,
      ls: (parseFloat(cs.letterSpacing) || 0) * z,
      shadow,
      a,
    });
  };
  for (const [i, p] of pieces(n.data, words)) put(i, p, true);
}

// An inline icon, with its CSS colours and stroke written onto a copy so it draws the same as an image.
function svgSource(svg, r) {
  const copy = svg.cloneNode(true);
  const from = [svg, ...svg.querySelectorAll('*')],
    to = [copy, ...copy.querySelectorAll('*')];
  const props = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'display'];
  from.forEach((e, i) => {
    const cs = getComputedStyle(e);
    to[i].setAttribute('style', props.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'));
  });
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', r.width);
  copy.setAttribute('height', r.height);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new window.XMLSerializer().serializeToString(copy));
}

async function paint(x, ops, k) {
  await Promise.all(
    ops
      .filter((o) => o.t === 'svg')
      .map(
        (o) =>
          new Promise((res) => {
            const i = new Image();
            i.onload = () => res((o.img = i));
            i.onerror = () => res(null);
            i.src = o.src;
          }),
      ),
  );
  x.save();
  x.scale(k, k);
  for (const o of ops) {
    if (o.t === 'clip') {
      x.save();
      x.beginPath();
      x.rect(o.r.left, o.r.top, o.r.width, o.r.height);
      x.clip();
      continue;
    }
    if (o.t === 'filter') {
      x.save();
      x.filter = x.filter === 'none' ? o.f : `${x.filter} ${o.f}`;
      continue;
    }
    if (o.t === 'unclip') {
      x.restore();
      continue;
    }
    x.globalAlpha = o.a;
    if (o.t === 'fill' || o.t === 'stroke') {
      x.beginPath();
      const i = o.t === 'stroke' ? o.w / 2 : 0;
      x.roundRect(o.r.left + i, o.r.top + i, o.r.width - 2 * i, o.r.height - 2 * i, Math.max(0, o.rad - i));
      if (o.t === 'fill') {
        x.fillStyle = o.color;
        x.fill();
      } else {
        x.strokeStyle = o.color;
        x.lineWidth = o.w;
        x.stroke();
      }
    } else if (o.t === 'side') {
      x.fillStyle = o.color;
      x.beginPath();
      for (let i = 0; i < 8; i += 2) x.lineTo(o.p[i], o.p[i + 1]);
      x.fill();
    } else if (o.t === 'grad') {
      const g = x.createLinearGradient(...o.g.from, ...o.g.to);
      try {
        for (const [c, at] of o.g.stops) g.addColorStop(at, c);
      } catch {
        continue; // a stop colour the canvas can't read
      }
      x.fillStyle = g;
      x.beginPath();
      x.roundRect(o.r.left, o.r.top, o.r.width, o.r.height, o.rad);
      x.fill();
    } else if ((o.t === 'img' || o.t === 'svg') && o.img) {
      try {
        drawFit(x, o);
      } catch {
        /* an image that can't be drawn (not loaded, other origin) is left out */
      }
    } else if (o.t === 'text') {
      x.font = o.font;
      x.fillStyle = o.color;
      x.textBaseline = 'middle';
      x.letterSpacing = `${o.ls}px`;
      if (o.shadow)
        Object.assign(x, {
          shadowColor: o.shadow.color,
          shadowOffsetX: o.shadow.x,
          shadowOffsetY: o.shadow.y,
          shadowBlur: o.shadow.blur,
        });
      x.fillText(o.s, o.x, o.y, o.w + 4);
      x.shadowColor = 'transparent';
    }
  }
  x.restore();
}

function drawFit(x, { img, r, fit }) {
  const iw = img.naturalWidth || img.width,
    ih = img.naturalHeight || img.height;
  if (fit !== 'cover' && fit !== 'contain') return x.drawImage(img, r.left, r.top, r.width, r.height);
  const s = (fit === 'cover' ? Math.max : Math.min)(r.width / iw, r.height / ih);
  const w = iw * s,
    h = ih * s;
  x.drawImage(img, r.left + (r.width - w) / 2, r.top + (r.height - h) / 2, w, h);
}
