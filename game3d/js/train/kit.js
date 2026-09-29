// Small modelling kit for flat-shaded low-poly parts. Every triangle carries one colour.
// Geometry is built as plain triangle lists (non-indexed), so each face shades flat.
import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Seeded random so jitter is the same on every load.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _col = new THREE.Color();
function rgb(c) {
  if (Array.isArray(c)) return c;
  _col.set(c);
  return [_col.r, _col.g, _col.b];
}

const _ab = V(),
  _ac = V(),
  _n = V();
function faceNormal(a, b, c, out = V()) {
  _ab.subVectors(b, a);
  _ac.subVectors(c, a);
  return out.crossVectors(_ab, _ac).normalize();
}

export class Geo {
  constructor() {
    this.t = [];
  } // each: {a,b,c,col}

  get count() {
    return this.t.length;
  }

  // Add a triangle. If `inside` is given, the winding is flipped so the face points away from it.
  tri(a, b, c, col, inside) {
    if (a.distanceToSquared(b) < 1e-12 || b.distanceToSquared(c) < 1e-12 || a.distanceToSquared(c) < 1e-12) return this;
    if (inside) {
      faceNormal(a, b, c, _n);
      const g = V()
        .add(a)
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3)
        .sub(inside);
      if (_n.dot(g) < 0) {
        const t = b;
        b = c;
        c = t;
      }
    }
    this.t.push({ a: a.clone(), b: b.clone(), c: c.clone(), col: rgb(col) });
    return this;
  }

  // Add a triangle whose normal points along dir.
  triDir(a, b, c, col, dir) {
    faceNormal(a, b, c, _n);
    if (_n.dot(dir) < 0) return this.tri(a, c, b, col);
    return this.tri(a, b, c, col);
  }
  quadDir(a, b, c, d, col, dir) {
    this.triDir(a, b, c, col, dir);
    this.triDir(a, c, d, col, dir);
    return this;
  }

  quad(a, b, c, d, col, inside) {
    this.tri(a, b, c, col, inside);
    this.tri(a, c, d, col, inside);
    return this;
  }

  add(g, m) {
    for (const f of g.t) {
      const n = { a: f.a.clone(), b: f.b.clone(), c: f.c.clone(), col: f.col };
      if (m) {
        n.a.applyMatrix4(m);
        n.b.applyMatrix4(m);
        n.c.applyMatrix4(m);
        if (m.determinant() < 0) {
          const t = n.b;
          n.b = n.c;
          n.c = t;
        }
      }
      this.t.push(n);
    }
    return this;
  }

  apply(m) {
    const flip = m.determinant() < 0;
    for (const f of this.t) {
      f.a.applyMatrix4(m);
      f.b.applyMatrix4(m);
      f.c.applyMatrix4(m);
      if (flip) {
        const t = f.b;
        f.b = f.c;
        f.c = t;
      }
    }
    return this;
  }
  move(x, y, z) {
    return this.apply(new THREE.Matrix4().makeTranslation(x, y, z));
  }
  scale(x, y = x, z = x) {
    return this.apply(new THREE.Matrix4().makeScale(x, y, z));
  }
  rot(x = 0, y = 0, z = 0, order = 'XYZ') {
    return this.apply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z, order)));
  }
  // Pose a part: rotate, then move.
  place(pos, rotEuler = [0, 0, 0]) {
    this.rot(...rotEuler);
    return this.move(pos.x, pos.y, pos.z);
  }

  mirrorX() {
    const g = new Geo();
    g.add(this, new THREE.Matrix4().makeScale(-1, 1, 1));
    return g;
  }
  clone() {
    return new Geo().add(this);
  }

  // Deform every vertex (shared positions move together because they are equal values).
  warp(fn) {
    for (const f of this.t) {
      fn(f.a);
      fn(f.b);
      fn(f.c);
    }
    return this;
  }

  // Recolour faces: fn(centroid, normal, face) returns a colour or undefined to keep.
  paint(fn) {
    for (const f of this.t) {
      const g = V()
        .add(f.a)
        .add(f.b)
        .add(f.c)
        .multiplyScalar(1 / 3);
      const n = faceNormal(f.a, f.b, f.c);
      const c = fn(g, n, f);
      if (c !== undefined && c !== null) f.col = rgb(c);
    }
    return this;
  }

  // Drop faces: keep(centroid, normal) returns false to remove.
  filter(keep) {
    this.t = this.t.filter((f) =>
      keep(
        V()
          .add(f.a)
          .add(f.b)
          .add(f.c)
          .multiplyScalar(1 / 3),
        faceNormal(f.a, f.b, f.c),
      ),
    );
    return this;
  }

  bounds() {
    const b = new THREE.Box3();
    for (const f of this.t) {
      b.expandByPoint(f.a);
      b.expandByPoint(f.b);
      b.expandByPoint(f.c);
    }
    return b;
  }

  build() {
    const n = this.t.length;
    const pos = new Float32Array(n * 9),
      col = new Float32Array(n * 9);
    let i = 0;
    for (const f of this.t) {
      for (const p of [f.a, f.b, f.c]) {
        pos[i] = p.x;
        pos[i + 1] = p.y;
        pos[i + 2] = p.z;
        col[i] = f.col[0];
        col[i + 1] = f.col[1];
        col[i + 2] = f.col[2];
        i += 3;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
}

export function merge(...gs) {
  const g = new Geo();
  for (const x of gs) if (x) g.add(x);
  return g;
}

// ---------- rings (cross-sections) ----------

// Chamfered rectangle in the XZ plane at height y. ch=0 gives 4 points.
export function rrect(w, d, ch = 0, y = 0, cx = 0, cz = 0) {
  const x = w / 2,
    z = d / 2;
  if (ch <= 0) return [V(cx - x, y, cz + z), V(cx + x, y, cz + z), V(cx + x, y, cz - z), V(cx - x, y, cz - z)];
  const c = Math.min(ch, x * 0.95, z * 0.95);
  return [
    V(cx - x + c, y, cz + z),
    V(cx + x - c, y, cz + z),
    V(cx + x, y, cz + z - c),
    V(cx + x, y, cz - z + c),
    V(cx + x - c, y, cz - z),
    V(cx - x + c, y, cz - z),
    V(cx - x, y, cz - z + c),
    V(cx - x, y, cz + z - c),
  ];
}

// Regular n-gon in the XZ plane.
export function ngon(n, rx, rz = rx, y = 0, phase = 0, cx = 0, cz = 0) {
  const r = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    r.push(V(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz));
  }
  return r;
}

// Ring from 2D points (x, z) at height y.
export function ringXZ(pts, y = 0) {
  return pts.map(([x, z]) => V(x, y, z));
}

const centroid = (ring) => ring.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / ring.length);

// ---------- loft ----------
// rings: arrays of points with equal length, or a single Vector3 for a pointed end.
// color: hex, or fn({kind:'side'|'cap', i, j, g, n}) -> hex.
export function loft(rings, { color = '#888', caps = [true, true] } = {}) {
  const geo = new Geo();
  const N = rings.find((r) => Array.isArray(r)).length;
  const R = rings.map((r) => (Array.isArray(r) ? r : Array(N).fill(r)));
  const C = R.map(centroid);
  const pick = (info, a, b, c) => {
    if (typeof color !== 'function') return color;
    info.g = V()
      .add(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    return color(info);
  };
  for (let i = 0; i < R.length - 1; i++) {
    const r0 = R[i],
      r1 = R[i + 1];
    const inside = V()
      .addVectors(C[i], C[i + 1])
      .multiplyScalar(0.5);
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      const a = r0[j],
        b = r0[k],
        c = r1[k],
        d = r1[j];
      const col = pick({ kind: 'side', i, j }, a, b, c);
      geo.tri(a, b, c, col, inside);
      geo.tri(a, c, d, col, inside);
    }
  }
  const cap = (ri, other) => {
    const r = R[ri];
    if (r.every((p) => p.distanceToSquared(r[0]) < 1e-12)) return;
    const c = C[ri];
    // Push the inside point a little off the cap plane so orientation is stable.
    const inside = C[other].clone();
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      const col = pick({ kind: 'cap', i: ri, j }, c, r[j], r[k]);
      geo.tri(c, r[j], r[k], col, inside);
    }
  };
  if (caps[0]) cap(0, 1);
  if (caps[1]) cap(R.length - 1, R.length - 2);
  return geo;
}

// Antiprism loft: consecutive rings are offset by half a step, so each band is a zigzag of
// triangles with diagonal edges (vertex j of ring i+1 sits between vertices j and j+1 of ring i).
// Rings must have the same count. color: hex or fn({i, j, up, g}) where up says which way the
// triangle points.
export function aloft(rings, { color = '#888', caps = [true, true] } = {}) {
  const geo = new Geo();
  const N = rings[0].length;
  const C = rings.map(centroid);
  const col = (info, a, b, c) =>
    typeof color === 'function'
      ? color({
          ...info,
          g: V()
            .add(a)
            .add(b)
            .add(c)
            .multiplyScalar(1 / 3),
        })
      : color;
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i],
      B = rings[i + 1];
    const inside = V()
      .addVectors(C[i], C[i + 1])
      .multiplyScalar(0.5);
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      geo.tri(A[j], A[k], B[j], col({ i, j, up: true }, A[j], A[k], B[j]), inside);
      geo.tri(A[k], B[k], B[j], col({ i, j, up: false }, A[k], B[k], B[j]), inside);
    }
  }
  const cap = (ri, other) => {
    const r = rings[ri],
      c = C[ri];
    for (let j = 0; j < N; j++)
      geo.tri(c, r[j], r[(j + 1) % N], col({ i: ri, j, cap: true }, c, r[j], r[(j + 1) % N]), C[other]);
  };
  if (caps[0]) cap(0, 1);
  if (caps[1]) cap(rings.length - 1, rings.length - 2);
  return geo;
}

// Ring of n points around (cx, cz) at height y. half = true rotates it by half a step.
// e < 1 flattens it toward a rounded square. tilt drops points on the +x side (for angled cuffs).
export function oring(n, y, rx, rz, { cx = 0, cz = 0, half = false, e = 1, tilt = 0, phase = 0 } = {}) {
  const r = [];
  for (let j = 0; j < n; j++) {
    const a = phase + ((j + (half ? 0.5 : 0)) / n) * Math.PI * 2;
    const s = Math.sin(a),
      c = Math.cos(a);
    const x = rx * Math.sign(s) * Math.abs(s) ** e,
      z = rz * Math.sign(c) * Math.abs(c) ** e;
    r.push(V(cx + x, y - tilt * (x / rx), cz + z));
  }
  return r;
}

// Faceted box, optionally bevelled and tapered. Sits on y=0..h, centred in x and z.
// taper: [sx, sz] scale of the top ring. colors: {top, bottom, side} or a single colour.
export function box(w, h, d, { bevel = 0, taper = [1, 1], color = '#888', top, bottom, front } = {}) {
  const [tx, tz] = taper;
  const lerp = (a, b, t) => a + (b - a) * t;
  let rings;
  if (bevel > 0) {
    const b = bevel;
    const s1 = b / h,
      s2 = 1 - b / h;
    rings = [
      rrect(w - 2 * b, d - 2 * b, b * 0.8, 0),
      rrect(w * lerp(1, tx, s1), d * lerp(1, tz, s1), b, b),
      rrect(w * lerp(1, tx, s2), d * lerp(1, tz, s2), b, h - b),
      rrect(w * tx - 2 * b, d * tz - 2 * b, b * 0.8, h),
    ];
  } else {
    rings = [rrect(w, d, 0, 0), rrect(w * tx, d * tz, 0, h)];
  }
  const g = loft(rings, { color });
  if (top || bottom || front) {
    g.paint((c, n) => {
      if (top && n.y > 0.7) return top;
      if (bottom && n.y < -0.7) return bottom;
      if (front && n.z > 0.7) return front;
    });
  }
  return g;
}

// Box centred on the origin (all axes).
export function cbox(w, h, d, opts) {
  return box(w, h, d, opts).move(0, -h / 2, 0);
}

// Cylinder / prism along y from 0 to h.
export function cyl(n, r0, r1, h, { color = '#888', phase = 0, rz0, rz1 } = {}) {
  return loft([ngon(n, r0, rz0 ?? r0, 0, phase), ngon(n, r1, rz1 ?? r1, h, phase)], { color });
}

// Flat ring (washer) lying in the XZ plane, y from 0 to h.
export function washer(n, rOut, rIn, h, { color = '#888', phase = 0 } = {}) {
  const g = new Geo();
  const o0 = ngon(n, rOut, rOut, 0, phase),
    o1 = ngon(n, rOut, rOut, h, phase);
  const i0 = ngon(n, rIn, rIn, 0, phase),
    i1 = ngon(n, rIn, rIn, h, phase);
  const up = V(0, 1, 0),
    down = V(0, -1, 0);
  for (let j = 0; j < n; j++) {
    const k = (j + 1) % n;
    const mid = o0[j].clone().add(o0[k]).setY(0).normalize();
    g.quadDir(o0[j], o0[k], o1[k], o1[j], color, mid);
    g.quadDir(i0[j], i0[k], i1[k], i1[j], color, mid.clone().negate());
    g.quadDir(i1[j], i1[k], o1[k], o1[j], color, up);
    g.quadDir(i0[j], i0[k], o0[k], o0[j], color, down);
  }
  return g;
}

// Flat convex polygon (list of [x,y]) extruded along +z from z0 to z1 (a thin plate).
export function plate(pts, z0, z1, { color = '#888', side } = {}) {
  const r0 = pts.map(([x, y]) => V(x, y, z0));
  const r1 = pts.map(([x, y]) => V(x, y, z1));
  const g = loft([r0, r1], { color });
  if (side) g.paint((c, n) => (Math.abs(n.z) < 0.5 ? side : undefined));
  return g;
}

// Single flat convex polygon (list of [x,y]) at depth z, facing +z. For decals such as eyes and card print.
export function flat(pts, z, { color = '#888' } = {}) {
  const g = new Geo();
  const P = pts.map(([x, y]) => V(x, y, z));
  for (let i = 1; i < P.length - 1; i++) g.triDir(P[0], P[i], P[i + 1], color, V(0, 0, 1));
  return g;
}

// Low-poly ellipsoid. ws segments around, hs rings from top to bottom.
// deform(v, u, t) may move each vertex (u around 0..1, t from top 0 to bottom 1).
// keep(centroid, normal) may drop faces. color: hex or fn(centroid, normal).
export function ball(
  rx,
  ry,
  rz,
  ws = 8,
  hs = 6,
  { color = '#888', deform, keep, phase = 0, jitter = 0, seed = 1 } = {},
) {
  const rnd = rng(seed);
  const rows = [];
  for (let i = 0; i <= hs; i++) {
    const t = i / hs,
      th = t * Math.PI;
    if (i === 0 || i === hs) {
      const v = V(0, Math.cos(th) * ry, 0);
      if (deform) deform(v, 0, t);
      rows.push([v]);
      continue;
    }
    const row = [];
    for (let j = 0; j < ws; j++) {
      const u = j / ws,
        ph = phase + u * Math.PI * 2 + (i % 2 ? Math.PI / ws : 0) * 0;
      const v = V(Math.sin(th) * Math.sin(ph) * rx, Math.cos(th) * ry, Math.sin(th) * Math.cos(ph) * rz);
      if (jitter) {
        const s = 1 + (rnd() - 0.5) * 2 * jitter;
        v.multiplyScalar(s);
      }
      if (deform) deform(v, u, t);
      row.push(v);
    }
    rows.push(row);
  }
  const g = new Geo();
  const O = V();
  const colOf = (a, b, c) => {
    if (typeof color !== 'function') return color;
    const gc = V()
      .add(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    return color(gc, faceNormal(a, b, c));
  };
  for (let i = 0; i < hs; i++) {
    const r0 = rows[i],
      r1 = rows[i + 1];
    for (let j = 0; j < ws; j++) {
      const k = (j + 1) % ws;
      if (r0.length === 1) {
        const c = colOf(r0[0], r1[j], r1[k]);
        g.tri(r0[0], r1[j], r1[k], c, O);
      } else if (r1.length === 1) {
        const c = colOf(r0[j], r0[k], r1[0]);
        g.tri(r0[j], r0[k], r1[0], c, O);
      } else {
        const c = colOf(r0[j], r0[k], r1[k]);
        g.tri(r0[j], r0[k], r1[k], c, O);
        const c2 = colOf(r0[j], r1[k], r1[j]);
        g.tri(r0[j], r1[k], r1[j], c2, O);
      }
    }
  }
  if (keep) g.filter(keep);
  return g;
}

// Strand: sweep a small diamond section along a path, tapering to a point.
// path: points; w[i] width, t[i] thickness at each point; out: vector (or fn(i)) that points away from the body.
// Section: two side edges, an outer ridge and a flatter inner face.
export function strand(path, w, t, out, { color = '#888', tipColor, tipFrom = 1, inner = 0.35, ridge = 0 } = {}) {
  const rings = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const T = (
      i === 0
        ? path[1].clone().sub(path[0])
        : i === path.length - 1
          ? p.clone().sub(path[i - 1])
          : path[i + 1].clone().sub(path[i - 1])
    ).normalize();
    const O = (typeof out === 'function' ? out(i, p) : out).clone().normalize();
    const S = V().crossVectors(T, O).normalize();
    const N = V().crossVectors(S, T).normalize();
    if (w[i] <= 1e-5) {
      rings.push(p.clone());
      continue;
    }
    const hw = w[i] / 2,
      th = t[i];
    rings.push([
      p.clone().addScaledVector(S, -hw),
      p
        .clone()
        .addScaledVector(S, ridge * hw)
        .addScaledVector(N, th),
      p.clone().addScaledVector(S, hw),
      p.clone().addScaledVector(N, -th * inner),
    ]);
  }
  const g = loft(rings, {
    color: (info) => (tipColor && info.i >= tipFrom ? tipColor : color),
  });
  return g;
}
