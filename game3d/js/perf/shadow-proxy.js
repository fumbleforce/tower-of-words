// A lighter stand-in geometry for a mesh's shadow (issue #372). The shadow map only needs a thing's outline, softened
// by the shadow filter, so a bush can cast through a faceted ball and a hedge through a box while the eye still sees
// the modelled leaves. Set on the meshes a builder makes (outdoor/parts.js), carried through the place's merge
// (scenes/merge-static.js), and drawn by the draw-call pass's shadow-only batches (perf/batch.js); a mesh drawing
// itself still casts with its own geometry. Position only, in the mesh's own frame, as its geometry.
import * as THREE from 'three';

const proxies = new WeakMap();

export const setShadowGeometry = (mesh, geometry) => (geometry ? proxies.set(mesh, geometry) : proxies.delete(mesh));
export const shadowProxy = (mesh) => proxies.get(mesh) || null;
// the geometry a mesh's shadow is drawn from: its own stand-in, a plain box for a rounded one (perf/rounded-box.js), or
// its own geometry
export const shadowGeometry = (mesh) => proxies.get(mesh) || boxFor(mesh.geometry) || mesh.geometry;
const boxes = new Map();
function boxFor(g) {
  const s = g.userData.shadowBox;
  if (!s) return null;
  const key = s.join('|');
  let b = boxes.get(key);
  if (!b) {
    if (boxes.size > 500) boxes.clear();
    boxes.set(key, (b = positions(new THREE.BoxGeometry(s[0], s[1], s[2]))));
  }
  return b;
}
// a geometry's triangles as a non-indexed position-only copy (what a shadow needs)
export function positions(g) {
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', (g.index ? g.toNonIndexed() : g).attributes.position.clone());
  return out;
}

// A shadow-only stand-in for a mesh that draws itself: drawn into `light`'s shadow map and nowhere else. three.js
// tests layers against the view's camera in its shadow pass too, so a layer can't do it; the stand-in instead counts
// as inside only that light's shadow frustum, so every view (and the AO and outline passes) culls it, and rays pass.
export function shadowOnly(geometry, name, light) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = name;
  const inside = mesh.intersectsFrustum.bind(mesh);
  mesh.intersectsFrustum = (frustum) => frustum === light.shadow.getFrustum() && inside(frustum);
  mesh.raycast = () => {};
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.noBatch = mesh.userData.noAO = mesh.userData.noLook = mesh.material.userData.noLook = true;
  return mesh;
}
// a lighter copy of a non-indexed geometry for its shadow: its corners snapped to a grid of `cell` metres, the
// triangles that collapse or repeat dropped (the outline the shadow map sees stays within half a cell)
export function clustered(g, cell) {
  const P = g.attributes.position,
    out = [],
    seen = new Set();
  const snap = (i) => [P.getX(i), P.getY(i), P.getZ(i)].map((v) => Math.round(v / cell) * cell);
  for (let i = 0; i + 2 < P.count; i += 3) {
    const [a, b, c] = [snap(i), snap(i + 1), snap(i + 2)];
    const ka = a.join(),
      kb = b.join(),
      kc = c.join();
    if (ka === kb || kb === kc || ka === kc) continue;
    const key = [ka, kb, kc].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(...a, ...b, ...c);
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return r;
}

// A caster's shadow geometry snapped to `cell` metres (clustered), kept per geometry when that drops a fifth or more of
// its triangles; with cell 0 (or little to gain) the geometry itself. For a cell under the shadow map's texel the
// shadow is the same (perf/phone.js batchSizes).
const snapped = new WeakMap();
export function snappedShadow(g, cell) {
  if (!cell) return g;
  let s = snapped.get(g);
  if (s === undefined) {
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    s = n >= 24 ? clustered(g.index ? g.toNonIndexed() : g, cell) : null;
    if (s && s.attributes.position.count / 3 > n * 0.8) s = null;
    snapped.set(g, s);
  }
  return s || g;
}
