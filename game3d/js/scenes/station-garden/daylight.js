// The cached shop street returns to its built daylight after the evening pass.
// Capture only scenery, before people are installed; door cards are reapplied by the place.
export function daylightState(scene) {
  const lights = [],
    materials = new Map(),
    pools = [],
    visibility = [];
  scene.traverse((o) => {
    // Evening reveals skyline windows. Moving tools and roof occlusion own their visibility.
    if (!o.visible && !o.userData.noBatch && !o.userData.occluder) visibility.push([o, false]);
    if (o.isLight) lights.push([o, o.color.clone(), o.groundColor?.clone(), o.intensity]);
    if (o.userData.lampPool) pools.push([o, o.userData.k, o.userData.gain]);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m?.emissive && !materials.has(m))
        materials.set(m, [m.color.clone(), m.emissive.clone(), m.emissiveIntensity]);
    }
  });
  return () => {
    for (const [o, visible] of visibility) o.visible = visible;
    for (const [o, color, ground, intensity] of lights) {
      o.color.copy(color);
      if (ground) o.groundColor.copy(ground);
      o.intensity = intensity;
    }
    for (const [m, [color, emissive, intensity]] of materials) {
      m.color.copy(color);
      m.emissive.copy(emissive);
      m.emissiveIntensity = intensity;
    }
    for (const [o, k, gain] of pools) {
      o.userData.gain = gain;
      o.userData.set(k);
    }
  };
}
