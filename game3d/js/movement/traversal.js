// Physical support and clearance for the player. The navigation grid remains the route planner; it is not a
// wall. Cast against the original static scene meshes, before batching, in the place's coordinate system.
import * as THREE from 'three';
import { capsuleHits } from './capsule.js';

const EPS = 0.025;

export function createTraversal(place, excluded = []) {
  const root = place.space;
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const skip = new Set(excluded.filter(Boolean));
  const entries = [],
    broad = new Set(),
    bins = new Map();
  const cell = 2;
  const key = (x, z) => `${x},${z}`;
  const sources = new Map(),
    voidSources = new Set(),
    voids = [];
  function indexEntry(entry) {
    for (const k of entry.keys || []) bins.get(k)?.delete(entry);
    broad.delete(entry);
    entry.keys = [];
    const { box } = entry;
    const x0 = Math.floor(box.min.x / cell),
      x1 = Math.floor(box.max.x / cell),
      z0 = Math.floor(box.min.z / cell),
      z1 = Math.floor(box.max.z / cell);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 64) broad.add(entry);
    else
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const k = key(x, z);
          if (!bins.has(k)) bins.set(k, new Set());
          bins.get(k).add(entry);
          entry.keys.push(k);
        }
  }
  function present(object) {
    for (let p = object; p; p = p.parent) {
      if (skip.has(p)) return false;
      if (!p.visible && !p.userData.occluder && !p.userData.followEnclosure) return false;
      if (p === root) return true;
    }
    return false;
  }
  function collect(object) {
    if (object.userData.traversalVoids && !voidSources.has(object)) {
      voidSources.add(object);
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld);
      for (const v of object.userData.traversalVoids)
        voids.push(new THREE.Box3(new THREE.Vector3(...v.min), new THREE.Vector3(...v.max)).applyMatrix4(matrix));
    }
    if (sources.has(object)) return;
    if (
      !object.isMesh ||
      object.isSkinnedMesh ||
      object.userData.perfBatch ||
      (object.raycast !== THREE.Mesh.prototype.raycast && object.raycast !== THREE.InstancedMesh.prototype.raycast)
    )
      return;
    if (!(object.layers.mask & (1 | (1 << 31)))) return;
    for (let p = object; p; p = p.parent) if (skip.has(p) || p.userData.noTraversal) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const glass = materials.every(
      (m) => m?.isMeshStandardMaterial && m.transparent && m.roughness < 0.6 && !m.emissive?.getHex(),
    );
    if (
      materials.some(
        (m) => !m || (!m.depthWrite && !glass) || !m.colorWrite || m.isShaderMaterial || m.userData.noTraversal,
      )
    )
      return;
    sources.set(object, {
      matrix: object.matrixWorld.clone(),
      geometry: object.geometry,
      instances: object.instanceMatrix?.version,
      entries: [],
    });
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
      const entry = { mesh, box, source: object, instance };
      sources.get(object).entries.push(entry);
      entries.push(entry);
      indexEntry(entry);
    }
  }
  root.traverse(collect);
  let discovery = -Infinity;
  function refresh() {
    for (const actor of [
      ...Object.values(place.people || {}),
      ...Object.values(place.extras || {}),
      ...(place.crowd || []),
    ])
      if (actor.root) skip.add(actor.root);
    if (performance.now() - discovery > 250) {
      root.updateWorldMatrix(true, true);
      root.traverse(collect);
      discovery = performance.now();
    }
    inverse.copy(root.matrixWorld).invert();
    for (const [source, record] of sources) {
      source.updateWorldMatrix(true, false);
      if (
        source.matrixWorld.equals(record.matrix) &&
        source.geometry === record.geometry &&
        source.instanceMatrix?.version === record.instances
      )
        continue;
      record.geometry = source.geometry;
      record.instances = source.instanceMatrix?.version;
      record.matrix.copy(source.matrixWorld);
      for (const entry of record.entries) {
        entry.mesh.geometry = source.geometry;
        if (!source.geometry.boundingBox) source.geometry.computeBoundingBox();
        entry.mesh.matrixWorld.multiplyMatrices(inverse, source.matrixWorld);
        if (source.isInstancedMesh) {
          const m = new THREE.Matrix4();
          source.getMatrixAt(entry.instance, m);
          entry.mesh.matrixWorld.multiply(m);
        }
        entry.box.copy(source.geometry.boundingBox).applyMatrix4(entry.mesh.matrixWorld);
        indexEntry(entry);
      }
    }
  }
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
      ({ box: b, source }) =>
        present(source) &&
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
  function supportPoint(x, z, ceiling, depth = 8) {
    const found = hits(x, ceiling, z, new THREE.Vector3(0, -1, 0), depth);
    for (const hit of found) {
      if (voids.some((v) => v.containsPoint(hit.point))) continue;
      if (hit.faceIndex < (hit.object.geometry.userData.traversalSkipFaces || 0)) continue;
      normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));
      if (normal.y > 0.65) return hit.point.y;
    }
    return null;
  }
  function support(x, z, ceiling, depth = 8) {
    let height = null;
    for (const [dx, dz] of [
      [0, 0],
      [0.08, 0],
      [-0.08, 0],
      [0, 0.08],
      [0, -0.08],
    ]) {
      const y = supportPoint(x + dx, z + dz, ceiling, depth);
      if (y !== null && (height === null || y > height)) height = y;
    }
    return height;
  }
  function free(x, z, ox, oz, feet, scale, airborne) {
    const radius = 0.16 * scale,
      step = (airborne ? 0.025 : 0.21) * scale;
    const n = Math.max(1, Math.ceil(Math.hypot(x - ox, z - oz) / (radius * 0.5)));
    for (let i = 1; i <= n; i++) {
      const cx = ox + ((x - ox) * i) / n,
        cz = oz + ((z - oz) * i) / n;
      const bottom = new THREE.Vector3(cx, feet + step + radius, cz),
        top = new THREE.Vector3(cx, feet + 1.2 * scale - radius, cz);
      const nearby = new Set(broad);
      for (let bx = Math.floor((cx - radius) / cell); bx <= Math.floor((cx + radius) / cell); bx++)
        for (let bz = Math.floor((cz - radius) / cell); bz <= Math.floor((cz + radius) / cell); bz++)
          for (const e of bins.get(key(bx, bz)) || []) nearby.add(e);
      for (const { mesh, box: b, source } of nearby) {
        if (!present(source)) continue;
        if (
          b.max.x < cx - radius ||
          b.min.x > cx + radius ||
          b.max.z < cz - radius ||
          b.min.z > cz + radius ||
          b.max.y < feet + step ||
          b.min.y > feet + 1.2 * scale
        )
          continue;
        if (capsuleHits(mesh, bottom, top, radius)) return false;
      }
    }
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
  return { support, collide, clear, free, refresh, count: entries.length };
}
