import * as THREE from 'three';

// Diagnostic only: rendered support vertices and actual furniture, using this bench's own height.
export function outingSeatContact(game) {
  const P = game.place, rigs = [game.player, game.outing.actor.rig];
  const seats = game.flagsRef.outing_stage?.seats;
  if (!seats?.length) throw Error('No saved real outing bench pair');
  P.space.updateWorldMatrix(true, true);
  return rigs.map((rig, index) => {
    rig.root.updateWorldMatrix(true, true);
    rig.root.updateMatrixWorld(true); // refresh skinned bind inverses after the seating reparent/pose

    const seat = seats[index], hip = rig.root.getObjectByName('Hips'), point = new THREE.Vector3();
    if (!hip) throw Error('Approved rig has no rendered hips');
    const center = rig.root.worldToLocal(hip.getWorldPosition(point.clone()));
    let underside = Infinity, vertices = 0;
    rig.root.traverse(mesh => {
      if (!mesh.isSkinnedMesh || !mesh.visible) return;
      mesh.skeleton.update();
      const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
      const support = mesh.skeleton.bones.map(b => /hips|pelvis|up_?leg|thigh/i.test(b.name));
      for (let i = 0; i < position.count; i++) {
        let weight = 0, bone = -1;
        for (let k = 0; k < 4; k++) if (skinWeight.getComponent(i, k) > weight) {
          weight = skinWeight.getComponent(i, k); bone = skinIndex.getComponent(i, k);
        }
        if (!support[bone]) continue;
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        if (rig.root.worldToLocal(point.clone()).z - center.z >= 0.2) continue;
        vertices++; underside = Math.min(underside, P.space.worldToLocal(point.clone()).y);
      }
    });
    const hits = [], roots = new Set([game.player, ...Object.values(P.people)].map(r => r?.root));
    // Outdoor benches have gaps between slats, so sample the support patch rather than one ray.
    for (const dx of [-0.08, 0, 0.08]) for (const dz of [-0.08, 0, 0.08]) {
      const ray = new THREE.Raycaster(P.space.localToWorld(new THREE.Vector3(seat.x + dx, seat.top + 0.12, seat.z + dz)), new THREE.Vector3(0, -1, 0), 0, 0.24);
      P.space.traverse(mesh => {
        if (!mesh.isMesh || !mesh.geometry || mesh.material?.transparent) return;
        for (let parent = mesh; parent; parent = parent.parent) if (roots.has(parent)) return;
        THREE.Mesh.prototype.raycast.call(mesh, ray, hits);
      });
    }
    // Traversal order is not ray depth: the merged bench can contribute lower faces first.
    // The sitter is supported by the highest seat surface in the sampled patch.
    const surfaces = hits.map(hit => P.space.worldToLocal(hit.point.clone()).y).filter(y => Math.abs(y - seat.top) < 0.04);
    const surface = surfaces.length ? Math.max(...surfaces) : undefined;
    if (!vertices || surface === undefined) throw Error('Missing rendered bench/body contact geometry: ' + JSON.stringify({ vertices, underside, seat, heights: hits.map(hit => P.space.worldToLocal(hit.point.clone()).y) }));
    return { surfaces: [...new Set(surfaces.map(y => +y.toFixed(6)))], who: index ? 'kenji' : 'player', vertices, seat, surface, underside, gap: underside - surface };
  });
}
