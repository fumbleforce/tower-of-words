// Cut one big merged geometry into pieces on the ground, so the parts out of view are culled (issue #372). A place's
// build merges everything of one material into one mesh (scenes/merge-static.js, outdoor/parts.js): a whole court's
// trees became one 40k-triangle mesh that every camera and the shadow map drew in full while a tenth of it was on
// screen. Each piece then draws as a batch of its own (perf/batch.js), so the cut costs draw calls: how fine to cut
// is set per screen (perf/phone.js phoneTiles), the narrow phone view gaining most from small pieces.
import * as THREE from 'three';

// How to cut what casts a shadow: { max } median cuts across the longest side (x or z) until each piece holds at most
// max triangles, or { cell } squares of cell metres; geometries of max triangles or fewer stay whole either way.
// rest: the max for what casts none (scenes/merge-static.js cuts those by triangles only).
let how = { max: 8000, rest: 8000 };
export const setTiling = (t) => (how = { max: 8000, rest: 8000, ...t });
export const tiling = () => how;

// Split a non-indexed geometry by where its triangles' centres lie. Returns [g] unchanged when it is indexed or
// small; otherwise new geometries with every attribute copied (the caller disposes of g).
export function tileGeometry(g, t = how) {
  const pieces = tilePieces(g, t);
  return pieces ? pieces.map((tris) => pick(g, tris)) : [g];
}

// the triangle lists of the pieces (each in its original order), or null when g stays whole
export function tilePieces(g, { max = 8000, cell = 0 } = how) {
  const P = g.attributes.position;
  const nt = P.count / 3;
  if (g.index || nt <= max || g.morphAttributes?.position) return null;
  if (Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) return null;
  const cx = new Float32Array(nt),
    cz = new Float32Array(nt);
  for (let t = 0; t < nt; t++) [cx[t], cz[t]] = centre(P, t);
  if (cell) {
    const cells = new Map();
    for (let t = 0; t < nt; t++) {
      const k = Math.floor(cx[t] / cell) * 65536 + Math.floor(cz[t] / cell);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(t);
    }
    return cells.size > 1 ? [...cells.values()] : null;
  }
  const out = [],
    todo = [Array.from({ length: nt }, (_, t) => t)];
  while (todo.length) {
    const l = todo.pop();
    if (l.length <= max) {
      out.push(l.sort((a, b) => a - b));
      continue;
    }
    let x0 = Infinity,
      x1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity;
    for (const t of l) {
      x0 = Math.min(x0, cx[t]);
      x1 = Math.max(x1, cx[t]);
      z0 = Math.min(z0, cz[t]);
      z1 = Math.max(z1, cz[t]);
    }
    const c = x1 - x0 >= z1 - z0 ? cx : cz;
    l.sort((a, b) => c[a] - c[b]);
    const h = l.length >> 1;
    todo.push(l.slice(0, h), l.slice(h));
  }
  return out;
}

// a new geometry of the listed triangles of g, every attribute copied
export function pick(g, tris) {
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(g.attributes)) {
    const s = a.itemSize * 3,
      arr = new a.array.constructor(tris.length * s);
    tris.forEach((t, k) => arr.set(a.array.subarray(t * s, t * s + s), k * s));
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
  }
  return out;
}

// Cut a second geometry (a shadow stand-in, perf/shadow-proxy.js) to go with the pieces of g: each of its triangles
// goes to the piece whose area (the box round its triangles' centres) is nearest its own centre. [geometry per piece]
export function followPieces(other, g, pieces) {
  const P = g.attributes.position,
    Q = other.attributes.position;
  const boxes = pieces.map((tris) => {
    const b = [Infinity, -Infinity, Infinity, -Infinity];
    for (const t of tris) {
      const [x, z] = centre(P, t);
      b[0] = Math.min(b[0], x);
      b[1] = Math.max(b[1], x);
      b[2] = Math.min(b[2], z);
      b[3] = Math.max(b[3], z);
    }
    return b;
  });
  const lists = pieces.map(() => []);
  for (let t = 0; t < Q.count / 3; t++) {
    const [x, z] = centre(Q, t);
    let best = 0,
      bd = Infinity;
    boxes.forEach(([x0, x1, z0, z1], k) => {
      const dx = Math.max(x0 - x, 0, x - x1),
        dz = Math.max(z0 - z, 0, z - z1),
        d = dx * dx + dz * dz;
      if (d < bd) ((bd = d), (best = k));
    });
    lists[best].push(t);
  }
  return lists.map((l) => pick(other, l));
}

const centre = (P, t) => [
  (P.getX(3 * t) + P.getX(3 * t + 1) + P.getX(3 * t + 2)) / 3,
  (P.getZ(3 * t) + P.getZ(3 * t + 1) + P.getZ(3 * t + 2)) / 3,
];
