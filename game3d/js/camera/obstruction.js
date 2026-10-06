import * as THREE from 'three';
import { cameraCandidates } from './candidates.js';
import { cameraTriangles } from './triangles.js';

// A five-ray camera volume catches wall corners as well as the centre of the lens.
// The world is already built/batched when this is created. Actor roots are deliberately excluded.
export function cameraObstruction(place, actorRoots) {
  const meshes = [],
    ray = new THREE.Raycaster(),
    delta = new THREE.Vector3();
  const right = new THREE.Vector3(),
    up = new THREE.Vector3(),
    from = new THREE.Vector3();
  place.scene.traverse((o) => {
    if (o.isMesh && !o.isSkinnedMesh && !o.userData.perfBatch && o.name !== 'perf-outlined') {
      for (let p = o; p; p = p.parent) if (actorRoots.has(p)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      meshes.push({ object: o, matrix: null, box: new THREE.Box3(), geometry: null, version: -1, instances: -1 });
    }
  });
  const candidates = cameraCandidates(place, meshes),
    triangles = cameraTriangles();
  const visible = (o) => {
    if (!o.layers.test(place.camera.layers) && !o.layers.isEnabled(31)) return false;
    for (let p = o; p; p = p.parent) if (!p.visible || actorRoots.has(p)) return false;
    return true;
  };
  const materials = (o) => (Array.isArray(o.material) ? o.material : [o.material]);
  return (pivot, desired) => {
    delta.subVectors(desired, pivot);
    const distance = delta.length();
    if (distance < 0.01) return false;
    delta.divideScalar(distance);
    right
      .crossVectors(delta, new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(0.16);
    up.crossVectors(right, delta).normalize().multiplyScalar(0.16);
    ray.set(pivot, delta);
    const objects = candidates(ray.ray, distance).filter(
      (o) => visible(o) && materials(o).some((m) => m?.visible && m.opacity >= 0.4),
    );
    const sides = new Map();
    for (const o of objects)
      for (const m of materials(o))
        if (m && !sides.has(m)) {
          sides.set(m, m.side);
          m.side = THREE.DoubleSide;
        }
    let nearest = distance;
    try {
      ray.near = 0.05;
      ray.far = distance;
      ray.layers.mask = place.camera.layers.mask;
      ray.layers.enable(31); // Batched originals remain the precise, spatially small collision shapes.
      for (const [x, y] of [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        from.copy(pivot).addScaledVector(right, x).addScaledVector(up, y);
        ray.set(from, delta);
        for (const object of objects) {
          const cached = triangles(object, ray);
          const distance = cached === undefined ? ray.intersectObject(object, false)[0]?.distance : cached;
          if (Number.isFinite(distance)) nearest = Math.min(nearest, Math.max(0.03, distance - 0.18));
        }
      }
    } finally {
      for (const [material, side] of sides) material.side = side;
    }
    desired.copy(pivot).addScaledVector(delta, nearest);
    return nearest < distance;
  };
}
