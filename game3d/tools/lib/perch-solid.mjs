import { AdditiveBlending } from 'three';

// Surface surveys follow physical scene semantics. noLook only controls shading.
export function perchSolidHit(hit, actors = new Set()) {
  const object = hit.object;
  if (object.isSkinnedMesh) return false;
  for (let node = object; node; node = node.parent) {
    const data = node.userData;
    if (!node.visible || actors.has(node) || data.noTraversal || data.creature || data.farView || data.farModel)
      return false;
  }
  const material = Array.isArray(object.material) ? object.material[hit.face?.materialIndex ?? 0] : object.material;
  if (
    !material ||
    material.userData.noTraversal ||
    !material.colorWrite ||
    !material.depthWrite ||
    material.isShaderMaterial
  )
    return false;
  return !(material.transparent && (material.opacity < 0.9 || material.blending === AdditiveBlending));
}
