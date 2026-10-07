import * as THREE from 'three';

// Measure the displayed seated body against the furniture below it. No joint-height fallback.
export function seatContact(place, rig, actors) {
  rig.root.updateWorldMatrix(true, true);
  const hip = rig.root.getObjectByName('Hips');
  if (!hip) throw Error('Seat contact requires the rendered hips bone');
  const center = rig.root.worldToLocal(hip.getWorldPosition(new THREE.Vector3()));
  const point = new THREE.Vector3();
  let underside = Infinity,
    vertices = 0;
  rig.root.traverse((mesh) => {
    if (!mesh.isSkinnedMesh || !mesh.visible) return;
    mesh.skeleton.update();
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    const support = mesh.skeleton.bones.map((b) => /hips|pelvis|up_?leg|thigh/i.test(b.name));
    for (let i = 0; i < position.count; i++) {
      let weight = 0,
        bone = -1;
      for (let k = 0; k < 4; k++)
        if (skinWeight.getComponent(i, k) > weight) {
          weight = skinWeight.getComponent(i, k);
          bone = skinIndex.getComponent(i, k);
        }
      if (!support[bone]) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      const local = rig.root.worldToLocal(point.clone());
      if (local.z - center.z >= 0.2) continue;
      vertices++;
      underside = Math.min(underside, place.space.worldToLocal(point.clone()).y);
    }
  });
  if (!vertices) throw Error('Seat contact found no rendered support vertices');
  const roots = new Set(actors.map((actor) => actor?.root).filter(Boolean));
  place.space.updateWorldMatrix(true, true);
  const p = rig.root.position;
  const ray = new THREE.Raycaster(
    place.space.localToWorld(new THREE.Vector3(p.x, 0.32, p.z)),
    new THREE.Vector3(0, -1, 0),
    0,
    0.2,
  );
  const hits = [];
  place.space.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry || mesh.material?.transparent) return;
    for (let parent = mesh; parent; parent = parent.parent) if (roots.has(parent)) return;
    // Batched furniture disables picking on source meshes, but keeps its physical geometry.
    THREE.Mesh.prototype.raycast.call(mesh, ray, hits);
  });
  hits.sort((a, b) => a.distance - b.distance);
  const surface = hits.find((hit) => {
    const y = place.space.worldToLocal(hit.point.clone()).y;
    return y > 0.15 && y < 0.27;
  });
  if (!surface) throw Error('Seat contact found no cushion surface');
  const cushion = place.space.worldToLocal(surface.point.clone()).y;
  return { vertices, underside, cushion, gap: underside - cushion };
}
