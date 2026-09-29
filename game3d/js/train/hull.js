// Convex-hull parts. Every part is the convex hull of a few key points, so it can't have dents or
// inward-facing faces, and its faces are flat planes. Uses three's r186 ConvexHull (vendor/three-addons).
import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { Geo, V } from './kit.js';

const _c = new THREE.Color();

// points: [[x,y,z], ...] or Vector3s. Returns a Geo with one colour per face.
// grad: how much darker the bottom of the part is than its top (0.1 = 10%).
// colorOf(centroid, normal) may return a colour to override per face.
export function hull(points, color, { grad = 0.1, colorOf, name = 'part', chamfer = 0 } = {}) {
  let pts = points.map((p) => (p.isVector3 ? p.clone() : V(p[0], p[1], p[2])));
  if (chamfer > 0) pts = truncate(pts, chamfer);
  const h = new ConvexHull().setFromPoints(pts);
  const centre = pts.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / pts.length);
  let ymin = Infinity,
    ymax = -Infinity;
  for (const p of pts) {
    ymin = Math.min(ymin, p.y);
    ymax = Math.max(ymax, p.y);
  }
  const g = new Geo();
  for (const f of h.faces) {
    const loop = [];
    let e = f.edge;
    do {
      loop.push(e.head().point.clone());
      e = e.next;
    } while (e !== f.edge);
    const fc = loop.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / loop.length);
    let col = (colorOf && colorOf(fc, f.normal)) || color;
    // vertical gradient: lighter at the top of the part, darker at the bottom
    const t = ymax > ymin ? (fc.y - ymin) / (ymax - ymin) : 1;
    _c.set(col).multiplyScalar(1 - grad * (1 - t));
    const rgb = [_c.r, _c.g, _c.b];
    for (let i = 1; i < loop.length - 1; i++) g.tri(loop[0], loop[i], loop[i + 1], rgb);
  }
  checkOutward(g, centre, name);
  return g;
}

// Cut every corner of the hull: replace each vertex with points a distance c along each of its
// hull edges (at most 45% of the edge). The hull of those points has an angled bevel plane where
// each sharp corner was, and it is still convex.
export function truncate(pts, c) {
  const h = new ConvexHull().setFromPoints(pts);
  const out = [];
  const seen = new Set();
  for (const f of h.faces) {
    let e = f.edge;
    do {
      const a = e.tail().point,
        b = e.head().point;
      const key = [a, b]
        .map((p) =>
          p
            .toArray()
            .map((v) => v.toFixed(5))
            .join(','),
        )
        .sort()
        .join('|');
      if (!seen.has(key)) {
        seen.add(key);
        const d = b.clone().sub(a),
          len = d.length(),
          k = Math.min(c, len * 0.45) / len;
        out.push(a.clone().addScaledVector(d, k), b.clone().addScaledVector(d, -k));
      }
      e = e.next;
    } while (e !== f.edge);
  }
  return out;
}

// Guard: every triangle must face away from its part's centre. Fails loudly if not.
export function checkOutward(g, centre, name) {
  const ab = V(),
    ac = V(),
    n = V();
  for (const t of g.t) {
    ab.subVectors(t.b, t.a);
    ac.subVectors(t.c, t.a);
    n.crossVectors(ab, ac);
    const fc = V()
      .add(t.a)
      .add(t.b)
      .add(t.c)
      .multiplyScalar(1 / 3);
    if (n.dot(fc.sub(centre)) <= 0) throw new Error(`inward face on ${name}`);
  }
}

// Mirror a list of points to the other side (x -> -x).
export const mx = (pts) => pts.map(([x, y, z]) => [-x, y, z]);
// Points with a +-x pair for every entry that has x != 0.
export const sym = (pts) =>
  pts.flatMap(([x, y, z]) =>
    x === 0
      ? [[0, y, z]]
      : [
          [x, y, z],
          [-x, y, z],
        ],
  );

// A thin plate: a convex 2D outline (in a plane given by origin o and axes u, v, normal n),
// with thickness d behind it. Used for eyes, card print and flecks.
export function plate2(outline, o, u, v, n, d, color, opts = {}) {
  const pts = [];
  for (const [a, b] of outline) {
    const p = o.clone().addScaledVector(u, a).addScaledVector(v, b);
    pts.push(p, p.clone().addScaledVector(n, -d));
  }
  return hull(pts, color, { grad: 0, ...opts });
}

// A beam between two points with a square-ish section w x h (8 points).
export function beamHull(a, b, w, h, color, up = V(0, 1, 0), opts = {}) {
  const A = a.isVector3 ? a : V(...a),
    B = b.isVector3 ? b : V(...b);
  const d = B.clone().sub(A).normalize();
  let s = V().crossVectors(d, up);
  if (s.lengthSq() < 1e-6) s = V().crossVectors(d, V(1, 0, 0));
  s.normalize();
  const t = V().crossVectors(s, d).normalize();
  const pts = [];
  for (const P of [A, B])
    for (const [i, j] of [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ])
      pts.push(
        P.clone()
          .addScaledVector(s, (i * w) / 2)
          .addScaledVector(t, (j * h) / 2),
      );
  return hull(pts, color, { grad: 0, ...opts });
}

// Regular n-gon prism along axis (from centre c, radius r, length len) as a hull.
export function prismHull(c, axis, r, len, n, color, opts = {}) {
  const ax = axis.clone().normalize();
  let s = V().crossVectors(ax, V(0, 1, 0));
  if (s.lengthSq() < 1e-6) s = V(1, 0, 0);
  s.normalize();
  const t = V().crossVectors(ax, s).normalize();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    const p = c
      .clone()
      .addScaledVector(s, Math.cos(a) * r)
      .addScaledVector(t, Math.sin(a) * r);
    pts.push(p.clone(), p.clone().addScaledVector(ax, len));
  }
  return hull(pts, color, { grad: 0, ...opts });
}

// Icosahedron points around c with radii r (scaled per axis) and a little seeded jitter.
export function icoPoints(c, r, jitter = 0, seed = 1) {
  const f = (1 + Math.sqrt(5)) / 2;
  let a = seed;
  const rnd = () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
  const base = [
    [0, 1, f],
    [0, -1, f],
    [0, 1, -f],
    [0, -1, -f],
    [1, f, 0],
    [-1, f, 0],
    [1, -f, 0],
    [-1, -f, 0],
    [f, 0, 1],
    [-f, 0, 1],
    [f, 0, -1],
    [-f, 0, -1],
  ];
  return base.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z),
      k = 1 + (rnd() - 0.5) * 2 * jitter;
    return V(c.x + (x / l) * r[0] * k, c.y + (y / l) * r[1] * k, c.z + (z / l) * r[2] * k);
  });
}
