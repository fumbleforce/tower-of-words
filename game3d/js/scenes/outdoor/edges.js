// Edges for the outdoor kit (scenes/outdoor/): what goes wherever two surfaces meet. A kerb where paving meets
// grass or a bed, a low wall with a coping stone round a raised bed, and the helpers that run them round a
// rectangle with gaps left for paths. All of them add boxes to a Parts collector (outdoor/parts.js).
//   kerb(p, [x, z], [x, z], { w, h })            a granite kerb along an axis-aligned line, its top a lighter stone
//   kerbRect(p, [x0, x1, z0, z1], { sides, gaps })   kerbs round a rectangle, on its outline
//   lowWall(p, a, b, { h, w })                   a seat-height wall with a coping, for raised beds and terraces
//   wallRect(p, rect, { h, w, sides, gaps })     the same round a rectangle
//   ramp(p, top, foot, w, h)                     a ramp down from a landing, with its cheeks
// gaps: { n: [[from, to]], s: [...], w: [...], e: [...] } in world x (n, s) or z (w, e), left open.
import * as THREE from 'three';

export const KERB = { body: '#7d8087', top: '#a4a6a7', wall: '#8b8d90', coping: '#b0b1b0' };

// the segments of a..b (1-D) left after cutting the gaps out
function spans(a, b, gaps = []) {
  const lo = Math.min(a, b),
    hi = Math.max(a, b);
  const cuts = gaps
    .map(([g0, g1]) => [Math.max(lo, Math.min(g0, g1)), Math.min(hi, Math.max(g0, g1))])
    .filter(([g0, g1]) => g1 > g0)
    .sort((p, q) => p[0] - q[0]);
  const out = [];
  let t = lo;
  for (const [g0, g1] of cuts) {
    if (g0 - t > 0.05) out.push([t, g0]);
    t = Math.max(t, g1);
  }
  if (hi - t > 0.05) out.push([t, hi]);
  return out;
}

// a straight run of boxes from a to b, `w` wide, centred on the line (or pushed `off` across it)
function run(p, a, b, w, y, h, color, off = 0, gaps = [], cast = false) {
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  if (alongX)
    for (const [s0, s1] of spans(a[0], b[0], gaps))
      p.box(color, s1 - s0, h, w, (s0 + s1) / 2, y, a[1] + off, { cast, surf: 'concrete' });
  else
    for (const [s0, s1] of spans(a[1], b[1], gaps))
      p.box(color, w, h, s1 - s0, a[0] + off, y, (s0 + s1) / 2, { cast, surf: 'concrete' });
}

export function kerb(p, a, b, { w = 0.16, h = 0.1, gaps = [], off = 0, body = KERB.body, top = KERB.top } = {}) {
  run(p, a, b, w, -0.06, h + 0.06 - 0.02, body, off, gaps);
  run(p, a, b, w - 0.02, h - 0.02, 0.02, top, off, gaps); // the top, a lighter worn stone
}

const sidesOf = ([x0, x1, z0, z1]) => ({
  n: [
    [x0, z0],
    [x1, z0],
  ],
  s: [
    [x0, z1],
    [x1, z1],
  ],
  w: [
    [x0, z0],
    [x0, z1],
  ],
  e: [
    [x1, z0],
    [x1, z1],
  ],
});

export function kerbRect(p, rect, { sides = 'nsew', gaps = {}, inside = true, ...o } = {}) {
  const w = o.w ?? 0.16;
  const S = sidesOf(rect);
  // kerbs sit just inside the outline, so the paving beyond runs up to them
  const off = { n: w / 2, s: -w / 2, w: w / 2, e: -w / 2 };
  for (const s of sides) kerb(p, ...S[s], { ...o, gaps: gaps[s] || [], off: inside ? off[s] : -off[s] });
}

export function lowWall(p, a, b, { h = 0.38, w = 0.22, gaps = [], off = 0 } = {}) {
  run(p, a, b, w, -0.05, h + 0.05 - 0.05, KERB.wall, off, gaps, true);
  run(p, a, b, w + 0.06, h - 0.05, 0.05, KERB.coping, off, gaps, true);
}

export function wallRect(p, rect, { sides = 'nsew', gaps = {}, ...o } = {}) {
  const w = o.w ?? 0.22;
  const S = sidesOf(rect);
  const off = { n: w / 2, s: -w / 2, w: w / 2, e: -w / 2 };
  for (const s of sides) lowWall(p, ...S[s], { ...o, gaps: gaps[s] || [], off: off[s] });
}

// a ramp from `a` ([x, z], its top, h high, against a landing) down to `b` on the ground, axis-aligned, w wide: a
// sloped slab a shade darker than pale paving on its wedge and a low cheek down each side
export function ramp(p, a, b, w, h, { stone = '#8f8c87', cheek = KERB.wall } = {}) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const L = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]),
    dir = Math.sign(alongX ? b[0] - a[0] : b[1] - a[1]);
  const turn = alongX ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  // a wedge in (along, up), `ww` across, `off` across from the ramp's middle
  const wedge = (color, pts, ww, off) => {
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
    const g = new THREE.ExtrudeGeometry(s, { depth: ww, bevelEnabled: false });
    g.translate(0, 0, off - ww / 2)
      .rotateY(turn)
      .translate(a[0], 0, a[1]);
    p.geo(color, g, { surf: 'concrete' });
  };
  const slab = [
    [0, 0],
    [L, 0],
    [0, h],
  ];
  const side = [
    [0, 0],
    [L, 0],
    [L, 0.05],
    [0, h + 0.05],
  ];
  wedge(stone, slab, w - 0.2, 0);
  for (const o of [-1, 1]) wedge(cheek, side, 0.1, o * (w / 2 - 0.05));
}
