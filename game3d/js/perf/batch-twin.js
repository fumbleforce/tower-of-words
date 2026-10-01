// What an outlined thing draws with while its meshes are lifted out of their batches (js/perf/batch.js, issue #82).
// The outline pass needs the thing on its own: not in the batches its depth pass draws, and as objects it can select.
// Drawn one by one, a thing of 80 small meshes cost 80 draws in the main pass and 80 more in the outline's mask.
// A twin draws one batch's share of the thing: the batch's own vertex buffers with an index of just those parts, so
// it is the same triangles with the same material, one draw per batch touched.
//   const t = makeTwin(batch, parts)   parts: the batch's { i0, cnt } entries for the lifted meshes
//   dropTwin(t)
import * as THREE from 'three';

const v = new THREE.Vector3();

export function makeTwin(b, parts) {
  const src = b.mesh,
    g = src.geometry,
    P = g.attributes.position;
  let n = 0;
  for (const p of parts) n += p.cnt;
  const idx = new b.orig.constructor(n),
    box = new THREE.Box3();
  n = 0;
  for (const p of parts) {
    idx.set(b.orig.subarray(p.i0, p.i0 + p.cnt), n);
    n += p.cnt;
  }
  for (let i = 0; i < n; i++) box.expandByPoint(v.fromBufferAttribute(P, idx[i]));
  const geo = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) geo.setAttribute(k, a); // shared, not copied
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingBox = box; // just these parts: culling and the outline's cropped depth pass stay tight
  geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  const m = new THREE.Mesh(geo, src.material);
  m.name = 'perf-outlined';
  m.castShadow = src.castShadow;
  m.receiveShadow = src.receiveShadow;
  m.renderOrder = src.renderOrder;
  m.frustumCulled = src.frustumCulled;
  m.userData = { ...src.userData };
  m.raycast = () => {}; // picking goes by the original meshes (main.js modelAt)
  m.matrixAutoUpdate = false;
  m.matrix.copy(src.matrix);
  src.parent.add(m);
  m.updateMatrixWorld(true);
  return m;
}

// the vertex buffers belong to the batch: only the twin's index and its own state are freed
export function dropTwin(m) {
  m.parent && m.parent.remove(m);
  const g = m.geometry;
  for (const k of Object.keys(g.attributes)) g.deleteAttribute(k);
  g.dispose();
}
