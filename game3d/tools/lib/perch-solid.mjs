import { AdditiveBlending } from 'three';

export function perchWaterHit(hit) {
  const material = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0]
    : hit.object.material;
  return material?.userData.seaSurface === true;
}

// Surface surveys follow physical scene semantics. noLook only controls shading.
export function perchSolidHit(hit, actors = new Set()) {
  const object = hit.object;
  const water = perchWaterHit(hit);
  if (object.isSkinnedMesh) return false;
  for (let node = object; node; node = node.parent) {
    const data = node.userData;
    if (
      !node.visible ||
      actors.has(node) ||
      (data.noTraversal && !water) ||
      data.creature ||
      data.farView ||
      data.farModel
    )
      return false;
  }
  const material = Array.isArray(object.material) ? object.material[hit.face?.materialIndex ?? 0] : object.material;
  if (
    !material ||
    (material.userData.noTraversal && !water) ||
    !material.colorWrite ||
    !material.depthWrite ||
    (material.isShaderMaterial && !water)
  )
    return false;
  return !(material.transparent && (material.opacity < 0.9 || material.blending === AdditiveBlending));
}
