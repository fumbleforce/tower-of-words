// Pool close views put markers above the selected body's hair, including after an outfit swap.
import * as THREE from 'three';
import { characterHead } from '../../character-scale.js';

const measured = new WeakMap();
const point = new THREE.Vector3(),
  inverse = new THREE.Matrix4(),
  corner = new THREE.Vector3();
function headBounds(person) {
  const model = person.model || person.root;
  if (measured.has(model)) return measured.get(model);
  const head = characterHead(person) || person.root,
    box = new THREE.Box3();
  person.root.updateWorldMatrix(true, false);
  // Attached skins refresh bindMatrixInverse only through updateMatrixWorld.
  // A first marker can run after movement/outfit setup, before the renderer does this.
  person.root.updateMatrixWorld(true);
  inverse.copy(head.matrixWorld).invert();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const a = mesh.geometry.attributes;
    for (let i = 0; i < a.position.count; i++) {
      if (
        mesh.isSkinnedMesh &&
        ![0, 1, 2, 3].some(
          (k) =>
            a.skinWeight.getComponent(i, k) > 0.05 &&
            /Head|Neck/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i, k)].name),
        )
      )
        continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      box.expandByPoint(point);
    }
  });
  const result = { head, box };
  measured.set(model, result);
  return result;
}

export function poolMarkerAnchor(camera) {
  return (person, out) => {
    const { head, box } = headBounds(person);
    head.updateWorldMatrix(true, false);
    head.getWorldPosition(out).project(camera);
    let top = out.y;
    if (!box.isEmpty())
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            corner.set(x, y, z).applyMatrix4(head.matrixWorld).project(camera);
            top = Math.max(top, corner.y);
          }
    out.y = top + 0.02;
    return out.unproject(camera);
  };
}

// Keep a nearby seat's target under its own pin, but clear the player beside it.
export function poolSeatAnchor(camera) {
  const hair = poolMarkerAnchor(camera),
    head = new THREE.Vector3(),
    view = new THREE.Matrix4();
  return (person, out) => {
    hair(person, head).project(camera);
    // Solve projected Y along the seat's world vertical. Its x/z also define the
    // fixed-height pick box, so moving along camera-up would move the hit target.
    view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = view.elements,
      y =
        (head.y * (e[3] * out.x + e[11] * out.z + e[15]) - (e[1] * out.x + e[9] * out.z + e[13])) /
        (e[5] - head.y * e[7]);
    if (Number.isFinite(y)) out.y = Math.max(out.y, y);
    return out;
  };
}
