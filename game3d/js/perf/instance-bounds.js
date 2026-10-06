// Moving instances need fresh bounds after their matrices change. Zero-scale slots are hidden, so including
// their origin would stretch a distant flock's sphere back across the place and defeat frustum culling.
import { Matrix4, Sphere } from 'three';

const matrix = new Matrix4(),
  sphere = new Sphere();
export function updateInstanceBounds(mesh) {
  if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  if (!mesh.boundingSphere) mesh.boundingSphere = new Sphere();
  mesh.boundingSphere.makeEmpty();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    const e = matrix.elements;
    if (
      e[0] === 0 &&
      e[1] === 0 &&
      e[2] === 0 &&
      e[4] === 0 &&
      e[5] === 0 &&
      e[6] === 0 &&
      e[8] === 0 &&
      e[9] === 0 &&
      e[10] === 0
    )
      continue;
    sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);
    mesh.boundingSphere.union(sphere);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return !mesh.boundingSphere.isEmpty();
}
