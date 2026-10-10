// A merged mesh is never drawn while its batch draws it, so its own copy on the GPU only takes memory (#374): once no
// mesh that still draws shares its geometry, that copy is let go (the geometry and its arrays stay, for raycasts and
// re-merging). If it draws again (released, ?nobatch toggled), three.js uploads it again on that frame.
// geometry.userData.perfFreed tells the place budget check (tools/perf/place-measure.mjs) it isn't on the GPU.

// the merged meshes (`live`, all on the `hidden` layers mask) whose geometry no drawn mesh in `scene` shares
export function freeMerged(scene, live, hidden) {
  const drawn = new Set();
  scene.traverse((o) => {
    if (o.geometry && o.layers.mask !== hidden) drawn.add(o.geometry);
  });
  for (const o of live) {
    const g = o.geometry;
    if (!g || drawn.has(g) || g.userData.perfFreed) continue;
    g.dispose();
    g.userData.perfFreed = true;
  }
}
// a merged mesh about to draw itself again: three.js uploads its geometry then
export const unfree = (o) => {
  if (o.geometry && o.geometry.userData.perfFreed) delete o.geometry.userData.perfFreed;
};
