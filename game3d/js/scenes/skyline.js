// The island around an outdoor chunk, cut from the shared layout (scenes/island-layout.js: BUILDINGS, PATHS, GREEN,
// COAST, CHUNKS, toLocal), so every chunk shows the same neighbours in the same directions.
//
//   const sky = buildSkyline(root, 'plaza', { layout, evening })      // or yield* skylineSteps(...) in a builder
//   place.onPeriod = (p) => sky.onPeriod(p)                            // lit windows after work
//
// Near ring (a building within `near` units of the chunk): walls with window rows on the faces the camera or the
// chunk sees, a parapet, a few roof plant boxes, balcony slabs on dorms and fins on offices. Merged by colour: one
// mesh per wall colour, one roof, one window, one lit window (emissive, shown in the evening), one for parapets,
// fins, bands and plant. Walls cast shadows only when a building stands within 12 units.
// Far ring (within `far`): walls, roofs and window quads in one vertex-coloured mesh, outside the look, no shadows;
// on the phone tier (q0) without windows.
// Ground: sea everywhere, the island's land from COAST, green from GREEN and paving from PATHS, all in one
// vertex-coloured mesh just under the chunk's own floor, so the frame edge never shows scene.background.
// Budget: at most 10 meshes and 25k triangles per chunk (stats on the returned handle).
//
// Shapes in the layout: `poly` [[x, z], ...], or `rect` [x0, z0, x1, z1] / { x0, x1, z0, z1 } / { x, z, w, d },
// in the island frame. A path may instead be { points: [[x, z], ...], width }. A building whose `detail` names this
// chunk is built by the chunk itself and left out here; so is any id in opts.skip.
import * as THREE from 'three';
import { mat } from '../props.js';
import { qualityTier } from '../settings.js';
import { drain } from '../perf/slice.js';
import { TOWN } from './town.js';

export const SEA = '#50667a';
const GROUND = { sea: SEA, land: '#707275', green: TOWN.grass, path: '#86847f' };
const FLOOR_H = 1.9, // a storey, in game units, unless the building says otherwise
  SHADOW_R = 12,
  WALL_COLOURS = 4,
  MAX_MESHES = 10,
  MAX_TRIS = 25000,
  LIT = '#e8c89a',
  LIT_GLOW = '#ffc98a';
const Q = new URLSearchParams(globalThis.location?.search || '');
const tierNow = () => (Q.has('q') ? +Q.get('q') : ({ low: 0, medium: 1, high: 2 }[qualityTier()] ?? 1));

// ---------- shapes ----------
const pt = (p) => (Array.isArray(p) ? p : [p.x, p.z]);
function rectPoly(r) {
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
const shapeOf = (item) => (item.poly ? item.poly.map(pt) : item.rect ? rectPoly(item.rect) : null);
const area = (poly) =>
  poly.reduce((s, [x, z], i) => s + x * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * z, 0) / 2;
// counter-clockwise in (x, z), so an edge a->b has its outside on (dz, -dx)
const ccw = (poly) => (area(poly) < 0 ? poly.slice().reverse() : poly);
function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
const bbox = (poly) => {
  const xs = poly.map((p) => p[0]),
    zs = poly.map((p) => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
};
// a small stable hash for which windows are lit and where roof plant stands
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};

// ---------- geometry buckets: raw triangles, turned into one BufferGeometry each at the end ----------
const bucket = (colored = false) => ({ pos: [], nor: [], col: colored ? [] : null });
function tri(b, pts, n, color) {
  for (const p of pts) {
    b.pos.push(p[0], p[1], p[2]);
    b.nor.push(n[0], n[1], n[2]);
    if (b.col) b.col.push(color.r, color.g, color.b);
  }
}
// a triangle wound so that its front face is the side the normal points to
function face(b, p0, p1, p2, n, color) {
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
const quad = (b, p0, p1, p2, p3, n, color) => (face(b, p0, p1, p2, n, color), face(b, p0, p2, p3, n, color));
// a vertical rectangle on an edge: from `u0` to `u1` along the edge (a unit direction d from point a), y0..y1,
// pushed `out` along the edge's outside normal n
function facePatch(b, a, d, n, u0, u1, y0, y1, out, color) {
  const X = (u) => a[0] + d[0] * u + n[0] * out,
    Z = (u) => a[1] + d[1] * u + n[1] * out;
  quad(b, [X(u0), y0, Z(u0)], [X(u1), y0, Z(u1)], [X(u1), y1, Z(u1)], [X(u0), y1, Z(u0)], [n[0], 0, n[1]], color);
}
// a box on an edge: from u0 to u1 along it, y0..y1, from `o0` to `o1` out from the face
function edgeBox(b, a, d, n, u0, u1, y0, y1, o0, o1, color) {
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
function flat(b, poly, y, color) {
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(
    poly.map(([x, z]) => new THREE.Vector2(x, z)),
    [],
  )) {
    const P = (q) => [poly[q][0], y, poly[q][1]];
    face(b, P(i), P(j), P(k), [0, 1, 0], color);
  }
}
function toMesh(b, material, name) {
  if (!b.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  if (b.col) g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, material);
  m.name = name; // named: mergeStatic and the perf batch leave it as it is
  return m;
}
const tris = (b) => b.pos.length / 9;

// at most WALL_COLOURS wall meshes: a further colour shares the bucket of the nearest one
function wallBucket(buckets, hex) {
  if (buckets.has(hex)) return buckets.get(hex);
  if (buckets.size < WALL_COLOURS) return buckets.set(hex, bucket()).get(hex);
  const c = new THREE.Color(hex),
    d = (h) => {
      const o = new THREE.Color(h);
      return (o.r - c.r) ** 2 + (o.g - c.g) ** 2 + (o.b - c.b) ** 2;
    };
  return buckets.get([...buckets.keys()].sort((a, b) => d(a) - d(b))[0]);
}

// ---------- one building ----------
// the edges of a counter-clockwise footprint: start point, unit direction, outside normal, length
function edges(poly) {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    return { a, d, n: [d[1], -d[0]], L, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  });
}

// window rows on one face; `lit` gets the same windows a hair further out, for the evening
// (win coloured with wc when it is the far ring's vertex-coloured bucket); B takes fins and balconies (near ring)
function windows(B, e, { kind, storeys, fh }, id, win, lit, wc = null) {
  const add = (u0, u1, y0, y1, key) => {
    facePatch(win, e.a, e.d, e.n, u0, u1, y0, y1, 0.02, wc);
    if (hash(key) < 0.28) facePatch(lit, e.a, e.d, e.n, u0, u1, y0, y1, 0.035, null);
  };
  for (let f = 0; f < storeys; f++) {
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

// ---------- the skyline ----------
export const buildSkyline = (root, chunkId, opts) => drain(skylineSteps(root, chunkId, opts));

export function* skylineSteps(
  root,
  chunkId,
  { layout, near = 26, far = 60, evening = false, tier, skip = [], walk } = {},
) {
  const L = layout,
    chunk = L.CHUNKS?.[chunkId] || {};
  const local = (p) => {
    const r = L.toLocal(chunkId, p[0], p[1]);
    return Array.isArray(r) ? r : [r.x, r.z];
  };
  const q = tier ?? tierNow();
  const W = walk ? rectPoly(walk) : chunk.walk ? rectPoly(chunk.walk) : null;
  const [wx0, wx1, , wz1] = W ? bbox(W) : [-6, 6, -6, 3];
  const cx = (wx0 + wx1) / 2,
    cz = W ? (bbox(W)[2] + wz1) / 2 : 0;
  const skipIds = new Set(skip);

  const wallsNear = new Map(), // colour -> bucket
    roofNear = bucket(),
    winNear = bucket(),
    litAll = bucket(),
    bands = bucket(),
    farB = bucket(true);
  let casts = false,
    nNear = 0,
    nFar = 0;
  const roofC = new THREE.Color(TOWN.roof),
    winC = new THREE.Color(TOWN.window);

  for (const b of L.BUILDINGS || []) {
    if (skipIds.has(b.id) || b.detail === chunkId) continue;
    const shape = shapeOf(b);
    if (!shape) continue;
    const poly = ccw(shape.map(local));
    const [x0, x1, z0, z1] = bbox(poly);
    const dist = Math.hypot(Math.max(x0 - cx, 0, cx - x1), Math.max(z0 - cz, 0, cz - z1));
    if (dist > far) continue;
    const fh = b.floorH || FLOOR_H;
    let storeys = b.storeys || 2;
    // the occlusion rule: south of the walk line and across it, nothing taller than 0.95 x its distance to the line
    if (z0 > wz1 && x1 > wx0 && x0 < wx1) storeys = Math.min(storeys, Math.floor((0.95 * (z0 - wz1)) / fh));
    if (storeys < 1) continue;
    const h = storeys * fh,
      kind = b.windows || 'flat',
      wallHex = typeof b.wall === 'number' ? TOWN.walls[b.wall] : b.wall || TOWN.walls[0];
    const es = edges(poly);
    const seen = (e) => e.n[1] > 0.2 || e.n[0] * (cx - e.mid[0]) + e.n[1] * (cz - e.mid[1]) > 0;
    const s = { kind, storeys, fh };
    if (dist <= near) {
      nNear++;
      const wb = wallBucket(wallsNear, wallHex);
      if (dist <= SHADOW_R) casts = true;
      for (const e of es) facePatch(wb, e.a, e.d, e.n, 0, e.L, 0, h, 0, null);
      flat(roofNear, poly, h, null);
      // parapet all round, a little plant on the roof
      for (const e of es) edgeBox(bands, e.a, e.d, e.n, 0, e.L, h, h + 0.3, -0.14, 0, null);
      for (let i = 0; i < 3; i++) {
        const u = hash(`${b.id}|p${i}|u`),
          v = hash(`${b.id}|p${i}|v`),
          px = x0 + 0.8 + u * (x1 - x0 - 1.6),
          pz = z0 + 0.8 + v * (z1 - z0 - 1.6),
          w = 0.6 + hash(`${b.id}|p${i}|w`) * 0.8;
        if (x1 - x0 < 2.4 || z1 - z0 < 2.4 || !inside(poly, px, pz) || i >= 1 + Math.floor(u * 3)) continue;
        edgeBox(bands, [px - w / 2, pz], [1, 0], [0, 1], 0, w, h, h + 0.45, -0.35, 0.35, null);
      }
      for (const e of es) if (seen(e)) windows(bands, e, s, b.id, winNear, litAll);
    } else {
      nFar++;
      const wc = new THREE.Color(wallHex);
      for (const e of es) facePatch(farB, e.a, e.d, e.n, 0, e.L, 0, h, 0, wc);
      flat(farB, poly, h, roofC);
      if (q > 0) for (const e of es) if (seen(e)) windows(null, e, s, b.id, farB, litAll, winC);
    }
    yield;
  }

  // ground: sea, land, green, paving, one vertex-coloured mesh just under the chunk's floor
  const gb = bucket(true),
    R = far + 30;
  const C = (hex) => new THREE.Color(hex);
  flat(gb, rectPoly([cx - R, cz - R, cx + R, cz + R]), -0.2, C(GROUND.sea));
  const coasts = L.COAST ? [].concat(L.COAST.poly || L.COAST.rect ? [L.COAST] : L.COAST) : [];
  for (const c of coasts) {
    const sh = Array.isArray(c[0]) ? c : shapeOf(c);
    if (sh) flat(gb, ccw(sh.map(local)), -0.16, C(GROUND.land));
  }
  if (!coasts.length) flat(gb, rectPoly([cx - R, cz - R, cx + R, cz + R]), -0.16, C(GROUND.land));
  for (const g of L.GREEN || []) {
    const sh = shapeOf(g);
    if (sh) flat(gb, ccw(sh.map(local)), -0.145, C(g.color || GROUND.green));
  }
  for (const p of L.PATHS || []) {
    const color = C(p.color || GROUND.path);
    const sh = shapeOf(p);
    if (sh) flat(gb, ccw(sh.map(local)), -0.13, color);
    else if (p.points) {
      const pts = p.points.map(pt).map(local),
        hw = (p.width || 1.5) / 2;
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]],
          l = Math.hypot(b[0] - a[0], b[1] - a[1]),
          d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l],
          n = [d[1], -d[0]],
          A = [a[0] - d[0] * hw, a[1] - d[1] * hw],
          B = [b[0] + d[0] * hw, b[1] + d[1] * hw];
        const P = (q0, s) => [q0[0] + n[0] * hw * s, q0[1] + n[1] * hw * s];
        flat(gb, ccw([P(A, 1), P(B, 1), P(B, -1), P(A, -1)]), -0.13, color);
      }
    }
    yield;
  }

  // materials and meshes
  const litMat = mat(LIT, { emissive: new THREE.Color(LIT_GLOW), emissiveIntensity: 0.9 });
  const meshes = [];
  const put = (m, { cast = false, recv = true, noLook = false } = {}) => {
    if (!m) return null;
    m.castShadow = cast;
    m.receiveShadow = recv;
    if (noLook) m.userData.noLook = true;
    root.add(m);
    meshes.push(m);
    return m;
  };
  let i = 0;
  for (const [hex, b] of wallsNear) put(toMesh(b, mat(hex), `skyline:walls${i++}`), { cast: casts });
  put(toMesh(roofNear, mat(TOWN.roof, { roughness: 0.9 }), 'skyline:roofs'));
  put(toMesh(winNear, mat(TOWN.window, { roughness: 0.35 }), 'skyline:windows'));
  put(toMesh(bands, mat(TOWN.band), 'skyline:bands'), { cast: casts });
  put(toMesh(farB, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 'skyline:far'), {
    recv: false,
    noLook: true,
  });
  put(toMesh(gb, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), 'skyline:ground'), {
    noLook: true,
  });
  const lit = put(toMesh(litAll, litMat, 'skyline:lit'), { recv: false });
  if (lit) lit.visible = !!evening;
  const allTris = [...wallsNear.values(), roofNear, winNear, bands, farB, gb, litAll].reduce((s, b) => s + tris(b), 0);
  if (meshes.length > MAX_MESHES || allTris > MAX_TRIS)
    console.warn(`skyline ${chunkId}: ${meshes.length} meshes, ${Math.round(allTris)} triangles, over its budget`);
  return {
    meshes,
    lit,
    stats: { meshes: meshes.length, tris: Math.round(allTris), near: nNear, far: nFar, tier: q },
    // lights come on after work and stay on (a place is entered with the period it was built in, then later ones)
    onPeriod(period) {
      if (lit && period === 'evening') lit.visible = true;
    },
  };
}
