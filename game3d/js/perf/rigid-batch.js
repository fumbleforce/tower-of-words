// Draw several independently moving rigid parts in one call. Each source instance becomes one bone, so the
// original vertices, colours and transforms are preserved without CPU vertex deformation or multidraw support.
// Sources share one flat-shaded material and carry their colours in geometry (no instance colours).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { updateInstanceBounds } from './instance-bounds.js';

export function rigidBatch(parts) {
  const bones = [],
    geometries = [];
  for (const part of parts) {
    for (let i = 0; i < part.count; i++) {
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      const count = geometry.attributes.position.count;
      const indices = new Uint16Array(count * 4),
        weights = new Float32Array(count * 4);
      for (let vertex = 0; vertex < count; vertex++) {
        indices[vertex * 4] = bones.length;
        weights[vertex * 4] = 1;
      }
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
      geometries.push(geometry);
      const bone = new THREE.Bone();
      bone.matrixAutoUpdate = false;
      bones.push(bone);
    }
  }
  const mesh = new THREE.SkinnedMesh(mergeGeometries(geometries), parts[0].material);
  geometries.forEach((geometry) => geometry.dispose());
  mesh.add(...bones);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.receiveShadow = parts[0].receiveShadow;
  mesh.castShadow = parts[0].castShadow;
  mesh.userData.noBatch = true;
  mesh.boundingSphere = new THREE.Sphere();
  function commit() {
    mesh.boundingSphere.makeEmpty();
    let index = 0;
    for (const part of parts) {
      updateInstanceBounds(part);
      if (!part.boundingSphere.isEmpty()) mesh.boundingSphere.union(part.boundingSphere);
      for (let i = 0; i < part.count; i++) {
        const bone = bones[index++];
        part.getMatrixAt(i, bone.matrix);
        bone.matrixWorldNeedsUpdate = true;
      }
    }
    mesh.visible = !mesh.boundingSphere.isEmpty();
  }
  commit();
  return { mesh, commit };
}
