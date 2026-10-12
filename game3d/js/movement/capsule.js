// Exact distance between the player's vertical capsule and scene triangles. Geometry-local triangle bins keep
// large combined island meshes cheap; narrow-phase tests happen in the place frame, including nonuniform scale.
import * as THREE from 'three';
const CELL = 2;
const cache = new WeakMap();
const key = (x, y, z) => `${x},${y},${z}`;
function geometryGrid(g) {
  let grid = cache.get(g);
  const version = [
    g.attributes.position.version,
    g.index?.version,
    g.drawRange.start,
    g.drawRange.count,
    g.userData.traversalSkipFaces || 0,
  ].join('/');
  if (grid?.version === version && grid.position === g.attributes.position && grid.index === g.index) return grid;
  const cells = new Map(),
    broad = [],
    p = g.attributes.position,
    ix = g.index;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const count = ix?.count ?? p.count;
  const start = Math.max(g.drawRange.start, (g.userData.traversalSkipFaces || 0) * 3);
  for (let i = start; i + 2 < Math.min(count, g.drawRange.start + g.drawRange.count); i += 3) {
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
  grid = { cells, broad, version, position: p, index: ix };
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
function triangleDistance(triangle, bottom, top, ray, length, near) {
  if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, near) && near.distanceTo(bottom) <= length)
    return 0;
  let distance = Math.min(
    triangle.closestPointToPoint(bottom, near).distanceToSquared(bottom),
    triangle.closestPointToPoint(top, near).distanceToSquared(top),
  );
  const vertices = [triangle.a, triangle.b, triangle.c];
  for (let j = 0; j < 3; j++) distance = Math.min(distance, segments(bottom, top, vertices[j], vertices[(j + 1) % 3]));
  return distance;
}
export function capsuleHits(mesh, bottom, top, radius, previousBottom, previousTop, parallel = false) {
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
    const distance = triangleDistance(triangle, bottom, top, ray, length, near);
    if (distance >= radius * radius) continue;
    if (!previousBottom) return true;
    const previousRay = new THREE.Ray(previousBottom, previousTop.clone().sub(previousBottom).normalize());
    const previous = triangleDistance(
      triangle,
      previousBottom,
      previousTop,
      previousRay,
      previousBottom.distanceTo(previousTop),
      near,
    );
    // Recover only toward less overlap; a vertical lift may slide along an existing side contact.
    // A newly contacted face always blocks, including another face of this same merged mesh.
    const sideContact = parallel && (distance > 1e-10 || Math.abs(triangle.getNormal(near).y) < 1e-8);
    if (sideContact ? distance < previous - 1e-10 : distance <= previous + 1e-10) return true;
  }
  return false;
}

// Downward support rays share the collision triangle bins instead of raycasting a whole merged island.
export function supportHit(mesh, raycaster, accept = () => true) {
  const g = mesh.geometry,
    grid = geometryGrid(g),
    inverse = mesh.matrixWorld.clone().invert();
  const ray = raycaster.ray.clone().applyMatrix4(inverse);
  const end = raycaster.ray.at(raycaster.far, new THREE.Vector3()).applyMatrix4(inverse);
  const lo = ray.origin.clone().min(end).divideScalar(CELL).floor();
  const hi = ray.origin.clone().max(end).divideScalar(CELL).floor();
  const ids = new Set(grid.broad);
  if ((hi.x - lo.x + 1) * (hi.y - lo.y + 1) * (hi.z - lo.z + 1) > 4096) {
    const start = Math.max(g.drawRange.start, (g.userData.traversalSkipFaces || 0) * 3);
    const stop = Math.min(g.index?.count ?? g.attributes.position.count, g.drawRange.start + g.drawRange.count);
    for (let id = start; id + 2 < stop; id += 3) ids.add(id);
  } else {
    for (let x = lo.x; x <= hi.x; x++)
      for (let y = lo.y; y <= hi.y; y++)
        for (let z = lo.z; z <= hi.z; z++) for (const id of grid.cells.get(key(x, y, z)) || []) ids.add(id);
  }
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    point = new THREE.Vector3();
  const normal = new THREE.Vector3(),
    normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  let nearest = null;
  for (const id of ids) {
    const material = Array.isArray(mesh.material)
      ? mesh.material[g.groups.find((group) => id >= group.start && id < group.start + group.count)?.materialIndex]
      : mesh.material;
    if (!material || material.side === THREE.BackSide) continue;
    a.fromBufferAttribute(g.attributes.position, g.index ? g.index.getX(id) : id);
    b.fromBufferAttribute(g.attributes.position, g.index ? g.index.getX(id + 1) : id + 1);
    c.fromBufferAttribute(g.attributes.position, g.index ? g.index.getX(id + 2) : id + 2);
    THREE.Triangle.getNormal(a, b, c, normal).applyNormalMatrix(normalMatrix);
    if (normal.y <= 0.65 || !ray.intersectTriangle(a, b, c, false, point)) continue;
    point.applyMatrix4(mesh.matrixWorld);
    const distance = point.distanceTo(raycaster.ray.origin);
    if (
      distance < raycaster.near ||
      distance > raycaster.far ||
      (nearest && distance >= nearest.distance) ||
      !accept(point)
    )
      continue;
    nearest = {
      distance,
      point: point.clone(),
      face: { normal: new THREE.Vector3().copy(normal) },
      faceIndex: id / 3,
      object: mesh,
    };
  }
  return nearest;
}
