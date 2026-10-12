// One low-detail model of the whole island for the far view (look/far-flag.js): the island plan's buildings
// (island-layout.js BUILDINGS) at their footprints, turns and full heights with window rows, the land and the sea past
// the skyline's square, and trees on the layout's green and over the north half (the park and the shrine headland,
// docs/game/island.md), so a place's street ends in the next districts and the hills instead of a flat plain. One
// vertex-coloured mesh (one draw call), plus the lit windows after work.
// It leaves out what the place builds itself: the skyline's skip ids and near ring (the skyline ground's
// userData.farModel), and anything standing on the place's own ground, buildings or planting (`own`, look/sky.js
// probes the built place), so no plan building lands on a lawn, street or building the place laid out differently.
// Every tree stands on a trunk from below the ground.
//
//   const far = yield* farModelSteps(info, LAYOUT, opts)   // { mesh, lit, stats }, in the chunk's own frame
//   opts.own(x, z): true where the place has built something of its own at that point (chunk frame)
//   opts.buildFrom, opts.treesFrom: how far from the walk box the buildings and the trees begin (past the near ring)
//   opts.sideTo: how far out a tree's crown gets its second mass
//
// The tree spots are worked out once for the island and shared by every place.
import * as THREE from 'three';
import { mat } from '../props.js';
import { LEAF } from './outdoor/planting.js';
import { TOWN } from './town.js';
import { coastLand } from './island-west.js';
import { skylinePieces, skylinePieceId } from './skyline-pieces.js';
import { farStation } from './far-station.js';
import { distantMaterial } from './diorama/distant-material.js';
import { islandTreeSpots } from './distant-trees.js';
import { SEA } from './skyline.js';
import {
  tierNow,
  shapeOf,
  ccw,
  inside,
  bbox,
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
  SEA_PAD = 260, // how far the sea runs past the island's land
  LIT = '#e8c89a',
  LIT_GLOW = '#ffc98a';
const GREENS = ['#4d6b47', '#43603f', '#57704c', '#4a6545'].map((h) => new THREE.Color(h));

// ---------- the trees: spots on the island, once ----------
// a tree in the street trees' shape (outdoor/planting.js keyaki, seen from far): a grey trunk from under the far land up
// into a broad crown of two flattened twenty-faced blobs, flat-shaded, at (x, z) in the chunk's frame; r is the crown's
// radius. The trunk starts below LAND_Y so it meets whichever ground lies over it (the far land or the skyline's).
const CANOPY = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
const NEAR_CANOPY = new THREE.SphereGeometry(1, 10, 5).toNonIndexed();
const SIDE_CANOPY = new THREE.SphereGeometry(1, 8, 4).toNonIndexed();
const CLOSE_CANOPY = new THREE.SphereGeometry(1, 16, 8).toNonIndexed();
const CLOSE_SIDE = new THREE.SphereGeometry(1, 12, 6).toNonIndexed();
const TRUNK = new THREE.CylinderGeometry(0.62, 1, 1, 5, 1, true).translate(0, 0.5, 0).toNonIndexed();
const BARK = new THREE.Color(LEAF.barkGrey);
function put(b, geo, [sx, sy, sz], [x, y, z], color, turn = 0) {
  const P = geo.attributes.position,
    normals = geo.attributes.normal,
    cs = Math.cos(turn),
    sn = Math.sin(turn),
    tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = tri[k].fromBufferAttribute(P, i + k);
      v.set(v.x * sx, v.y * sy, v.z * sz);
      v.set(v.x * cs - v.z * sn, v.y, v.x * sn + v.z * cs);
    }
    const n = e1.subVectors(tri[1], tri[0]).cross(e2.subVectors(tri[2], tri[0])).normalize();
    for (const [k, v] of tri.entries()) {
      if (geo !== TRUNK) {
        n.fromBufferAttribute(normals, i + k).set(n.x / sx, n.y / sy, n.z / sz);
        n.set(n.x * cs - n.z * sn, n.y, n.x * sn + n.z * cs).normalize();
      }
      b.pos.push(x + v.x, y + v.y, z + v.z);
      b.nor.push(n.x, n.y, n.z);
      b.col.push(color.r, color.g, color.b);
    }
  }
}
function tree(b, x, z, r, color, seed, side, rounded, close) {
  const canopy = close ? CLOSE_CANOPY : rounded ? NEAR_CANOPY : CANOPY;
  const sideCanopy = close ? CLOSE_SIDE : rounded ? SIDE_CANOPY : canopy;
  const trunkTop = 0.95 * r,
    cy = trunkTop + 0.62 * r,
    turn = seed * 6.283;
  put(b, TRUNK, [0.12 * r, trunkTop - LAND_Y + 0.2 * r, 0.12 * r], [x, LAND_Y, z], BARK, turn);
  put(b, canopy, [r, 0.72 * r, r], [x, cy, z], color, turn);
  // a second, smaller mass to one side, so the crown reads as a tree's and not a ball (not past opts.sideTo, where the haze hides it)
  if (!side) return;
  const a = turn * 1.7;
  put(
    b,
    sideCanopy,
    [0.68 * r, 0.55 * r, 0.68 * r],
    [x + Math.cos(a) * 0.55 * r, cy + 0.42 * r, z + Math.sin(a) * 0.55 * r],
    color,
    turn + 1,
  );
  if (rounded)
    put(
      b,
      sideCanopy,
      [0.52 * r, 0.48 * r, 0.52 * r],
      [x - Math.cos(a) * 0.5 * r, cy + 0.34 * r, z - Math.sin(a) * 0.5 * r],
      color,
      turn + 2,
    );
}

// points spread over a footprint (a three by three grid inside it): where the place's own ground is probed
function samples(poly) {
  const [x0, x1, z0, z1] = bbox(poly),
    out = [];
  for (const u of [0.1, 0.5, 0.9])
    for (const v of [0.1, 0.5, 0.9]) {
      const x = x0 + (x1 - x0) * u,
        z = z0 + (z1 - z0) * v;
      if (inside(poly, x, z)) out.push([x, z]);
    }
  return out;
}

// ---------- one place's far model ----------
export function* farModelSteps(
  info,
  L,
  { own = () => false, ownTree = own, buildFrom = 0, treesFrom = 0, treesTo = Infinity, sideTo = Infinity } = {},
) {
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
  for (const b of (L.BUILDINGS || []).flatMap(skylinePieces)) {
    if (skipIds.has(b.id) || skipIds.has(skylinePieceId(b)) || b.detail === chunk) continue;
    const shape = shapeOf(b);
    if (!shape) continue;
    const poly = ccw(shape.map(local)),
      [x0, x1, z0, z1] = bbox(poly);
    if (off(x0, x1, z0, z1) <= Math.max(near, buildFrom) || samples(poly).some(([x, z]) => own(x, z))) continue;
    nb++;
    if (b.id === 'platform_shed') {
      farStation(B, b, local);
      continue;
    }
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
  for (const t of islandTreeSpots(L)) {
    const [x, z] = local([t.x, t.z]);
    const d = off(x, x, z, z);
    // Past the full haze plus camera-arm margin, the entire crown is hidden. Spend those
    // triangles on round silhouettes in the exposed middle distance instead.
    if (d <= treesFrom || d > treesTo + t.r * 2 || ownTree(x, z)) continue;
    tree(B, x, z, t.r, GREENS[t.c], t.s, d < Math.min(sideTo, 30), d < 45, d < 22);
    nt++;
  }
  yield;

  const mesh = toMesh(B, distantMaterial(), 'far:island');
  const litMesh = toMesh(lit, mat(LIT, { emissive: new THREE.Color(LIT_GLOW), emissiveIntensity: 0.9 }), 'far:lit');
  for (const m of [mesh, litMesh].filter(Boolean)) {
    m.castShadow = false;
    m.receiveShadow = false;
    m.userData.noLook = true;
    m.userData.noAO = true; // past the haze's start, where contact shadows don't show (post.js leaves it out)
    m.userData.farView = 'follow';
  }
  if (litMesh) litMesh.userData.farLit = true; // after work only (look/sky.js)
  return {
    mesh,
    lit: litMesh,
    stats: { buildings: nb, trees: nt, tris: Math.round(tris(B) + tris(lit)) },
  };
}
