// Geometry helpers shared by the skyline (skyline.js) and the far model (far-model.js): footprints from the island
// layout's shapes, raw triangle buckets turned into one BufferGeometry each, building walls, roofs and window rows.
import * as THREE from 'three';
import { qualityTier } from '../settings.js';
import { kindOf, patchMaterial } from '../look/procedural.js';

export const FLOOR_H = 1.9; // a storey, in game units, unless the building says otherwise
const Q = new URLSearchParams(globalThis.location?.search || '');
export const tierNow = () => (Q.has('q') ? +Q.get('q') : ({ low: 0, medium: 1, high: 2 }[qualityTier()] ?? 1));

// ---------- shapes ----------
export const pt = (p) => (Array.isArray(p) ? p : [p.x, p.z]);
export function rectPoly(r) {
  let x0, z0, x1, z1;
  if (Array.isArray(r)) [x0, z0, x1, z1] = r;
  else if (r.w != null) [x0, z0, x1, z1] = [r.x - r.w / 2, r.z - r.d / 2, r.x + r.w / 2, r.z + r.d / 2];
  else ({ x0, z0, x1, z1 } = r);
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}
export const shapeOf = (item) => (item.poly ? item.poly.map(pt) : item.rect ? rectPoly(item.rect) : null);
export const area = (poly) =>
  poly.reduce((s, [x, z], i) => s + x * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * z, 0) / 2;
// counter-clockwise in (x, z), so an edge a->b has its outside on (dz, -dx)
export const ccw = (poly) => (area(poly) < 0 ? poly.slice().reverse() : poly);
export function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
export const bbox = (poly) => {
  const xs = poly.map((p) => p[0]),
    zs = poly.map((p) => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
};
// a small stable hash for which windows are lit and where roof plant stands
export const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};

// ---------- geometry buckets: raw triangles, turned into one BufferGeometry each at the end ----------
export const bucket = (colored = false) => ({
  pos: [],
  nor: [],
  col: colored ? [] : null,
});
export function tri(b, pts, n, color) {
  for (const p of pts) {
    b.pos.push(p[0], p[1], p[2]);
    b.nor.push(n[0], n[1], n[2]);
    if (b.col) b.col.push(color.r, color.g, color.b);
    if (b.look) b.look.push(kindOf(b.surface), 0, 0, 0.8);
  }
}
// a triangle wound so that its front face is the side the normal points to
export function face(b, p0, p1, p2, n, color) {
  const ax = p1[0] - p0[0],
    ay = p1[1] - p0[1],
    az = p1[2] - p0[2],
    bx = p2[0] - p0[0],
    by = p2[1] - p0[1],
    bz = p2[2] - p0[2];
  const dot = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2];
  tri(b, dot >= 0 ? [p0, p1, p2] : [p0, p2, p1], n, color);
}
// four corners in order round the rectangle
export const quad = (b, p0, p1, p2, p3, n, color) => (face(b, p0, p1, p2, n, color), face(b, p0, p2, p3, n, color));
// a vertical rectangle on an edge: from `u0` to `u1` along the edge (a unit direction d from point a), y0..y1,
// pushed `out` along the edge's outside normal n
export function facePatch(b, a, d, n, u0, u1, y0, y1, out, color) {
  const X = (u) => a[0] + d[0] * u + n[0] * out,
    Z = (u) => a[1] + d[1] * u + n[1] * out;
  quad(b, [X(u0), y0, Z(u0)], [X(u1), y0, Z(u1)], [X(u1), y1, Z(u1)], [X(u0), y1, Z(u0)], [n[0], 0, n[1]], color);
}
// a box on an edge: from u0 to u1 along it, y0..y1, from `o0` to `o1` out from the face
export function edgeBox(b, a, d, n, u0, u1, y0, y1, o0, o1, color) {
  const P = (u, o, y) => [a[0] + d[0] * u + n[0] * o, y, a[1] + d[1] * u + n[1] * o];
  const s = [
    [P(u0, o1, y0), P(u1, o1, y0), P(u1, o1, y1), P(u0, o1, y1), [n[0], 0, n[1]]],
    [P(u1, o0, y0), P(u0, o0, y0), P(u0, o0, y1), P(u1, o0, y1), [-n[0], 0, -n[1]]],
    [P(u0, o0, y0), P(u0, o1, y0), P(u0, o1, y1), P(u0, o0, y1), [-d[0], 0, -d[1]]],
    [P(u1, o1, y0), P(u1, o0, y0), P(u1, o0, y1), P(u1, o1, y1), [d[0], 0, d[1]]],
    [P(u0, o1, y1), P(u1, o1, y1), P(u1, o0, y1), P(u0, o0, y1), [0, 1, 0]],
  ];
  for (const [p0, p1, p2, p3, nn] of s) quad(b, p0, p1, p2, p3, nn, color);
}
// a flat polygon at height y, facing up
export function flat(b, poly, y, color, surface = null) {
  b.surface = surface;
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(
    poly.map(([x, z]) => new THREE.Vector2(x, z)),
    [],
  )) {
    const P = (q) => [poly[q][0], y, poly[q][1]];
    face(b, P(i), P(j), P(k), [0, 1, 0], color);
  }
  b.surface = null;
}
export function toMesh(b, material, name) {
  if (!b.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  if (b.col) g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  if (b.look) {
    g.setAttribute('aLook', new THREE.Float32BufferAttribute(b.look, 4));
    patchMaterial(material);
  }
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, material);
  m.name = name; // named: mergeStatic and the perf batch leave it as it is
  return m;
}
export const tris = (b) => b.pos.length / 9;

// ---------- one building ----------
// the edges of a counter-clockwise footprint: start point, unit direction, outside normal, length
export function edges(poly) {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    return {
      a,
      d,
      n: [d[1], -d[0]],
      L,
      mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    };
  });
}

// window rows on one face; `lit` gets the same windows a hair further out, for the evening
// (win coloured with wc when it is the far ring's vertex-coloured bucket); B takes fins and balconies (near ring);
// `from`: the first floor with windows (the floors under it are left as they are)
export function windows(B, e, { kind, storeys, fh, from = 0 }, id, win, lit, wc = null) {
  const add = (u0, u1, y0, y1, key) => {
    facePatch(win, e.a, e.d, e.n, u0, u1, y0, y1, 0.02, wc);
    if (hash(key) < 0.28) facePatch(lit, e.a, e.d, e.n, u0, u1, y0, y1, 0.035, null);
  };
  for (let f = from; f < storeys; f++) {
    const y = f * fh;
    if (kind === 'office') {
      add(0.2, e.L - 0.2, y + 0.35 * fh, y + 0.85 * fh, `${id}|${f}|${e.a}`);
      continue;
    }
    if (kind === 'shop' && f === 0) {
      add(0.25, e.L - 0.25, 0.1, 0.75 * fh, `${id}|0|${e.a}`);
      continue;
    }
    const cols = Math.max(1, Math.floor(e.L / 1.25)),
      step = e.L / cols;
    for (let c = 0; c < cols; c++) {
      const u = step * (c + 0.5);
      add(u - step * 0.3, u + step * 0.3, y + 0.3 * fh, y + 0.8 * fh, `${id}|${f}|${c}|${e.a}`);
    }
  }
  // near ring only: office fins, dorm balconies
  if (!B) return;
  if (kind === 'office')
    for (let u = 0; u <= e.L + 0.01; u += Math.max(1.1, e.L / Math.ceil(e.L / 1.4)))
      edgeBox(B, e.a, e.d, e.n, u - 0.05, u + 0.05, 0, storeys * fh, 0, 0.18, null);
  if (kind === 'dorm' && e.n[1] > 0.5)
    for (let f = 1; f < storeys; f++) {
      edgeBox(B, e.a, e.d, e.n, 0.1, e.L - 0.1, f * fh - 0.08, f * fh, 0, 0.5, null);
      edgeBox(B, e.a, e.d, e.n, 0.1, e.L - 0.1, f * fh, f * fh + 0.45, 0.46, 0.5, null);
    }
}
