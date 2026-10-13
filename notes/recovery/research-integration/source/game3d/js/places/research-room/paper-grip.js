import * as THREE from 'three';
// The fixed hand meshes cannot pinch. A rendered palm supports one clear sheet edge.
export function paperGrips(space, hands) {
  const grips = new Map();
  let owner = null;
  const point = new THREE.Vector3();
  function start(s, toward) {
    const points = [];
    s.r.root.updateWorldMatrix(true, true);
    s.r.root.traverse((mesh) => {
      if (!mesh.isSkinnedMesh) return;
      mesh.skeleton.update();
      const a = mesh.geometry.attributes,
        index = mesh.skeleton.bones.indexOf(s.hand);
      for (let i = 0; i < a.position.count; i++) {
        let weight = 0,
          strongest = -1,
          dominant = -1;
        for (let k = 0; k < 4; k++) {
          const w = a.skinWeight.getComponent(i, k),
            bone = a.skinIndex.getComponent(i, k);
          if (bone === index) weight += w;
          if (w > strongest) {
            strongest = w;
            dominant = bone;
          }
        }
        if (dominant !== index) continue;
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        points.push({ mesh, i, weight, local: s.hand.worldToLocal(point.clone()) });
      }
    });
    if (!points.length) throw Error('Missing rendered paper-supporting palm');
    const contactPoints = points.filter((p) => p.weight >= 0.8);
    if (!contactPoints.length) throw Error('Missing stable palm surface');
    const box = new THREE.Box3().setFromPoints(contactPoints.map((p) => p.local)),
      size = box.getSize(new THREE.Vector3());
    const candidates = contactPoints.filter(
      (p) => p.local.y > box.min.y + size.y * 0.5 && p.local.y < box.min.y + size.y * 0.85,
    );
    candidates.sort((a, b) => b.local.x - a.local.x);
    if (!candidates.length) throw Error('Missing forward palm surface');
    const x = new THREE.Vector3(0, 1, 0).transformDirection(space.matrixWorld);
    const y = new THREE.Vector3(...toward).transformDirection(space.matrixWorld).normalize();
    const rotation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y)),
    );
    grips.set(s, { sample: candidates[0], points, rotation, base: s.hand.quaternion.clone() });
    orient(s);
    return s;
  }
  function orient(s) {
    const g = grips.get(s);
    s.hand.parent.updateWorldMatrix(true, false);
    s.hand.quaternion.copy(s.hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(g.rotation));
    s.hand.updateWorldMatrix(false, true);
  }
  function contact(s) {
    const { mesh, i } = grips.get(s).sample;
    mesh.skeleton.update();
    return space.worldToLocal(mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  function wrist(s, edge) {
    const g = grips.get(s),
      offset = g.sample.local.clone().multiply(s.hand.getWorldScale(new THREE.Vector3())).applyQuaternion(g.rotation);
    return space.worldToLocal(space.localToWorld(new THREE.Vector3(...edge)).sub(offset)).toArray();
  }
  function hold(s, prop, edge) {
    owner = { s, prop, edge: new THREE.Vector3(...edge) };
  }
  function stop(s) {
    const g = grips.get(s);
    if (g) s.hand.quaternion.copy(g.base);
    grips.delete(s);
    if (owner?.s === s) owner = null;
    hands.stop(s);
  }
  function bounds(s) {
    const box = new THREE.Box3();
    for (const { mesh, i } of grips.get(s).points) {
      mesh.skeleton.update();
      box.expandByPoint(
        space.worldToLocal(mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)),
      );
    }
    return box;
  }
  return {
    start,
    contact,
    wrist,
    hold,
    stop,
    bounds,
    update() {
      for (const s of grips.keys())
        if (hands.active.get(s.r) === s) orient(s);
        else stop(s);
      if (owner) owner.prop.position.copy(contact(owner.s)).sub(owner.edge);
    },
    clear() {
      for (const s of [...grips.keys()]) stop(s);
    },
  };
}
