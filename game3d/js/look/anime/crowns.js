// Soft crowns for the anime trial (#383): every leaf mass in a place (the meshes the world look marks as foliage,
// look/procedural.js kind 18) is split into its separate clumps, the pieces of geometry that share no vertex, found
// across all foliage meshes at once in world space (a merged mesh cut into tiles still gives whole clumps). Each
// vertex's normal then points out from its clump's centre as on an ellipsoid of the clump's size, blended with the
// faceted normal, so a crown shades as a few soft balls of leaves, and the toon ramp (look/anime/shade.js) gives
// each a lit side, a middle band and a shade side. Returns the clumps, which the leaf shade (look/anime/canopy.js)
// draws its map from.
import * as THREE from 'three';

const FOLIAGE = 18,
  CELL = 1.2, // metres: the grid that finds neighbouring clumps
  JOIN = 0.75, // two clumps join when their centres are closer than this share of their sizes added
  FLAT = 0.3; // a clump less tall than this share of its narrower side is a sheet, not a ball
const isFoliage = (o) =>
  o.isMesh &&
  !o.isInstancedMesh &&
  !o.isSkinnedMesh &&
  (o.userData.surf === 'foliage' || o.geometry?.attributes.aLook?.array[0] === FOLIAGE) &&
  o.geometry?.attributes.normal;

export function foliageMeshes(scene) {
  const list = [];
  scene.traverse((o) => isFoliage(o) && list.push(o));
  return list;
}

// union-find over every vertex of every mesh, joined by triangle and by shared position (rounded to a millimetre)
function* clumpsOf(meshes, world) {
  let total = 0;
  for (const o of meshes) total += o.geometry.attributes.position.count;
  const parent = new Int32Array(total);
  for (let i = 0; i < total; i++) parent[i] = i;
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const join = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[a] = b;
  };
  const at = new Map();
  let base = 0;
  for (const [mi, o] of meshes.entries()) {
    const g = o.geometry,
      p = world[mi],
      n = g.attributes.position.count,
      idx = g.index?.array;
    for (let i = 0; i < n; i++) {
      const k = `${Math.round(p[i * 3] * 1000)},${Math.round(p[i * 3 + 1] * 1000)},${Math.round(p[i * 3 + 2] * 1000)}`;
      const seen = at.get(k);
      if (seen == null) at.set(k, base + i);
      else join(base + i, seen);
    }
    if (idx)
      for (let t = 0; t < idx.length; t += 3)
        (join(base + idx[t], base + idx[t + 1]), join(base + idx[t], base + idx[t + 2]));
    else for (let t = 0; t + 2 < n; t += 3) (join(base + t, base + t + 1), join(base + t, base + t + 2));
    base += n;
    yield;
  }
  // each clump's box; then clumps that sit well inside each other's size join, so a crown's overlapping leaf
  // masses shade as one soft ball while separate ones stay apart
  const boxes = () => {
    const box = new Map();
    let at0 = 0;
    for (const [mi, o] of meshes.entries()) {
      const p = world[mi],
        n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        const r = find(at0 + i);
        let b = box.get(r);
        if (!b) box.set(r, (b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]));
        for (let a = 0; a < 3; a++) {
          const v = p[i * 3 + a];
          if (v < b[a]) b[a] = v;
          if (v > b[a + 3]) b[a + 3] = v;
        }
      }
      at0 += n;
    }
    return box;
  };
  const first = boxes();
  yield;
  const grid = new Map(),
    list = [...first]
      .filter(([, b]) => b[4] - b[1] >= FLAT * Math.min(b[3] - b[0], b[5] - b[2])) // sheets join nothing
      .map(([r, b]) => ({
        r,
        c: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2],
        s: Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2,
      }));
  const cell = (v) => Math.floor(v / CELL);
  for (const k of list) {
    const key = `${cell(k.c[0])},${cell(k.c[1])},${cell(k.c[2])}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(k);
  }
  for (const k of list)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const o of grid.get(`${cell(k.c[0]) + dx},${cell(k.c[1]) + dy},${cell(k.c[2]) + dz}`) || [])
            if (o !== k && Math.hypot(o.c[0] - k.c[0], o.c[1] - k.c[1], o.c[2] - k.c[2]) < JOIN * (o.s + k.s))
              join(o.r, k.r);
  const box = boxes();
  return { find, box };
}

// soften: how far the normals go from faceted (0) to the clump's ellipsoid (1)
export function* softCrownSteps(meshes, { soften = 0.85, edit = true } = {}) {
  if (!meshes.length) return [];
  const world = meshes.map((o) => {
    o.updateMatrixWorld(true);
    const a = o.geometry.attributes.position,
      out = new Float32Array(a.count * 3),
      v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    return out;
  });
  yield;
  const { find, box } = yield* clumpsOf(meshes, world);
  if (edit) {
    let base = 0;
    const nw = new THREE.Vector3(),
      e = new THREE.Vector3(),
      m3 = new THREE.Matrix3(),
      inv = new THREE.Matrix3();
    for (const [mi, o] of meshes.entries()) {
      const g = o.geometry,
        p = world[mi],
        nrm = g.attributes.normal,
        n = nrm.count;
      m3.setFromMatrix4(o.matrixWorld);
      inv.copy(m3).transpose(); // world to local for a turned, evenly scaled mesh
      for (let i = 0; i < n; i++) {
        const b = box.get(find(base + i));
        const hx = Math.max((b[3] - b[0]) / 2, 0.05),
          hy = Math.max((b[4] - b[1]) / 2, 0.05),
          hz = Math.max((b[5] - b[2]) / 2, 0.05);
        if (hy < FLAT * Math.min(hx, hz)) continue; // ground cover and other flat sheets keep their own normals
        e.set(
          (p[i * 3] - (b[0] + b[3]) / 2) / (hx * hx),
          (p[i * 3 + 1] - (b[1] + b[4]) / 2) / (hy * hy),
          (p[i * 3 + 2] - (b[2] + b[5]) / 2) / (hz * hz),
        );
        if (e.lengthSq() < 1e-8) e.set(0, 1, 0);
        e.normalize();
        nw.fromBufferAttribute(nrm, i)
          .applyMatrix3(m3)
          .normalize()
          .lerp(e, soften)
          .normalize()
          .applyMatrix3(inv)
          .normalize();
        nrm.setXYZ(i, nw.x, nw.y, nw.z);
      }
      nrm.needsUpdate = true;
      base += n;
      yield;
    }
  }
  return [...box.values()].map((b) => ({
    x: (b[0] + b[3]) / 2,
    y: (b[1] + b[4]) / 2,
    z: (b[2] + b[5]) / 2,
    rx: (b[3] - b[0]) / 2,
    ry: (b[4] - b[1]) / 2,
    rz: (b[5] - b[2]) / 2,
  }));
}
