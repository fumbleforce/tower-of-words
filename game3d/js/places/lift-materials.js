// Each attachment owns the cutaway materials assigned to its landing meshes.
// Cached prop materials and their textures remain shared and are never disposed here.
export function clipLiftMaterial(material, planes) {
  for (const m of Array.isArray(material) ? material : [material]) {
    if (!m || m.userData.liftClip) continue;
    m.clippingPlanes = planes;
    m.clipIntersection = true;
    m.clipShadows = true;
    m.userData.liftClip = true;
    m.needsUpdate = true;
  }
}

export function isolateLiftMaterials(place, planes) {
  const clones = new Map();
  const assignments = new Map();
  const previousDispose = place.dispose;
  function clone(source) {
    if (!source) return source;
    if (!clones.has(source)) {
      const material = source.clone();
      delete material.userData.liftClip;
      clipLiftMaterial(material, planes);
      clones.set(source, material);
    }
    return clones.get(source);
  }
  place.dispose = function (...args) {
    for (const [mesh, { original, clipped }] of assignments) {
      if (mesh.material === clipped) mesh.material = original;
    }
    assignments.clear();
    for (const material of clones.values()) material.dispose();
    clones.clear();
    return previousDispose?.apply(this, args);
  };
  return (mesh) => {
    if (assignments.has(mesh)) return;
    const original = mesh.material;
    const clipped = Array.isArray(original) ? original.map(clone) : clone(original);
    mesh.material = clipped;
    assignments.set(mesh, { original, clipped });
  };
}
