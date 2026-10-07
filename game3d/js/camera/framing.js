// A compressed camera keeps its normal lens and controls. Fade the local actor
// before the head fills that lens, with room to retreat before bringing it back.
export function playerFraming(player) {
  const originals = new Map(),
    copies = new Map();
  let shown = null,
    opacity = 1,
    time = null,
    visible = null;
  function restore() {
    if (visible !== null) player.visible = visible;
    visible = null;
    for (const [mesh, material] of originals) mesh.material = material;
    originals.clear();
  }
  function material(source) {
    let copy = copies.get(source);
    if (!copy) {
      copy = source.clone();
      // Three's Material.copy omits these character normal/tint/lighting hooks.
      copy.onBeforeCompile = source.onBeforeCompile;
      copy.customProgramCacheKey = source.customProgramCacheKey;
      copy.transparent = true;
      copy.depthWrite = false;
      copy.alphaTest = 0;
      copies.set(source, copy);
    }
    copy.opacity = source.opacity * opacity;
    return copy;
  }
  return {
    restore,
    reset() {
      restore();
      for (const copy of copies.values()) copy.dispose();
      copies.clear();
      shown = time = null;
    },
    update(distance, scale, now = performance.now()) {
      restore();
      const near = distance / scale;
      if (shown === null) {
        shown = near >= 1.9;
        opacity = shown ? 1 : 0;
      } else if (near < 1.9) shown = false;
      else if (near > 2.1) shown = true;
      const step = time === null ? 0 : Math.max(0, now - time) / 160;
      time = now;
      opacity = shown ? Math.min(1, opacity + step) : Math.max(0, opacity - step);
      // A sudden obstruction may skip the fade band. Never draw hair against the lens.
      if (near < 1.4) opacity = 0;
      if (opacity === 1) return;
      visible = player.visible;
      if (opacity === 0) {
        player.visible = false;
        return;
      }
      player.traverse((mesh) => {
        if (!mesh.material) return;
        originals.set(mesh, mesh.material);
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(material) : material(mesh.material);
      });
    },
  };
}
