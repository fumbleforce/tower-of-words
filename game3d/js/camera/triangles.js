import * as THREE from 'three';

// Large, prebuilt background meshes need a local broad phase too. Small, instanced and custom
// meshes retain Three's raycaster. Cached cells contain triangle offsets, never render geometry.
const CELL = 2;
export function cameraTriangles() {
  const cache = new WeakMap(),
    inverse = new THREE.Matrix4(),
    local = new THREE.Ray();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const hit = new THREE.Vector3(),
    end = new THREE.Vector3();
  const coords = (v) => [Math.floor(v.x / CELL), Math.floor(v.y / CELL), Math.floor(v.z / CELL)];
  const key = (x, y, z) => `${x},${y},${z}`;
  function grid(g) {
    const p = g.attributes.position,
      index = g.index;
    const version = [p.version, index?.version, g.drawRange.start, g.drawRange.count].join('/');
    let saved = cache.get(g);
    if (saved?.version === version && saved.position === p && saved.index === index) return saved;
    const cells = new Map(),
      broad = [];
    const count = index?.count ?? p.count,
      start = Math.max(0, g.drawRange.start);
    const stop = Math.min(count, start + g.drawRange.count);
    for (let i = start; i + 2 < stop; i += 3) {
      a.fromBufferAttribute(p, index ? index.getX(i) : i);
      b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
      c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
      const lo = coords(hit.copy(a).min(b).min(c)),
        hi = coords(hit.copy(a).max(b).max(c));
      if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 64) {
        broad.push(i);
        continue;
      }
      for (let x = lo[0]; x <= hi[0]; x++)
        for (let y = lo[1]; y <= hi[1]; y++)
          for (let z = lo[2]; z <= hi[2]; z++) {
            const k = key(x, y, z);
            if (!cells.has(k)) cells.set(k, []);
            cells.get(k).push(i);
          }
    }
    saved = { version, position: p, index, cells, broad };
    cache.set(g, saved);
    return saved;
  }
  return (object, raycaster) => {
    const g = object.geometry;
    if (
      object.isInstancedMesh ||
      Array.isArray(object.material) ||
      g.morphAttributes.position?.length ||
      object.raycast !== THREE.Mesh.prototype.raycast ||
      g.attributes.position.count < 6000
    )
      return undefined;
    const data = grid(g),
      p = data.position,
      index = data.index;
    inverse.copy(object.matrixWorld).invert();
    local.copy(raycaster.ray).applyMatrix4(inverse);
    end.copy(raycaster.ray.direction).multiplyScalar(raycaster.far).add(raycaster.ray.origin).applyMatrix4(inverse);
    const lo = coords(hit.copy(local.origin).min(end)),
      hi = coords(hit.copy(local.origin).max(end));
    // Extreme object scales can span many cells; defer to Three rather than iterate an unbounded volume.
    if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 4096) return undefined;
    const triangles = new Set(data.broad);
    for (let x = lo[0]; x <= hi[0]; x++)
      for (let y = lo[1]; y <= hi[1]; y++)
        for (let z = lo[2]; z <= hi[2]; z++) for (const i of data.cells.get(key(x, y, z)) || []) triangles.add(i);
    let nearest = Infinity;
    for (const i of triangles) {
      a.fromBufferAttribute(p, index ? index.getX(i) : i);
      b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
      c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
      if (!local.intersectTriangle(a, b, c, false, hit)) continue;
      const distance = hit.applyMatrix4(object.matrixWorld).distanceTo(raycaster.ray.origin);
      if (distance >= raycaster.near && distance <= raycaster.far) nearest = Math.min(nearest, distance);
    }
    return nearest;
  };
}
