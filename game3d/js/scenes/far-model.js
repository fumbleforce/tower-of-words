// One low-detail model of the whole island for the far view (?far=1, look/far-flag.js): every building in the
// island layout at its full height with window rows, the land and the sea past the skyline's square, and clumps of
// trees on the layout's green and over the north half (the park and the shrine headland, docs/game/island.md), so a
// place's street ends in the next districts and the hills instead of a flat plain. One vertex-coloured mesh (one
// draw call), plus the lit windows after work. It leaves out what the place and its skyline already build near it
// (the skyline ground's userData.farModel: skip ids, the near radius round the walk box).
//
//   const far = yield* farModelSteps(info, LAYOUT)    // { mesh, lit, stats }, in the chunk's own frame
//
// The tree spots are worked out once for the island and shared by every place.
import * as THREE from 'three';
import { mat } from '../props.js';
import { TOWN } from './town.js';
import { coastLand } from './island-west.js';
import { HALF_EDGE } from './island-plan.js';
import { SEA } from './skyline.js';
import {
  tierNow,
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

const SEA_Y = -0.5,
  LAND_Y = -0.42,
  TREE_GAP = 3.4, // the tree grid on the green, in island units
  WOOD_GAP = 4.2, // and in the north half's woods
  SEA_PAD = 260, // how far the sea runs past the island's land
  LIT = '#e8c89a',
  LIT_GLOW = '#ffc98a';
const GREENS = ['#4d6b47', '#43603f', '#57704c', '#4a6545'].map((h) => new THREE.Color(h));

// ---------- the trees: spots on the island, once ----------
let spots = null;
function treeSpots(L) {
  if (spots) return spots;
  const land = coastLand(L.COAST.line),
    blocked = (L.BUILDINGS || []).map((b) => shapeOf(b)).filter(Boolean),
    paths = (L.PATHS || []).map((p) => shapeOf(p)).filter(Boolean),
    free = (x, z) => inside(land, x, z) && !blocked.some((s) => inside(s, x, z)) && !paths.some((s) => inside(s, x, z));
  spots = [];
  const add = (x, z, key, big = 1) => {
    if (!free(x, z)) return;
    spots.push({
      x,
      z,
      r: (1.1 + hash(key + 'r') * 0.9) * big,
      c: Math.floor(hash(key + 'c') * GREENS.length),
    });
  };
  // on the green: a jittered grid, a third of it left open as lawn
  for (const g of L.GREEN || []) {
    const sh = shapeOf(g);
    if (!sh) continue;
    const [x0, x1, z0, z1] = bbox(sh);
    for (let x = x0; x < x1; x += TREE_GAP)
      for (let z = z0; z < z1; z += TREE_GAP) {
        const k = `${g.id}|${Math.round(x)}|${Math.round(z)}`,
          px = x + hash(k + 'x') * TREE_GAP,
          pz = z + hash(k + 'z') * TREE_GAP;
        if (hash(k) < 0.66 && inside(sh, px, pz)) add(px, pz, k);
      }
  }
  // the north half, past its edge: woods in broad clumps with clearings between (the park's lawns)
  const north = Math.min(...HALF_EDGE.map((p) => p[1])),
    [lx0, lx1, lz0] = bbox(land);
  for (let x = lx0; x < lx1; x += WOOD_GAP)
    for (let z = lz0; z < north + 8; z += WOOD_GAP) {
      const k = `n|${Math.round(x)}|${Math.round(z)}`,
        clump = Math.sin(x * 0.07) + Math.cos(z * 0.09 + x * 0.03);
      if (clump < -0.2 || hash(k) < 0.25) continue;
      add(x + hash(k + 'x') * WOOD_GAP, z + hash(k + 'z') * WOOD_GAP, k, 1.6);
    }
  return spots;
}

// a tree: a twenty-faced canopy sitting almost on the ground, flat-shaded, at (x, z) in the chunk's frame (no trunk:
// past the near ring a trunk read as a dark stick under each tree)
const CANOPY = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
function tree(b, x, z, r, color) {
  const cy = 0.5 + r * 1.25;
  const P = CANOPY.attributes.position,
    tmp = new THREE.Vector3(),
    tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < P.count; i += 3) {
    for (let k = 0; k < 3; k++) tri[k].fromBufferAttribute(P, i + k).multiply(tmp.set(r, r * 1.25, r));
    const n = new THREE.Vector3()
      .subVectors(tri[1], tri[0])
      .cross(new THREE.Vector3().subVectors(tri[2], tri[0]))
      .normalize();
    for (const v of tri) {
      b.pos.push(x + v.x, cy + v.y, z + v.z);
      b.nor.push(n.x, n.y, n.z);
      b.col.push(color.r, color.g, color.b);
    }
  }
}

// ---------- one place's far model ----------
export function* farModelSteps(info, L) {
  const { chunk, near, box, skip } = info,
    skipIds = new Set(skip);
  const local = (p) => {
    const r = L.toLocal(chunk, p[0], p[1]);
    return Array.isArray(r) ? r : [r.x, r.z];
  };
  // how far a point in the chunk's frame is from the walk box: the skyline's own measure
  const [bx0, bx1, bz0, bz1] = box,
    off = (x0, x1, z0, z1) => Math.hypot(Math.max(x0 - bx1, 0, bx0 - x1), Math.max(z0 - bz1, 0, bz0 - z1));
  const q = tierNow(),
    B = bucket(true),
    lit = bucket(),
    winC = new THREE.Color(TOWN.window),
    band = new THREE.Color(TOWN.band);

  // the sea, then the land over it, both under the skyline's ground so the near ground always wins
  const land = ccw(coastLand(L.COAST.line).map(local)),
    [lx0, lx1, lz0, lz1] = bbox(land);
  flat(
    B,
    [
      [lx0 - SEA_PAD, lz0 - SEA_PAD],
      [lx1 + SEA_PAD, lz0 - SEA_PAD],
      [lx1 + SEA_PAD, lz1 + SEA_PAD],
      [lx0 - SEA_PAD, lz1 + SEA_PAD],
    ],
    SEA_Y,
    new THREE.Color(SEA),
  );
  flat(B, land, LAND_Y, new THREE.Color(TOWN.grass));
  yield;

  let nb = 0;
  for (const b of L.BUILDINGS || []) {
    if (skipIds.has(b.id) || b.detail === chunk) continue;
    const shape = shapeOf(b);
    if (!shape) continue;
    const poly = ccw(shape.map(local)),
      [x0, x1, z0, z1] = bbox(poly);
    if (off(x0, x1, z0, z1) <= near) continue;
    nb++;
    const fh = b.floorH || FLOOR_H,
      s = { kind: b.windows || 'flat', storeys: b.storeys || 2, fh },
      h = s.storeys * fh,
      wall = new THREE.Color(typeof b.wall === 'number' ? TOWN.walls[b.wall] : b.wall || TOWN.walls[0]);
    const es = edges(poly);
    for (const e of es) facePatch(B, e.a, e.d, e.n, 0, e.L, 0, h, 0, wall);
    flat(B, poly, h, new THREE.Color(b.roof || TOWN.roof));
    for (const e of es) edgeBox(B, e.a, e.d, e.n, 0, e.L, h, h + 0.3, -0.14, 0, band);
    if (q > 0) for (const e of es) windows(null, e, s, b.id, B, lit, winC);
  }
  yield;

  let nt = 0;
  for (const t of treeSpots(L)) {
    const [x, z] = local([t.x, t.z]);
    if (off(x, x, z, z) <= near) continue;
    tree(B, x, z, t.r, GREENS[t.c]);
    nt++;
  }
  yield;

  const mesh = toMesh(B, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), 'far:island');
  const litMesh = toMesh(lit, mat(LIT, { emissive: new THREE.Color(LIT_GLOW), emissiveIntensity: 0.9 }), 'far:lit');
  for (const m of [mesh, litMesh].filter(Boolean)) {
    m.castShadow = false;
    m.receiveShadow = false;
    m.userData.noLook = true;
    m.userData.farView = 'follow';
  }
  if (litMesh) litMesh.userData.farLit = true; // after work only (look/sky.js)
  return {
    mesh,
    lit: litMesh,
    stats: { buildings: nb, trees: nt, tris: Math.round(tris(B) + tris(lit)) },
  };
}
