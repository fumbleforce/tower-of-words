// Vertex colour and baked light (texture avenue 4, game3d/design/style/AVENUES.md): at load, a pass writes a colour
// into every vertex. No pattern, no textures; the flat faces get gradients. Used by the game (look/index.js, every
// place) and the showcase room.
//   - big boxes (floors, walls) are subdivided first so a gradient has vertices to live on
//   - occlusion: a cheap estimate from the boxes around each vertex (the world bounding box of every nearby mesh,
//     weighted by how much it faces the vertex and how close it is), so corners, wall bottoms, under desks and
//     around the props' feet go darker
//   - light: faces turned toward the light (a window, or the place's sun) get a little warmer; optionally a floor
//     gradient from the window side to the far side (the showcase room)
//   - repeated props (chairs, binders, boxes) each get a slightly different tint
//   - vertices already coloured (leaves) keep their colours: the bake multiplies on top
// Strength: Jørgen found the first version "over the top hard" (review style-avenues-room), so the game uses
// SOFT; HARD is that first version, kept for before/after shots (?bake=hard).
// Runtime cost: one multiply per pixel in the same materials (patchMaterial(m, { bake: true })); the work is at load.
// The result is a per-vertex attribute, aBake (1 minus the colour); the caller patches the meshes' materials.
import * as THREE from 'three';
import { drain } from '../perf/slice.js';

export const HARD = { ao: 1, aoMax: 0.6, feet: 0.3, warm: 0.9, tint: 1, step: 0.12 };
export const SOFT = { ao: 0.5, aoMax: 0.25, feet: 0.12, warm: 0.4, tint: 0.7, step: 0.3 };

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
};

// floor: the underside is never seen, so it stays one quad (BoxGeometry's groups: +x, -x, +y, -y, +z, -z)
function subdivide(mesh, step, floor) {
  const g = mesh.geometry;
  if (g.type !== 'BoxGeometry') return;
  const { width: w, height: h, depth: d } = g.parameters;
  if (Math.max(w, h, d) < 0.6) return;
  const seg = (v) => Math.min(40, Math.max(1, Math.round(v / step)));
  const n = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  if (floor) {
    const idx = n.index.array,
      keep = [];
    for (const gr of n.groups)
      if (gr.materialIndex !== 3) for (let i = gr.start; i < gr.start + gr.count; i++) keep.push(idx[i]);
    n.setIndex(keep);
    n.clearGroups();
  }
  n.userData = { ...g.userData };
  mesh.geometry = n;
  g.dispose();
}

// meshes: the lit meshes to bake (the caller decides what takes part). Options:
//   strength  SOFT | HARD | an object like them
//   isFloor(m), isShell(m)  floors, and walls / skirting (the room shell: floors darken toward walls by occlusion)
//   floorY    height of the floor the props stand on
//   warmAt    a point (a window) whose facing faces get warmer; or warmDir, a direction toward the light (the sun)
//   floorGrad { z0, z1 }: the floor shades from z0 (lit) to z1 (showcase room)
//   owner(m)  the object a mesh belongs to (its own parts occlude it less), and repeat(ob) true for repeated props
export const bakeLight = (meshes, o = {}) => drain(bakeLightSteps(meshes, o));
// the same as a generator that yields between steps (look/index.js runs it in slices, js/perf/slice.js)
export function* bakeLightSteps(meshes, o = {}) {
  const S = { ...SOFT, ...(o.strength || {}) };
  const isFloor = o.isFloor || (() => false),
    isShell = o.isShell || (() => false);
  const owner = o.owner || ((m) => m.parent || m),
    repeat = o.repeat || (() => false);
  const floorY = o.floorY || 0;
  // geometries shared by several meshes get their own copy (each mesh has its own colours)
  const seen = new Set();
  for (const m of meshes) {
    if (seen.has(m.geometry)) m.geometry = m.geometry.clone();
    seen.add(m.geometry);
  }
  for (const m of meshes)
    if (isFloor(m) || isShell(m)) {
      subdivide(m, S.step, isFloor(m));
      yield;
    }
  for (const m of meshes) m.updateMatrixWorld();

  // occluders in a grid of cells on x/z; floors don't occlude (they're handled as the ground below). Past REACH an
  // occluder barely counts (s² / (s² + 9 d²) with s up to 0.6 is under 0.08 there)
  const CELL = 0.8,
    REACH = 0.7,
    grid = new Map(),
    occ = [];
  const key = (i, k) => (i + 4096) * 8192 + (k + 4096);
  for (const m of meshes) {
    if (isFloor(m)) continue;
    yield;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    const s = new THREE.Vector3();
    b.getSize(s);
    if (Math.max(s.x, s.y, s.z) < 0.05) continue; // tiny parts don't shade anything
    const sz = Math.min(0.6, (s.x + s.y + s.z) / 3);
    const e = {
      m,
      own: owner(m),
      s2: sz * sz,
      x0: b.min.x,
      y0: b.min.y,
      z0: b.min.z,
      x1: b.max.x,
      y1: b.max.y,
      z1: b.max.z,
    };
    occ.push(e);
    for (let i = Math.floor((b.min.x - REACH) / CELL); i <= Math.floor((b.max.x + REACH) / CELL); i++)
      for (let k = Math.floor((b.min.z - REACH) / CELL); k <= Math.floor((b.max.z + REACH) / CELL); k++) {
        const kk = key(i, k);
        let c = grid.get(kk);
        if (!c) grid.set(kk, (c = []));
        c.push(e);
      }
  }
  // occlusion at a point with a normal, for mesh m of object me
  const R2 = REACH * REACH;
  function occlusion(px, py, pz, nx, ny, nz, m, me) {
    const cell = grid.get(key(Math.floor(px / CELL), Math.floor(pz / CELL)));
    if (!cell) return 0;
    let occl = 0;
    for (let j = 0; j < cell.length; j++) {
      const b = cell[j];
      if (b.m === m) continue;
      const dx = (px < b.x0 ? b.x0 : px > b.x1 ? b.x1 : px) - px,
        dy = (py < b.y0 ? b.y0 : py > b.y1 ? b.y1 : py) - py,
        dz = (pz < b.z0 ? b.z0 : pz > b.z1 ? b.z1 : pz) - pz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > R2) continue;
      const same = b.own === me;
      if (d2 < 1e-6) {
        occl += same ? 0.05 : 0.25;
        continue;
      }
      const d = Math.sqrt(d2);
      // a box beside a vertex still covers part of its sky: facing counts from a little below the horizon
      const facing = ((nx * dx + ny * dy + nz * dz) / d + 0.35) / 1.35;
      if (facing <= 0) continue;
      occl += ((facing * b.s2) / (b.s2 + d2 * 9)) * (same ? 0.35 : 1);
    }
    return occl;
  }

  const warm = new THREE.Color(1.07, 1.0, 0.9),
    cool = new THREE.Color(0.93, 0.96, 1.04);
  const P = new THREE.Vector3(),
    Nn = new THREE.Vector3(),
    D = new THREE.Vector3(),
    nm = new THREE.Matrix3();
  const warmDir = o.warmDir ? o.warmDir.clone().normalize() : null;
  const tintOf = new Map(),
    col = new THREE.Color(),
    memo = new Map();
  let verts = 0;
  for (const m of meshes) {
    const g = m.geometry,
      pos = g.attributes.position,
      nor = g.attributes.normal,
      n = pos.count;
    if (!nor) continue;
    const c = new Float32Array(n * 3);
    nm.getNormalMatrix(m.matrixWorld);
    const me = owner(m),
      floor = isFloor(m),
      shell = isShell(m);
    // a big mesh with few, far-apart vertices (a car shell, a platform) would spread the darkness of its corners over
    // whole faces: it gets no occlusion, only the light and tint
    if (!g.boundingBox) g.computeBoundingBox();
    const ext = g.boundingBox.getSize(new THREE.Vector3()).multiply(m.getWorldScale(new THREE.Vector3()));
    const coarse =
      g.type !== 'BoxGeometry' &&
      Math.max(ext.x, ext.y, ext.z) > 1.2 &&
      n / Math.max(1, ext.x * ext.z + ext.y * (ext.x + ext.z)) < 40;
    let tint = null;
    if (S.tint && !floor && !shell) {
      const part = m.userData.tintPart; // binders on a shelf are one object: tint them by part
      const id = part ? m.uuid : me.uuid;
      if (part || repeat(me)) {
        if (!tintOf.has(id)) {
          const r = hash(id + (part ? 'p' : ''));
          tintOf.set(id, { l: (r - 0.5) * 0.14 * S.tint, h: (hash(id + 'h') - 0.5) * 0.03 * S.tint });
        }
        tint = tintOf.get(id);
      }
    }
    memo.clear();
    yield;
    for (let i = 0; i < n; i++) {
      if ((i & 2047) === 2047) yield;
      P.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      Nn.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      // vertices bunch up at rounded corners: one answer per 4 cm and normal direction, per mesh
      const ck =
        ((Math.round(P.x * 25) + 2048) * 4096 + Math.round(P.y * 25) + 2048) * 4096 + Math.round(P.z * 25) + 2048;
      const nk = ck * 125 + (Math.round(Nn.x * 2) + 2) * 25 + (Math.round(Nn.y * 2) + 2) * 5 + Math.round(Nn.z * 2) + 2;
      let occl = memo.get(nk);
      if (coarse) occl = 0;
      else if (occl === undefined) {
        occl = occlusion(P.x, P.y, P.z, Nn.x, Nn.y, Nn.z, m, me);
        memo.set(nk, occl);
      }
      let ao = 1 - Math.min(S.aoMax, occl * 1.2 * S.ao);
      // props near the floor: their lower parts darken toward it
      if (!floor && !shell && !coarse) ao *= 1 - S.feet * Math.exp(-Math.max(0, P.y - floorY) / 0.12);
      if (shell) ao *= 1 - S.feet * 0.8 * Math.exp(-Math.max(0, P.y - floorY) / 0.3);
      // light: warmth on faces that see the window (or the sun)
      let k = 0;
      if (o.warmAt) {
        D.subVectors(o.warmAt, P);
        const dw = D.length();
        D.normalize();
        k = Math.max(0, Nn.dot(D)) * Math.exp(-dw / 2.4);
      } else if (warmDir) k = Math.max(0, Nn.dot(warmDir)) * 0.5;
      if (floor && o.floorGrad)
        k = THREE.MathUtils.clamp(1 - (P.z - o.floorGrad.z0) / (o.floorGrad.z1 - o.floorGrad.z0), 0, 1);
      col.setRGB(1, 1, 1).lerp(warm, S.warm * k);
      if (floor && o.floorGrad)
        col.lerp(cool, 0.5 * (1 - k) * S.warm).multiplyScalar(1 - 0.1 * S.warm + 0.2 * S.warm * k);
      col.multiplyScalar(ao);
      if (tint) {
        col.r *= 1 + tint.l + tint.h;
        col.g *= 1 + tint.l;
        col.b *= 1 + tint.l - tint.h;
      }
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    // stored as 1 minus the colour, so a mesh without the attribute (0) is unchanged (look/procedural.js reads it)
    for (let i = 0; i < c.length; i++) c[i] = 1 - c[i];
    g.setAttribute('aBake', new THREE.BufferAttribute(c, 3));
    verts += n;
  }
  return { meshes: meshes.length, verts, occluders: occ.length };
}
