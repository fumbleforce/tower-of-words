// The platform-side door sets the train place hangs on the car, built from the car's DOORWAYS (car.js). Each is a
// full-height door module in the wall: two biparting stainless leaves (train/door-leaf.js) that run inside the wall's
// thickness and slide into a pocket either side of the opening, a header over it with a lamp (amber shut, green
// open), and a yellow threshold on the floor. Jørgen, 2026-10-09: the doors "slide into the windows and outside the
// cart when opening ... they should have the space to slide, and be sensibly placed on the chassis"; the windows
// stay clear of the pockets (car.js WIN) and the leaves never leave the wall at any point of the cycle
// (game3d/test/unit/train-doorways.test.mjs). Leaves, pockets and header are full height in every framing and never
// fade with the cut wall (Jørgen: "the doors are still half size when trying to leave the train wagon"); in the
// closed car the Blender skin covers the pockets' outer faces.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DOORWAYS, LZ, T, HF, COL } from './car.js';
import { doorLeaf } from './door-leaf.js';

const mats = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key))
    mats.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0,
        ...opts,
      }),
    );
  return mats.get(key);
};
const emissive = (color, glow, k) => mat(color, { emissive: new THREE.Color(glow), emissiveIntensity: k });
// box between two corners, x0..x1, y0..y1, z0..z1
function box(x0, x1, y0, y1, z0, z1, m, { r = 0.004, cast = false } = {}) {
  const w = x1 - x0,
    h = y1 - y0,
    d = z1 - z0;
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2, h / 2, d / 2) - 1e-4), m);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

export const lampShut = emissive('#ffcf8a', '#ffb24a', 1.8),
  lampOpen = emissive('#b8f5c8', '#46d18a', 2.2);

// how far each leaf reaches past the opening's edge into its pocket when shut, and how much of its nosing still
// shows at the jamb when open
export const LAP = 0.02,
  SHOW = 0.012;
// the leaves' plane: the middle of the wall's outer half, inside the cut-away wall (LZ - 0.013 .. LZ + T + 0.003)
// and inside the Blender skin (LZ + T - 0.055 .. LZ + T)
export const LEAF_Z = LZ + T - 0.035;
// the wall's two layers for the pockets and the header: the inside colour, then the car-side colour
const IN_Z = [LZ - 0.018, LZ + 0.045],
  OUT_Z = [LZ + 0.045, LZ + T - 0.01];

// each leaf's x range [a, b] when shut and when open, for a doorway; the far-from-centre end of each pocket
export function leafSpan(d, s, k = 0) {
  const w = (d.x1 - d.x0) / 2 + LAP,
    edge = d.x + s * k * ((d.x1 - d.x0) / 2 - SHOW);
  return s < 0 ? [edge - w, edge] : [edge, edge + w];
}
export const pocketEnd = (d, s) =>
  s < 0 ? d.x0 - (d.x1 - d.x0) / 2 - LAP - 0.03 : d.x1 + (d.x1 - d.x0) / 2 + LAP + 0.03;

// leaves: [{ g, d, s }] for slideLeaves; lamps: the lamp meshes to recolour
export function buildDoorSets() {
  const group = new THREE.Group(),
    leaves = [],
    lamps = [];
  const inner = mat(COL.inner),
    outer = mat(COL.shell, { roughness: 0.55 });
  const walls = new Map([
    [inner, []],
    [outer, []],
  ]); // every pocket and header, merged into one mesh per layer
  for (const d of DOORWAYS) {
    const { x: dx, x0, x1, y0, y1 } = d;
    // the pockets either side and the header over the opening, full height, in the wall's two layers
    for (const [a, b, ya, yb] of [
      [pocketEnd(d, -1), x0, 0, HF],
      [x1, pocketEnd(d, 1), 0, HF],
      [x0, x1, y1 + 0.003, HF],
    ])
      for (const [z0, z1, m] of [
        [...IN_Z, inner],
        [...OUT_Z, outer],
      ])
        walls.get(m).push(box(a, b, ya, yb, z0, z1, m));
    const lamp = box(dx - 0.11, dx + 0.11, y1 + 0.05, y1 + 0.085, LZ + T - 0.012, LZ + T + 0.014, lampShut, {
      r: 0.008,
    });
    group.add(lamp);
    lamps.push(lamp);
    group.add(box(x0 + 0.02, x1 - 0.02, 0.001, 0.005, LZ - 0.12, LZ - 0.02, mat('#d8b447'), { r: 0.002 }));
    for (const s of [-1, 1]) {
      const [a, b] = leafSpan(d, s);
      const g = doorLeaf(b - a, y1 - y0 - 0.003, -s);
      g.position.set((a + b) / 2, y0 + 0.002, LEAF_Z);
      group.add(g);
      leaves.push({ g, d, s });
    }
  }
  for (const [m, parts] of walls) {
    const mesh = new THREE.Mesh(mergeGeometries(parts.map((p) => p.geometry.translate(...p.position))), m);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, leaves, lamps };
}

// k: 0 shut, 1 open. The leaves only ever slide along the wall, inside it.
export function slideLeaves(leaves, k) {
  const e = THREE.MathUtils.smoothstep(k, 0, 1);
  for (const { g, d, s } of leaves) {
    const [a, b] = leafSpan(d, s, e);
    g.position.x = (a + b) / 2;
    g.visible = true;
  }
}
