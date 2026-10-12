// Physical support and clearance for the player. The navigation grid remains the route planner; it is not a
// wall. Cast against the original static scene meshes, before batching, in the place's coordinate system.
import * as THREE from 'three';

const EPS = 0.025;

export function createTraversal(place, excluded = []) {
  const root = place.space;
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const skip = new Set(excluded.filter(Boolean));
  const entries = [],
    broad = [],
    bins = new Map();
  const cell = 2;
  const key = (x, z) => `${x},${z}`;
  root.traverse((object) => {
    if (!object.isMesh || object.isSkinnedMesh || object.userData.perfBatch) return;
    for (let p = object; p; p = p.parent) if (skip.has(p) || p.userData.noTraversal) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((m) => !m || !m.depthWrite || !m.colorWrite || m.isShaderMaterial)) return;
    for (let instance = 0; instance < (object.isInstancedMesh ? object.count : 1); instance++) {
      const mesh = new THREE.Mesh(object.geometry, object.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrixWorld.multiplyMatrices(inverse, object.matrixWorld);
      if (object.isInstancedMesh) {
        const transform = new THREE.Matrix4();
        object.getMatrixAt(instance, transform);
        mesh.matrixWorld.multiply(transform);
      }
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      const entry = { mesh, box };
      entries.push(entry);
      const x0 = Math.floor(box.min.x / cell),
        x1 = Math.floor(box.max.x / cell),
        z0 = Math.floor(box.min.z / cell),
        z1 = Math.floor(box.max.z / cell);
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 64) broad.push(entry);
      else
        for (let x = x0; x <= x1; x++)
          for (let z = z0; z <= z1; z++) {
            const k = key(x, z);
            if (!bins.has(k)) bins.set(k, []);
            bins.get(k).push(entry);
          }
    }
  });
  const ray = new THREE.Raycaster();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  function hits(x, y, z, direction, distance, radius = 0) {
    ray.set(new THREE.Vector3(x, y, z), direction);
    ray.far = distance;
    const tx = x + direction.x * distance,
      tz = z + direction.z * distance;
    const nearby = new Set(broad);
    for (
      let bx = Math.floor((Math.min(x, tx) - radius) / cell);
      bx <= Math.floor((Math.max(x, tx) + radius) / cell);
      bx++
    )
      for (
        let bz = Math.floor((Math.min(z, tz) - radius) / cell);
        bz <= Math.floor((Math.max(z, tz) + radius) / cell);
        bz++
      )
        for (const entry of bins.get(key(bx, bz)) || []) nearby.add(entry);
    const candidates = [...nearby].filter(
      ({ box: b }) =>
        b.max.x >= Math.min(x, tx) - radius &&
        b.min.x <= Math.max(x, tx) + radius &&
        b.max.z >= Math.min(z, tz) - radius &&
        b.min.z <= Math.max(z, tz) + radius &&
        b.max.y >= Math.min(y, y + direction.y * distance) - EPS &&
        b.min.y <= Math.max(y, y + direction.y * distance) + EPS,
    );
    return ray.intersectObjects(
      candidates.map((e) => e.mesh),
      false,
    );
  }
  function support(x, z, ceiling, depth = 8) {
    const found = hits(x, ceiling, z, new THREE.Vector3(0, -1, 0), depth);
    for (const hit of found) {
      normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));
      if (normal.y > 0.65) return hit.point.y;
    }
    return null;
  }
  function free(x, z, ox, oz, feet, scale, airborne) {
    const dx = x - ox,
      dz = z - oz,
      length = Math.hypot(dx, dz);
    if (length < 1e-8) return true;
    const direction = new THREE.Vector3(dx / length, 0, dz / length);
    const radius = 0.16 * scale;
    // Three body-height rays, with side rays for the capsule's width. Low kerbs are a step, not a wall.
    const step = (airborne ? 0.035 : 0.21) * scale;
    for (const height of [step, 0.7 * scale, 1.35 * scale])
      for (const side of [-radius, 0, radius])
        if (hits(ox - direction.z * side, feet + height, oz + direction.x * side, direction, length + radius).length)
          return false;
    return true;
  }
  function collide(x, z, ox, oz, feet, scale, airborne) {
    if (free(x, z, ox, oz, feet, scale, airborne)) return [x, z];
    if (free(x, oz, ox, oz, feet, scale, airborne)) return [x, oz];
    if (free(ox, z, ox, oz, feet, scale, airborne)) return [ox, z];
    return [ox, oz];
  }
  function clear(a, b, feet, scale) {
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(distance / (0.15 * scale));
    let x = a[0],
      z = a[1],
      y = feet;
    for (let i = 1; i <= n; i++) {
      const nx = a[0] + ((b[0] - a[0]) * i) / n,
        nz = a[1] + ((b[1] - a[1]) * i) / n;
      if (!free(nx, nz, x, z, y, scale, false)) return false;
      const floor = support(nx, nz, y + 0.22 * scale, 0.65 * scale);
      if (floor === null) return false;
      x = nx;
      z = nz;
      y = floor;
    }
    return true;
  }
  return { support, collide, clear, count: entries.length };
}
