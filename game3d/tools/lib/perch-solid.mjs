import { AdditiveBlending } from 'three';

export function perchWaterHit(hit) {
  const material = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0]
    : hit.object.material;
  const faces = hit.object.geometry?.userData.seaSurfaceFaces;
  return (
    material?.userData.seaSurface === true ||
    (Number.isInteger(hit.faceIndex) && hit.faceIndex >= 0 && hit.faceIndex < faces)
  );
}

// Surface surveys follow physical scene semantics. noLook only controls shading.
export function perchSolidHit(hit, actors = new Set()) {
  return solidHit(hit, actors, false);
}

// Mixed skyline ground also covers the sea underneath the island. Its land can
// occlude water habitat without itself becoming a physical perch.
export function perchRayHit(hits, actors = new Set()) {
  for (const hit of hits) {
    if (perchSolidHit(hit, actors)) return hit;
    if (Number.isInteger(hit.object.geometry?.userData.seaSurfaceFaces) && !perchWaterHit(hit) && solidHit(hit, actors, true)) return null;
  }
  return null;
}

function solidHit(hit, actors, groundOccluder) {
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
      (data.farModel && !((water || groundOccluder) && node === object))
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
