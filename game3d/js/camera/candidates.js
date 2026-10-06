import * as THREE from 'three';

// Render batches are only a broad phase: exact collisions still use their original little meshes.
// Loose/moving objects are always tested separately. A release/rebuild changes the grouping revision.
export function cameraCandidates(place, entries) {
  let revision = '',
    groups = [],
    loose = entries;
  const hit = new THREE.Vector3();
  function bounds(entry) {
    const o = entry.object,
      position = o.geometry.attributes.position,
      version = position?.version || 0;
    const instances = o.instanceMatrix?.version || 0;
    if (
      !entry.matrix?.equals(o.matrixWorld) ||
      entry.geometry !== o.geometry ||
      entry.position !== position ||
      entry.version !== version ||
      entry.instances !== instances
    ) {
      if (
        !o.geometry.boundingBox ||
        entry.geometry !== o.geometry ||
        entry.position !== position ||
        entry.version !== version
      ) {
        o.geometry.computeBoundingBox();
        o.geometry.computeBoundingSphere();
      }
      if (o.isInstancedMesh) {
        o.computeBoundingBox();
        o.computeBoundingSphere();
      }
      entry.box
        .copy(o.isInstancedMesh ? o.boundingBox : o.geometry.boundingBox)
        .applyMatrix4(o.matrixWorld)
        .expandByScalar(0.17);
      entry.matrix = o.matrixWorld.clone();
      entry.geometry = o.geometry;
      entry.position = position;
      entry.version = version;
      entry.instances = instances;
    }
    return entry.box;
  }
  function regroup() {
    const perf = place.perf;
    if (!perf?.info || !perf.stats) return;
    const key = [perf.stats.merged, perf.stats.released, perf.stats.scans, perf.stats.batches].join('/');
    if (key === revision) return;
    revision = key;
    const byBatch = new Map();
    loose = [];
    for (const entry of entries) {
      const info = perf.info.get(entry.object);
      const batches = info?.state === 'batched' ? info.batches?.filter((b) => !b.shadow) : null;
      if (!batches?.length) {
        loose.push(entry);
        continue;
      }
      for (const batch of batches) {
        if (!byBatch.has(batch)) byBatch.set(batch, { object: batch.mesh, box: new THREE.Box3(), entries: [] });
        byBatch.get(batch).entries.push(entry);
      }
    }
    groups = [...byBatch.values()];
  }
  return (ray, distance) => {
    regroup();
    const touches = (entry) => {
      const box = bounds(entry);
      return (
        box.containsPoint(ray.origin) ||
        (ray.intersectBox(box, hit) && hit.distanceToSquared(ray.origin) <= distance * distance)
      );
    };
    const nearby = new Set(loose);
    for (const group of groups) if (touches(group)) for (const entry of group.entries) nearby.add(entry);
    return [...nearby].filter(touches).map((entry) => entry.object);
  };
}
