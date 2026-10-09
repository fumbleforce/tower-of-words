import { lighterAfterLoss } from '../../perf/gl-guard.js';

// Called by the cached place's update: no global listeners or scene rebuild on Settings/resize.
export function detailController(root) {
  const query = new URLSearchParams(location.search),
    meshes = [],
    geometry = [];
  root.traverse((mesh) => {
    if (mesh.isInstancedMesh && /^diorama-(leaves-|meadow)/.test(mesh.name)) {
      meshes.push({ mesh, full: mesh.count });
      mesh.userData.noAO = true; // leaf cards and grass blades stay out of the AO's own pass (perf/gtao.js)
    }
    if (mesh.userData.dioramaGeometry) geometry.push(mesh);
  });
  let previous = '';
  return () => {
    const tier = query.has('q')
      ? +query.get('q')
      : lighterAfterLoss({ low: 0, medium: 1, high: 2 }[window.__qualityTier?.()] ?? 1);
    const width = +(query.get('w') || innerWidth),
      height = +(query.get('h') || innerHeight);
    const phone = width / height < 0.8 || width < 640;
    const key = `${tier}:${phone}`;
    if (key === previous) return;
    previous = key;
    const leaves = (phone ? [4000, 6000, 18000] : [12000, 22000, 32000])[tier] ?? 4000;
    const grass = (phone ? [1000, 1200, 4000] : [2500, 4500, 6500])[tier] ?? 1000;
    let leafCount = 0,
      grassCount = 0;
    for (const { mesh, full } of meshes) {
      const leaf = mesh.name.startsWith('diorama-leaves-');
      mesh.count = Math.min(full, Math.round(full * (leaf ? leaves / 32000 : grass / 6500)));
      // the crowns and hedges under them cast the shadow; leaf cards and grass blades would draw the place again
      mesh.castShadow = false;
      // none on a phone: its high overview barely shows them (coordinator, 2026-10-09, the place budgets)
      mesh.visible = !phone;
      if (phone) continue;
      if (leaf) leafCount += mesh.count;
      else if (mesh.name === 'diorama-meadow') grassCount += mesh.count;
    }
    for (const mesh of geometry) mesh.geometry = mesh.userData.dioramaGeometry[!phone && tier === 2 ? 'high' : 'low'];
    Object.assign(root.userData.diorama, { tier, phone, activeLeaves: leafCount, activeGrass: grassCount });
  };
}
