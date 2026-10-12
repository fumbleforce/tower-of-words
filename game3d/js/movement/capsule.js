// Exact distance between the player's vertical capsule and scene triangles. Geometry-local triangle bins keep
// large combined island meshes cheap; narrow-phase tests happen in the place frame, including nonuniform scale.
import * as THREE from 'three';
const CELL = 2;
const cache = new WeakMap();
const key = (x, y, z) => `${x},${y},${z}`;
function geometryGrid(g) {
  let grid = cache.get(g);
  if (grid && grid.version === g.attributes.position.version) return grid;
  const cells = new Map(),
    broad = [],
    p = g.attributes.position,
    ix = g.index;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const count = ix?.count ?? p.count;
  for (let i = (g.userData.traversalSkipFaces || 0) * 3; i < count; i += 3) {
    v.forEach((a, j) => a.fromBufferAttribute(p, ix ? ix.getX(i + j) : i + j));
    const lo = v[0].clone().min(v[1]).min(v[2]).divideScalar(CELL).floor();
    const hi = v[0].clone().max(v[1]).max(v[2]).divideScalar(CELL).floor();
    if ((hi.x - lo.x + 1) * (hi.y - lo.y + 1) * (hi.z - lo.z + 1) > 64) broad.push(i);
    else
      for (let x = lo.x; x <= hi.x; x++)
        for (let y = lo.y; y <= hi.y; y++)
          for (let z = lo.z; z <= hi.z; z++) {
            const k = key(x, y, z);
            if (!cells.has(k)) cells.set(k, []);
            cells.get(k).push(i);
          }
  }
  grid = { cells, broad, version: p.version };
  cache.set(g, grid);
  return grid;
}
const clamp = (x) => Math.max(0, Math.min(1, x));
function segments(p, q, a, b) {
  const d1 = q.clone().sub(p),
    d2 = b.clone().sub(a),
    r = p.clone().sub(a);
  const aa = d1.dot(d1),
    ee = d2.dot(d2),
    f = d2.dot(r);
  let s = 0,
    t = 0;
  if (aa < 1e-12 && ee < 1e-12) return p.distanceToSquared(a);
  if (aa < 1e-12) t = clamp(f / ee);
  else {
    const c = d1.dot(r);
    if (ee < 1e-12) s = clamp(-c / aa);
    else {
      const bb = d1.dot(d2),
        den = aa * ee - bb * bb;
      s = den ? clamp((bb * f - c * ee) / den) : 0;
      t = (bb * s + f) / ee;
      if (t < 0) {
        t = 0;
        s = clamp(-c / aa);
      } else if (t > 1) {
        t = 1;
        s = clamp((bb - c) / aa);
      }
    }
  }
  return p.clone().addScaledVector(d1, s).distanceToSquared(a.clone().addScaledVector(d2, t));
}
export function capsuleHits(mesh, bottom, top, radius) {
  const g = mesh.geometry,
    grid = geometryGrid(g),
    inv = mesh.matrixWorld.clone().invert();
  const bounds = new THREE.Box3().setFromPoints([bottom, top]).expandByScalar(radius).applyMatrix4(inv);
  const lo = bounds.min.divideScalar(CELL).floor(),
    hi = bounds.max.divideScalar(CELL).floor();
  const ids = new Set(grid.broad);
  for (let x = lo.x; x <= hi.x; x++)
    for (let y = lo.y; y <= hi.y; y++)
      for (let z = lo.z; z <= hi.z; z++) for (const id of grid.cells.get(key(x, y, z)) || []) ids.add(id);
  const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const triangle = new THREE.Triangle(...vertices),
    near = new THREE.Vector3();
  const length = bottom.distanceTo(top),
    ray = new THREE.Ray(bottom, top.clone().sub(bottom).normalize());
  for (const id of ids) {
    vertices.forEach((v, j) =>
      v
        .fromBufferAttribute(g.attributes.position, g.index ? g.index.getX(id + j) : id + j)
        .applyMatrix4(mesh.matrixWorld),
    );
    if (ray.intersectTriangle(...vertices, false, near) && near.distanceTo(bottom) <= length) return true;
    if (triangle.closestPointToPoint(bottom, near).distanceToSquared(bottom) < radius * radius) return true;
    if (triangle.closestPointToPoint(top, near).distanceToSquared(top) < radius * radius) return true;
    for (let j = 0; j < 3; j++)
      if (segments(bottom, top, vertices[j], vertices[(j + 1) % 3]) < radius * radius) return true;
  }
  return false;
}
