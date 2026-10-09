// A lighter stand-in geometry for a mesh's shadow (issue #372). The shadow map only needs a thing's outline, softened
// by the shadow filter, so a bush can cast through a faceted ball and a hedge through a box while the eye still sees
// the modelled leaves. Set on the meshes a builder makes (outdoor/parts.js), carried through the place's merge
// (scenes/merge-static.js), and drawn by the draw-call pass's shadow-only batches (perf/batch.js); a mesh drawing
// itself still casts with its own geometry. Position only, in the mesh's own frame, as its geometry.
import * as THREE from 'three';

const proxies = new WeakMap();

export const setShadowGeometry = (mesh, geometry) => (geometry ? proxies.set(mesh, geometry) : proxies.delete(mesh));
export const shadowProxy = (mesh) => proxies.get(mesh) || null;
// the geometry a mesh's shadow is drawn from
export const shadowGeometry = (mesh) => proxies.get(mesh) || mesh.geometry;
// a geometry's triangles as a non-indexed position-only copy (what a shadow needs)
export function positions(g) {
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', (g.index ? g.toNonIndexed() : g).attributes.position.clone());
  return out;
}
