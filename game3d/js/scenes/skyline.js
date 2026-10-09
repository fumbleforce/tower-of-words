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
// Ground: sea everywhere, the island's land from COAST (or opts.land), sand from SAND, green from GREEN, mown bands
// and longer grass from MOWN and paving from PATHS, all in one vertex-coloured mesh just under the chunk's own floor, so the frame edge never shows
// scene.background
// (opts.sea false: no sea, for a place with its own, like the train's).
// Budget: at most 10 meshes and 25k triangles per chunk (stats on the returned handle).
//
// Shapes in the layout: `poly` [[x, z], ...], or `rect` [x0, z0, x1, z1] / { x0, x1, z0, z1 } / { x, z, w, d },
// in the island frame. A path may instead be { points: [[x, z], ...], width }. A building whose `detail` names this
// chunk is built by the chunk itself and left out here; so is any id in opts.skip.

import * as THREE from 'three';
import { mat } from '../props.js';
import { drain } from '../perf/slice.js';
import { TOWN } from './town.js';
import { farWanted } from '../look/far-flag.js';
import {
  tierNow,
  pt,
  rectPoly,
  shapeOf,
  ccw,
  inside,
  bbox,
  hash,
  bucket,
  facePatch,
  edgeBox,
  flat,
  toMesh,
  tris,
  edges,
  windows,
  FLOOR_H,
} from './skyline-geom.js';

export const SEA = '#50667a';
export const SAND = '#bdb8a8';
const GROUND = {
  sea: SEA,
  land: '#707275',
  green: TOWN.grass,
  path: '#86847f',
  sand: SAND,
};
const SHADOW_R = 12,
  WALL_COLOURS = 4,
  MAX_MESHES = 10,
  MAX_TRIS = 25000,
  LIT = '#e8c89a',
  LIT_GLOW = '#ffc98a';

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

// ---------- the skyline ----------
export const buildSkyline = (root, chunkId, opts) => drain(skylineSteps(root, chunkId, opts));

export function* skylineSteps(
  root,
  chunkId,
  { layout, near = 26, far = 60, evening = false, tier, skip = [], walk, land = null, landColor, sea = true } = {},
) {
  const L = layout,
    chunk = L.CHUNKS?.[chunkId] || {};
  const local = (p) => {
    const r = L.toLocal(chunkId, p[0], p[1]);
    return Array.isArray(r) ? r : [r.x, r.z];
  };
  const q = tier ?? tierNow();
  // CHUNKS walk rectangles are [x0, x1, z0, z1]
  const cw = chunk.walk && {
    x0: chunk.walk[0],
    x1: chunk.walk[1],
    z0: chunk.walk[2],
    z1: chunk.walk[3],
  };
  const W = walk ? rectPoly(walk) : cw ? rectPoly(cw) : null;
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
  // ?far=1 (look/far-flag.js): the follow camera gets the far model (far-model.js) in place of the far ring, and the
  // buildings the occlusion rule cuts down get their missing floors in `tall`; litFar keeps the far ring's lit
  // windows with it. nearIds: what this ring builds, so the far model leaves it out.
  const farMode = farWanted(chunkId),
    tall = bucket(true),
    litFar = farMode ? bucket() : litAll,
    nearIds = new Set();
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
    const full = b.storeys || 2;
    let storeys = full;
    // the occlusion rule: south of the walk line and across it, nothing taller than 0.95 x its distance to the line
    if (z0 > wz1 && x1 > wx0 && x0 < wx1) storeys = Math.min(storeys, Math.floor((0.95 * (z0 - wz1)) / fh));
    const kind = b.windows || 'flat',
      wallHex = typeof b.wall === 'number' ? TOWN.walls[b.wall] : b.wall || TOWN.walls[0];
    const es = edges(poly);
    if (farMode && dist <= near) {
      nearIds.add(b.id);
      if (storeys < full)
        upperFloors(tall, poly, es, { kind, storeys: full, fh, from: Math.max(0, storeys) }, b.id, wallHex);
    }
    if (storeys < 1) continue;
    const h = storeys * fh;
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
      if (q > 0) for (const e of es) if (seen(e)) windows(null, e, s, b.id, farB, litFar, winC);
    }
    yield;
  }

  // Ground stays one mesh. Material roles ride per vertex, so lawn gets surface detail
  // without applying grass to sea/paving or baking lighting across the whole island.
  const gb = { ...bucket(true), look: [] },
    R = far + 30;
  const C = (hex) => new THREE.Color(hex);
  if (sea) flat(gb, rectPoly([cx - R, cz - R, cx + R, cz + R]), -0.2, C(GROUND.sea));
  // opts.land: the land as one island-frame polygon (scenes/island-west.js coastLand); without it, COAST if it is
  // a polygon, else land everywhere
  if (land)
    flat(gb, ccw(land.map(local)), -0.16, C(landColor || GROUND.land), landColor === TOWN.grass ? 'grass' : 'concrete');
  const coasts = L.COAST ? [].concat(L.COAST.poly || L.COAST.rect ? [L.COAST] : L.COAST) : [];
  for (const c of land ? [] : coasts) {
    const sh = Array.isArray(c[0]) ? c : shapeOf(c);
    if (sh) flat(gb, ccw(sh.map(local)), -0.16, C(GROUND.land));
  }
  if (!land && !coasts.length) flat(gb, rectPoly([cx - R, cz - R, cx + R, cz + R]), -0.16, C(GROUND.land));
  for (const s of L.SAND || []) {
    const sh = shapeOf(s);
    if (sh) flat(gb, ccw(sh.map(local)), -0.15, C(s.color || GROUND.sand));
  }
  for (const g of L.GREEN || []) {
    const sh = shapeOf(g);
    if (sh) flat(gb, ccw(sh.map(local)), -0.145, C(g.color || GROUND.green), 'grass');
  }
  for (const g of L.MOWN || []) {
    const sh = shapeOf(g);
    if (sh) flat(gb, ccw(sh.map(local)), g.y, C(g.color), 'grass');
  }
  for (const p of L.PATHS || []) {
    const color = C(p.color || GROUND.path);
    // a path in its own stone (the terraces) lies 5 mm over the plain paths it overlaps, so the two never fight
    const py = p.color && p.color !== GROUND.path ? -0.125 : -0.13;
    const sh = shapeOf(p);
    if (sh) flat(gb, ccw(sh.map(local)), py, color, 'paving');
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
        flat(gb, ccw([P(A, 1), P(B, 1), P(B, -1), P(A, -1)]), py, color, 'paving');
      }
    }
    yield;
  }

  // materials and meshes
  const litMat = mat(LIT, {
    emissive: new THREE.Color(LIT_GLOW),
    emissiveIntensity: 0.9,
  });
  const meshes = [];
  const put = (m, { cast = false, recv = true, noLook = false, surf = null } = {}) => {
    if (!m) return null;
    m.castShadow = cast;
    m.receiveShadow = recv;
    if (noLook) m.userData.noLook = true;
    if (surf) m.userData.surf = surf;
    root.add(m);
    meshes.push(m);
    return m;
  };
  let i = 0;
  for (const [hex, b] of wallsNear)
    put(toMesh(b, mat(hex), `skyline:walls${i++}`), {
      cast: casts,
      surf: 'cladding',
    });
  put(toMesh(roofNear, mat(TOWN.roof, { roughness: 0.9 }), 'skyline:roofs'), {
    surf: 'roof',
  });
  put(toMesh(winNear, mat(TOWN.window, { roughness: 0.35 }), 'skyline:windows'));
  put(toMesh(bands, mat(TOWN.band), 'skyline:bands'), { cast: casts });
  const vc = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const farMesh = put(toMesh(farB, vc(), 'skyline:far'), {
    recv: false,
    noLook: true,
  });
  const ground = put(
    toMesh(gb, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), 'skyline:ground'),
    { noLook: true },
  );
  const lit = put(toMesh(litAll, litMat, 'skyline:lit'), { recv: false });
  if (lit) lit.visible = !!evening;
  const allTris = [...wallsNear.values(), roofNear, winNear, bands, farB, gb, litAll].reduce((s, b) => s + tris(b), 0);
  if (meshes.length > MAX_MESHES || allTris > MAX_TRIS)
    console.warn(`skyline ${chunkId}: ${meshes.length} meshes, ${Math.round(allTris)} triangles, over its budget`);
  // ?far=1: which camera sees what (look/sky.js shows `follow` and hides `overview` while the follow camera is on);
  // the ground carries what the far model needs to fit round this ring
  let litF = null;
  if (farMode) {
    if (farMesh) farMesh.userData.farView = 'overview';
    const tm = toMesh(tall, vc(), 'skyline:tall');
    if (tm) {
      root.add(tm);
      tm.castShadow = casts;
      tm.receiveShadow = true;
      tm.userData.farView = 'follow';
    }
    litF = toMesh(litFar, litMat, 'skyline:lit-far');
    if (litF) {
      root.add(litF);
      litF.userData.farView = 'overview';
      litF.userData.farLit = true;
      litF.visible = !!evening;
    }
    if (ground)
      ground.userData.farModel = {
        chunk: chunkId,
        near,
        centre: [cx, cz],
        box: W ? bbox(W) : [-6, 6, -6, 3],
        skip: [...skipIds, ...nearIds],
      };
  }
  return {
    meshes,
    lit,
    stats: {
      meshes: meshes.length,
      tris: Math.round(allTris),
      near: nNear,
      far: nFar,
      tier: q,
    },
    // lights come on after work and stay on (a place is entered with the period it was built in, then later ones)
    onPeriod(period) {
      if (period !== 'evening') return;
      if (lit) lit.visible = true;
      if (litF) litF.visible = true;
    },
  };
}

// ?far=1: a building the occlusion rule cut down, from where the cut left it to its full height (walls, roof,
// parapet and the missing floors' windows in one vertex-coloured bucket), for the follow camera only
function upperFloors(b, poly, es, s, id, wallHex) {
  const y0 = s.from * s.fh,
    h = s.storeys * s.fh,
    wc = new THREE.Color(wallHex),
    band = new THREE.Color(TOWN.band);
  for (const e of es) facePatch(b, e.a, e.d, e.n, 0, e.L, y0, h, 0, wc);
  flat(b, poly, h, new THREE.Color(TOWN.roof));
  for (const e of es) edgeBox(b, e.a, e.d, e.n, 0, e.L, h, h + 0.3, -0.14, 0, band);
  const sink = bucket();
  for (const e of es) windows(null, e, s, id, b, sink, new THREE.Color(TOWN.window));
}
